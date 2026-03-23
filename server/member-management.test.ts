import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 人員管理工具函數測試 =====

// 模擬人員數據
const mockMembers = [
  { id: 1, name: '張三', identity: 'student', gender: 'male', phone: '12345678', groupId: 1, groupName: '蘇州一中A組', groupCode: 'JS202507-P1' },
  { id: 2, name: '李四', identity: 'teacher', gender: 'female', phone: '87654321', groupId: 1, groupName: '蘇州一中A組', groupCode: 'JS202507-P1' },
  { id: 3, name: '王五', identity: 'student', gender: 'male', phone: null, groupId: 2, groupName: '蘇州二中A組', groupCode: 'JS202507-P2' },
  { id: 4, name: '趙六', identity: 'staff', gender: 'other', phone: '11223344', groupId: 2, groupName: '蘇州二中A組', groupCode: 'JS202507-P2' },
];

// 模擬行程指派數據
const mockItineraryMembers = [
  { id: 1, itineraryId: 100, memberId: 1, role: 'staff', name: '張三', identity: 'student', gender: 'male', phone: '12345678', groupId: 1 },
  { id: 2, itineraryId: 100, memberId: 2, role: 'guide', name: '李四', identity: 'teacher', gender: 'female', phone: '87654321', groupId: 1 },
];

// 模擬狀態數據
const mockMemberStatuses = [
  { id: 1, memberId: 1, itineraryId: 100, status: 'completed', checkInTime: new Date('2025-07-01T09:00:00'), checkOutTime: new Date('2025-07-01T17:00:00'), notes: '準時到達', name: '張三', identity: 'student', gender: 'male', phone: '12345678', groupId: 1 },
  { id: 2, memberId: 2, itineraryId: 100, status: 'absent', checkInTime: null, checkOutTime: null, notes: '請假', name: '李四', identity: 'teacher', gender: 'female', phone: '87654321', groupId: 1 },
];

// ===== 工具函數 =====

/**
 * 過濾人員列表
 */
function filterMembers(
  members: typeof mockMembers,
  searchQuery: string,
  groupFilter: string
) {
  return members.filter((m) => {
    const matchSearch = !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery));
    const matchGroup = groupFilter === 'all' || String(m.groupId) === groupFilter;
    return matchSearch && matchGroup;
  });
}

/**
 * 計算統計數據
 */
function calcStats(members: typeof mockMembers) {
  return {
    total: members.length,
    students: members.filter((m) => m.identity === 'student').length,
    teachers: members.filter((m) => m.identity === 'teacher').length,
    staff: members.filter((m) => m.identity === 'staff').length,
  };
}

/**
 * 計算狀態統計
 */
