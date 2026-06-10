import { spawnSync } from "node:child_process";
import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_XLSX = "/Users/bobo/Downloads/蘇州學校交流排程表_補充版.xlsx";
const DEFAULT_ZIP = "/Users/bobo/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/3ce99cc7f550e719bde3a98404db39e1/Message/MessageTemp/db27d21bb2c4923698216756ebec3d73/File/26年粤港六天五夜行程.zip";

const xlsxPath = process.env.REAL_SCHEDULE_XLSX || DEFAULT_XLSX;
const zipPath = process.env.REAL_ITINERARY_ZIP || DEFAULT_ZIP;
const python = process.env.PYTHON || "python3";

const PROJECT_CODE = "2026-SZHK-YOUTH";
const PROJECT_NAME = "2026苏港青少年交流项目";
const CREATED_BY = 1;

const parserCode = String.raw`
import io, json, re, sys, zipfile
from datetime import date
from xml.etree import ElementTree as ET

from openpyxl import load_workbook

xlsx_path, zip_path = sys.argv[1], sys.argv[2]

def norm_text(v):
    if v is None:
        return ""
    return str(v).replace("\r", "\n").strip()

def ws_cell(ws, row, col):
    c = ws.cell(row, col)
    value = c.value
    fill = c.fill
    color = ""
    if fill and fill.fill_type == "solid":
        raw = fill.fgColor.rgb or ""
        color = str(raw).replace("FF", "", 1).upper() if str(raw).startswith("FF") else str(raw).upper()
    if value is None:
        for merged in ws.merged_cells.ranges:
            if merged.min_row <= row <= merged.max_row and merged.min_col <= col <= merged.max_col:
                value = ws.cell(merged.min_row, merged.min_col).value
                break
    return norm_text(value), color

def date_from_day(day_text):
    m = re.search(r"(\d{1,2})", str(day_text or ""))
    if not m:
        return ""
    return f"2026-07-{int(m.group(1)):02d}"

wb = load_workbook(xlsx_path, data_only=False)
overview = wb["深港分流批次方案"]
date_cols = list(range(10, 25))
dates = {col: date_from_day(ws_cell(overview, 3, col)[0]) for col in date_cols}
active_colors = {"9DC3E6", "1F4E79", "FFE699", "BDD7EE"}
schedule_rows = []
for row in range(5, 18):
    code_text = ws_cell(overview, row, 1)[0]
    codes = re.findall(r"[PS]\d+", code_text or "", re.I)
    if not codes:
        continue
    cells = []
    for col in date_cols:
        color = ws_cell(overview, row, col)[1]
        if color in active_colors:
            cells.append({"date": dates[col], "color": color})
    schedule_rows.append({
        "row": row,
        "codes": [c.upper() for c in codes],
        "codeText": code_text,
        "typeText": ws_cell(overview, row, 2)[0],
        "peopleText": ws_cell(overview, row, 3)[0],
        "totalText": ws_cell(overview, row, 5)[0] or ws_cell(overview, row, 4)[0],
        "startCityText": ws_cell(overview, row, 6)[0],
        "batchCode": ws_cell(overview, row, 7)[0],
        "flightGroupText": ws_cell(overview, row, 8)[0],
        "schoolText": ws_cell(overview, row, 9)[0],
        "cells": cells,
    })

sheet2 = wb["Sheet2"]
school_rows = []
for row in range(2, sheet2.max_row + 1):
    school = ws_cell(sheet2, row, 4)[0]
    if not school:
        continue
    school_rows.append({
        "row": row,
        "arrivalFlightText": ws_cell(sheet2, row, 2)[0],
        "departureFlightText": ws_cell(sheet2, row, 3)[0],
        "school": school,
        "ticketCount": ws_cell(sheet2, row, 5)[0],
        "actualCount": ws_cell(sheet2, row, 6)[0],
        "studentCount": ws_cell(sheet2, row, 7)[0],
        "teacherCount": ws_cell(sheet2, row, 8)[0],
        "startDay": ws_cell(sheet2, row, 9)[0],
        "exchangeDay": ws_cell(sheet2, row, 10)[0],
        "notes": ws_cell(sheet2, row, 11)[0],
        "exchangeTime": ws_cell(sheet2, row, 12)[0],
        "lunch": ws_cell(sheet2, row, 13)[0],
    })

ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

def texts(el):
    return "".join(t.text or "" for t in el.findall(".//w:t", ns)).strip()

def parse_docx(data):
    with zipfile.ZipFile(io.BytesIO(data)) as dz:
        root = ET.fromstring(dz.read("word/document.xml"))
    body = root.find("w:body", ns)
    paragraphs, tables = [], []
    for child in list(body):
        tag = child.tag.split("}")[-1]
        if tag == "p":
            text = texts(child)
            if text:
                paragraphs.append(text)
        elif tag == "tbl":
            rows = []
            for tr in child.findall("w:tr", ns):
                row = [texts(tc).replace("\n", " ").strip() for tc in tr.findall("w:tc", ns)]
                if any(row):
                    rows.append(row)
            if rows:
                tables.append(rows)
    return paragraphs, tables

def clean_school_name(text):
    text = re.sub(r"\s+", "", text or "")
    return text.strip(" /，,")

def source_schools(text):
    schools = []
    for part in re.split(r"\s*/\s*", text or ""):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"(.+?)[(（]\s*(\d+)\s*[)）]", part)
        if m:
            schools.append({"name": clean_school_name(m.group(1)), "studentCount": int(m.group(2))})
        else:
            schools.append({"name": clean_school_name(part), "studentCount": 0})
    return schools

def parse_people(text):
    m = re.search(r"(\d+)\s*學生\s*(\d+)\s*老師", text or "")
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)

def parse_date_range(text):
    m = re.search(r"(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*[-–—]\s*(?:(\d{1,2})月)?\s*(\d{1,2})日", text or "")
    if not m:
        return "", "", 0
    year = int(m.group(1))
    start_month = int(m.group(2))
    start_day = int(m.group(3))
    end_month = int(m.group(4) or start_month)
    end_day = int(m.group(5))
    start = date(year, start_month, start_day)
    end = date(year, end_month, end_day)
    return start.isoformat(), end.isoformat(), (end - start).days + 1

def normalize_time(text):
    return (text or "").replace("：", ":").replace("–", "-").replace("—", "-").strip()

def parse_flight(text):
    m = re.search(r"(.+?)\s*-\s*(.+?)\s+航班\s*[:：]\s*([A-Z]{2})\s*([0-9]+)\s+时间\s*[:：]\s*([0-9:：]{1,5})\s*[–—-]\s*([0-9:：]{1,5})", text or "")
    if not m:
        return None
    return {
        "fromCity": m.group(1).strip(),
        "toCity": m.group(2).strip(),
        "flight": f"{m.group(3)}{m.group(4)}",
        "startTime": normalize_time(m.group(5)),
        "endTime": normalize_time(m.group(6)),
        "raw": text,
    }

def parse_date_cell(text):
    m = re.search(r"(\d{1,2})月\s*(\d{1,2})日", text or "")
    if not m:
        return ""
    return f"2026-{int(m.group(1)):02d}-{int(m.group(2)):02d}"

def parse_time(text):
    text = normalize_time(text)
    m = re.search(r"(\d{1,2}):(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?", text)
    if not m:
        return "", ""
    start = f"{int(m.group(1)):02d}:{m.group(2)}"
    end = f"{int(m.group(3)):02d}:{m.group(4)}" if m.group(3) else ""
    return start, end

def parse_itineraries(tables, start_date):
    out = []
    current = ""
    sort_order = {}
    for table in tables:
        for row in table:
            if row and row[0] in ("日期", "行程内容"):
                continue
            date_text = row[0] if row else ""
            found_date = parse_date_cell(date_text)
            if found_date:
                current = found_date
            if not current:
                continue
            if len(row) >= 3:
                time_text = row[1]
                desc = " ".join(x for x in row[2:] if x).strip()
            elif len(row) == 2:
                time_text = ""
                desc = row[1].strip()
            else:
                continue
            if not desc or desc in ("行程内容", "日期"):
                continue
            start_time, end_time = parse_time(time_text)
            day_number = 1
            if start_date:
                y1, m1, d1 = [int(x) for x in start_date.split("-")]
                y2, m2, d2 = [int(x) for x in current.split("-")]
                day_number = (date(y2, m2, d2) - date(y1, m1, d1)).days + 1
            idx = sort_order.get(current, 0)
            sort_order[current] = idx + 1
            out.append({
                "date": current,
                "dayNumber": day_number,
                "startTime": start_time,
                "endTime": end_time,
                "description": desc,
                "timeText": time_text,
                "sortOrder": idx,
            })
    return out

groups = []
with zipfile.ZipFile(zip_path) as z:
    infos = [info for info in z.infolist() if info.filename.lower().endswith(".docx")]
    for info in infos:
        code_match = re.search(r"([PS]\d+)\.docx", info.filename, re.I)
        code = code_match.group(1).upper() if code_match else info.filename
        paragraphs, tables = parse_docx(z.read(info))
        students, teachers = parse_people(next((p for p in paragraphs if "人數" in p), ""))
        date_line = next((p for p in paragraphs if re.search(r"\d{4}年", p)), "")
        start_date, end_date, days = parse_date_range(date_line)
        flights = [parse_flight(p) for p in paragraphs if "航班" in p and "时间" in p]
        flights = [f for f in flights if f]
        groups.append({
            "code": code,
            "fileName": info.filename,
            "type": "小學" if code.startswith("P") else "中學",
            "sourceText": paragraphs[0] if paragraphs else "",
            "sourceSchools": source_schools(paragraphs[0] if paragraphs else ""),
            "studentCount": students,
            "teacherCount": teachers,
            "totalCount": students + teachers,
            "startDate": start_date,
            "endDate": end_date,
            "days": days,
            "arrival": flights[0] if len(flights) > 0 else None,
            "departure": flights[1] if len(flights) > 1 else None,
            "itineraries": parse_itineraries(tables, start_date),
        })

print(json.dumps({"scheduleRows": schedule_rows, "schoolRows": school_rows, "groups": groups}, ensure_ascii=False))
`;

