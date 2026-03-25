/**
 * 仪表盘测试数据注入脚本
 * 为仪表盘注入：精确行程时间点、工作人员指派、景点容量、餐厅预订
 * 以今天（2026-03-25）为"当前日期"，模拟 P1 团组正在进行中
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ========== 1. 更新 itineraries：为 P1 团组的今日行程添加精确时间 ==========
// 今天是 2026-03-25，我们把 P1 团组的 D2（姊妹校+太空館+維港）设为今天
// 先查询 P1 团组 (id=360001) 的 itineraries
const [itins] = await conn.execute(
  'SELECT id, groupId, date, description FROM itineraries WHERE groupId IN (360001, 360002, 360003) ORDER BY groupId, date LIMIT 20'
);
console.log('Current itineraries for P1/P2/P3:', itins.map(i => `${i.id}:${i.description}`));

// 更新 P1 D1 (id=60001) 为今天，并添加精确时间点
// 先把 P1 的 D1 日期改为今天，这样仪表盘能检测到"正在进行"
const today = '2026-03-25';
const tomorrow = '2026-03-26';

// 更新 P1 团组的行程日期（把整个行程前移到今天开始）
// D1 = 今天 (2026-03-25), D2 = 明天, D3 = 后天...
await conn.execute(`UPDATE itineraries SET date = '2026-03-25', startTime = '08:00', endTime = '12:00', description = '落地接机 + 香港大學參觀', locationName = '香港國際機場 → 香港大學' WHERE id = 60001`);
await conn.execute(`UPDATE itineraries SET date = '2026-03-26', startTime = '09:00', endTime = '16:30', description = '姊妹校交流 + 太空館 + 維港遊', locationName = '培僑書院 → 太空館 → 尖沙咀' WHERE id = 60002`);
await conn.execute(`UPDATE itineraries SET date = '2026-03-27', startTime = '09:30', endTime = '17:00', description = '海洋公園全日遊', locationName = '海洋公園' WHERE id = 60003`);
await conn.execute(`UPDATE itineraries SET date = '2026-03-28', startTime = '09:00', endTime = '18:00', description = '叮叮車體驗 + 過關 + 比亞迪參觀', locationName = '香港島 → 深圳灣口岸 → 比亞迪' WHERE id = 60004`);
await conn.execute(`UPDATE itineraries SET date = '2026-03-29', startTime = '09:00', endTime = '17:00', description = '華大基因 + 基因庫參觀', locationName = '深圳華大基因' WHERE id = 60005`);
await conn.execute(`UPDATE itineraries SET date = '2026-03-30', startTime = '10:00', endTime = '14:00', description = '蓮花山公園 + 深圳飛', locationName = '蓮花山 → 深圳寶安機場' WHERE id = 60006`);

// 更新 P2 团组的行程日期（同批次，同天开始）
const [p2Itins] = await conn.execute('SELECT id FROM itineraries WHERE groupId = 360002 ORDER BY date LIMIT 6');
if (p2Itins.length >= 1) await conn.execute(`UPDATE itineraries SET date = '2026-03-25', startTime = '08:30', endTime = '12:30', description = '落地接机 + 香港大學參觀', locationName = '香港國際機場 → 香港大學' WHERE id = ${p2Itins[0].id}`);
if (p2Itins.length >= 2) await conn.execute(`UPDATE itineraries SET date = '2026-03-26', startTime = '09:00', endTime = '16:30', description = '姊妹校交流 + 太空館 + 維港遊', locationName = '培道中學 → 太空館 → 尖沙咀' WHERE id = ${p2Itins[1].id}`);
if (p2Itins.length >= 3) await conn.execute(`UPDATE itineraries SET date = '2026-03-27', startTime = '09:30', endTime = '17:00', description = '海洋公園全日遊', locationName = '海洋公園' WHERE id = ${p2Itins[2].id}`);

// 更新 P3 团组（第二批次，晚一天开始）
const [p3Itins] = await conn.execute('SELECT id FROM itineraries WHERE groupId = 360003 ORDER BY date LIMIT 6');
if (p3Itins.length >= 1) await conn.execute(`UPDATE itineraries SET date = '2026-03-26', startTime = '09:00', endTime = '13:00', description = '落地接机 + 蓮花山公園', locationName = '深圳寶安機場 → 蓮花山' WHERE id = ${p3Itins[0].id}`);
if (p3Itins.length >= 2) await conn.execute(`UPDATE itineraries SET date = '2026-03-27', startTime = '09:00', endTime = '17:00', description = '華大基因 + 基因庫參觀', locationName = '深圳華大基因' WHERE id = ${p3Itins[1].id}`);
if (p3Itins.length >= 3) await conn.execute(`UPDATE itineraries SET date = '2026-03-28', startTime = '09:30', endTime = '17:30', description = '比亞迪參觀 + 過關 + 叮叮車', locationName = '比亞迪 → 深圳灣口岸 → 香港島' WHERE id = ${p3Itins[2].id}`);

console.log('✅ Itineraries updated with precise times');

// ========== 2. 清空旧的 batchStaff 数据，注入新的工作人员指派 ==========
await conn.execute('DELETE FROM batchStaff');

// 查询工作人员
const [staffRows] = await conn.execute('SELECT id, name, role FROM staff LIMIT 20');
console.log('Staff available:', staffRows.map(s => `${s.id}:${s.name}(${s.role})`).join(', '));

// 为 P1 团组今天的行程指派工作人员
// 假设 staff 有 id: 60001(王珏/staff), 60002(阿聪/staff), 60003(张梓音/staff)
const staffMap = {};
staffRows.forEach(s => { staffMap[s.name] = s.id; });

// P1 今天 (2026-03-25) 落地接机
const p1TodayItinId = 60001;
const batchStaffData = [];

// 为每个团组的今日行程指派工作人员
if (staffRows.length >= 1) {
  batchStaffData.push([360001, staffRows[0].id, 'coordinator', '2026-03-25', p1TodayItinId, '落地接机 + 香港大學參觀', '08:00', '12:00', 'P1团组今日总统筹']);
}
if (staffRows.length >= 2) {
  batchStaffData.push([360001, staffRows[1].id, 'guide', '2026-03-25', p1TodayItinId, '落地接机 + 香港大學參觀', '08:00', '12:00', 'P1团组导游']);
}
if (staffRows.length >= 3) {
  batchStaffData.push([360002, staffRows[2].id, 'coordinator', '2026-03-25', null, '落地接机 + 香港大學參觀', '08:30', '12:30', 'P2团组今日总统筹']);
}
// 明天的行程预指派
if (staffRows.length >= 1) {
  batchStaffData.push([360001, staffRows[0].id, 'coordinator', '2026-03-26', null, '姊妹校交流 + 太空館 + 維港遊', '09:00', '16:30', 'P1团组明日统筹']);
}
if (staffRows.length >= 2) {
  batchStaffData.push([360003, staffRows[1].id, 'guide', '2026-03-26', null, '落地接机 + 蓮花山公園', '09:00', '13:00', 'P3团组导游']);
}

for (const row of batchStaffData) {
  await conn.execute(
    'INSERT INTO batchStaff (groupId, staffId, role, date, itineraryId, taskName, startTime, endTime, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    row
  );
}
console.log(`✅ batchStaff: inserted ${batchStaffData.length} assignments`);

// ========== 3. 更新 attractions 表：添加容量信息 ==========
const [attrCols] = await conn.execute('DESCRIBE attractions');
console.log('Attractions columns:', attrCols.map(c => c.Field).join(', '));

const [existingAttrs] = await conn.execute('SELECT id, name FROM attractions LIMIT 10');
console.log('Existing attractions:', existingAttrs.map(a => `${a.id}:${a.name}`).join(', '));

// 检查是否有 maxCapacity 字段
const hasCapacity = attrCols.some(c => c.Field === 'maxCapacity');
if (!hasCapacity) {
  await conn.execute('ALTER TABLE attractions ADD COLUMN maxCapacity INT DEFAULT 500');
  await conn.execute('ALTER TABLE attractions ADD COLUMN currentVisitors INT DEFAULT 0');
  console.log('✅ Added maxCapacity and currentVisitors columns to attractions');
}

// 清空旧的景点数据并插入新的
await conn.execute('DELETE FROM attractions');
const attractions = [
  ['香港太空館', 300, 180, '尖沙咀梳士巴利道10號', '天文科普展覽，學生最愛'],
  ['海洋公園', 8000, 5200, '香港南區黃竹坑', '主題樂園，含海洋生物展覽'],
  ['香港大學', 500, 120, '香港薄扶林道', '百年學府參觀'],
  ['華大基因深圳總部', 200, 0, '深圳鹽田區北山工業區', '基因科技教育基地'],
  ['比亞迪總部', 300, 0, '深圳坪山區比亞迪路3009號', '新能源汽車工廠參觀'],
  ['蓮花山公園', 2000, 0, '深圳福田區蓮花山', '深圳地標公園'],
  ['維港遊船', 150, 0, '尖沙咀碼頭', '維多利亞港遊船觀光'],
];
for (const [name, maxCap, currentVisitors, address, notes] of attractions) {
  await conn.execute(
    'INSERT INTO attractions (name, maxCapacity, currentVisitors, address, notes, createdBy) VALUES (?, ?, ?, ?, ?, 1)',
    [name, maxCap, currentVisitors, address, notes]
  );
}
console.log(`✅ Attractions: inserted ${attractions.length} records`);

// ========== 4. 更新 restaurants 表：添加预订信息 ==========
const [restCols] = await conn.execute('DESCRIBE restaurants');
console.log('Restaurants columns:', restCols.map(c => c.Field).join(', '));

const hasBookingTime = restCols.some(c => c.Field === 'bookingTime');
if (!hasBookingTime) {
  await conn.execute("ALTER TABLE restaurants ADD COLUMN bookingTime VARCHAR(10) DEFAULT NULL");
  await conn.execute("ALTER TABLE restaurants ADD COLUMN bookingDate DATE DEFAULT NULL");
  await conn.execute("ALTER TABLE restaurants ADD COLUMN bookingGroupId INT DEFAULT NULL");
  await conn.execute("ALTER TABLE restaurants ADD COLUMN bookingPax INT DEFAULT 0");
  console.log('✅ Added booking columns to restaurants');
}

// 清空旧数据并插入新的餐厅预订
await conn.execute('DELETE FROM restaurants');
const restaurants = [
  // [name, address, capacity, bookingDate, bookingTime, bookingGroupId, bookingPax, notes]
  ['翠園酒家（尖沙咀）', '香港九龍尖沙咀漢口道2-20號', 200, '2026-03-25', '12:30', 360001, 45, 'P1团组今日午餐，粤菜'],
  ['金鳳茶餐廳', '香港灣仔軒尼詩道', 80, '2026-03-25', '18:30', 360002, 42, 'P2团组今日晚餐'],
  ['海景軒', '香港尖沙咀海景嘉福洲際酒店', 150, '2026-03-26', '12:00', 360001, 45, 'P1团组明日午餐'],
  ['深圳老街坊', '深圳福田區益田路', 120, '2026-03-26', '18:00', 360003, 38, 'P3团组明日晚餐'],
  ['鏞記酒家', '香港中環威靈頓街32-40號', 300, '2026-03-27', '12:30', 360001, 45, 'P1团组后天午餐'],
  ['海底撈（深圳）', '深圳南山區科技園', 200, '2026-03-27', '18:30', 360003, 38, 'P3团组后天晚餐'],
];
for (const [name, address, capacity, bookingDate, bookingTime, bookingGroupId, bookingPax, notes] of restaurants) {
  await conn.execute(
    'INSERT INTO restaurants (name, address, capacity, bookingDate, bookingTime, bookingGroupId, bookingPax, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
    [name, address, capacity, bookingDate, bookingTime, bookingGroupId, bookingPax, notes]
  );
}
console.log(`✅ Restaurants: inserted ${restaurants.length} records`);

await conn.end();
console.log('\n🎉 Dashboard test data injection complete!');
