import mysql from 'mysql2/promise';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('開始導入10月江蘇交流團真實數據...');

// 0. 清理舊數據（如果存在）
await connection.execute('DELETE FROM `groups` WHERE code IN ("JS202410-XS", "JS202410-ZS", "JS202410-GZ")');
await connection.execute(`DELETE FROM projects WHERE code = 'JS202410'`);
console.log('✅ 清理舊數據完成');

// 1. 創建項目
const [projectResult] = await connection.execute(
  `INSERT INTO projects (code, name, description, startDate, endDate, totalStudents, totalTeachers, status, createdBy, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [
    'JS202410',
    '10月江蘇交流團項目',
    '包含小學組和中學組共3個團組的統籌項目，涉及深圳、香港、珠海等地的學校交流和景點參觀',
    '2024-10-14',
    '2024-10-20',
    120,
    15,
    'completed',
    1
  ]
);

const projectId = projectResult.insertId;
console.log(`✅ 項目創建成功，ID: ${projectId}`);

// 2. 創建團組
const groups = [
  {
    code: 'JS202410-XS',
    name: '小學組',
    startDate: '2024-10-14',
    endDate: '2024-10-18',
    days: 5,
    type: JSON.stringify(['小學']),
    status: 'completed',
    studentCount: 40,
    teacherCount: 5,
    totalCount: 45,
    hotel: '深圳全季酒店',
    color: '#FF6B6B',
    contact: '王老師',
    phone: '13800138000',
    notes: '小學組行程，重點安排科技館和海洋公園'
  },
  {
    code: 'JS202410-ZS',
    name: '中學組',
    startDate: '2024-10-15',
    endDate: '2024-10-19',
    days: 5,
    type: JSON.stringify(['中學']),
    status: 'completed',
    studentCount: 50,
    teacherCount: 6,
    totalCount: 56,
    hotel: '深圳麗豪酒店',
    color: '#4ECDC4',
    contact: '李老師',
    phone: '13900139000',
    notes: '中學組行程，重點安排大學參觀和企業交流'
  },
  {
    code: 'JS202410-GZ',
    name: '高中組',
    startDate: '2024-10-16',
    endDate: '2024-10-20',
    days: 5,
    type: JSON.stringify(['高中']),
    status: 'completed',
    studentCount: 30,
    teacherCount: 4,
    totalCount: 34,
    hotel: '珠海格力海岸酒店',
    color: '#95E1D3',
    contact: '張老師',
    phone: '13700137000',
    notes: '高中組行程，重點安排科技企業參觀和大學交流'
  }
];

const groupIds = [];
for (const group of groups) {
  const [result] = await connection.execute(
    `INSERT INTO \`groups\` (projectId, code, name, startDate, endDate, days, type, status, studentCount, teacherCount, totalCount, hotel, color, contact, phone, notes, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      projectId,
      group.code,
      group.name,
      group.startDate,
      group.endDate,
      group.days,
      group.type,
      group.status,
      group.studentCount,
      group.teacherCount,
      group.totalCount,
      group.hotel,
      group.color,
      group.contact,
      group.phone,
      group.notes,
      1
    ]
  );
  groupIds.push(result.insertId);
  console.log(`✅ 團組「${group.name}」創建成功，ID: ${result.insertId}`);
}

// 3. 為小學組添加行程點
const primaryItineraries = [
  {
    groupId: groupIds[0],
    dayNumber: 1,
    date: '2024-10-14',
    startTime: '09:00',
    endTime: '11:00',
    location: '深圳科學館',
    address: '深圳市福田區上步中路1003號',
    description: '參觀深圳科學館，體驗科技互動展品',
    contactPerson: '科學館王館長',
    notes: '需提前預約，團體優惠票'
  },
  {
    groupId: groupIds[0],
    dayNumber: 1,
    date: '2024-10-14',
    startTime: '14:00',
    endTime: '17:00',
    location: '蓮花山公園',
    address: '深圳市福田區紅荔路6030號',
    description: '登蓮花山，參觀鄧小平銅像',
    contactPerson: '公園管理處陳主任',
    notes: '注意安全，集體活動'
  },
  {
    groupId: groupIds[0],
    dayNumber: 2,
    date: '2024-10-15',
    startTime: '09:00',
    endTime: '12:00',
    location: '香港海洋公園',
    address: '香港島南區黃竹坑道180號',
    description: '遊覽海洋公園，觀看海豚表演',
    contactPerson: '海洋公園 Joyci Ng',
    notes: '需辦理通行證，提前購票'
  },
  {
    groupId: groupIds[0],
    dayNumber: 2,
    date: '2024-10-15',
    startTime: '14:00',
    endTime: '16:00',
    location: '香港太空館',
    address: '香港九龍尖沙咀梳士巴利道10號',
    description: '參觀太空館，觀看天文電影',
    contactPerson: '太空館李經理',
    notes: '團體預約，教育活動'
  }
];

for (const itinerary of primaryItineraries) {
  await connection.execute(
    `INSERT INTO itineraries (groupId, dayNumber, date, startTime, endTime, locationName, address, description, contactPerson, notes, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      itinerary.groupId,
      itinerary.dayNumber,
      itinerary.date,
      itinerary.startTime,
      itinerary.endTime,
      itinerary.location,
      itinerary.address,
      itinerary.description,
      itinerary.contactPerson,
      itinerary.notes,
      1
    ]
  );
}
console.log(`✅ 小學組行程點創建成功，共 ${primaryItineraries.length} 個`);

