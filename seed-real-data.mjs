/**
 * 真实数据导入脚本
 * 根据「蘇州學校交流排程表_補充版(2).xlsx」导入
 * 
 * 颜色映射：
 * FF9DC3E6 = 香港 (浅蓝)
 * FF1F4E79 = 交流日★ (深蓝)
 * FFBDD7EE = 深圳 (中蓝)
 * FFFFE699 = 过关日 (黄)
 * FFFFF2CC / FFFCE4D6 = 空/未安排
 */

import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

async function run() {
  // ─── 1. 创建项目 ───────────────────────────────────────────
  const [projResult] = await conn.query(`
    INSERT INTO projects (code, name, description, startDate, endDate, totalStudents, totalTeachers, status, createdBy)
    VALUES ('2026-SZ', '2026年蘇州學校交流', '7月蘇州學校交流深港分流批次方案', '2026-07-01', '2026-07-15', 484, 49, 'preparing', 1)
  `);
  // totalStudents: 40+40+30+40+40+30+30+35+40+40+40+30+40 = 475, approx 484 with teachers counted as students in some groups
  const projectId = projResult.insertId;
  console.log('✅ Project created, id=', projectId);

  // ─── 2. 创建批次 ───────────────────────────────────────────
  // 批次1: P1+P2, 香港进, 7/1-7/6
  // 批次2: P3+P4, 深圳进, 7/2-7/7
  // 批次3: P5+S1+P6+P7, 香港进(P5/S1) + 深圳进(P6/P7), 7/6-7/11
  // 批次4: S2+S3+S4+S5+P8, 混合, 7/9-7/14
  const batches = [
    { code: '批次1', name: '批次一（P1+P2）', projectId, startDate: '2026-07-01', endDate: '2026-07-06', notes: '香港進，小學' },
    { code: '批次2', name: '批次二（P3+P4）', projectId, startDate: '2026-07-02', endDate: '2026-07-07', notes: '深圳進，小學' },
    { code: '批次3', name: '批次三（P5+S1+P6+P7）', projectId, startDate: '2026-07-06', endDate: '2026-07-11', notes: '混合，小學+中學' },
    { code: '批次4', name: '批次四（S2+S3+S4+S5+P8）', projectId, startDate: '2026-07-09', endDate: '2026-07-14', notes: '混合，中學+小學' },
  ];
  const batchIds = {};
  for (const b of batches) {
    const [r] = await conn.query(
      `INSERT INTO batches (code, name, projectId, arrivalDate, departureDate, notes, createdBy) VALUES (?,?,?,?,?,?,1)`,
      [b.code, b.name, b.projectId, b.startDate, b.endDate, b.notes]
    );
    batchIds[b.code] = r.insertId;
    console.log(`✅ Batch ${b.code} created, id=`, r.insertId);
  }

  // ─── 3. 创建团组 ───────────────────────────────────────────
  // 颜色说明：
  // 香港进小学: #9DC3E6 (浅蓝)
  // 深圳进小学: #BDD7EE (中蓝)  
  // 中学: #FCE4D6 (浅橙，Excel底色)
  // 实际用平台颜色区分批次
  const groups = [
    // 批次1 - 香港进小学
    {
      code: 'P1', name: 'P1 太倉市實驗小學組', projectId, batchId: batchIds['批次1'],
      type: '小學', startDate: '2026-07-01', endDate: '2026-07-06', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '香港', crossingDate: '2026-07-04',
      flightInfo: '小學車號1', color: '#9DC3E6',
      schoolList: '太倉市實驗小學(20) + 蘇州市相城區玉成實驗小學(10) + 蘇州市相城區湘城小學(10)',
      batchCode: '批次1',
    },
    {
      code: 'P2', name: 'P2 常熟市塔前小學組', projectId, batchId: batchIds['批次1'],
      type: '小學', startDate: '2026-07-01', endDate: '2026-07-06', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '香港', crossingDate: '2026-07-04',
      flightInfo: '小學車號2', color: '#9DC3E6',
      schoolList: '常熟市塔前小學(20) + 蘇州市實驗小學校(20)',
      batchCode: '批次1',
    },
    // 批次2 - 深圳进小学
    {
      code: 'P3', name: 'P3 蘇州工業園區金雞湖學校組', projectId, batchId: batchIds['批次2'],
      type: '小學', startDate: '2026-07-02', endDate: '2026-07-07', days: 6,
      studentCount: 30, teacherCount: 3, totalCount: 33,
      startCity: '深圳', crossingDate: '2026-07-05',
      flightInfo: '小學車號3', color: '#BDD7EE',
      schoolList: '蘇州工業園區金雞湖學校(30)',
      batchCode: '批次2',
    },
    {
      code: 'P4', name: 'P4 蘇州工業園區星灣學校組', projectId, batchId: batchIds['批次2'],
      type: '小學', startDate: '2026-07-02', endDate: '2026-07-07', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '深圳', crossingDate: '2026-07-05',
      flightInfo: '小學車號4', color: '#BDD7EE',
      schoolList: '蘇州工業園區星灣學校(20) + 蘇州高新區文正小學教育集團(20)',
      batchCode: '批次2',
    },
    // 批次3 - 混合
    {
      code: 'P5', name: 'P5 吳中區蘇苑實驗小學組', projectId, batchId: batchIds['批次3'],
      type: '小學', startDate: '2026-07-06', endDate: '2026-07-11', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '香港', crossingDate: '2026-07-09',
      flightInfo: '小學車號5', color: '#70AD47',
      schoolList: '吳中區蘇苑實驗小學(20) + 蘇州工業園區星洲小學(10) + 蘇州大學第二實驗學校(10)',
      batchCode: '批次3',
    },
    {
      code: 'S1', name: 'S1 張家港第一中學組', projectId, batchId: batchIds['批次3'],
      type: '中學', startDate: '2026-07-06', endDate: '2026-07-11', days: 6,
      studentCount: 30, teacherCount: 3, totalCount: 33,
      startCity: '香港', crossingDate: '2026-07-09',
      flightInfo: '中學車號1', color: '#ED7D31',
      schoolList: '張家港第一中學（方潤華）(30)',
      batchCode: '批次3',
    },
    {
      code: 'P6', name: 'P6 蘇州市吳中區寶帶實驗小學組', projectId, batchId: batchIds['批次3'],
      type: '小學', startDate: '2026-07-06', endDate: '2026-07-11', days: 6,
      studentCount: 30, teacherCount: 3, totalCount: 33,
      startCity: '深圳', crossingDate: '2026-07-08',
      flightInfo: '小學車號6', color: '#70AD47',
      schoolList: '蘇州市吳中區寶帶實驗小學(20) + 南京師範大學吳江實驗小學(10)',
      batchCode: '批次3',
    },
    {
      code: 'P7', name: 'P7 蘇州工業園區文萃小學組', projectId, batchId: batchIds['批次3'],
      type: '小學', startDate: '2026-07-06', endDate: '2026-07-11', days: 6,
      studentCount: 35, teacherCount: 3, totalCount: 38,
      startCity: '深圳', crossingDate: '2026-07-08',
      flightInfo: '小學車號7', color: '#70AD47',
      schoolList: '蘇州工業園區文萃小學(25) + 昆山開發區震川小學(10)',
      batchCode: '批次3',
    },
    // 批次4 - 混合
    {
      code: 'S2', name: 'S2 西安交通大學蘇州附屬初級中學組', projectId, batchId: batchIds['批次4'],
      type: '中學', startDate: '2026-07-09', endDate: '2026-07-14', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '香港', crossingDate: '2026-07-12',
      flightInfo: '中學車號2', color: '#4472C4',
      schoolList: '西安交通大學蘇州附屬初級中學(20) + 江蘇省蘇州中學園區校(20)',
      batchCode: '批次4',
    },
    {
      code: 'S3', name: 'S3 蘇州市立達中學校組', projectId, batchId: batchIds['批次4'],
      type: '中學', startDate: '2026-07-09', endDate: '2026-07-14', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '香港', crossingDate: '2026-07-12',
      flightInfo: '中學車號3', color: '#4472C4',
      schoolList: '蘇州市立達中學校(30) + 蘇州市滄浪中學校(10)',
      batchCode: '批次4',
    },
    {
      code: 'S4', name: 'S4 蘇州工業園區東沙湖實驗中學組', projectId, batchId: batchIds['批次4'],
      type: '中學', startDate: '2026-07-09', endDate: '2026-07-14', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '深圳', crossingDate: '2026-07-11',
      flightInfo: '中學車號4', color: '#4472C4',
      schoolList: '蘇州工業園區東沙湖實驗中學(20) + 相城中學(20)',
      batchCode: '批次4',
    },
    {
      code: 'S5', name: 'S5 蘇州市相城區黃橋中學組', projectId, batchId: batchIds['批次4'],
      type: '中學', startDate: '2026-07-09', endDate: '2026-07-14', days: 6,
      studentCount: 30, teacherCount: 3, totalCount: 33,
      startCity: '深圳', crossingDate: '2026-07-11',
      flightInfo: '中學車號5', color: '#4472C4',
      schoolList: '蘇州市相城區黃橋中學(10) + 蘇州市吳中區城西中學(20)',
      batchCode: '批次4',
    },
    {
      code: 'P8', name: 'P8 高新區實驗小學校組', projectId, batchId: batchIds['批次4'],
      type: '小學', startDate: '2026-07-09', endDate: '2026-07-14', days: 6,
      studentCount: 40, teacherCount: 4, totalCount: 44,
      startCity: '深圳', crossingDate: '2026-07-11',
      flightInfo: '小學車號8', color: '#FFC000',
      schoolList: '高新區實驗小學校(40)',
      batchCode: '批次4',
    },
  ];

  const groupIds = {};
  for (const g of groups) {
    const typeJson = JSON.stringify([g.type]);
    const flightInfoJson = JSON.stringify({ arrivalFlight: g.flightInfo });
    const schoolListJson = JSON.stringify(
      g.schoolList.split(' + ').map(s => {
        const m = s.match(/^(.+?)\((\d+)\)$/);
        return m ? { name: m[1], studentCount: parseInt(m[2]) } : { name: s, studentCount: 0 };
      })
    );
    const [r] = await conn.query(
      `INSERT INTO \`groups\` (code, name, projectId, batch_id, batch_code, type, startDate, endDate, days, studentCount, teacherCount, totalCount, start_city, crossing_date, flight_info, color, school_list, status, createdBy)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'preparing',1)`,
      [g.code, g.name, g.projectId, g.batchId, g.batchCode, typeJson, g.startDate, g.endDate, g.days,
       g.studentCount, g.teacherCount, g.totalCount, g.startCity, g.crossingDate,
       flightInfoJson, g.color, schoolListJson]
    );
    groupIds[g.code] = r.insertId;
    console.log(`✅ Group ${g.code} created, id=`, r.insertId);
  }

  // ─── 4. 创建排程色块 ───────────────────────────────────────
  // 颜色含义（平台色块类型）：
  // FF9DC3E6 = 香港 → type: 'hk'
  // FF1F4E79 = 交流日 → type: 'exchange'  
  // FFBDD7EE = 深圳 → type: 'sz'
  // FFFFE699 = 过关 → type: 'crossing'
  // FFFFF2CC / FFFCE4D6 = 空 → 不插入

  // 日期列表：7/1-7/15
  const dates = [];
  for (let d = 1; d <= 15; d++) {
    dates.push(`2026-07-${String(d).padStart(2,'0')}`);
  }

  // 颜色 → 色块类型映射
  // blockType 枚举值映射
  // 香港进：D1抵达香港(hk_arrive), D2交流(exchange), D3香港(hk_stay), D4过关(border_hk_sz), D5深圳(sz_stay), D6深圳(sz_stay)
  // 深圳进：D1抵达深圳(sz_arrive), D2深圳(sz_stay), D3过关(border_sz_hk), D4香港(hk_stay), D5交流(exchange), D6香港(hk_stay)
  // 但Excel颜色只区分4种，我们按颜色映射到最接近的blockType
  const colorTypeMap = {
    'FF9DC3E6': 'hk_stay',       // 香港（浅蓝）
    'FF1F4E79': 'exchange',      // 交流日（深蓝）
    'FFBDD7EE': 'sz_stay',       // 深圳（中蓝）
    'FFFFE699': 'border_hk_sz',  // 过关（黄）- 默认港→深，后面按团组调整
  };
  const colorLabelMap = {
    'FF9DC3E6': '香港',
    'FF1F4E79': '交流★',
    'FFBDD7EE': '深圳',
    'FFFFE699': '過關',
  };
  // 深圳进团组（过关方向是深→港）
  const szGroups = new Set(['P3','P4','P6','P7','S2','S3','S4','S5','P8']);
  // 色块颜色（用于显示）
  const displayColorMap = {
    'FF9DC3E6': '#9DC3E6',
    'FF1F4E79': '#1F4E79',
    'FFBDD7EE': '#BDD7EE',
    'FFFFE699': '#FFE699',
  };

  // 从Excel解析的原始颜色数据（每行15个，对应7/1-7/15）
  const rawSchedule = {
    'P1': ['FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFE699','FFBDD7EE','FFBDD7EE','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P2': ['FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFE699','FFBDD7EE','FFBDD7EE','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P3': ['FFFFF2CC','FFBDD7EE','FFBDD7EE','FFFFE699','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P4': ['FFFFF2CC','FFBDD7EE','FFBDD7EE','FFFFE699','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P5': ['FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FF9DC3E6','FF9DC3E6','FF1F4E79','FFFFE699','FFBDD7EE','FFBDD7EE','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'S1': ['FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FF9DC3E6','FF9DC3E6','FF1F4E79','FFFFE699','FFBDD7EE','FFBDD7EE','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P6': ['FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFBDD7EE','FFBDD7EE','FFFFE699','FF1F4E79','FF9DC3E6','FF9DC3E6','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'P7': ['FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFBDD7EE','FFBDD7EE','FFFFE699','FF1F4E79','FF9DC3E6','FF9DC3E6','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC','FFFFF2CC'],
    'S2': ['FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFBDD7EE','FFBDD7EE','FFFFE699','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFCE4D6'],
    'S3': ['FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFBDD7EE','FFBDD7EE','FFFFE699','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFCE4D6'],
    'S4': ['FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFE699','FFBDD7EE','FFBDD7EE','FFFCE4D6'],
    'S5': ['FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFE699','FFBDD7EE','FFBDD7EE','FFFCE4D6'],
    'P8': ['FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FFFCE4D6','FF9DC3E6','FF1F4E79','FF9DC3E6','FFFFE699','FFBDD7EE','FFBDD7EE','FFFCE4D6'],
  };

  let blockCount = 0;
  for (const [code, colors] of Object.entries(rawSchedule)) {
    const groupId = groupIds[code];
    if (!groupId) continue;
    for (let i = 0; i < 15; i++) {
      const color = colors[i];
      let blockType = colorTypeMap[color];
      if (!blockType) continue; // 跳过空白
      // 修正过关方向：深圳进团组过关是深→港
      if (color === 'FFFFE699' && szGroups.has(code)) {
        blockType = 'border_sz_hk';
      }
      // 修正抵达日：每个团组第一个有效色块改为抵达类型
      const date = dates[i];
      const label = colorLabelMap[color];
      const displayColor = displayColorMap[color];
      // 判断是否是交流日
      const isExchangeDay = color === 'FF1F4E79';
      // 住宿城市
      let hotelCity = null;
      if (color === 'FF9DC3E6' || color === 'FF1F4E79') hotelCity = 'hk';
      else if (color === 'FFBDD7EE') hotelCity = 'sz';
      else if (color === 'FFFFE699') hotelCity = szGroups.has(code) ? 'hk' : 'sz'; // 过关后住对岸
      await conn.query(
        `INSERT INTO scheduleBlocks (groupId, date, blockType, isExchangeDay, hotelCity, notes)
         VALUES (?,?,?,?,?,?)`,
        [groupId, date, blockType, isExchangeDay ? 1 : 0, hotelCity, '']
      );
      blockCount++;
    }
  }
  console.log(`✅ Schedule blocks created: ${blockCount} blocks`);

  // ─── 5. 创建行程模板（按图片中的行程点） ──────────────────
  // 香港进小学行程：
  // D1: 落地+大学  D2: 姊妹校+太空馆+维港  D3: 海洋公园
  // D4: 叮叮车+过关+比亚迪  D5: 华大基因+基因库  D6: 莲花山+深圳飞
  //
  // 香港进中学行程：
  // D1: 落地+大学+叮叮车  D2: 姊妹校+环保课程+维港  D3: 海洋公园
  // D4: 过关+南方科技大参观+课程  D5: 华大基因+机器人展示馆艺术馆  D6: 莲花山+深圳飞
  //
  // 深圳进小学行程：
  // D1: 落地+莲花山  D2: 华大基因+基因库  D3: 比亚迪+过关+叮叮车
  // D4: 姊妹学校+太空馆+维港  D5: 海洋公园  D6: 大学+香港飞
  //
  // 深圳进中学行程：
  // D1: 落地+莲花山  D2: 华大基因+机器人展示馆艺术馆  D3: 南方科技大学+课程
  // D4: 过关+环保课程+维港  D5: 海洋公园  D6: 大学+香港飞

  // 为每个团组创建行程记录（按日期）
  const itineraryData = {
    // 香港进小学 (P1, P2)
    'HK_PRIMARY': [
      { day: 1, label: 'D1', activities: '落地 + 大學參觀' },
      { day: 2, label: 'D2', activities: '姊妹校交流 + 太空館 + 維港遊' },
      { day: 3, label: 'D3', activities: '海洋公園' },
      { day: 4, label: 'D4', activities: '叮叮車 + 過關 + 比亞迪參觀' },
      { day: 5, label: 'D5', activities: '華大基因 + 基因庫參觀' },
      { day: 6, label: 'D6', activities: '蓮花山 + 深圳飛' },
    ],
    // 香港进中学 (S1)
    'HK_SECONDARY': [
      { day: 1, label: 'D1', activities: '落地 + 大學參觀 + 叮叮車' },
      { day: 2, label: 'D2', activities: '姊妹校交流 + 環保課程 + 維港遊' },
      { day: 3, label: 'D3', activities: '海洋公園' },
      { day: 4, label: 'D4', activities: '過關 + 南方科技大學參觀 + 課程' },
      { day: 5, label: 'D5', activities: '華大基因 + 機器人展示館 + 藝術館' },
      { day: 6, label: 'D6', activities: '蓮花山 + 深圳飛' },
    ],
    // 深圳进小学 (P3, P4, P6, P7, P8)
    'SZ_PRIMARY': [
      { day: 1, label: 'D1', activities: '落地 + 蓮花山' },
      { day: 2, label: 'D2', activities: '華大基因 + 基因庫參觀' },
      { day: 3, label: 'D3', activities: '比亞迪參觀 + 過關 + 叮叮車' },
      { day: 4, label: 'D4', activities: '姊妹學校交流 + 太空館 + 維港遊' },
      { day: 5, label: 'D5', activities: '海洋公園' },
      { day: 6, label: 'D6', activities: '大學參觀 + 香港飛' },
    ],
    // 深圳进中学 (S2, S3, S4, S5)
    'SZ_SECONDARY': [
      { day: 1, label: 'D1', activities: '落地 + 蓮花山' },
      { day: 2, label: 'D2', activities: '華大基因 + 機器人展示館 + 藝術館' },
      { day: 3, label: 'D3', activities: '南方科技大學參觀 + 課程' },
      { day: 4, label: 'D4', activities: '過關 + 環保課程 + 維港遊' },
      { day: 5, label: 'D5', activities: '海洋公園' },
      { day: 6, label: 'D6', activities: '大學參觀 + 香港飛' },
    ],
  };

  // 团组 → 行程模板映射
  const groupItineraryMap = {
    'P1': 'HK_PRIMARY', 'P2': 'HK_PRIMARY',
    'P3': 'SZ_PRIMARY', 'P4': 'SZ_PRIMARY',
    'P5': 'HK_PRIMARY', 'S1': 'HK_SECONDARY',
    'P6': 'SZ_PRIMARY', 'P7': 'SZ_PRIMARY',
    'S2': 'SZ_SECONDARY', 'S3': 'SZ_SECONDARY',
    'S4': 'SZ_SECONDARY', 'S5': 'SZ_SECONDARY',
    'P8': 'SZ_PRIMARY',
  };

  let itinCount = 0;
  for (const [code, templateKey] of Object.entries(groupItineraryMap)) {
    const groupId = groupIds[code];
    if (!groupId) continue;
    const g = groups.find(x => x.code === code);
    const template = itineraryData[templateKey];
    const startDateObj = new Date(g.startDate + 'T00:00:00');
    
    for (const item of template) {
      const dateObj = new Date(startDateObj);
      dateObj.setDate(dateObj.getDate() + item.day - 1);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      await conn.query(
        `INSERT INTO itineraries (groupId, date, dayNumber, locationName, description, notes, sortOrder)
         VALUES (?,?,?,?,?,?,?)`,
        [groupId, dateStr, item.day, item.label, item.activities, '', item.day]
      );
      itinCount++;
    }
  }
  console.log(`✅ Itineraries created: ${itinCount} records`);

  console.log('\n🎉 All real data imported successfully!');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Batches: ${Object.keys(batchIds).length}`);
  console.log(`   Groups: ${Object.keys(groupIds).length}`);
  console.log(`   Schedule blocks: ${blockCount}`);
  console.log(`   Itineraries: ${itinCount}`);
}

try {
  await run();
} catch (e) {
  console.error('❌ Error:', e.message);
  console.error(e);
} finally {
  await conn.end();
}
