import mysql from 'mysql2/promise';

const PROJECT_ID = 90002;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. 姊妹学校（exchangeSchools）- 字段: id(auto), name, city, address, contactName, contactPhone, contactEmail, notes
  const sisterSchoolsList = [
    '中华基督教会何福堂小学',
    '中华基督教会元朗真光小学',
    '中华基督教会蒙黄花沃纪念小学',
    '中华基督教会基慧小学',
    '中华基督教会基慧小学(马湾)',
    '主恩小学',
    '中华基督教会协和小学',
    '中华基督教会协和小学(长沙湾)',
    '中华基督教会基真小学',
    '中华基督教会基全小学',
    '中华基督教会方润华中学',
    '中华基督教会全完第二小学',
    '中华基督教会全完第一小学',
    '中华基督教会基慈小学',
    '真铎学校',
    '中华基督教会何福堂书院',
    '中华基督教会燕京书院',
    '中华基督教会协和书院',
    '中华基督教会基协中学',
    '中华基督教会基湾小学（爱蝶湾）',
    '真光女书院',
    '中华基督教会基智中学',
    '中华基督教会基朗中学',
    '中华基督教会基元中学',
  ];

  const schoolIdMap = {};
  for (const name of sisterSchoolsList) {
    const [result] = await conn.execute(
      `INSERT INTO exchangeSchools (name, city, address, createdAt, updatedAt) VALUES (?, '香港', '香港', NOW(), NOW())`,
      [name]
    );
    schoolIdMap[name] = result.insertId;
  }
  console.log('✅ 姊妹学校已插入:', Object.keys(schoolIdMap).length, '所');

  // 2. 前来交流学校（domesticSchools）- 字段: id(auto), name, address, studentCount, teacherCount, contactName, contactPhone, contactEmail, notes
  const domesticList = [
    { name: '太倉市實驗小學', studentCount: 20, teacherCount: 2 },
    { name: '蘇州市相城區玉成實驗小學', studentCount: 10, teacherCount: 1 },
    { name: '蘇州市相城區湘城小學', studentCount: 10, teacherCount: 1 },
    { name: '常熟市塔前小學', studentCount: 20, teacherCount: 2 },
    { name: '蘇州市實驗小學校', studentCount: 20, teacherCount: 2 },
    { name: '高新區實驗小學校', studentCount: 40, teacherCount: 4 },
    { name: '蘇州工業園區星灣學校', studentCount: 20, teacherCount: 2 },
    { name: '蘇州高新區文正小學教育集團', studentCount: 20, teacherCount: 2 },
    { name: '吳中區蘇苑實驗小學', studentCount: 20, teacherCount: 2 },
    { name: '蘇州工業園區星洲小學', studentCount: 10, teacherCount: 1 },
    { name: '蘇州大學第二實驗學校', studentCount: 10, teacherCount: 1 },
    { name: '张家港市第一中学', studentCount: 30, teacherCount: 3 },
    { name: '蘇州市吳中區寶帶實驗小學', studentCount: 20, teacherCount: 2 },
    { name: '南京師範大學吳江實驗小學', studentCount: 10, teacherCount: 1 },
    { name: '蘇州工業園區文萃小學', studentCount: 25, teacherCount: 2 },
    { name: '昆山開發區震川小學', studentCount: 10, teacherCount: 1 },
    { name: '西安交通大學蘇州附屬初級中學', studentCount: 20, teacherCount: 2 },
    { name: '江蘇省蘇州中學園區校', studentCount: 20, teacherCount: 2 },
    { name: '蘇州市立達中學校', studentCount: 30, teacherCount: 3 },
    { name: '蘇州市滄浪中學校', studentCount: 10, teacherCount: 1 },
    { name: '蘇州工業園區金雞湖學校', studentCount: 30, teacherCount: 1 },
    { name: '蘇州工業園區東沙湖實驗中學', studentCount: 20, teacherCount: 2 },
    { name: '相城中學', studentCount: 20, teacherCount: 2 },
    { name: '蘇州市相城區黃橋中學', studentCount: 10, teacherCount: 1 },
    { name: '蘇州市吳中區城西中學', studentCount: 20, teacherCount: 2 },
  ];

  for (const s of domesticList) {
    await conn.execute(
      `INSERT INTO domesticSchools (name, studentCount, teacherCount, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
      [s.name, s.studentCount, s.teacherCount]
    );
  }
  console.log('✅ 前来交流学校已插入:', domesticList.length, '所');

  // 3. 批次（batches）- 字段: id(auto), projectId, code, name, arrivalDate, departureDate, arrivalFlight, departureFlight, arrivalTime, departureTime, notes
  const batchesData = [
    { code: '批次1', name: '批次一', arrivalDate: '2026-07-01', departureDate: '2026-07-06', arrivalFlight: 'FM811/MU507', departureFlight: 'MU5350/FM9334', arrivalTime: '12:45', departureTime: '21:00', notes: '上海浦东→香港(FM811 09:40-12:45 / MU507 11:10-14:05)，深圳→上海虹桥(MU5350 18:30-21:00 / FM9334 17:30-20:05)' },
    { code: '批次2', name: '批次二', arrivalDate: '2026-07-02', departureDate: '2026-07-07', arrivalFlight: 'MU5337/FM9333', departureFlight: 'MU508/MU510', arrivalTime: '14:30', departureTime: '19:30', notes: '上海虹桥→深圳(MU5337 12:00-14:30 / FM9333 12:55-15:30)，香港→上海浦东(MU508 15:05-17:45 / MU510 17:05-19:30)' },
    { code: '批次3', name: '批次三', arrivalDate: '2026-07-06', departureDate: '2026-07-11', arrivalFlight: 'FM811/MU507', departureFlight: 'MU5346/FM9334', arrivalTime: '12:45', departureTime: '20:05', notes: '上海浦东→香港(FM811 09:40-12:45 / MU507 11:10-14:05)，深圳→上海虹桥(MU5346 16:30-19:00 / FM9334 17:30-20:05)' },
    { code: '批次4', name: '批次四', arrivalDate: '2026-07-06', departureDate: '2026-07-11', arrivalFlight: 'FM9331/MU533', departureFlight: 'MU508/MU510', arrivalTime: '11:45', departureTime: '19:30', notes: '上海→深圳(FM9331虹桥 08:05-10:30 / MU533浦东 09:10-11:45)，香港→上海浦东(MU508 15:05-17:45 / MU510 17:05-19:30)' },
    { code: '批次5', name: '批次五', arrivalDate: '2026-07-09', departureDate: '2026-07-14', arrivalFlight: 'FM811/MU507', departureFlight: 'MU5346/FM9334', arrivalTime: '12:45', departureTime: '20:05', notes: '上海浦东→香港(FM811 09:40-12:45 / MU507 11:10-14:05)，深圳→上海虹桥(MU5346 16:30-19:00 / FM9334 17:30-20:05)' },
    { code: '批次6', name: '批次六', arrivalDate: '2026-07-10', departureDate: '2026-07-15', arrivalFlight: 'MU5333/MU5331', departureFlight: 'MU508/MU510', arrivalTime: '11:30', departureTime: '19:30', notes: '上海→深圳(MU5333虹桥 09:00-11:30 / MU5331浦东 09:10-11:45)，香港→上海浦东(MU508 15:05-17:45 / MU510 17:05-19:30)' },
  ];

  const batchIdMap = {};
  for (const b of batchesData) {
    const [result] = await conn.execute(
      `INSERT INTO batches (projectId, code, name, arrivalDate, departureDate, arrivalFlight, departureFlight, arrivalTime, departureTime, notes, createdBy, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [PROJECT_ID, b.code, b.name, b.arrivalDate, b.departureDate, b.arrivalFlight, b.departureFlight, b.arrivalTime, b.departureTime, b.notes]
    );
    batchIdMap[b.code] = result.insertId;
    console.log(`  ✅ 批次 ${b.code} (id=${result.insertId})`);
  }
  console.log('✅ 批次已插入:', batchesData.length, '个');

  // 4. 团组（groups）
  const groupsData = [
    // 批次1 - 抵港
    { code: 'P1', name: 'P1 太倉市實驗小學組', batchCode: '批次1', startDate: '2026-07-01', endDate: '2026-07-06', days: 6, type: ['小學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'hk', crossingDate: '2026-07-04', color: '#3B82F6', exchangeDate: '2026-07-02',
      schools: [
        { name: '太倉市實驗小學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会何福堂小学'], timeSlot: '上午' },
        { name: '蘇州市相城區玉成實驗小學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会元朗真光小学'], timeSlot: '上午' },
        { name: '蘇州市相城區湘城小學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会蒙黄花沃纪念小学'], timeSlot: '上午' },
      ]},
    { code: 'P2', name: 'P2 常熟市塔前小學組', batchCode: '批次1', startDate: '2026-07-01', endDate: '2026-07-06', days: 6, type: ['小學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'hk', crossingDate: '2026-07-04', color: '#3B82F6', exchangeDate: '2026-07-02',
      schools: [
        { name: '常熟市塔前小學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会基慧小学'], timeSlot: '上午' },
        { name: '蘇州市實驗小學校', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会基慧小学(马湾)'], timeSlot: '上午' },
      ]},
    // 批次2 - 抵深
    { code: 'P3', name: 'P3 高新區實驗小學組', batchCode: '批次2', startDate: '2026-07-02', endDate: '2026-07-07', days: 6, type: ['小學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'sz', crossingDate: '2026-07-05', color: '#10B981', exchangeDate: '2026-07-06',
      schools: [
        { name: '高新區實驗小學校', studentCount: 40, teacherCount: 4, exchangeSchoolId: schoolIdMap['主恩小学'], timeSlot: '上午' },
      ]},
    { code: 'P4', name: 'P4 蘇州工業園區星灣學校組', batchCode: '批次2', startDate: '2026-07-02', endDate: '2026-07-07', days: 6, type: ['小學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'sz', crossingDate: '2026-07-05', color: '#10B981', exchangeDate: '2026-07-06',
      schools: [
        { name: '蘇州工業園區星灣學校', studentCount: 20, teacherCount: 2, exchangeSchoolId: null, timeSlot: '上午' },
        { name: '蘇州高新區文正小學教育集團', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会协和小学'], timeSlot: '上午' },
      ]},
    // 批次3 - 抵港
    { code: 'P5', name: 'P5 吳中區蘇苑實驗小學組', batchCode: '批次3', startDate: '2026-07-06', endDate: '2026-07-11', days: 6, type: ['小學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'hk', crossingDate: '2026-07-09', color: '#F59E0B', exchangeDate: '2026-07-08',
      schools: [
        { name: '吳中區蘇苑實驗小學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会协和小学(长沙湾)'], timeSlot: '上午' },
        { name: '蘇州工業園區星洲小學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会基真小学'], timeSlot: '上午' },
        { name: '蘇州大學第二實驗學校', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会基全小学'], timeSlot: '上午' },
      ]},
    { code: 'S1', name: 'S1 张家港市第一中学組', batchCode: '批次3', startDate: '2026-07-06', endDate: '2026-07-11', days: 6, type: ['中學'], studentCount: 30, teacherCount: 3, totalCount: 33, startCity: 'hk', crossingDate: '2026-07-09', color: '#F59E0B', exchangeDate: '2026-07-08',
      schools: [
        { name: '张家港市第一中学', studentCount: 30, teacherCount: 3, exchangeSchoolId: schoolIdMap['中华基督教会方润华中学'], timeSlot: '上午' },
      ]},
    // 批次4 - 抵深
    { code: 'P6', name: 'P6 蘇州市吳中區寶帶實驗小學組', batchCode: '批次4', startDate: '2026-07-06', endDate: '2026-07-11', days: 6, type: ['小學'], studentCount: 30, teacherCount: 3, totalCount: 33, startCity: 'sz', crossingDate: '2026-07-08', color: '#EF4444', exchangeDate: '2026-07-09',
      schools: [
        { name: '蘇州市吳中區寶帶實驗小學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会基慈小学'], timeSlot: '上午' },
        { name: '南京師範大學吳江實驗小學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['真铎学校'], timeSlot: '上午' },
      ]},
    { code: 'P7', name: 'P7 蘇州工業園區文萃小學組', batchCode: '批次4', startDate: '2026-07-06', endDate: '2026-07-11', days: 6, type: ['小學'], studentCount: 35, teacherCount: 3, totalCount: 38, startCity: 'sz', crossingDate: '2026-07-08', color: '#EF4444', exchangeDate: '2026-07-09',
      schools: [
        { name: '蘇州工業園區文萃小學', studentCount: 25, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会全完第二小学'], timeSlot: '上午' },
        { name: '昆山開發區震川小學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会全完第一小学'], timeSlot: '上午' },
      ]},
    // 批次5 - 抵港
    { code: 'S2', name: 'S2 西安交通大學蘇州附屬初級中學組', batchCode: '批次5', startDate: '2026-07-09', endDate: '2026-07-14', days: 6, type: ['中學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'hk', crossingDate: '2026-07-12', color: '#8B5CF6', exchangeDate: '2026-07-10',
      schools: [
        { name: '西安交通大學蘇州附屬初級中學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会何福堂书院'], timeSlot: '上午' },
        { name: '江蘇省蘇州中學園區校', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会燕京书院'], timeSlot: '上午' },
      ]},
    { code: 'S3', name: 'S3 蘇州市立達中學校組', batchCode: '批次5', startDate: '2026-07-09', endDate: '2026-07-14', days: 6, type: ['中學'], studentCount: 40, teacherCount: 4, totalCount: 44, startCity: 'hk', crossingDate: '2026-07-12', color: '#8B5CF6', exchangeDate: '2026-07-10',
      schools: [
        { name: '蘇州市立達中學校', studentCount: 30, teacherCount: 3, exchangeSchoolId: schoolIdMap['中华基督教会协和书院'], timeSlot: '上午' },
        { name: '蘇州市滄浪中學校', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会基协中学'], timeSlot: '上午' },
      ]},
    // 批次6 - 抵深
    { code: 'S4', name: 'S4 蘇州工業園區金雞湖學校組', batchCode: '批次6', startDate: '2026-07-10', endDate: '2026-07-15', days: 6, type: ['中學'], studentCount: 48, teacherCount: 3, totalCount: 51, startCity: 'sz', crossingDate: '2026-07-12', color: '#EC4899', exchangeDate: '2026-07-13',
      schools: [
        { name: '蘇州工業園區金雞湖學校', studentCount: 30, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会基湾小学（爱蝶湾）'], timeSlot: '上午' },
        { name: '蘇州工業園區東沙湖實驗中學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['真光女书院'], timeSlot: '上午' },
      ]},
    { code: 'S5', name: 'S5 相城中學組', batchCode: '批次6', startDate: '2026-07-10', endDate: '2026-07-15', days: 6, type: ['中學'], studentCount: 47, teacherCount: 5, totalCount: 52, startCity: 'sz', crossingDate: '2026-07-12', color: '#EC4899', exchangeDate: '2026-07-13',
      schools: [
        { name: '相城中學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会基智中学'], timeSlot: '上午' },
        { name: '蘇州市相城區黃橋中學', studentCount: 10, teacherCount: 1, exchangeSchoolId: schoolIdMap['中华基督教会基朗中学'], timeSlot: '上午' },
        { name: '蘇州市吳中區城西中學', studentCount: 20, teacherCount: 2, exchangeSchoolId: schoolIdMap['中华基督教会基元中学'], timeSlot: '上午' },
      ]},
  ];

  for (const g of groupsData) {
    const batchId = batchIdMap[g.batchCode];
    const tags = JSON.stringify({ exchangeDate: g.exchangeDate });
    const schoolList = JSON.stringify(g.schools);
    await conn.execute(
      `INSERT INTO \`groups\` (projectId, name, code, startDate, endDate, days, type, status, 
        studentCount, teacherCount, totalCount, color, tags, batch_id, batch_code, start_city, 
        crossing_date, school_list, createdBy, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'preparing', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        PROJECT_ID, g.name, g.code, g.startDate, g.endDate, g.days,
        JSON.stringify(g.type), g.studentCount, g.teacherCount, g.totalCount,
        g.color, tags, batchId, g.batchCode, g.startCity,
        g.crossingDate, schoolList
      ]
    );
    console.log(`  ✅ 团组 ${g.code} (${g.name})`);
  }
  console.log('✅ 团组已插入:', groupsData.length, '个');

  await conn.end();
  console.log('\n🎉 所有真实数据填充完成！');
}

main().catch(e => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});