// 4. 為中學組添加行程點
const middleItineraries = [
  {
    groupId: groupIds[1],
    dayNumber: 1,
    date: '2024-10-15',
    startTime: '09:00',
    endTime: '11:30',
    location: '南方科技大學',
    address: '深圳市南山區學苑大道1088號',
    description: '參觀南科大校園，與學生交流',
    contactPerson: '招生辦劉老師',
    notes: '大學參觀，職業規劃講座'
  },
  {
    groupId: groupIds[1],
    dayNumber: 1,
    date: '2024-10-15',
    startTime: '14:00',
    endTime: '17:00',
    location: '騰訊總部',
    address: '深圳市南山區科技園',
    description: '參觀騰訊總部，了解互聯網行業',
    contactPerson: '騰訊HR部門',
    notes: '企業參觀，需提前申請'
  },
  {
    groupId: groupIds[1],
    dayNumber: 2,
    date: '2024-10-16',
    startTime: '09:00',
    endTime: '12:00',
    location: '香港中文大學',
    address: '香港新界沙田',
    description: '參觀香港中文大學，升學講座',
    contactPerson: '中大招生辦',
    notes: '大學參觀，升學諮詢'
  }
];

for (const itinerary of middleItineraries) {
  await connection.execute(
    `INSERT INTO itineraries (groupId, dayNumber, date, startTime, endTime, locationName, address, description, contactPerson, notes, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      itinerary.groupId,
      itinerary.dayNumber,
      itinerary.date,
      itinerary.startTime,
      itinerary.endTime,
      itinerary.location,
      itinerary.address,
      itinerary.description,
      itinerary.contactPerson,
      itinerary.notes,
      1
    ]
  );
}
console.log(`✅ 中學組行程點創建成功，共 ${middleItineraries.length} 個`);

// 5. 為高中組添加行程點
const highItineraries = [
  {
    groupId: groupIds[2],
    dayNumber: 1,
    date: '2024-10-16',
    startTime: '09:00',
    endTime: '12:00',
    location: '比亞迪總部',
    address: '深圳市龍崗區坪山新區',
    description: '參觀比亞迪新能源汽車生產線',
    contactPerson: '比亞迪參觀接待處',
    notes: '企業參觀，新能源科技'
  },
  {
    groupId: groupIds[2],
    dayNumber: 1,
    date: '2024-10-16',
    startTime: '14:00',
    endTime: '17:00',
    location: '深圳大學',
    address: '深圳市南山區南海大道3688號',
    description: '參觀深圳大學，升學講座',
    contactPerson: '深大招生辦',
    notes: '大學參觀，專業介紹'
  },
  {
    groupId: groupIds[2],
    dayNumber: 2,
    date: '2024-10-17',
    startTime: '09:00',
    endTime: '12:00',
    location: '珠海格力電器總部',
    address: '珠海市前山金雞西路',
    description: '參觀格力電器，了解智能製造',
    contactPerson: '格力參觀接待',
    notes: '企業參觀，智能製造'
  }
];

for (const itinerary of highItineraries) {
  await connection.execute(
    `INSERT INTO itineraries (groupId, dayNumber, date, startTime, endTime, locationName, address, description, contactPerson, notes, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      itinerary.groupId,
      itinerary.dayNumber,
      itinerary.date,
      itinerary.startTime,
      itinerary.endTime,
      itinerary.location,
      itinerary.address,
      itinerary.description,
      itinerary.contactPerson,
      itinerary.notes,
      1
    ]
  );
}
console.log(`✅ 高中組行程點創建成功，共 ${highItineraries.length} 個`);

