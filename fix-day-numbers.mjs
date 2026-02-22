import mysql from 'mysql2/promise';
import 'dotenv/config';

async function fixDayNumbers() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log('開始修復dayNumber...');
    
    // 獲取所有團組
    const [groups] = await conn.execute('SELECT id, startDate FROM `groups`');
    console.log(`找到 ${groups.length} 個團組`);
    
    for (const group of groups) {
      const groupId = group.id;
      const startDate = new Date(group.startDate);
      
      // 獲取該團組的所有行程點
      const [itineraries] = await conn.execute(
        'SELECT id, date FROM `itineraries` WHERE groupId = ?',
        [groupId]
      );
      
      console.log(`\n團組 ${groupId}: 找到 ${itineraries.length} 個行程點`);
      
      for (const item of itineraries) {
        const itemDate = new Date(item.date);
        // 計算正確的dayNumber
        const dayNumber = Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // 更新數據庫
        await conn.execute(
          'UPDATE itineraries SET dayNumber = ? WHERE id = ?',
          [dayNumber, item.id]
        );
        
        console.log(`  - 行程點 ${item.id}: 日期 ${item.date.toISOString().split('T')[0]}, dayNumber ${dayNumber}`);
      }
    }
    
    console.log('\n✅ dayNumber修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error);
  } finally {
    await conn.end();
  }
}

fixDayNumbers();
