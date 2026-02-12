import fs from 'fs';
import { db } from './server/db.ts';

async function batchImportMembers() {
  try {
    // 讀取JSON數據
    const membersData = JSON.parse(fs.readFileSync('/tmp/members_data.json', 'utf-8'));
    console.log(`準備導入 ${membersData.length} 個成員到團組 ID=1`);

    // 轉換數據格式
    const members = membersData.map(m => ({
      groupId: 1,
      name: m['姓名'] || '',
      identity: m['身份'] || '',
      gender: m['性别'] || '',
      phone: m['联系电话'] || '',
      idCard: m['身份证号'] || '',
      notes: m['备注'] || '',
      customFields: {
        '序号': m['序号'],
        '苏州学校': m['苏州学校'],
        '药物过敏': m['药物过敏'],
        '食物过敏': m['食物过敏'],
        '房间号': m['房间号']
      }
    }));

    // 批量創建成員
    const result = await db.batchCreateMembers(members);
    console.log(`成功導入 ${result.length} 個成員`);
    
    // 驗證導入結果
    const groupMembers = await db.getMembersByGroup(1);
    console.log(`團組1現在有 ${groupMembers.length} 個成員`);
    
    // 顯示前3個成員
    console.log('\n前3個成員:');
    groupMembers.slice(0, 3).forEach(m => {
      console.log(`- ${m.name} (${m.identity}) - ${m.phone}`);
    });
    
  } catch (error) {
    console.error('導入失敗:', error);
    process.exit(1);
  }
}

batchImportMembers();
