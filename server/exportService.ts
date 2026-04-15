/**
 * exportService.ts
 * 按照小學组P1.docx 模板格式，生成團組行程 Word 文件
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
  PageOrientation,
  ShadingType,
} from "docx";
import * as db from "./db";

// 星期對照
const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"];

// 將任意日期格式（Date 物件或字串）轉成 "YYYY-MM-DD" 字串
function toDateStr(d: any): string {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  // 如果已經是 YYYY-MM-DD 格式，直接返回
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // 其他格式嘗試解析
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function getWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `(星期${WEEKDAY_ZH[d.getDay()]})`;
}

function calcDaysNights(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const nights = days - 1;
  return `${days} 天 ${nights} 夜`;
}

// 無邊框 TableCell
function noBorderCell(children: Paragraph[], options?: { width?: number; verticalAlign?: "top" | "center" | "bottom" }) {
  return new TableCell({
    children,
    verticalAlign: (options?.verticalAlign ?? "top") as any,
    width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

// 帶邊框 TableCell
function borderedCell(children: Paragraph[], options?: { width?: number; verticalAlign?: "top" | "center" | "bottom"; shading?: string }) {
  return new TableCell({
    children,
    verticalAlign: (options?.verticalAlign ?? "top") as any,
    width: options?.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options?.shading ? { type: ShadingType.SOLID, color: options.shading } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
    },
  });
}

function makeText(text: string, options?: { bold?: boolean; size?: number; color?: string }): TextRun {
  return new TextRun({
    text,
    bold: options?.bold ?? false,
    size: options?.size ?? 20, // 10pt = 20 half-points
    color: options?.color,
    // 不指定字體，讓 Word 使用文件默認字體（避免服務器端字體缺失導致亂碼）
  });
}

function makePara(text: string, options?: { bold?: boolean; size?: number; color?: string; align?: typeof AlignmentType[keyof typeof AlignmentType] }): Paragraph {
  return new Paragraph({
    children: [makeText(text, options)],
    alignment: options?.align ?? AlignmentType.LEFT,
  });
}

export async function generateGroupItineraryDocx(groupId: number): Promise<Buffer> {
  // 1. 取得團組資料
  const group = await db.getGroupById(groupId);
  if (!group) throw new Error("Group not found");

  // 2. 取得行程點（按日期+排序）
  const itineraryRows = await db.getItinerariesByGroupId(groupId);
  itineraryRows.sort((a, b) => {
    const dateCompare = String(a.date).localeCompare(String(b.date));
    if (dateCompare !== 0) return dateCompare;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  // 3. 取得食行卡片（按日期）
  const dailyCardRows = await db.getDailyCardsByGroupId(groupId);
  const dailyCardMap: Record<string, any> = {};
  for (const card of dailyCardRows) {
    dailyCardMap[toDateStr(card.date)] = card;
  }

  // 4. 解析學校列表
  const schoolList: Array<{ name: string; studentCount: number; teacherCount?: number }> =
    (group.school_list as any) || [];

  // 5. 解析航班信息
  const flightInfo: {
    arrivalFlight?: string;
    arrivalTime?: string;
    arrivalFromCity?: string;
    arrivalToCity?: string;
    departureFlight?: string;
    departureTime?: string;
    departureFromCity?: string;
    departureToCity?: string;
  } = (group.flight_info as any) || {};

  // 6. 生成日期範圍（統一轉成 YYYY-MM-DD 字串）
  const startDate = toDateStr(group.startDate);
  const endDate = toDateStr(group.endDate);

  // 按日期分組行程點（統一轉成 YYYY-MM-DD 字串）
  const itineraryByDate: Record<string, typeof itineraryRows> = {};
  for (const row of itineraryRows) {
    const d = toDateStr(row.date);
    if (!itineraryByDate[d]) itineraryByDate[d] = [];
    itineraryByDate[d].push(row);
  }

  // 生成日期列表
  const dates: string[] = [];
  if (startDate && endDate) {
    const cur = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  }

  // ─────────────────────────────────────────────
  // 構建文件內容
  // ─────────────────────────────────────────────

  const sections: any[] = [];

  // ── 頂部學校名稱（多所學校以 / 分隔）
  const schoolNamesStr = schoolList.map((s) => s.name).join(" / ") || group.name || "";
  sections.push(
    new Paragraph({
      children: [makeText(schoolNamesStr, { bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // ── 副標題「活动行程」
  sections.push(
    new Paragraph({
      children: [makeText("活动行程", { bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // ── 一. 活动信息（無邊框表格）
  sections.push(
    new Paragraph({
      children: [makeText("一. 活动信息", { bold: true, size: 22 })],
      spacing: { after: 100 },
    })
  );

  const totalStudents = schoolList.reduce((s, x) => s + (x.studentCount || 0), 0) || group.studentCount || 0;
  const totalTeachers = schoolList.reduce((s, x) => s + (x.teacherCount || 0), 0) || group.teacherCount || 0;

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          noBorderCell([makePara(`团组编号 : ${group.code || group.name || "—"}`, { bold: true })], { width: 4000 }),
          noBorderCell([makePara(`人數 : ${totalStudents} 學生 ${totalTeachers} 老師`, { bold: true })], { width: 5000 }),
        ],
      }),
      new TableRow({
        children: [
          noBorderCell([
            makePara("活动日期：", { bold: true }),
            makePara(
              startDate && endDate
                ? `${new Date(startDate + "T00:00:00").getFullYear()} 年 ${formatDate(startDate)} - ${formatDate(endDate)}（${calcDaysNights(startDate, endDate)}）`
                : "—"
            ),
          ], { width: 9000 }),
        ],
      }),
      // 到達航班
      new TableRow({
        children: [
          noBorderCell([
            makePara(
              `${flightInfo.arrivalFromCity || "___"} - ${flightInfo.arrivalToCity || "___"}  航班 : ${flightInfo.arrivalFlight || ""}  时间 : ${flightInfo.arrivalTime || ""}`
            ),
          ], { width: 9000 }),
        ],
      }),
      // 離開航班
      new TableRow({
        children: [
          noBorderCell([
            makePara(
              `${flightInfo.departureFromCity || "___"} - ${flightInfo.departureToCity || "___"}  航班 : ${flightInfo.departureFlight || ""}  时间 : ${flightInfo.departureTime || ""}`
            ),
          ], { width: 9000 }),
        ],
      }),
    ],
  });
  sections.push(infoTable);
  sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));

  // ── 行程表（帶邊框）
  const tableHeaderRow = new TableRow({
    children: [
      borderedCell([makePara("日期", { bold: true, align: AlignmentType.CENTER })], { width: 1200, shading: "D9E1F2" }),
      borderedCell([makePara("行程内容", { bold: true, align: AlignmentType.CENTER })], { shading: "D9E1F2" }),
    ],
    tableHeader: true,
  });

  const tableRows: TableRow[] = [tableHeaderRow];

  for (const date of dates) {
    const dayItineraries = itineraryByDate[date] || [];
    const card = dailyCardMap[date];

    // 構建行程內容段落
    const contentParas: Paragraph[] = [];

    // 行程點
    for (const item of dayItineraries) {
      if (item.description) {
        contentParas.push(makePara(item.description));
      }
      if (item.locationName) {
        contentParas.push(makePara(`地址: ${item.locationName}`));
      }
      if (item.notes) {
        contentParas.push(makePara(item.notes));
      }
    }

    // 食行卡片信息
    if (card) {
      if (card.lunchRestaurant) {
        contentParas.push(makePara(`前往餐厅`));
        if (card.lunchAddress) contentParas.push(makePara(`地址: ${card.lunchAddress}`));
        contentParas.push(makePara("午餐"));
      }
      if (card.dinnerRestaurant) {
        contentParas.push(makePara(`前往餐厅 - ${card.dinnerRestaurant}`));
        if (card.dinnerAddress) contentParas.push(makePara(`地址: ${card.dinnerAddress}`));
        contentParas.push(makePara("晚餐"));
      }
      if (card.hotelName) {
        contentParas.push(makePara(`前往酒店辨理入住手續`));
        contentParas.push(makePara(card.hotelName));
        if (card.hotelAddress) contentParas.push(makePara(`地址: ${card.hotelAddress}`));
      }
    }

    if (contentParas.length === 0) {
      contentParas.push(makePara(""));
    }

    // 日期列（含星期）
    const dateLabel = `${formatDate(date)}\n${getWeekday(date)}`;
    const datePara = new Paragraph({
      children: [
        makeText(`${formatDate(date)}`, { bold: true }),
        new TextRun({ text: "\n", break: 1 }),
        makeText(getWeekday(date), { size: 18 }),
      ],
      alignment: AlignmentType.CENTER,
    });

    tableRows.push(
      new TableRow({
        children: [
          borderedCell([datePara], { width: 1200, verticalAlign: VerticalAlign.TOP }),
          borderedCell(contentParas, { verticalAlign: VerticalAlign.TOP }),
        ],
      })
    );
  }

  const itineraryTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
  sections.push(itineraryTable);

  // ── 構建 Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: sections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
