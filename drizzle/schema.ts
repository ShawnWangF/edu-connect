import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, boolean, json } from "drizzle-orm/mysql-core";

/**
 * 用戶表 - 支持三級權限體系
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(), // 用於本地登錄
  password: varchar("password", { length: 255 }), // 加密後的密碼
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "editor", "viewer"]).default("viewer").notNull(),
  isOnline: boolean("isOnline").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * 項目表 - 存儲項目基本信息（一個項目包含多個團組）
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).unique().notNull(), // 項目編號
  name: varchar("name", { length: 255 }).notNull(), // 項目名稱
  description: text("description"), // 項目描述
  startDate: date("startDate").notNull(), // 開始日期
  endDate: date("endDate").notNull(), // 結束日期
  totalStudents: int("totalStudents").default(0).notNull(), // 總學生數
  totalTeachers: int("totalTeachers").default(0).notNull(), // 總教師數
  status: mysqlEnum("status", ["preparing", "ongoing", "completed", "cancelled"]).default("preparing").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 批次表 - 多個團組的打包容器（共享抵離窗口）
 * 同一批次的團組必須在同一天抵達、同一天離開
 */
export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(), // 所屬項目
  code: varchar("code", { length: 64 }).notNull(), // 批次編號，如「批次1」、「批次2」
  name: varchar("name", { length: 255 }), // 批次名稱（可選）
  arrivalDate: date("arrivalDate"), // 計劃抵達日期（同批次所有團組共享）
  departureDate: date("departureDate"), // 計劃離開日期（同批次所有團組共享）
  arrivalFlight: varchar("arrivalFlight", { length: 100 }), // 抵達航班號
  departureFlight: varchar("departureFlight", { length: 100 }), // 離開航班號
  arrivalTime: varchar("arrivalTime", { length: 10 }), // 抵達時間
  departureTime: varchar("departureTime", { length: 10 }), // 離開時間
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 團組表 - 存儲團組基本信息
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"), // 所屬項目 ID，可為空表示獨立團組
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).unique().notNull(), // 團組編號
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  days: int("days").notNull(), // 行程天數
  type: json("type").$type<string[]>().notNull(), // 支持多選和自定義類型
  status: mysqlEnum("status", ["preparing", "ongoing", "completed", "cancelled"]).default("preparing").notNull(),
  studentCount: int("studentCount").default(0).notNull(),
  teacherCount: int("teacherCount").default(0).notNull(),
  totalCount: int("totalCount").default(0).notNull(),
  hotel: text("hotel"), // 住宿酒店
  color: varchar("color", { length: 7 }).default("#52c41a"), // 標識顏色
  tags: json("tags").$type<Record<string, string>>(), // 標籤（JSON 格式，支持 exchangeDate 等結構化數據）
  contact: varchar("contact", { length: 100 }), // 聯系人
  phone: varchar("phone", { length: 50 }), // 聯系電話
  emergencyContact: varchar("emergencyContact", { length: 100 }), // 緊急聯系人
  emergencyPhone: varchar("emergencyPhone", { length: 50 }), // 緊急電話
  notes: text("notes"), // 備註
  requiredItineraries: json("requiredItineraries").$type<number[]>(), // 必去景點 ID 數組
  // 排程總覽相關字段
  batch_id: int("batch_id"), // 關聯批次 ID（batches 表），同批次的團組共享同一批次
  batch_code: varchar("batch_code", { length: 32 }), // 批次編號冗餘字段（方便顯示）
  start_city: varchar("start_city", { length: 10 }), // 起始城市（sz/hk/macau），即第一天落地城市
  crossing_date: date("crossing_date"), // 過關日期（從起始城市過關到另一個城市的日期）
  sister_school_id: int("sister_school_id"), // 指定的交流學校 ID（schools 表），創建時指定
  flight_info: json("flight_info").$type<{ arrivalFlight?: string; arrivalTime?: string; departureFlight?: string; departureTime?: string }>(), // 航班信息
  school_list: json("school_list").$type<Array<{ name: string; studentCount: number; teacherCount?: number }>>(), // 學校分組列表（每個項目重新配置）
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 行程表 - 存儲每日行程安排
 */
