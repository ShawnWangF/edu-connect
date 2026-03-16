import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 查詢所有團組
const [groups] = await conn.execute('SELECT id, startDate, endDate, days, start_city FROM `groups` ORDER BY id');

// 景點 ID 對應（1=香港大學, 2=太空館, 3=維港, 4=海洋公園, 5=叮叮車, 6=環保課程, 7=蓮花山, 8=華大基因, 9=基因庫, 10=比亞迪, 11=南科大, 12=機器人展示館, 13=藝術館, 14=過關體驗）
const attractionMap = {
  hk_small: [1, 2, 3, 4, 5], // 香港進小學：香港大學、太空館、維港、海洋公園、叮叮車
  hk_middle: [1, 2, 3, 4, 5], // 香港進中學：香港大學、太空館、維港、海洋公園、叮叮車
  sz_small: [7, 8, 9], // 深圳進小學：蓮花山、華大基因、基因庫
  sz_middle: [7, 8, 10, 11, 12, 13], // 深圳進中學：蓮花山、華大基因、比亞迪、南科大、機器人展示館、藝術館
};

// 餐廳 ID 對應（香港：30001-30005, 深圳：30006-30009）
const restaurantMap = {
  hk: [30001, 30002, 30003, 30004, 30005],
  sz: [30006, 30007, 30008, 30009],
};

// 酒店 ID 對應（香港：1-4, 深圳：5-7）
const hotelMap = {
  hk: [1, 2, 3, 4],
  sz: [5, 6, 7],
};

// 時段配置
const timeSlots = [
  { period: '上午', startTime: '09:00', endTime: '12:00' },
  { period: '下午', startTime: '14:00', endTime: '17:00' },
  { period: '晚上', startTime: '19:00', endTime: '21:00' },
];

const itinerariesData = [];
const dailyCardsData = [];

for (const group of groups) {
  const groupId = group.id;
  const startDate = new Date(group.startDate);
  const city = group.start_city; // 'hk' or 'sz'
  const isSmall = group.id % 2 === 1; // 奇數為小學，偶數為中學
  const groupType = isSmall ? 'small' : 'middle';
  
  // 確定該組的景點列表
  const attractionKey = `${city}_${groupType}`;
  const attractions = attractionMap[attractionKey] || [];
  const restaurants = restaurantMap[city] || [];
  const hotels = hotelMap[city] || [];
  
  // 為每一天生成行程點和食行卡片
  for (let day = 1; day <= group.days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day - 1);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // 生成該天的行程點（景點）
    // 每天 1-3 個景點，分散在上午/下午/晚上
    const dayAttractions = attractions.slice((day - 1) % attractions.length, (day - 1) % attractions.length + 2);
    dayAttractions.forEach((attractionId, idx) => {
      const slot = timeSlots[idx % timeSlots.length];
      itinerariesData.push({
        groupId,
        date: dateStr,
        dayNumber: day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        locationId: attractionId,
        locationName: `景點 ${attractionId}`,
        description: `第 ${day} 天 ${slot.period}行程`,
        notes: null,
        sortOrder: idx,
      });
    });
    
    // 生成該天的食行卡片
    const restaurantIdx = (day - 1) % restaurants.length;
    const hotelIdx = (day - 1) % hotels.length;
    dailyCardsData.push({
      groupId,
      date: dateStr,
      departureTime: day === 1 ? '10:00' : '08:00',
      arrivalTime: day === group.days ? '18:00' : '17:00',
      departurePlace: day === 1 ? '出發地' : '上一城市',
      arrivalPlace: day === group.days ? '目的地' : city === 'hk' ? '香港' : '深圳',
      transportContact: '司機',
      flightNumber: day === 1 || day === group.days ? `CZ${3000 + groupId}` : null,
      airline: day === 1 || day === group.days ? 'China Southern' : null,
      terminal: day === 1 || day === group.days ? '1' : null,
      transportNotes: null,
      departureCity: day === 1 ? '出發城市' : city === 'hk' ? '深圳' : '香港',
      arrivalCity: city === 'hk' ? '香港' : '深圳',
      weatherData: null,
      hotelId: hotelIdx < hotels.length ? hotels[hotelIdx] : null,
      hotelName: hotelIdx < hotels.length ? `酒店 ${hotelIdx + 1}` : null,
      hotelAddress: hotelIdx < hotels.length ? `${city === 'hk' ? '香港' : '深圳'}地址` : null,
      vehicleId: null,
      vehiclePlate: `粵${String(groupId).slice(-3)}`,
      driverName: `司機 ${groupId}`,
      driverPhone: `13800${String(groupId).slice(-6)}`,
      guideId: null,
      guideName: `導遊 ${groupId}`,
      guidePhone: `13900${String(groupId).slice(-6)}`,
      securityId: null,
      securityName: null,
      securityPhone: null,
      breakfastRestaurant: restaurantIdx < restaurants.length ? `餐廳 ${restaurantIdx + 1}` : null,
      breakfastAddress: restaurantIdx < restaurants.length ? `${city === 'hk' ? '香港' : '深圳'}早餐地址` : null,
      lunchRestaurant: restaurantIdx < restaurants.length ? `餐廳 ${restaurantIdx + 1}` : null,
      lunchAddress: restaurantIdx < restaurants.length ? `${city === 'hk' ? '香港' : '深圳'}午餐地址` : null,
      dinnerRestaurant: restaurantIdx < restaurants.length ? `餐廳 ${restaurantIdx + 1}` : null,
      dinnerAddress: restaurantIdx < restaurants.length ? `${city === 'hk' ? '香港' : '深圳'}晚餐地址` : null,
      specialNotes: `第 ${day} 天食行卡片`,
    });
  }
}

