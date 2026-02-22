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
  tags: text("tags"), // 標籤
  contact: varchar("contact", { length: 100 }), // 聯系人
  phone: varchar("phone", { length: 50 }), // 聯系電話
  emergencyContact: varchar("emergencyContact", { length: 100 }), // 緊急聯系人
  emergencyPhone: varchar("emergencyPhone", { length: 50 }), // 緊急電話
  notes: text("notes"), // 備註
  requiredItineraries: json("requiredItineraries").$type<number[]>(), // 必去景點 ID 數組
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
  breakfastRestaurant: varchar("breakfastRestaurant", { length: 255 }),
  breakfastAddress: text("breakfastAddress"),
  lunchRestaurant: varchar("lunchRestaurant", { length: 255 }),
  lunchAddress: text("lunchAddress"),
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
  // 可容納人數
  capacity: int("capacity"),
  // 不可用時間段（JSON格式），例如：[{"day": "monday", "startTime": "09:00", "endTime": "17:00"}]
  unavailableTimeSlots: json("unavailableTimeSlots"),
  // 是否全天不可用（例如永久關閉的景點）
  isAlwaysUnavailable: boolean("isAlwaysUnavailable").default(false).notNull(),
  // 開放時間（JSON格式），例如：{"monday": {"open": "09:00", "close": "17:00"}, ...}
  openingHours: json("openingHours"),
  // 休館日（JSON格式），例如：["2024-01-01", "2024-12-25"]
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
 * 通知表 - 存儲系統通知
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