export const itineraries = mysqlTable("itineraries", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  date: date("date").notNull(),
  dayNumber: int("dayNumber").notNull(), // 第幾天
  startTime: varchar("startTime", { length: 10 }), // 開始時間 HH:mm
  endTime: varchar("endTime", { length: 10 }), // 結束時間 HH:mm
  locationId: int("locationId"), // 關聯景點
  locationName: varchar("locationName", { length: 255 }), // 地點名稱
  description: text("description"), // 行程描述
  notes: text("notes"), // 備註
  sortOrder: int("sortOrder").default(0).notNull(), // 排序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 食行卡片表 - 存儲每日詳細安排
 */
export const dailyCards = mysqlTable("dailyCards", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  date: date("date").notNull(),
  
  // 交通安排
  departureTime: varchar("departureTime", { length: 10 }),
  arrivalTime: varchar("arrivalTime", { length: 10 }),
  departurePlace: varchar("departurePlace", { length: 255 }),
  arrivalPlace: varchar("arrivalPlace", { length: 255 }),
  transportContact: varchar("transportContact", { length: 100 }),
  flightNumber: varchar("flightNumber", { length: 50 }),
  airline: varchar("airline", { length: 100 }),
  terminal: varchar("terminal", { length: 50 }),
  transportNotes: text("transportNotes"),
  
  // 天氣信息
  departureCity: varchar("departureCity", { length: 100 }),
  arrivalCity: varchar("arrivalCity", { length: 100 }),
  weatherData: json("weatherData"), // 存儲天氣JSON數據
  
  // 住宿信息
  hotelId: int("hotelId"), // 關聯酒店資源ID
  hotelName: varchar("hotelName", { length: 255 }),
  hotelAddress: text("hotelAddress"),
  
  // 車輛安排
  vehicleId: int("vehicleId"), // 關聯車輛ID
  vehiclePlate: varchar("vehiclePlate", { length: 50 }),
  driverName: varchar("driverName", { length: 100 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  
  // 導遊安排
  guideId: int("guideId"), // 關聯導過ID
  guideName: varchar("guideName", { length: 100 }),
  guidePhone: varchar("guidePhone", { length: 50 }),
  
  // 安保安排
  securityId: int("securityId"), // 關聯安保ID
  securityName: varchar("securityName", { length: 100 }),
  securityPhone: varchar("securityPhone", { length: 50 }),
  
  // 餐飲安排
  breakfastRestaurantId: int("breakfastRestaurantId"), // 關聯餐廳資源ID
  breakfastRestaurant: varchar("breakfastRestaurant", { length: 255 }),
  breakfastAddress: text("breakfastAddress"),
  lunchRestaurantId: int("lunchRestaurantId"), // 關聯餐廳資源ID
  lunchRestaurant: varchar("lunchRestaurant", { length: 255 }),
  lunchAddress: text("lunchAddress"),
  dinnerRestaurantId: int("dinnerRestaurantId"), // 關聯餐廳資源ID
  dinnerRestaurant: varchar("dinnerRestaurant", { length: 255 }),
  dinnerAddress: text("dinnerAddress"),
  
  // 特殊備註
  specialNotes: text("specialNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 人員表 - 存儲團組成員信息
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  identity: mysqlEnum("identity", ["student", "teacher", "staff", "other"]).notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  phone: varchar("phone", { length: 50 }),
  idCard: varchar("idCard", { length: 50 }), // 身份證號
  notes: text("notes"),
  customFields: json("customFields"), // 存儲自定義字段（Excel導入的額外字段）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 景點資源表
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  capacity: int("capacity").default(0).notNull(),
  applicableType: mysqlEnum("applicableType", ["all", "elementary", "middle", "vip"]).default("all").notNull(),
  restrictedDays: varchar("restrictedDays", { length: 100 }), // 受限日期，逗號分隔
  maxCapacity: int("maxCapacity"), // 最大承接量（超過此人數觸發超載警告）
  closedDays: json("closedDays").$type<number[]>(), // 每週固定休館日（0=週日,1=週一,...,6=週六）
  openingHours: varchar("openingHours", { length: 100 }), // 開放時間（文字描述）
  contact: varchar("contact", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 行程方案模板表
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  days: int("days").notNull(),
  applicableTypes: json("applicableTypes").$type<string[]>(), // 適用的團組類型
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 住宿資源表
 */
export const hotels = mysqlTable("hotels", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  contact: varchar("contact", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  roomCount: int("roomCount").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 車輛資源表
 */
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  plate: varchar("plate", { length: 50 }).notNull().unique(),
  driverName: varchar("driverName", { length: 100 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  capacity: int("capacity").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 快照表 - 版本控制
 */
export const snapshots = mysqlTable("snapshots", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["manual", "auto"]).notNull(),
  summary: text("summary"), // 摘要信息
  token: varchar("token", { length: 64 }).unique().notNull(),
  data: json("data").notNull(), // 存儲快照數據JSON
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 文件表 - 存儲上傳的文件信息
 */
export const files = mysqlTable("files", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId"), // 關聯團組，可為空表示通用文件
  name: varchar("name", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3文件鍵
  url: text("url").notNull(), // S3文件URL
  mimeType: varchar("mimeType", { length: 100 }),
  size: int("size"), // 文件大小（字節）
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 景點資源表 - 存儲景點信息和不可用時間
 */
export const attractions = mysqlTable("attractions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  // 地點（用於Google Maps自動補全）
  location: text("location"),
  // 詳細地址
  address: text("address"),
  description: text("description"),
  // 可容納人數（一般容量）
  capacity: int("capacity"),
  // 最大承接量（同時最多可接待的人數，超過則觸發超載警告）
  maxCapacity: int("maxCapacity"),
  // 不可用時間段（JSON格式），例如：[{"day": "monday", "startTime": "09:00", "endTime": "17:00"}]
  unavailableTimeSlots: json("unavailableTimeSlots"),
  // 是否全天不可用（例如永久關閉的景點）
  isAlwaysUnavailable: boolean("isAlwaysUnavailable").default(false).notNull(),
  // 開放時間（JSON格式），例如：{"monday": {"open": "09:00", "close": "17:00"}, ...}
  openingHours: json("openingHours"),
  // 休館日（JSON格式）：支持兩種格式混用
  //   每週固定休館日：["monday", "tuesday", ...] （0=週日, 1=週一, ..., 6=週六）
  //   特定日期休館：["2024-01-01", "2024-12-25"]
  //   混合格式：["monday", "2024-01-01"]
  closedDays: json("closedDays"),
  // 是否需要預約
  requiresBooking: boolean("requiresBooking").default(false).notNull(),
  // 提前預約天數
  bookingLeadTime: int("bookingLeadTime"),
  // 對接人姓名
  contactPerson: varchar("contactPerson", { length: 100 }),
  // 對接人電話
  contactPhone: varchar("contactPhone", { length: 50 }),
  // 備註
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 餐廳資源表
 */
export const restaurants = mysqlTable("restaurants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  capacity: int("capacity").default(0).notNull(), // 可容納人數
  cuisine: varchar("cuisine", { length: 100 }), // 菜系
  priceRange: varchar("priceRange", { length: 50 }), // 價格區間
  businessHours: varchar("businessHours", { length: 200 }), // 營業時間
  specialties: text("specialties"), // 特色菜品
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 學校資源表
 */
/**
 * 交流學校表（港澳）- 存儲港澳交流學校信息
 */
export const exchangeSchools = mysqlTable("exchangeSchools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  region: varchar("region", { length: 50 }), // 地區：香港/澳門
  contactPerson: varchar("contactPerson", { length: 100 }), // 聯繫人
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 100 }),
  receptionProcess: text("receptionProcess"), // 接待流程
  availableDates: json("availableDates").$type<string[]>(), // 可交流日期數組
  schoolType: varchar("schoolType", { length: 50 }), // 學校類型：小學/中學/大學
  maxGroupSize: int("maxGroupSize").default(50), // 最大接待團組人數
  capacity: int("capacity").default(0), // 可接待人數
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 前來交流學校表（內地）- 存儲內地前來交流的學校信息
 */
export const domesticSchools = mysqlTable("domesticSchools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  studentCount: int("studentCount").default(0), // 學生人數
  teacherCount: int("teacherCount").default(0), // 教師人數
  contactPerson: varchar("contactPerson", { length: 100 }), // 聯繫人
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 舊的 schools 表 - 保留以支持向後兼容
 */
export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  region: varchar("region", { length: 50 }), // 地區：香港/澳門
  contactPerson: varchar("contactPerson", { length: 100 }), // 聯繫人
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 100 }),
  receptionProcess: text("receptionProcess"), // 接待流程
  availableTimeSlots: json("availableTimeSlots"), // 可交流時段 JSON
  schoolType: varchar("schoolType", { length: 50 }), // 學校類型：小學/中學/大學
  maxGroupSize: int("maxGroupSize").default(50), // 最大接待團組人數
  capacity: int("capacity").default(0), // 可接待人數
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 模板行程點表
 */
export const templateItineraries = mysqlTable("templateItineraries", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(), // 關聯模板
  dayNumber: int("dayNumber").notNull(), // 第幾天
  timeSlot: varchar("timeSlot", { length: 20 }), // 時段：上午/下午/晚上
  startTime: varchar("startTime", { length: 10 }), // 開始時間 HH:mm
  endTime: varchar("endTime", { length: 10 }), // 結束時間 HH:mm
  locationId: int("locationId"), // 關聯景點資源（attractions表）
  locationName: varchar("locationName", { length: 255 }), // 地點名稱（備用）
  description: text("description"), // 行程描述
  sortOrder: int("sortOrder").default(0).notNull(), // 排序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 導遊資源表
 */
export const guides = mysqlTable("guides", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  languages: text("languages"), // 語言能力，逗號分隔
  specialties: text("specialties"), // 專長領域
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 安保人員資源表
 */
export const securities = mysqlTable("securities", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  idCard: varchar("idCard", { length: 50 }), // 證件號
  company: varchar("company", { length: 255 }), // 所屬公司
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 行程人员关联表 - 记录人员与行程的关系
 */
export const itineraryMembers = mysqlTable("itineraryMembers", {
  id: int("id").autoincrement().primaryKey(),
  itineraryId: int("itineraryId").notNull(), // 关联行程 ID
  memberId: int("memberId").notNull(), // 关联人员 ID
  role: mysqlEnum("role", ["guide", "staff", "security", "coordinator", "other"]).default("staff").notNull(), // 人员角色
  assignedAt: timestamp("assignedAt").defaultNow().notNull(), // 指派时间
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 人员状态表 - 监控人员在行程中的状态
 */
export const memberStatus = mysqlTable("memberStatus", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(), // 关联人员 ID
  itineraryId: int("itineraryId").notNull(), // 关联行程 ID
  status: mysqlEnum("status", ["pending", "assigned", "in_progress", "completed", "absent", "cancelled"]).default("pending").notNull(), // 人员状态
  checkInTime: timestamp("checkInTime"), // 签到时间
  checkOutTime: timestamp("checkOutTime"), // 签退时间
  notes: text("notes"), // 备注
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 通知表 - 存储系统通知
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 接收通知的用戶
  type: mysqlEnum("type", ["reminder", "deadline", "departure", "change"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  relatedGroupId: int("relatedGroupId"), // 關聯的團組
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;
export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = typeof itineraries.$inferInsert;
export type DailyCard = typeof dailyCards.$inferSelect;
export type InsertDailyCard = typeof dailyCards.$inferInsert;
export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = typeof hotels.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type InsertSnapshot = typeof snapshots.$inferInsert;
export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Attraction = typeof attractions.$inferSelect;
export type InsertAttraction = typeof attractions.$inferInsert;
export type Guide = typeof guides.$inferSelect;
export type InsertGuide = typeof guides.$inferInsert;
export type Security = typeof securities.$inferSelect;
export type InsertSecurity = typeof securities.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = typeof restaurants.$inferInsert;
export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export type TemplateItinerary = typeof templateItineraries.$inferSelect;
export type InsertTemplateItinerary = typeof templateItineraries.$inferInsert;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type InsertScheduleBlock = typeof scheduleBlocks.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;
export type BatchStaff = typeof batchStaff.$inferSelect;
export type InsertBatchStaff = typeof batchStaff.$inferInsert;
export type ExchangeSchoolAvailability = typeof exchangeSchoolAvailability.$inferSelect;
export type InsertExchangeSchoolAvailability = typeof exchangeSchoolAvailability.$inferInsert;
export type BatchExchangeSchool = typeof batchExchangeSchools.$inferSelect;
export type InsertBatchExchangeSchool = typeof batchExchangeSchools.$inferInsert;
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = typeof batches.$inferInsert;

/**
 * 日程色塊表 - 排程總覽儀表板的核心數據
 * 每個色塊代表某個批次在某天的狀態
 */
export const scheduleBlocks = mysqlTable("scheduleBlocks", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // 關聯批次（groups表）
  date: date("date").notNull(), // 日期
  blockType: mysqlEnum("blockType", [
    "sz_arrive",    // 抵達深圳（淺藍）
    "sz_stay",      // 在深圳（淺藍）
    "hk_arrive",    // 抵達香港（較深藍）
    "hk_stay",      // 在香港（較深藍）
    "exchange",     // 交流日（深藍★）
    "border_sz_hk", // 過關：深圳→香港（黃色）
    "border_hk_sz", // 過關：香港→深圳（黃色）
    "departure",    // 離開（灰色）
    "free"          // 空白/未安排
  ]).notNull().default("free"),
  isExchangeDay: boolean("isExchangeDay").default(false).notNull(), // 是否為交流日（★）
  exchangeSchoolId: int("exchangeSchoolId"), // 關聯的交流學校
  flightNumber: varchar("flightNumber", { length: 50 }), // 航班號
  flightTime: varchar("flightTime", { length: 10 }), // 航班時間
  busInfo: text("busInfo"), // 巴士信息
  hotelCity: mysqlEnum("hotelCity", ["sz", "hk", "macau", "other"]), // 當晚住宿城市
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 工作人員表 - 總統籌、工作人員、導遊、司機
 */
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["coordinator", "staff", "guide", "driver"]).notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 100 }),
  wechat: varchar("wechat", { length: 100 }),
  languages: text("languages"), // 語言能力（導遊用）
  licenseNumber: varchar("licenseNumber", { length: 50 }), // 駕照/導遊證號
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 批次工作人員指派表 - 記錄哪些工作人員被指派到哪個批次
 */
export const batchStaff = mysqlTable("batchStaff", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // 關聯團組（groups 表）
  staffId: int("staffId").notNull(), // 關聯工作人員
  role: mysqlEnum("role", ["coordinator", "staff", "guide", "driver"]).notNull(), // 在此任務的角色
  // 行程點級別指派字段
  date: date("date"), // 具體指派日期（必填）
  itineraryId: int("itineraryId"), // 關聯 itineraries 表（可為空，空表示全天指派）
  taskName: varchar("taskName", { length: 255 }), // 行程點名稱（如「太空館」「海洋公園」）
  startTime: varchar("startTime", { length: 10 }), // 任務開始時間 HH:mm（可選）
  endTime: varchar("endTime", { length: 10 }), // 任務結束時間 HH:mm（可選）
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * 交流學校可用日表 - 記錄香港/澳門學校的可交流日期
 */
export const exchangeSchoolAvailability = mysqlTable("exchangeSchoolAvailability", {
  id: int("id").autoincrement().primaryKey(),
  schoolId: int("schoolId").notNull(), // 關聯 schools 表
  date: date("date").notNull(), // 可用日期
  isAvailable: boolean("isAvailable").default(true).notNull(),
  availableTimeStart: varchar("availableTimeStart", { length: 10 }), // 可用開始時間
  availableTimeEnd: varchar("availableTimeEnd", { length: 10 }), // 可用結束時間
  maxGroups: int("maxGroups").default(1), // 當天最多接待幾個批次
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * 批次與交流學校配對表
 */
export const batchExchangeSchools = mysqlTable("batchExchangeSchools", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(), // 關聯批次
  schoolId: int("schoolId").notNull(), // 關聯交流學校
  plannedDate: date("plannedDate"), // 計劃交流日期
  confirmedDate: date("confirmedDate"), // 確認交流日期
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const schoolExchanges = mysqlTable("schoolExchanges", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  schoolId: int("schoolId").notNull(),
  exchangeDate: date("exchangeDate").notNull(),
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  activities: text("activities"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});


/**
 * Web Push 訂閱表 - 存儲用戶的推送通知訂閱信息
 */
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 關聯用戶
  endpoint: text("endpoint").notNull(), // 推送服務端點 URL
  p256dh: text("p256dh").notNull(), // 加密公鑰
  auth: varchar("auth", { length: 255 }).notNull(), // 認證密鑰
  userAgent: text("userAgent"), // 設備信息（可選，用於調試）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
