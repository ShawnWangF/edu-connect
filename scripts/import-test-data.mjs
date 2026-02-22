/**
 * 導入10月江蘇交流團測試數據
 * 為3個團組（小學組、中學組、高中組）添加示例行程點
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 查詢3個團組的ID
  const [groups] = await conn.query(
    'SELECT id, code, name, startDate FROM `groups` WHERE projectId = 5 ORDER BY id'
  );
  
  console.log('找到團組：', groups.length);
  groups.forEach(g => console.log(`  - ${g.name} (${g.code}): ID=${g.id}, 開始日期=${g.startDate}`));
  
  if (groups.length !== 3) {
    throw new Error('應該有3個團組，但找到了 ' + groups.length + ' 個');
  }
  
  const [xiaoxue, zhongxue, gaozhong] = groups;
  
  // 小學組行程（10/14-10/18）
  const xiaoxueItineraries = [
    { groupId: xiaoxue.id, date: '2024-10-14', dayNumber: 1, startTime: '09:00', endTime: '12:00', locationName: '香港姊妹學校交流', description: '學校交流活動' },
    { groupId: xiaoxue.id, date: '2024-10-14', dayNumber: 1, startTime: '14:00', endTime: '16:00', locationName: '金紫荊廣場', description: '參觀金紫荊廣場' },
    { groupId: xiaoxue.id, date: '2024-10-14', dayNumber: 1, startTime: '17:00', endTime: '19:00', locationName: '太平山頂', description: '乘坐山頂纜車' },
    { groupId: xiaoxue.id, date: '2024-10-15', dayNumber: 2, startTime: '09:00', endTime: '11:00', locationName: '香港航天科普教育基地', description: '航天科普活動' },
    { groupId: xiaoxue.id, date: '2024-10-15', dayNumber: 2, startTime: '14:00', endTime: '16:00', locationName: '星光大道', description: '參觀星光大道' },
    { groupId: xiaoxue.id, date: '2024-10-16', dayNumber: 3, startTime: '10:00', endTime: '12:00', locationName: '香港太空館', description: '參觀太空館' },
    { groupId: xiaoxue.id, date: '2024-10-16', dayNumber: 3, startTime: '14:00', endTime: '16:00', locationName: '香港科學館', description: '參觀科學館' },
    { groupId: xiaoxue.id, date: '2024-10-17', dayNumber: 4, startTime: '09:00', endTime: '12:00', locationName: '澳門科學館', description: '參觀澳門科學館' },
    { groupId: xiaoxue.id, date: '2024-10-17', dayNumber: 4, startTime: '14:00', endTime: '16:00', locationName: '澳門小學交流', description: '學校交流活動' },
    { groupId: xiaoxue.id, date: '2024-10-18', dayNumber: 5, startTime: '09:00', endTime: '11:00', locationName: '大三巴牌坊', description: '參觀大三巴' },
  ];
  
  // 中學組行程（10/15-10/19）
  const zhongxueItineraries = [
    { groupId: zhongxue.id, date: '2024-10-15', dayNumber: 1, startTime: '09:00', endTime: '12:00', locationName: '香港姊妹學校交流', description: '學校交流活動' },
    { groupId: zhongxue.id, date: '2024-10-15', dayNumber: 1, startTime: '14:00', endTime: '16:00', locationName: '金紫荊廣場', description: '參觀金紫荊廣場' },
    { groupId: zhongxue.id, date: '2024-10-15', dayNumber: 1, startTime: '17:00', endTime: '19:00', locationName: '太平山頂', description: '乘坐山頂纜車' },
    { groupId: zhongxue.id, date: '2024-10-16', dayNumber: 2, startTime: '09:00', endTime: '11:00', locationName: '香港航天科普教育基地', description: '航天科普活動' },
    { groupId: zhongxue.id, date: '2024-10-16', dayNumber: 2, startTime: '14:00', endTime: '16:00', locationName: '星光大道', description: '參觀星光大道' },
    { groupId: zhongxue.id, date: '2024-10-16', dayNumber: 2, startTime: '16:30', endTime: '18:00', locationName: '港大學霸分享會', description: '學霸分享會' },
    { groupId: zhongxue.id, date: '2024-10-17', dayNumber: 3, startTime: '09:30', endTime: '11:30', locationName: '駐港部隊展覽中心', description: '參觀駐港部隊' },
    { groupId: zhongxue.id, date: '2024-10-17', dayNumber: 3, startTime: '14:00', endTime: '16:00', locationName: '香港文化博物館', description: '參觀文化博物館' },
    { groupId: zhongxue.id, date: '2024-10-18', dayNumber: 4, startTime: '09:00', endTime: '12:00', locationName: '澳門博物館', description: '參觀澳門博物館' },
    { groupId: zhongxue.id, date: '2024-10-18', dayNumber: 4, startTime: '14:00', endTime: '16:00', locationName: '澳門中學交流', description: '學校交流活動' },
    { groupId: zhongxue.id, date: '2024-10-19', dayNumber: 5, startTime: '09:00', endTime: '11:00', locationName: '大三巴牌坊', description: '參觀大三巴' },
  ];
  
  // 高中組行程（10/16-10/20）
  const gaozhongItineraries = [
    { groupId: gaozhong.id, date: '2024-10-16', dayNumber: 1, startTime: '09:00', endTime: '12:00', locationName: '香港姊妹學校交流', description: '學校交流活動' },
    { groupId: gaozhong.id, date: '2024-10-16', dayNumber: 1, startTime: '14:00', endTime: '16:00', locationName: '金紫荊廣場', description: '參觀金紫荊廣場' },
    { groupId: gaozhong.id, date: '2024-10-16', dayNumber: 1, startTime: '17:00', endTime: '19:00', locationName: '太平山頂', description: '乘坐山頂纜車' },
    { groupId: gaozhong.id, date: '2024-10-17', dayNumber: 2, startTime: '09:00', endTime: '11:00', locationName: '香港航天科普教育基地', description: '航天科普活動' },
    { groupId: gaozhong.id, date: '2024-10-17', dayNumber: 2, startTime: '14:00', endTime: '16:00', locationName: '星光大道', description: '參觀星光大道' },
    { groupId: gaozhong.id, date: '2024-10-17', dayNumber: 2, startTime: '16:30', endTime: '18:00', locationName: '港大學霸分享會', description: '學霸分享會' },
    { groupId: gaozhong.id, date: '2024-10-18', dayNumber: 3, startTime: '09:30', endTime: '11:30', locationName: '駐港部隊展覽中心', description: '參觀駐港部隊' },
    { groupId: gaozhong.id, date: '2024-10-18', dayNumber: 3, startTime: '14:00', endTime: '16:00', locationName: '香港文化博物館', description: '參觀文化博物館' },
    { groupId: gaozhong.id, date: '2024-10-19', dayNumber: 4, startTime: '09:00', endTime: '12:00', locationName: '澳門博物館', description: '參觀澳門博物館' },
    { groupId: gaozhong.id, date: '2024-10-19', dayNumber: 4, startTime: '14:00', endTime: '16:00', locationName: '澳門中學交流', description: '學校交流活動' },
    { groupId: gaozhong.id, date: '2024-10-20', dayNumber: 5, startTime: '09:00', endTime: '11:00', locationName: '大三巴牌坊', description: '參觀大三巴' },
  ];
  
  const allItineraries = [...xiaoxueItineraries, ...zhongxueItineraries, ...gaozhongItineraries];
  
  console.log(`\n準備插入 ${allItineraries.length} 條行程記錄...`);
  
  // 批量插入行程
  for (const itinerary of allItineraries) {
    await conn.query(
      `INSERT INTO itineraries (groupId, date, dayNumber, startTime, endTime, locationName, description, sortOrder) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [itinerary.groupId, itinerary.date, itinerary.dayNumber, itinerary.startTime, itinerary.endTime, itinerary.locationName, itinerary.description]
    );
  }
  
  console.log('✅ 數據導入成功！');
  
  // 驗證導入結果
  const [result] = await conn.query(
    'SELECT groupId, COUNT(*) as count FROM itineraries WHERE groupId IN (?, ?, ?) GROUP BY groupId',
    [xiaoxue.id, zhongxue.id, gaozhong.id]
  );
  
  console.log('\n導入結果統計：');
  result.forEach(r => {
    const group = groups.find(g => g.id === r.groupId);
    console.log(`  - ${group.name}: ${r.count} 條行程`);
  });
  
} catch (error) {
  console.error('❌ 導入失敗：', error);
  process.exit(1);
} finally {
  await conn.end();
}
