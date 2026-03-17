-- 為項目 60001 (JS202507) 填入完整的測試數據

-- 1. 創建批次
INSERT INTO batches (projectId, code, name, arrivalDate, departureDate, arrivalFlight, departureFlight, arrivalTime, departureTime, notes, createdBy, createdAt, updatedAt) VALUES
(60001, '批次1', '香港進小學組', '2025-07-01', '2025-07-06', 'CZ3401', 'CZ3402', '10:00', '14:00', '香港進小學組批次', 1, NOW(), NOW()),
(60001, '批次2', '深圳進小學組', '2025-07-06', '2025-07-07', 'MU5101', 'MU5102', '10:00', '14:00', '深圳進小學組批次', 1, NOW(), NOW()),
(60001, '批次3', '香港進中學組', '2025-07-08', '2025-07-11', 'CZ3403', 'CZ3404', '10:00', '14:00', '香港進中學組批次', 1, NOW(), NOW());

-- 2. 創建工作人員
INSERT INTO staff (name, role, phone, email, wechat, languages, licenseNumber, notes, isActive, createdAt, updatedAt) VALUES
('李協調1', 'coordinator', '13800138001', 'coordinator1@example.com', 'wechat_coord1', '中文,英文', '', '項目協調員', 1, NOW(), NOW()),
('李協調2', 'coordinator', '13800138002', 'coordinator2@example.com', 'wechat_coord2', '中文,英文', '', '項目協調員', 1, NOW(), NOW()),
('王導遊1', 'guide', '13800138003', 'guide1@example.com', 'wechat_guide1', '中文,英文', 'DL001', '導遊', 1, NOW(), NOW()),
('王導遊2', 'guide', '13800138004', 'guide2@example.com', 'wechat_guide2', '中文,英文', 'DL002', '導遊', 1, NOW(), NOW()),
('王導遊3', 'guide', '13800138005', 'guide3@example.com', 'wechat_guide3', '中文,英文', 'DL003', '導遊', 1, NOW(), NOW()),
('王導遊4', 'guide', '13800138006', 'guide4@example.com', 'wechat_guide4', '中文,英文', 'DL004', '導遊', 1, NOW(), NOW()),
('張司機1', 'driver', '13800138007', 'driver1@example.com', 'wechat_driver1', '中文', 'DL005', '巴士司機', 1, NOW(), NOW()),
('張司機2', 'driver', '13800138008', 'driver2@example.com', 'wechat_driver2', '中文', 'DL006', '巴士司機', 1, NOW(), NOW()),
('張司機3', 'driver', '13800138009', 'driver3@example.com', 'wechat_driver3', '中文', 'DL007', '巴士司機', 1, NOW(), NOW()),
('陳工作人員1', 'staff', '13800138010', 'staff1@example.com', 'wechat_staff1', '中文', '', '工作人員', 1, NOW(), NOW()),
('陳工作人員2', 'staff', '13800138011', 'staff2@example.com', 'wechat_staff2', '中文', '', '工作人員', 1, NOW(), NOW()),
('陳工作人員3', 'staff', '13800138012', 'staff3@example.com', 'wechat_staff3', '中文', '', '工作人員', 1, NOW(), NOW());

