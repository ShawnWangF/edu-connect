import { describe, it, expect } from 'vitest';

/**
 * 测试排程总览页面中学校分组的解析逻辑
 * 验证能否正确解析包含多个学校的字符串格式
 */

describe('ScheduleOverview - School List Parsing', () => {
  // 模拟排程总览页面中的学校列表解析逻辑
  function parseSchoolList(schoolListData: any): Array<{ name: string; studentCount: number; teacherCount?: number }> {
    let schoolList: Array<{ name: string; studentCount: number; teacherCount?: number }> = [];
    
    if (typeof schoolListData === 'string' && schoolListData) {
      // 尝试解析 JSON 格式
      if (schoolListData.startsWith('[')) {
        try {
          const parsed = JSON.parse(schoolListData);
          // 处理两种字段名格式：studentCount/teacherCount 或 students/teachers
          schoolList = parsed.map((item: any) => ({
            name: item.name,
            studentCount: item.studentCount ?? item.students ?? 0,
            teacherCount: item.teacherCount ?? item.teachers ?? 0
          }));
        } catch {
          // JSON 解析失败，作为普通字符串处理
          schoolList = [{ name: schoolListData, studentCount: 0 }];
        }
      } else {
        // 普通字符串格式："学校名（人数） · 学校名2（人数）"
        // 按 · 分割多个学校
        const schools = schoolListData.split('·').map((s: string) => s.trim());
        schoolList = schools.map((school: string) => {
          // 提取学校名和人数："蘇州一中（40+4人）" -> name: "蘇州一中", studentCount: 40, teacherCount: 4
          const match = school.match(/^(.+?)（([0-9]+)(?:\+([0-9]+))?人）$/);
          if (match) {
            return {
              name: match[1],
              studentCount: parseInt(match[2], 10),
              teacherCount: match[3] ? parseInt(match[3], 10) : 0
            };
          }
          return { name: school, studentCount: 0 };
        });
      }
    } else if (Array.isArray(schoolListData)) {
      // 处理数组格式，也需要处理两种字段名
      schoolList = (schoolListData as any[]).map((item: any) => ({
        name: item.name,
        studentCount: item.studentCount ?? item.students ?? 0,
        teacherCount: item.teacherCount ?? item.teachers ?? 0
      }));
    }
    
    return schoolList;
  }

  it('should parse single school with student and teacher count', () => {
    const input = '蘇州一中（40+4人）';
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 40,
      teacherCount: 4
    });
  });

  it('should parse single school with only student count', () => {
    const input = '蘇州一中（40人）';
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 40,
      teacherCount: 0
    });
  });

  it('should parse multiple schools separated by ·', () => {
    const input = '蘇州一中（40+4人） · 香港英華書院（50+5人） · 香港培道中學（10+1人）';
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 40,
      teacherCount: 4
    });
    expect(result[1]).toEqual({
      name: '香港英華書院',
      studentCount: 50,
      teacherCount: 5
    });
    expect(result[2]).toEqual({
      name: '香港培道中學',
      studentCount: 10,
      teacherCount: 1
    });
  });

  it('should parse JSON array format', () => {
    const input = JSON.stringify([
      { name: '蘇州一中', studentCount: 40, teacherCount: 4 },
      { name: '香港英華書院', studentCount: 50, teacherCount: 5 },
      { name: '香港培道中學', studentCount: 10, teacherCount: 1 }
    ]);
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 40,
      teacherCount: 4
    });
    expect(result[1]).toEqual({
      name: '香港英華書院',
      studentCount: 50,
      teacherCount: 5
    });
    expect(result[2]).toEqual({
      name: '香港培道中學',
      studentCount: 10,
      teacherCount: 1
    });
  });

  it('should handle JSON array with students/teachers field names', () => {
    const input = JSON.stringify([
      { name: '蘇州一中', students: 40, teachers: 4 },
      { name: '香港英華書院', students: 50, teachers: 5 }
    ]);
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 40,
      teacherCount: 4
    });
    expect(result[1]).toEqual({
      name: '香港英華書院',
      studentCount: 50,
      teacherCount: 5
    });
  });

  it('should handle empty array', () => {
    const input: any[] = [];
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(0);
  });

  it('should handle null/undefined', () => {
    const result1 = parseSchoolList(null);
    const result2 = parseSchoolList(undefined);
    
    expect(result1).toHaveLength(0);
    expect(result2).toHaveLength(0);
  });

  it('should handle malformed school string gracefully', () => {
    const input = '蘇州一中 · 香港英華書院';
    const result = parseSchoolList(input);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: '蘇州一中',
      studentCount: 0
    });
    expect(result[1]).toEqual({
      name: '香港英華書院',
      studentCount: 0
    });
  });
});
