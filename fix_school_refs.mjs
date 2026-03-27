/**
 * 修复 groups.school_list 中的学校引用
 * 问题：school_list 中学校名称是硬编码文本，缺少 domesticSchoolId 字段
 * 修复：为每个学校记录添加 domesticSchoolId，关联 domesticSchools 资源库
 */
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. 获取所有 domesticSchools，建立名称 → ID 映射
  const [domSchools] = await conn.execute('SELECT id, name FROM domesticSchools');
  const domMap = {};
  for (const s of domSchools) {
    domMap[s.name] = s.id;
  }
  console.log('domesticSchools 资源库:', Object.keys(domMap).length, '所');

  // 2. 获取所有团组的 school_list
  const [groups] = await conn.execute(
    'SELECT id, code, school_list FROM `groups` WHERE projectId = 90002'
  );

  let updated = 0;
  let missing = [];

  for (const group of groups) {
    const schoolList = group.school_list; // mysql2 已自动解析 JSON
    if (!schoolList || !Array.isArray(schoolList)) continue;

    let changed = false;
    const newList = schoolList.map(school => {
      // 如果已有 domesticSchoolId 则跳过
      if (school.domesticSchoolId) return school;

      const domId = domMap[school.name];
      if (domId) {
        changed = true;
        return { ...school, domesticSchoolId: domId };
      } else {
        missing.push({ group: group.code, school: school.name });
        return school;
      }
    });

    if (changed) {
      await conn.execute(
        'UPDATE `groups` SET school_list = ? WHERE id = ?',
        [JSON.stringify(newList), group.id]
      );
      console.log(`  ✅ 团组 ${group.code} school_list 已更新`);
      updated++;
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠️  以下学校在 domesticSchools 资源库中未找到匹配：');
    missing.forEach(m => console.log(`  - 团组 ${m.group}: "${m.school}"`));
  }

  // 3. 验证结果
  console.log(`\n✅ 共更新 ${updated} 个团组的 school_list`);

  // 打印 P1 验证
  const [p1] = await conn.execute('SELECT code, school_list FROM `groups` WHERE code = "P1"');
  console.log('\n=== P1 school_list 验证 ===');
  p1[0].school_list.forEach(s => {
    console.log(`  ${s.name} → domesticSchoolId: ${s.domesticSchoolId || '❌未找到'}, exchangeSchoolId: ${s.exchangeSchoolId || '-'}`);
  });

  await conn.end();
  console.log('\n🎉 修复完成！');
}

main().catch(e => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});