function calcStatusStats(
  assignedMembers: typeof mockItineraryMembers,
  memberStatuses: typeof mockMemberStatuses
) {
  const statusMap = new Map(memberStatuses.map((s) => [s.memberId, s.status]));
  const counts: Record<string, number> = {
    pending: 0, assigned: 0, in_progress: 0, completed: 0, absent: 0, cancelled: 0,
  };
  assignedMembers.forEach((m) => {
    const s = statusMap.get(m.memberId) ?? 'pending';
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

/**
 * 獲取可指派人員（排除已指派的）
 */
function getAvailableMembers(
  allMembers: typeof mockMembers,
  assignedMembers: typeof mockItineraryMembers,
  groupFilter: string
) {
  const assignedIds = new Set(assignedMembers.map((m) => m.memberId));
  return allMembers.filter((m) => {
    const matchGroup = groupFilter === 'all' || String(m.groupId) === groupFilter;
    return matchGroup && !assignedIds.has(m.id);
  });
}

// ===== 測試 =====

describe('人員管理 - 過濾功能', () => {
  it('應返回所有人員（無過濾條件）', () => {
    const result = filterMembers(mockMembers, '', 'all');
    expect(result).toHaveLength(4);
  });

  it('應按姓名搜尋人員', () => {
    const result = filterMembers(mockMembers, '張三', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('張三');
  });

  it('應按電話搜尋人員', () => {
    const result = filterMembers(mockMembers, '12345678', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('張三');
  });

  it('應按團組過濾人員', () => {
    const result = filterMembers(mockMembers, '', '1');
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.groupId === 1)).toBe(true);
  });

  it('應同時支持搜尋和團組過濾', () => {
    const result = filterMembers(mockMembers, '張', '1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('張三');
  });

  it('搜尋不存在的人員應返回空數組', () => {
    const result = filterMembers(mockMembers, '不存在的人', 'all');
    expect(result).toHaveLength(0);
  });
});

describe('人員管理 - 統計功能', () => {
  it('應正確計算總人數', () => {
    const stats = calcStats(mockMembers);
    expect(stats.total).toBe(4);
  });

  it('應正確計算學生人數', () => {
    const stats = calcStats(mockMembers);
    expect(stats.students).toBe(2);
  });

  it('應正確計算教師人數', () => {
    const stats = calcStats(mockMembers);
    expect(stats.teachers).toBe(1);
  });

  it('應正確計算工作人員人數', () => {
    const stats = calcStats(mockMembers);
    expect(stats.staff).toBe(1);
  });

  it('空數組應返回全部為0的統計', () => {
    const stats = calcStats([]);
    expect(stats.total).toBe(0);
    expect(stats.students).toBe(0);
    expect(stats.teachers).toBe(0);
    expect(stats.staff).toBe(0);
  });
});

describe('人員管理 - 狀態統計', () => {
  it('應正確計算各狀態人數', () => {
    const stats = calcStatusStats(mockItineraryMembers, mockMemberStatuses);
    expect(stats.completed).toBe(1);
    expect(stats.absent).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it('無狀態記錄的人員應計為 pending', () => {
    const members = [
      { id: 1, itineraryId: 100, memberId: 10, role: 'staff', name: '測試', identity: 'student', gender: 'male', phone: null, groupId: 1 },
    ];
    const stats = calcStatusStats(members, []);
    expect(stats.pending).toBe(1);
  });
});

describe('人員管理 - 可指派人員', () => {
  it('應排除已指派的人員', () => {
    const available = getAvailableMembers(mockMembers, mockItineraryMembers, 'all');
    // 已指派 memberId 1 和 2，所以剩下 3 和 4
    expect(available).toHaveLength(2);
    expect(available.map((m) => m.id)).toEqual([3, 4]);
  });

  it('無已指派人員時應返回所有人員', () => {
    const available = getAvailableMembers(mockMembers, [], 'all');
    expect(available).toHaveLength(4);
  });

  it('應按團組過濾可指派人員', () => {
    const available = getAvailableMembers(mockMembers, mockItineraryMembers, '2');
    // 團組2的人員是 id:3 和 id:4，都未被指派
    expect(available).toHaveLength(2);
    expect(available.every((m) => m.groupId === 2)).toBe(true);
  });

  it('所有人員都已指派時應返回空數組', () => {
    const allAssigned = mockMembers.map((m) => ({
      id: m.id,
      itineraryId: 100,
      memberId: m.id,
      role: 'staff',
      name: m.name,
      identity: m.identity,
      gender: m.gender,
      phone: m.phone,
      groupId: m.groupId,
    }));
    const available = getAvailableMembers(mockMembers, allAssigned, 'all');
    expect(available).toHaveLength(0);
  });
});

describe('人員管理 - 身份和角色標籤', () => {
  const identityLabel: Record<string, string> = {
    student: '學生',
    teacher: '教師',
    staff: '工作人員',
    other: '其他',
  };

  const roleLabel: Record<string, string> = {
    guide: '導遊',
    staff: '工作人員',
    security: '安保',
    coordinator: '協調員',
    other: '其他',
  };

  it('應正確映射身份標籤', () => {
    expect(identityLabel['student']).toBe('學生');
    expect(identityLabel['teacher']).toBe('教師');
    expect(identityLabel['staff']).toBe('工作人員');
    expect(identityLabel['other']).toBe('其他');
  });

  it('應正確映射角色標籤', () => {
    expect(roleLabel['guide']).toBe('導遊');
    expect(roleLabel['staff']).toBe('工作人員');
    expect(roleLabel['security']).toBe('安保');
    expect(roleLabel['coordinator']).toBe('協調員');
    expect(roleLabel['other']).toBe('其他');
  });

  it('未知身份應返回 undefined', () => {
    expect(identityLabel['unknown']).toBeUndefined();
  });
});

describe('人員管理 - 狀態顏色映射', () => {
  const statusColor: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    assigned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500 line-through',
  };

  it('所有狀態都應有對應的顏色', () => {
    const statuses = ['pending', 'assigned', 'in_progress', 'completed', 'absent', 'cancelled'];
    statuses.forEach((s) => {
      expect(statusColor[s]).toBeDefined();
    });
  });

  it('completed 狀態應使用綠色', () => {
    expect(statusColor['completed']).toContain('green');
  });

  it('absent 狀態應使用紅色', () => {
    expect(statusColor['absent']).toContain('red');
  });

  it('cancelled 狀態應有刪除線', () => {
    expect(statusColor['cancelled']).toContain('line-through');
  });
});
