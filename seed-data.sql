-- ============================================
-- 教育團組管理系統 - 完整測試數據
-- ============================================

-- 1. 插入工作人員數據
INSERT INTO staff (name, role, phone, email, notes, isActive, createdAt, updatedAt) VALUES
('王曉紅', 'coordinator', '13800138001', 'wang.xiaohong@example.com', '項目總協調員', 1, NOW(), NOW()),
('李明', 'coordinator', '13800138002', 'li.ming@example.com', '蘇州地區協調員', 1, NOW(), NOW()),
('張三', 'guide', '13800138010', 'zhang.san@example.com', '深圳導遊', 1, NOW(), NOW()),
('李四', 'guide', '13800138011', 'li.si@example.com', '香港導遊', 1, NOW(), NOW()),
('王五', 'guide', '13800138012', 'wang.wu@example.com', '蘇州導遊', 1, NOW(), NOW()),
('趙六', 'guide', '13800138013', 'zhao.liu@example.com', '備用導遊', 1, NOW(), NOW()),
('陳師傅', 'driver', '13800138020', 'chen.shifu@example.com', '深圳巴士司機', 1, NOW(), NOW()),
('劉師傅', 'driver', '13800138021', 'liu.shifu@example.com', '香港巴士司機', 1, NOW(), NOW()),
('楊師傅', 'driver', '13800138022', 'yang.shifu@example.com', '蘇州巴士司機', 1, NOW(), NOW()),
('馬麗', 'staff', '13800138030', 'ma.li@example.com', '行程安排員', 1, NOW(), NOW()),
('吳剛', 'staff', '13800138031', 'wu.gang@example.com', '安全負責人', 1, NOW(), NOW()),
('何靜', 'staff', '13800138032', 'he.jing@example.com', '醫療保障', 1, NOW(), NOW());

-- 2. 為團組分配工作人員
INSERT INTO batchStaff (groupId, staffId, role, startDate, endDate, currentTask, notes, createdAt, updatedAt) VALUES
(210001, 1, 'coordinator', '2024-07-01', '2024-07-06', '批次協調', '批次1總協調', NOW(), NOW()),
(210001, 3, 'guide', '2024-07-01', '2024-07-06', '帶隊導遊', '批次1導遊', NOW(), NOW()),
(210001, 7, 'driver', '2024-07-01', '2024-07-06', '巴士司機', '批次1司機', NOW(), NOW()),
(210001, 9, 'staff', '2024-07-01', '2024-07-06', '行程安排', '批次1行程安排', NOW(), NOW()),
(210005, 2, 'coordinator', '2024-07-06', '2024-07-07', '批次協調', '批次2總協調', NOW(), NOW()),
(210005, 4, 'guide', '2024-07-06', '2024-07-07', '帶隊導遊', '批次2導遊', NOW(), NOW()),
(210005, 8, 'driver', '2024-07-06', '2024-07-07', '巴士司機', '批次2司機', NOW(), NOW()),
(210005, 10, 'staff', '2024-07-06', '2024-07-07', '安全負責', '批次2安全負責', NOW(), NOW()),
(210008, 1, 'coordinator', '2024-07-08', '2024-07-11', '批次協調', '批次3總協調', NOW(), NOW()),
(210008, 5, 'guide', '2024-07-08', '2024-07-11', '帶隊導遊', '批次3導遊', NOW(), NOW()),
(210008, 7, 'driver', '2024-07-08', '2024-07-11', '巴士司機', '批次3司機', NOW(), NOW()),
(210008, 11, 'staff', '2024-07-08', '2024-07-11', '醫療保障', '批次3醫療保障', NOW(), NOW());

-- 3. 更新團組信息 - 批次 1 團組
UPDATE `groups` SET 
  batch_id = 30001,
  batch_code = '批次1',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州一中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-04'
WHERE id = 210001;

UPDATE `groups` SET 
  batch_id = 30001,
  batch_code = '批次1',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州二中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-04'
WHERE id = 210002;

UPDATE `groups` SET 
  batch_id = 30001,
  batch_code = '批次1',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州三中', 'students', 30, 'teachers', 3)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-04'
WHERE id = 210003;

UPDATE `groups` SET 
  batch_id = 30001,
  batch_code = '批次1',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3401', 'departure', 'CZ3402'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州四中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-04'
WHERE id = 210004;

-- 4. 更新團組信息 - 批次 2 團組
UPDATE `groups` SET 
  batch_id = 30002,
  batch_code = '批次2',
  start_city = 'sz',
  flight_info = JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州五中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-06'
WHERE id = 210005;

UPDATE `groups` SET 
  batch_id = 30002,
  batch_code = '批次2',
  start_city = 'sz',
  flight_info = JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州六中', 'students', 30, 'teachers', 3)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-06'
WHERE id = 210006;

UPDATE `groups` SET 
  batch_id = 30002,
  batch_code = '批次2',
  start_city = 'sz',
  flight_info = JSON_OBJECT('arrival', 'MU5101', 'departure', 'MU5102'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州七中', 'students', 35, 'teachers', 3)),
  type = JSON_ARRAY('primary'),
  crossing_date = '2024-07-06'
WHERE id = 210007;

-- 5. 更新團組信息 - 批次 3 團組
UPDATE `groups` SET 
  batch_id = 30003,
  batch_code = '批次3',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州八中', 'students', 30, 'teachers', 3)),
  type = JSON_ARRAY('secondary'),
  crossing_date = '2024-07-08'
WHERE id = 210008;

UPDATE `groups` SET 
  batch_id = 30003,
  batch_code = '批次3',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州九中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('secondary'),
  crossing_date = '2024-07-08'
WHERE id = 210009;

UPDATE `groups` SET 
  batch_id = 30003,
  batch_code = '批次3',
  start_city = 'hk',
  flight_info = JSON_OBJECT('arrival', 'CZ3403', 'departure', 'CZ3404'),
  school_list = JSON_ARRAY(JSON_OBJECT('name', '蘇州十中', 'students', 40, 'teachers', 4)),
  type = JSON_ARRAY('secondary'),
  crossing_date = '2024-07-08'
WHERE id = 210010;

-- 6. 更新批次信息
UPDATE batches SET 
  arrivalDate = '2024-07-01',
  departureDate = '2024-07-06',
  arrivalFlight = 'CZ3401',
  departureFlight = 'CZ3402',
  notes = '備註：4所蘇州小學，7/4連線時間別'
WHERE id = 30001;

UPDATE batches SET 
  arrivalDate = '2024-07-06',
  departureDate = '2024-07-07',
  arrivalFlight = 'MU5101',
  departureFlight = 'MU5102',
  notes = '深圳進小學組，澳門交流'
WHERE id = 30002;

UPDATE batches SET 
  arrivalDate = '2024-07-08',
  departureDate = '2024-07-11',
  arrivalFlight = 'CZ3403',
  departureFlight = 'CZ3404',
  notes = '香港進中學組，多校交流'
WHERE id = 30003;
