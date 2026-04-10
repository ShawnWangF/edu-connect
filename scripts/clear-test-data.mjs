import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('No DATABASE_URL found');
  process.exit(1);
}

// 解析 MySQL URL
const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
if (!match) {
  console.error('Cannot parse DATABASE_URL');
  process.exit(1);
}

const [, user, password, host, port, database] = match;
const sslParam = url.includes('ssl=') ? { rejectUnauthorized: true } : undefined;

const conn = await mysql.createConnection({
  host,
  port: parseInt(port),
  user,
  password,
  database,
  ssl: sslParam,
});

console.log('Connected to database:', database);

// 按照外鍵依賴順序清空（子表先清）
const tables = [
  'pushSubscriptions',
  'batchStaff',
  'batchExchangeSchools',
  'exchangeSchoolAvailability',
  'schoolExchanges',
  'memberStatus',
  'itineraryMembers',
  'notifications',
  'scheduleBlocks',
  'dailyCards',
  'itineraries',
  'groups',
  'batches',
  'snapshots',
  'files',
  'members',
  'staff',
  // 資源庫保留（景點、餐廳、學校等有用數據）
  // 'attractions',
  // 'restaurants',
  // 'exchangeSchools',
  // 'domesticSchools',
  // 'hotels',
  // 'vehicles',
  // 'locations',
  // 'guides',
  // 'securities',
  // 'templates',
  // 'templateItineraries',
  // 'schools',
];

// 禁用外鍵檢查
await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

for (const table of tables) {
  try {
    const [result] = await conn.execute(`DELETE FROM \`${table}\``);
    console.log(`✅ Cleared ${table}: ${result.affectedRows} rows deleted`);
  } catch (err) {
    console.log(`⚠️  ${table}: ${err.message}`);
  }
}

// 重啟外鍵檢查
await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

// 重置 AUTO_INCREMENT（可選）
const resetTables = ['batches', 'groups', 'itineraries', 'dailyCards', 'scheduleBlocks', 'members', 'staff'];
for (const table of resetTables) {
  try {
    await conn.execute(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    console.log(`🔄 Reset AUTO_INCREMENT for ${table}`);
  } catch (err) {
    console.log(`⚠️  Reset ${table}: ${err.message}`);
  }
}

await conn.end();
console.log('\n✅ All test data cleared successfully!');
console.log('📌 Resource tables (attractions, restaurants, schools, etc.) are preserved.');