function parseInputFiles() {
  const result = spawnSync(python, ["-c", parserCode, xlsxPath, zipPath], {
    encoding: "utf8",
    maxBuffer: 80 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Python parser failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

const LOCATION_DEFS = [
  { name: "香港大學", aliases: ["香港大学", "香港大學"], address: "香港薄扶林香港大學", applicableType: "all" },
  { name: "香港太空館", aliases: ["香港太空馆", "香港太空館"], address: "尖沙咀梳士巴利道10號", applicableType: "all" },
  { name: "尖沙咀星光大道", aliases: ["尖沙咀星光大道", "星光大道", "尖沙咀"], address: "尖沙咀星光大道", applicableType: "all" },
  { name: "維港遊", aliases: ["维港游", "維港遊"], address: "香港維多利亞港", applicableType: "all" },
  { name: "香港海洋公園", aliases: ["香港海洋公园", "香港海洋公園"], address: "香港島南區黃竹坑道180號", applicableType: "all" },
  { name: "金紫荊廣場", aliases: ["金紫荊廣場", "金紫荆广场"], address: "灣仔博覽道1號", applicableType: "all" },
  { name: "香港文化博物館", aliases: ["香港文化博物館", "香港文化博物馆"], address: "沙田文林路1號", applicableType: "all" },
  { name: "嘉道理農場暨植物園", aliases: ["嘉道理农场暨植物园", "嘉道理農場暨植物園"], address: "香港新界大埔林錦公路", applicableType: "all" },
  { name: "蓮花山公園", aliases: ["莲花山公园", "蓮花山公園"], address: "廣東省深圳市福田區紅荔路6030號", applicableType: "all" },
  { name: "華大基因時空中心", aliases: ["华大基因时空中心", "華大基因時空中心"], address: "深圳市鹽田區梅沙街道濱海社區雲華路9號", applicableType: "all" },
  { name: "深圳國家基因庫", aliases: ["深圳国家基因库", "深圳國家基因庫"], address: "廣東省深圳市龍崗區觀音山公園內", applicableType: "all" },
  { name: "比亞迪雲巴", aliases: ["比亚迪云巴", "比亞迪雲巴"], address: "坪山雲巴一號線綜合車場", applicableType: "all" },
  { name: "南方科技大學校園", aliases: ["南方科技大学校园", "南方科技大學校園"], address: "廣東省深圳市南山區學苑大道1088號", applicableType: "middle" },
  { name: "機器人展示館藝術館", aliases: ["机器人展示馆艺术馆", "機器人展示館藝術館"], address: "", applicableType: "middle" },
  { name: "香港高校參訪", aliases: ["香港高校参访", "香港高校參訪"], address: "香港", applicableType: "middle" },
];

const RESTAURANT_DEFS = [
  { name: "香港諾富特世紀酒店宴會廳", aliases: ["香港諾富特世紀酒店宴會廳", "香港诺富特世纪酒店宴会厅"], address: "香港灣仔謝斐道238號" },
  { name: "茗悅軒", aliases: ["茗悅軒", "茗悦轩"], address: "沙田小瀝源路68號廣源商場5座地下4號舖及1樓" },
  { name: "逸月軒（荃新天地）", aliases: ["逸月軒", "逸月轩"], address: "荃灣楊屋道18號荃新天地2期1樓130-133&135號舖" },
  { name: "香港海洋公園午餐", aliases: ["香港海洋公园午餐", "香港海洋公園午餐"], address: "香港海洋公園" },
];

function normalizeName(value) {
  const replacements = {
    蘇: "苏",
    實: "实",
    驗: "验",
    學: "学",
    區: "区",
    園: "园",
    書: "书",
    屬: "属",
    師: "师",
    範: "范",
    貿: "贸",
    茂: "贸",
  };
  return String(value || "")
    .replace(/[蘇實驗學區園書屬師範貿茂]/g, (char) => replacements[char] || char)
    .replace(/\s+/g, "")
    .replace(/[（）()，,。:：]/g, "")
    .replace(/[^\u4e00-\u9fa5a-z0-9]/gi, "")
    .toLowerCase();
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toInt(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function scheduleByCode(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const code of row.codes) map.set(code, row);
  }
  return map;
}

function getStartCity(group, scheduleRow) {
  const text = `${scheduleRow?.startCityText || ""} ${group.arrival?.toCity || ""}`;
  if (/香港|港/.test(text) && !/深圳進|深圳进/.test(text)) return "hk";
  if (/深圳|深/.test(text)) return "sz";
  return group.arrival?.toCity?.includes("香港") ? "hk" : "sz";
}

function findColorDate(scheduleRow, color) {
  return scheduleRow?.cells?.find((cell) => cell.color === color)?.date || null;
}

function firstActiveDate(scheduleRow) {
  return scheduleRow?.cells?.[0]?.date || null;
}

function lastActiveDate(scheduleRow) {
  return scheduleRow?.cells?.[scheduleRow.cells.length - 1]?.date || null;
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function oppositeCity(city) {
  return city === "hk" ? "sz" : "hk";
}

function cityLabel(city) {
  return city === "hk" ? "香港" : "深圳";
}

function inferBlockType(group, scheduleRow, cell, startCity, crossingDate, exchangeDate, startDate, endDate) {
  if (cell.date === endDate) return "departure";
  if (cell.date === crossingDate) return startCity === "hk" ? "border_hk_sz" : "border_sz_hk";
  if (cell.date === exchangeDate) return "exchange";
  if (cell.date === startDate) return startCity === "hk" ? "hk_arrive" : "sz_arrive";
  const city = crossingDate && cell.date >= crossingDate ? oppositeCity(startCity) : startCity;
  return city === "hk" ? "hk_stay" : "sz_stay";
}

function hotelCityForBlock(blockType) {
  if (["hk_arrive", "hk_stay", "exchange", "border_sz_hk"].includes(blockType)) return "hk";
  if (["sz_arrive", "sz_stay", "border_hk_sz"].includes(blockType)) return "sz";
  return null;
}

function detectDefinition(text, defs) {
  const source = normalizeName(text);
  return defs.find((def) => def.aliases.some((alias) => source.includes(normalizeName(alias))));
}

function inferLocationName(description, locationDef, restaurantDef) {
  if (locationDef) return locationDef.name;
  if (restaurantDef) return restaurantDef.name;
  const text = cleanText(description);
  const match = text.match(/(?:前往|参访|參訪|參觀|参观|游览|遊覽)([^。；;，,地址]{2,30})/);
  return cleanText(match?.[1] || text).slice(0, 120);
}

function parseExchangePairs(group, domesticNamesByKey) {
  const pairs = [];
  const pairRegex = /([^:：\n]{2,80}?(?:小學|小学|學校|学校|中學|中学|書院|书院|女書院|女书院|初級中學|初级中学|附屬小學|附属小学|實驗小學|实验小学))\s*[-－—]\s*([^:：\n]{2,90})/g;
  for (const item of group.itineraries) {
    let match;
    while ((match = pairRegex.exec(item.description))) {
      const domesticRaw = cleanText(match[1]);
      const exchangeRaw = cleanText(match[2])
        .replace(/\s*(?:\(|（).*/, "")
        .replace(/\s*地址.*/, "")
        .replace(/\s*交流.*/, "")
        .trim();
      const domesticKey = normalizeName(domesticRaw);
      const knownDomestic = [...domesticNamesByKey.keys()].find((key) => domesticKey.includes(key) || key.includes(domesticKey));
      if (!knownDomestic || !exchangeRaw || /上海|深圳|香港國際機場|香港国际机场/.test(exchangeRaw)) continue;
      pairs.push({
        groupCode: group.code,
        domesticName: domesticNamesByKey.get(knownDomestic),
        exchangeName: exchangeRaw,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        notes: item.description,
      });
    }
  }
  return pairs;
}

function schoolRowsByName(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = normalizeName(row.school);
    if (key) map.set(key, row);
  }
  return map;
}

function findSchoolInfo(rowsByName, name) {
  const key = normalizeName(name);
  if (rowsByName.has(key)) return rowsByName.get(key);
  for (const [candidate, row] of rowsByName) {
    if (candidate.includes(key) || key.includes(candidate)) return row;
  }
  return null;
}

async function clearPreviousData(conn) {
  await conn.query("SET FOREIGN_KEY_CHECKS=0");
  const tables = [
    "schoolExchanges",
    "batchExchangeSchools",
    "itineraryMembers",
    "memberStatus",
    "batchStaff",
    "scheduleBlocks",
    "dailyCards",
    "itineraries",
    "members",
    "files",
    "batches",
    "groups",
    "projects",
    "locations",
    "attractions",
    "restaurants",
    "exchangeSchools",
    "domesticSchools",
    "schools",
    "notifications",
  ];
  for (const table of tables) {
    await conn.query(`DELETE FROM \`${table}\``);
    await conn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`).catch(() => {});
  }
  await conn.query("SET FOREIGN_KEY_CHECKS=1");
}

async function insertResources(conn, groups, schoolRows) {
  const locationIds = new Map();
  const restaurantIds = new Map();
  const domesticIds = new Map();
  const exchangeIds = new Map();

  for (const def of LOCATION_DEFS) {
    const [locResult] = await conn.execute(
      `INSERT INTO locations (name, address, capacity, applicableType, maxCapacity, isActive)
       VALUES (?, ?, ?, ?, ?, true)`,
      [def.name, def.address || null, 0, def.applicableType || "all", null]
    );
    await conn.execute(
      `INSERT INTO attractions (name, location, address, description, capacity, maxCapacity, unavailableTimeSlots, isAlwaysUnavailable, closedDays, requiresBooking, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, false, ?, false, ?, ?)`,
      [def.name, def.address || null, def.address || null, "由真实行程自动导入", 0, null, JSON.stringify([]), JSON.stringify([]), "由真实行程自动导入", CREATED_BY]
    );
    locationIds.set(def.name, locResult.insertId);
  }

  for (const def of RESTAURANT_DEFS) {
    const [result] = await conn.execute(
      `INSERT INTO restaurants (name, address, capacity, cuisine, notes, isActive, createdBy)
       VALUES (?, ?, ?, ?, ?, true, ?)`,
      [def.name, def.address || null, 80, "團餐", "由真实行程自动导入", CREATED_BY]
    );
    restaurantIds.set(def.name, result.insertId);
  }

  const domestic = new Map();
  for (const row of schoolRows) {
    const key = normalizeName(row.school);
    if (!key) continue;
    domestic.set(key, {
      name: row.school,
      studentCount: toInt(row.studentCount),
      teacherCount: toInt(row.teacherCount),
      notes: [row.notes, row.exchangeTime && `交流時間：${row.exchangeTime}`, row.lunch && `午餐：${row.lunch}`].filter(Boolean).join("\n"),
    });
  }
  for (const group of groups) {
    for (const school of group.sourceSchools) {
      const key = normalizeName(school.name);
      const existing = domestic.get(key) || { name: school.name, studentCount: 0, teacherCount: 0, notes: "" };
      existing.studentCount = Math.max(existing.studentCount || 0, school.studentCount || 0);
      domestic.set(key, existing);
    }
  }

  for (const item of domestic.values()) {
    const [result] = await conn.execute(
      `INSERT INTO domesticSchools (name, studentCount, teacherCount, notes, isActive, createdBy)
       VALUES (?, ?, ?, ?, true, ?)`,
      [item.name, item.studentCount || 0, item.teacherCount || 0, item.notes || "由真实行程自动导入", CREATED_BY]
    );
    domesticIds.set(normalizeName(item.name), result.insertId);
  }

  const domesticNamesByKey = new Map([...domestic.values()].map((item) => [normalizeName(item.name), item.name]));
  const exchangePairs = groups.flatMap((group) => parseExchangePairs(group, domesticNamesByKey));
  const exchangeByKey = new Map();
  for (const pair of exchangePairs) {
    const key = normalizeName(pair.exchangeName);
    if (!exchangeByKey.has(key)) {
      exchangeByKey.set(key, {
        name: pair.exchangeName,
        dates: new Set(),
        notes: [],
      });
    }
    exchangeByKey.get(key).dates.add(pair.date);
    exchangeByKey.get(key).notes.push(`${pair.groupCode} / ${pair.domesticName} / ${pair.date} ${pair.startTime || ""}-${pair.endTime || ""}`);
  }

  for (const item of exchangeByKey.values()) {
    const [result] = await conn.execute(
      `INSERT INTO exchangeSchools (name, region, availableDates, schoolType, maxGroupSize, capacity, notes, isActive, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, ?)`,
      [item.name, "香港", JSON.stringify([...item.dates].sort()), "中小學", 60, 60, item.notes.join("\n"), CREATED_BY]
    );
    exchangeIds.set(normalizeName(item.name), result.insertId);
  }

  return { locationIds, restaurantIds, domesticIds, exchangeIds, exchangePairs };
}

async function insertProjectData(conn, parsed, resources) {
  const schedules = scheduleByCode(parsed.scheduleRows);
  const schoolInfoByName = schoolRowsByName(parsed.schoolRows);
  const orderedGroups = [...parsed.groups].sort((a, b) => {
    const ar = schedules.get(a.code)?.row || 999;
    const br = schedules.get(b.code)?.row || 999;
    return ar - br || a.code.localeCompare(b.code, "zh-Hans-CN");
  });

  const totalStudents = orderedGroups.reduce((sum, group) => sum + group.studentCount, 0);
  const totalTeachers = orderedGroups.reduce((sum, group) => sum + group.teacherCount, 0);

  const [projectResult] = await conn.execute(
    `INSERT INTO projects (code, name, description, startDate, endDate, totalStudents, totalTeachers, status, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'preparing', ?)`,
    [
      PROJECT_CODE,
      PROJECT_NAME,
      `由 ${xlsxPath} 和 ${zipPath} 导入；包含排程总览、13个团组详细行程和资源库基础资料。`,
      "2026-07-01",
      "2026-07-15",
      totalStudents,
      totalTeachers,
      CREATED_BY,
    ]
  );
  const projectId = projectResult.insertId;

  const groupedByBatch = new Map();
  for (const group of orderedGroups) {
    const scheduleRow = schedules.get(group.code);
    const batchCode = scheduleRow?.batchCode || "未分批";
    if (!groupedByBatch.has(batchCode)) groupedByBatch.set(batchCode, []);
    groupedByBatch.get(batchCode).push(group);
  }

  const batchIds = new Map();
  for (const [batchCode, batchGroups] of groupedByBatch) {
    const startDate = batchGroups.map((g) => g.startDate).sort()[0];
    const endDate = batchGroups.map((g) => g.endDate).sort().at(-1);
    const [result] = await conn.execute(
      `INSERT INTO batches (projectId, code, name, arrivalDate, departureDate, notes, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, batchCode, batchCode, startDate, endDate, `真实导入：${batchGroups.map((g) => g.code).join("、")}`, CREATED_BY]
    );
    batchIds.set(batchCode, result.insertId);
  }

  const groupIds = new Map();
  const exchangePairsByGroup = new Map();
  for (const pair of resources.exchangePairs) {
    if (!exchangePairsByGroup.has(pair.groupCode)) exchangePairsByGroup.set(pair.groupCode, []);
    exchangePairsByGroup.get(pair.groupCode).push(pair);
  }

  for (const group of orderedGroups) {
    const scheduleRow = schedules.get(group.code);
    const batchCode = scheduleRow?.batchCode || "未分批";
    const startCity = getStartCity(group, scheduleRow);
    const crossingDate = findColorDate(scheduleRow, "FFE699");
    const exchangeDate = findColorDate(scheduleRow, "1F4E79");
    const scheduleStart = firstActiveDate(scheduleRow) || group.startDate;
    const scheduleEnd = lastActiveDate(scheduleRow) || group.endDate;
    const sourceSchools = group.sourceSchools.map((school) => {
      const schoolInfo = findSchoolInfo(schoolInfoByName, school.name);
      const pair = (exchangePairsByGroup.get(group.code) || []).find((p) => normalizeName(p.domesticName) === normalizeName(school.name));
      const importedStudentCount = toInt(schoolInfo?.studentCount) || school.studentCount;
      return {
        name: school.name,
        studentCount: importedStudentCount,
        teacherCount: toInt(schoolInfo?.teacherCount),
        domesticSchoolId: resources.domesticIds.get(normalizeName(school.name)),
        exchangeSchoolId: pair ? resources.exchangeIds.get(normalizeName(pair.exchangeName)) : undefined,
        timeSlot: schoolInfo?.exchangeTime || undefined,
        exchangeDate: pair?.date || exchangeDate || undefined,
        lunch: schoolInfo?.lunch || undefined,
        notes: schoolInfo?.notes || undefined,
      };
    });
    const notes = [
      `资料来源：${group.fileName}`,
      `总排程：${scheduleRow?.codeText || group.code}`,
      scheduleRow?.flightGroupText && `航班/分组补充：${scheduleRow.flightGroupText}`,
      ...sourceSchools.flatMap((school) => [
        school.timeSlot && `${school.name} 交流时间：${school.timeSlot}`,
        school.lunch && `${school.name} 午餐：${school.lunch}`,
        school.notes && `${school.name} 备注：${school.notes}`,
      ]),
    ].filter(Boolean).join("\n");

    const firstExchange = (exchangePairsByGroup.get(group.code) || [])[0];
    const sisterSchoolId = firstExchange ? resources.exchangeIds.get(normalizeName(firstExchange.exchangeName)) : null;
    const flightInfo = {
      arrivalFlight: group.arrival?.flight,
      arrivalTime: group.arrival?.endTime,
      arrivalFromCity: group.arrival?.fromCity,
      arrivalToCity: group.arrival?.toCity,
      departureFlight: group.departure?.flight,
      departureTime: group.departure?.startTime,
      departureFromCity: group.departure?.fromCity,
      departureToCity: group.departure?.toCity,
    };
    const [result] = await conn.execute(
      `INSERT INTO \`groups\`
       (projectId, name, code, startDate, endDate, days, type, status, studentCount, teacherCount, totalCount, hotel, color, tags, notes, batch_id, batch_code, start_city, crossing_date, sister_school_id, flight_info, school_list, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'preparing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        `${group.code} ${group.sourceText}`.slice(0, 255),
        group.code,
        scheduleStart,
        scheduleEnd,
        Math.max(1, Math.round((new Date(`${scheduleEnd}T00:00:00`) - new Date(`${scheduleStart}T00:00:00`)) / 86400000) + 1),
        JSON.stringify([group.type]),
        group.studentCount,
        group.teacherCount,
        group.totalCount,
        group.itineraries.some((item) => item.description.includes("香港諾富特世紀酒店")) ? "香港諾富特世紀酒店" : null,
        group.type === "中學" ? "#f97316" : "#2563eb",
        JSON.stringify({ exchangeDate: exchangeDate || undefined, importedFrom: "real-suzhou-2026" }),
        notes,
        batchIds.get(batchCode),
        batchCode,
        startCity,
        crossingDate,
        sisterSchoolId || null,
        JSON.stringify(flightInfo),
        JSON.stringify(sourceSchools),
        CREATED_BY,
      ]
    );
    const groupId = result.insertId;
    groupIds.set(group.code, groupId);

    for (const cell of scheduleRow?.cells || []) {
      const blockType = inferBlockType(group, scheduleRow, cell, startCity, crossingDate, exchangeDate, scheduleStart, scheduleEnd);
      const flightNumber = blockType === "departure" ? group.departure?.flight : blockType.endsWith("_arrive") ? group.arrival?.flight : null;
      const flightTime = blockType === "departure" ? group.departure?.startTime : blockType.endsWith("_arrive") ? group.arrival?.endTime : null;
      await conn.execute(
        `INSERT INTO scheduleBlocks (groupId, date, blockType, isExchangeDay, exchangeSchoolId, flightNumber, flightTime, hotelCity, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          groupId,
          cell.date,
          blockType,
          blockType === "exchange",
          blockType === "exchange" && firstExchange ? resources.exchangeIds.get(normalizeName(firstExchange.exchangeName)) : null,
          flightNumber || null,
          flightTime || null,
          hotelCityForBlock(blockType),
          `Excel色块 ${cell.color}`,
        ]
      );
    }

    for (const pair of exchangePairsByGroup.get(group.code) || []) {
      const exchangeSchoolId = resources.exchangeIds.get(normalizeName(pair.exchangeName));
      if (!exchangeSchoolId) continue;
      await conn.execute(
        `INSERT INTO schoolExchanges (groupId, schoolId, exchangeDate, startTime, endTime, activities, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [groupId, exchangeSchoolId, pair.date, pair.startTime || null, pair.endTime || null, `${pair.domesticName} - ${pair.exchangeName}`, pair.notes || null]
      );
    }

    const dailyCards = new Map();
    for (const item of group.itineraries) {
      const locationDef = detectDefinition(item.description, LOCATION_DEFS);
      const restaurantDef = detectDefinition(item.description, RESTAURANT_DEFS);
      const locationId = locationDef ? resources.locationIds.get(locationDef.name) : null;
      const locationName = inferLocationName(item.description, locationDef, restaurantDef);
      await conn.execute(
        `INSERT INTO itineraries (groupId, date, dayNumber, startTime, endTime, locationId, locationName, description, notes, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          groupId,
          item.date,
          item.dayNumber,
          item.startTime || null,
          item.endTime || null,
          locationId || null,
          locationName || null,
          item.description,
          item.timeText || null,
          item.sortOrder,
        ]
      );

      if (!dailyCards.has(item.date)) {
        dailyCards.set(item.date, {
          breakfastRestaurant: null,
          lunchRestaurant: null,
          dinnerRestaurant: null,
          specialNotes: [],
        });
      }
      const card = dailyCards.get(item.date);
      if (/早餐/.test(item.description)) card.breakfastRestaurant ||= "酒店早餐";
      if (/午餐/.test(item.description)) card.lunchRestaurant ||= restaurantDef?.name || "午餐";
      if (/晚餐/.test(item.description)) card.dinnerRestaurant ||= restaurantDef?.name || "晚餐";
      if (/酒店|機場|机场|過關|过关/.test(item.description)) card.specialNotes.push(item.description);
    }

    for (const [date, card] of dailyCards) {
      await conn.execute(
        `INSERT INTO dailyCards (groupId, date, breakfastRestaurant, lunchRestaurant, dinnerRestaurant, hotelName, specialNotes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          groupId,
          date,
          card.breakfastRestaurant,
          card.lunchRestaurant,
          card.dinnerRestaurant,
          group.itineraries.some((item) => item.description.includes("香港諾富特世紀酒店")) ? "香港諾富特世紀酒店" : null,
          card.specialNotes.slice(0, 6).join("\n") || "由真实Word行程导入",
        ]
      );
    }
  }

  return { projectId, groups: orderedGroups.length };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  console.log("解析真实 Excel/Word 资料...");
  const parsed = parseInputFiles();
  console.log(`解析完成：${parsed.groups.length} 个团组，${parsed.schoolRows.length} 条学校补充记录`);

  const conn = await createConnection(process.env.DATABASE_URL);
  try {
    await clearPreviousData(conn);
    const resources = await insertResources(conn, parsed.groups, parsed.schoolRows);
    const result = await insertProjectData(conn, parsed, resources);
    const [[counts]] = await conn.query(`
      SELECT
        (SELECT COUNT(*) FROM projects) AS projects,
        (SELECT COUNT(*) FROM \`groups\`) AS groupsCount,
        (SELECT COUNT(*) FROM scheduleBlocks) AS blocks,
        (SELECT COUNT(*) FROM itineraries) AS itineraries,
        (SELECT COUNT(*) FROM dailyCards) AS dailyCards,
        (SELECT COUNT(*) FROM locations) AS locations,
        (SELECT COUNT(*) FROM restaurants) AS restaurants,
        (SELECT COUNT(*) FROM exchangeSchools) AS exchangeSchools,
        (SELECT COUNT(*) FROM domesticSchools) AS domesticSchools
    `);
    console.log("导入完成：", { projectId: result.projectId, ...counts });
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
