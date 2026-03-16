/**
 * 為現有測試團組生成 dailyCards 測試數據
 * 根據圖片行程表：香港進小學/中學、深圳進小學/中學 4種模板
 * 運行：node scripts/seed-daily-cards.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// 查詢現有團組
const [groups] = await connection.execute(
  'SELECT id, name, startDate, endDate, type, start_city, batch_code FROM `groups` ORDER BY id'
);

console.log(`找到 ${groups.length} 個團組`);

// 根據 start_city 和 type 決定行程模板
// 行程模板：每天的行程描述
const templates = {
  // 香港進小學
  'hk_primary': [
    { day: 1, morning: '抵達香港國際機場，辦理入境手續，前往酒店', afternoon: '香港大學校園參觀', dinner: '酒店晚餐', hotel: '香港九龍酒店', notes: '注意：攜帶港幣現金，備好港澳通行證' },
    { day: 2, morning: '姊妹學校交流訪問，課堂體驗互動', afternoon: '香港太空館參觀（天象廳）', evening: '維多利亞港海濱漫步', dinner: '尖沙咀餐廳', hotel: '香港九龍酒店', notes: '姊妹校聯絡人：待確認' },
    { day: 3, morning: '香港海洋公園（海洋生物展覽）', afternoon: '香港海洋公園（遊樂設施）', dinner: '海洋公園附近餐廳', hotel: '香港九龍酒店', notes: '全天活動，注意防曬' },
    { day: 4, morning: '叮叮車遊覽港島', afternoon: '深港口岸過關，前往深圳 → 比亞迪工廠參觀', dinner: '深圳酒店晚餐', hotel: '深圳福田酒店', notes: '過關需攜帶身份證，注意時間安排' },
    { day: 5, morning: '華大基因科技園參觀', afternoon: '國家基因庫參觀', dinner: '深圳酒店晚餐', hotel: '深圳福田酒店', notes: '需提前預約，準時到達' },
    { day: 6, morning: '蓮花山公園參觀，俯瞰深圳市區', afternoon: '前往深圳寶安機場，返回蘇州', dinner: '機場餐廳', hotel: '', notes: '航班：待確認，提前3小時到達機場' },
  ],
  // 香港進中學
  'hk_middle': [
    { day: 1, morning: '抵達香港國際機場，辦理入境手續', afternoon: '香港大學校園參觀，與港大學生交流', evening: '叮叮車遊覽港島', dinner: '港島餐廳', hotel: '香港九龍酒店', notes: '注意：攜帶港幣現金' },
    { day: 2, morning: '姊妹學校交流訪問，課堂互動', afternoon: '香港環保教育課程', evening: '維多利亞港夜景欣賞', dinner: '尖沙咀餐廳', hotel: '香港九龍酒店', notes: '環保課程需帶筆記本' },
    { day: 3, morning: '香港海洋公園（海洋生物展覽）', afternoon: '香港海洋公園（遊樂設施）', dinner: '海洋公園附近餐廳', hotel: '香港九龍酒店', notes: '全天活動' },
    { day: 4, morning: '深港口岸過關，前往深圳', afternoon: '南方科技大學校園參觀', evening: '南科大課程體驗，科技前沿講座', dinner: '深圳酒店晚餐', hotel: '深圳南山酒店', notes: '過關需攜帶身份證' },
    { day: 5, morning: '華大基因科技園參觀', afternoon: '機器人技術展示館 → 深圳藝術館', dinner: '深圳酒店晚餐', hotel: '深圳南山酒店', notes: '機器人館有互動體驗' },
    { day: 6, morning: '蓮花山公園參觀', afternoon: '前往深圳寶安機場，返回蘇州', dinner: '機場餐廳', hotel: '', notes: '航班：待確認' },
  ],
  // 深圳進小學
  'sz_primary': [
    { day: 1, morning: '抵達深圳寶安機場，辦理入境手續，前往酒店', afternoon: '蓮花山公園參觀，了解深圳發展歷史', dinner: '深圳酒店晚餐', hotel: '深圳福田酒店', notes: '注意：攜帶人民幣現金' },
    { day: 2, morning: '華大基因科技園參觀', afternoon: '國家基因庫參觀', dinner: '深圳酒店晚餐', hotel: '深圳福田酒店', notes: '需提前預約' },
    { day: 3, morning: '比亞迪新能源汽車工廠參觀', afternoon: '深港口岸過關，前往香港 → 叮叮車遊覽港島', dinner: '香港餐廳', hotel: '香港九龍酒店', notes: '過關需攜帶身份證' },
    { day: 4, morning: '姊妹學校交流訪問，課堂體驗互動', afternoon: '香港太空館參觀（天象廳）', evening: '維多利亞港海濱漫步', dinner: '尖沙咀餐廳', hotel: '香港九龍酒店', notes: '姊妹校聯絡人：待確認' },
    { day: 5, morning: '香港海洋公園（海洋生物展覽）', afternoon: '香港海洋公園（遊樂設施）', dinner: '海洋公園附近餐廳', hotel: '香港九龍酒店', notes: '全天活動，注意防曬' },
    { day: 6, morning: '香港大學校園參觀', afternoon: '前往香港國際機場，返回蘇州', dinner: '機場餐廳', hotel: '', notes: '航班：待確認，提前3小時到達機場' },
  ],
  // 深圳進中學
  'sz_middle': [
    { day: 1, morning: '抵達深圳寶安機場，辦理入境手續', afternoon: '蓮花山公園參觀，了解深圳發展歷史', dinner: '深圳酒店晚餐', hotel: '深圳南山酒店', notes: '注意：攜帶人民幣現金' },
    { day: 2, morning: '華大基因科技園參觀', afternoon: '機器人技術展示館 → 深圳藝術館', dinner: '深圳酒店晚餐', hotel: '深圳南山酒店', notes: '機器人館有互動體驗' },
    { day: 3, morning: '南方科技大學校園參觀', afternoon: '南科大課程體驗，科技前沿講座', dinner: '深圳酒店晚餐', hotel: '深圳南山酒店', notes: '課程需帶筆記本' },
    { day: 4, morning: '深港口岸過關，前往香港', afternoon: '香港環保教育課程', evening: '維多利亞港夜景欣賞', dinner: '尖沙咀餐廳', hotel: '香港九龍酒店', notes: '過關需攜帶身份證' },
    { day: 5, morning: '香港海洋公園（海洋生物展覽）', afternoon: '香港海洋公園（遊樂設施）', dinner: '海洋公園附近餐廳', hotel: '香港九龍酒店', notes: '全天活動' },
    { day: 6, morning: '香港大學校園參觀，與港大學生交流', afternoon: '前往香港國際機場，返回蘇州', dinner: '機場餐廳', hotel: '', notes: '航班：待確認' },
  ],
};

// 餐廳數據（測試用）
const restaurants = {
  hk: {
    breakfast: ['香港茶餐廳（示例）', '酒店自助早餐'],
    lunch: ['香港茶樓點心（示例）', '尖沙咀粵菜館（示例）', '銅鑼灣港式餐廳（示例）'],
    dinner: ['香港九龍酒店餐廳', '尖沙咀海景餐廳（示例）', '旺角特色餐廳（示例）'],
  },
  sz: {
    breakfast: ['深圳酒店自助早餐', '深圳早茶餐廳（示例）'],
    lunch: ['深圳粵菜館（示例）', '福田美食廣場（示例）', '南山科技園餐廳（示例）'],
    dinner: ['深圳福田酒店餐廳', '深圳南山酒店餐廳', '深圳特色餐廳（示例）'],
  },
};

function getTemplateKey(group) {
  const startCity = group.start_city || 'hk';
  let typeArr = [];
  try {
    typeArr = typeof group.type === 'string' ? JSON.parse(group.type) : (group.type || []);
  } catch {}
  const isMiddle = typeArr.some(t => t.includes('中學') || t === 'middle');
  if (startCity === 'hk') return isMiddle ? 'hk_middle' : 'hk_primary';
  return isMiddle ? 'sz_middle' : 'sz_primary';
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let insertedCount = 0;

for (const group of groups) {
  const templateKey = getTemplateKey(group);
  const tpl = templates[templateKey];
  const startDate = group.startDate instanceof Date 
    ? group.startDate.toISOString().split('T')[0]
    : String(group.startDate).split('T')[0];
  
  console.log(`\n處理團組 ID=${group.id} "${group.name}" (${templateKey}), 開始日期: ${startDate}`);
  
  for (let i = 0; i < tpl.length; i++) {
    const dayData = tpl[i];
    const date = addDays(startDate, i);
    // 判斷當天在哪個城市
    const isInHK = templateKey.startsWith('hk') 
      ? (i < 3 || i === 5) // 香港進：前3天在港，D4-D5在深，D6深圳飛
      : (i >= 2 && i < 5); // 深圳進：前2天在深，D3-D5在港，D6香港飛
    const city = isInHK ? 'hk' : 'sz';
    
    const notes = [dayData.morning, dayData.afternoon, dayData.evening].filter(Boolean).join(' → ');
    
    await connection.execute(
      `INSERT INTO dailyCards (groupId, date, breakfastRestaurant, lunchRestaurant, dinnerRestaurant, hotelName, specialNotes, departureCity, arrivalCity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        group.id,
        date,
        randomItem(city === 'hk' ? restaurants.hk.breakfast : restaurants.sz.breakfast),
        randomItem(city === 'hk' ? restaurants.hk.lunch : restaurants.sz.lunch),
        dayData.dinner || randomItem(city === 'hk' ? restaurants.hk.dinner : restaurants.sz.dinner),
        dayData.hotel || null,
        notes + (dayData.notes ? `\n備注：${dayData.notes}` : ''),
        city === 'hk' ? '香港' : '深圳',
        city === 'hk' ? '香港' : '深圳',
      ]
    );
    insertedCount++;
    console.log(`  D${i+1} (${date}): ${notes.substring(0, 50)}...`);
  }
}

await connection.end();
console.log(`\n完成！共插入 ${insertedCount} 條 dailyCards 記錄`);