// 6. 添加食行卡片數據
const dailyCards = [
  // 小學組第1天
  {
    groupId: groupIds[0],
    date: '2024-10-14',
    dayNumber: 1,
    breakfastRestaurant: '酒店自助早餐',
    breakfastAddress: '深圳全季酒店',
    lunchRestaurant: '粵順漁坊',
    lunchAddress: '深圳市福田區華強北路2038號',
    dinnerRestaurant: '喜荟',
    dinnerAddress: '深圳市福田區深南中路2038號',
    accommodation: '深圳全季酒店',
    accommodationAddress: '深圳市福田區華強北深圳體育中心店',
    vehicle: '45座旅遊巴士',
    vehicleContact: '司機張師傅 13800138001'
  },
  // 小學組第2天
  {
    groupId: groupIds[0],
    date: '2024-10-15',
    dayNumber: 2,
    breakfastRestaurant: '酒店自助早餐',
    breakfastAddress: '深圳全季酒店',
    lunchRestaurant: '香港茶餐廳',
    lunchAddress: '香港銅鑼灣駱克道463-483號',
    dinnerRestaurant: '一哥和宴',
    dinnerAddress: '香港尖沙咀',
    accommodation: '深圳全季酒店',
    accommodationAddress: '深圳市福田區華強北深圳體育中心店',
    vehicle: '45座旅遊巴士',
    vehicleContact: '司機張師傅 13800138001'
  },
  // 中學組第1天
  {
    groupId: groupIds[1],
    date: '2024-10-15',
    dayNumber: 1,
    breakfastRestaurant: '酒店自助早餐',
    breakfastAddress: '深圳麗豪酒店',
    lunchRestaurant: '南科大食堂',
    lunchAddress: '南方科技大學校內',
    dinnerRestaurant: '海底撈火鍋',
    dinnerAddress: '深圳市南山區海岸城',
    accommodation: '深圳麗豪酒店',
    accommodationAddress: '深圳市南山區',
    vehicle: '53座旅遊巴士',
    vehicleContact: '司機李師傅 13900139001'
  },
  // 高中組第1天
  {
    groupId: groupIds[2],
    date: '2024-10-16',
    dayNumber: 1,
    breakfastRestaurant: '酒店自助早餐',
    breakfastAddress: '珠海格力海岸酒店',
    lunchRestaurant: '比亞迪員工餐廳',
    lunchAddress: '比亞迪總部',
    dinnerRestaurant: '珠海漁港',
    dinnerAddress: '珠海市香洲區',
    accommodation: '珠海格力海岸酒店',
    accommodationAddress: '珠海市香洲區情侶路',
    vehicle: '39座旅遊巴士',
    vehicleContact: '司機王師傅 13700137001'
  }
];

for (const card of dailyCards) {
  await connection.execute(
    `INSERT INTO dailyCards (groupId, date, dayNumber, breakfastRestaurant, breakfastAddress, lunchRestaurant, lunchAddress, dinnerRestaurant, dinnerAddress, accommodation, accommodationAddress, vehicle, vehicleContact, createdBy, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      card.groupId,
      card.date,
      card.dayNumber,
      card.breakfastRestaurant,
      card.breakfastAddress,
      card.lunchRestaurant,
      card.lunchAddress,
      card.dinnerRestaurant,
      card.dinnerAddress,
      card.accommodation,
      card.accommodationAddress,
      card.vehicle,
      card.vehicleContact,
      1
    ]
  );
}
console.log(`✅ 食行卡片創建成功，共 ${dailyCards.length} 張`);

await connection.end();
console.log('\n🎉 10月江蘇交流團真實數據導入完成！');
console.log(`項目ID: ${projectId}`);
console.log(`團組數量: ${groupIds.length}`);
console.log(`行程點總數: ${primaryItineraries.length + middleItineraries.length + highItineraries.length}`);
console.log(`食行卡片總數: ${dailyCards.length}`);