// 批量插入 itineraries
if (itinerariesData.length > 0) {
  const itinerariesValues = itinerariesData.map(item => [
    item.groupId,
    item.date,
    item.dayNumber,
    item.startTime,
    item.endTime,
    item.locationId,
    item.locationName,
    item.description,
    item.notes,
    item.sortOrder,
  ]);
  
  const itinerariesSql = `
    INSERT INTO itineraries 
    (groupId, date, dayNumber, startTime, endTime, locationId, locationName, description, notes, sortOrder, createdAt, updatedAt)
    VALUES ?
  `;
  
  await conn.query(itinerariesSql, [itinerariesValues.map(v => [...v, new Date(), new Date()])]);
  console.log(`✓ 插入 ${itinerariesData.length} 條行程點`);
}

// 批量插入 dailyCards
if (dailyCardsData.length > 0) {
  const dailyCardsValues = dailyCardsData.map(item => [
    item.groupId,
    item.date,
    item.departureTime,
    item.arrivalTime,
    item.departurePlace,
    item.arrivalPlace,
    item.transportContact,
    item.flightNumber,
    item.airline,
    item.terminal,
    item.transportNotes,
    item.departureCity,
    item.arrivalCity,
    item.weatherData,
    item.hotelId,
    item.hotelName,
    item.hotelAddress,
    item.vehicleId,
    item.vehiclePlate,
    item.driverName,
    item.driverPhone,
    item.guideId,
    item.guideName,
    item.guidePhone,
    item.securityId,
    item.securityName,
    item.securityPhone,
    item.breakfastRestaurant,
    item.breakfastAddress,
    item.lunchRestaurant,
    item.lunchAddress,
    item.dinnerRestaurant,
    item.dinnerAddress,
    item.specialNotes,
  ]);
  
  const dailyCardsSql = `
    INSERT INTO dailyCards 
    (groupId, date, departureTime, arrivalTime, departurePlace, arrivalPlace, transportContact, flightNumber, airline, terminal, transportNotes, departureCity, arrivalCity, weatherData, hotelId, hotelName, hotelAddress, vehicleId, vehiclePlate, driverName, driverPhone, guideId, guideName, guidePhone, securityId, securityName, securityPhone, breakfastRestaurant, breakfastAddress, lunchRestaurant, lunchAddress, dinnerRestaurant, dinnerAddress, specialNotes, createdAt, updatedAt)
    VALUES ?
  `;
  
  await conn.query(dailyCardsSql, [dailyCardsValues.map(v => [...v, new Date(), new Date()])]);
  console.log(`✓ 插入 ${dailyCardsData.length} 條食行卡片`);
}

await conn.end();
console.log('✓ 數據填入完成');