-- 3. 創建團組（使用不同的 code 以避免重複）
INSERT INTO `groups` (projectId, name, code, startDate, endDate, days, type, status, studentCount, teacherCount, totalCount, hotel, color, tags, contact, phone, emergencyContact, emergencyPhone, notes, requiredItineraries, batch_id, batch_code, start_city, crossing_date, sister_school_id, flight_info, school_list, createdBy, createdAt, updatedAt) VALUES
(60001, '蘇州一中A組', 'JS202507-P1', '2025-07-01', '2025-07-06', 6, JSON_ARRAY('primary'), 'preparing', 40, 4, 44, '香港酒店1', '#FF6B6B', JSON_ARRAY('primary'), '李老師', '13900001001', '王主任', '13900001002', '備註：蘇州一中', JSON_ARRAY(), 30001, '批次1', 'hk', '2025-07-04', NULL, JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'), JSON_ARRAY(JSON_OBJECT('name', '蘇州一中', 'students', 40, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州二中A組', 'JS202507-P2', '2025-07-01', '2025-07-06', 6, JSON_ARRAY('primary'), 'preparing', 40, 4, 44, '香港酒店2', '#4ECDC4', JSON_ARRAY('primary'), '劉老師', '13900001003', '周主任', '13900001004', '備註：蘇州二中', JSON_ARRAY(), 30001, '批次1', 'hk', '2025-07-04', NULL, JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'), JSON_ARRAY(JSON_OBJECT('name', '蘇州二中', 'students', 40, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州三中A組', 'JS202507-P3', '2025-07-01', '2025-07-06', 6, JSON_ARRAY('primary'), 'preparing', 30, 3, 33, '香港酒店1', '#95E1D3', JSON_ARRAY('primary'), '陳老師', '13900001005', '吳主任', '13900001006', '備註：蘇州三中', JSON_ARRAY(), 30001, '批次1', 'hk', '2025-07-04', NULL, JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'), JSON_ARRAY(JSON_OBJECT('name', '蘇州三中', 'students', 30, 'teachers', 3)), 1, NOW(), NOW()),
(60001, '蘇州四中A組', 'JS202507-P4', '2025-07-01', '2025-07-06', 6, JSON_ARRAY('primary'), 'preparing', 40, 4, 44, '香港酒店3', '#F38181', JSON_ARRAY('primary'), '黃老師', '13900001007', '鄭主任', '13900001008', '備註：蘇州四中', JSON_ARRAY(), 30001, '批次1', 'hk', '2025-07-04', NULL, JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'), JSON_ARRAY(JSON_OBJECT('name', '蘇州四中', 'students', 40, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州五中A組', 'JS202507-P5', '2025-07-06', '2025-07-07', 2, JSON_ARRAY('primary'), 'preparing', 40, 4, 44, '深圳酒店1', '#AA96DA', JSON_ARRAY('primary'), '趙老師', '13900001009', '孫主任', '13900001010', '備註：蘇州五中', JSON_ARRAY(), 30002, '批次2', 'sz', '2025-07-06', NULL, JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'), JSON_ARRAY(JSON_OBJECT('name', '蘇州五中', 'students', 40, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州六中A組', 'JS202507-P6', '2025-07-06', '2025-07-07', 2, JSON_ARRAY('primary'), 'preparing', 35, 4, 39, '深圳酒店2', '#FCBAD3', JSON_ARRAY('primary'), '馬老師', '13900001011', '朱主任', '13900001012', '備註：蘇州六中', JSON_ARRAY(), 30002, '批次2', 'sz', '2025-07-06', NULL, JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'), JSON_ARRAY(JSON_OBJECT('name', '蘇州六中', 'students', 35, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州七中A組', 'JS202507-P7', '2025-07-06', '2025-07-07', 2, JSON_ARRAY('primary'), 'preparing', 40, 4, 44, '深圳酒店1', '#A8D8EA', JSON_ARRAY('primary'), '林老師', '13900001013', '何主任', '13900001014', '備註：蘇州七中', JSON_ARRAY(), 30002, '批次2', 'sz', '2025-07-06', NULL, JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'), JSON_ARRAY(JSON_OBJECT('name', '蘇州七中', 'students', 40, 'teachers', 4)), 1, NOW(), NOW()),
(60001, '蘇州一中B組', 'JS202507-P8', '2025-07-08', '2025-07-11', 4, JSON_ARRAY('secondary'), 'preparing', 50, 5, 55, '香港酒店4', '#FFD93D', JSON_ARRAY('secondary'), '徐老師', '13900001015', '曾主任', '13900001016', '備註：蘇州一中中學組', JSON_ARRAY(), 30003, '批次3', 'hk', '2025-07-08', NULL, JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'), JSON_ARRAY(JSON_OBJECT('name', '蘇州一中中學部', 'students', 50, 'teachers', 5)), 1, NOW(), NOW()),
(60001, '蘇州二中B組', 'JS202507-P9', '2025-07-08', '2025-07-11', 4, JSON_ARRAY('secondary'), 'preparing', 35, 3, 38, '香港酒店5', '#6BCB77', JSON_ARRAY('secondary'), '高老師', '13900001017', '汪主任', '13900001018', '備註：蘇州二中中學組', JSON_ARRAY(), 30003, '批次3', 'hk', '2025-07-08', NULL, JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'), JSON_ARRAY(JSON_OBJECT('name', '蘇州二中中學部', 'students', 35, 'teachers', 3)), 1, NOW(), NOW()),
(60001, '蘇州三中B組', 'JS202507-P10', '2025-07-08', '2025-07-11', 4, JSON_ARRAY('secondary'), 'preparing', 45, 5, 50, '香港酒店4', '#4D96FF', JSON_ARRAY('secondary'), '鄧老師', '13900001019', '余主任', '13900001020', '備註：蘇州三中中學組', JSON_ARRAY(), 30003, '批次3', 'hk', '2025-07-08', NULL, JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'), JSON_ARRAY(JSON_OBJECT('name', '蘇州三中中學部', 'students', 45, 'teachers', 5)), 1, NOW(), NOW());
