import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, groups, itineraries, dailyCards, members, locations, templates, hotels, vehicles, snapshots, files, notifications, attractions, guides, securities } from "../drizzle/schema";
import { ENV } from './_core/env';
import { createHash } from 'crypto';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// 密碼哈希函數
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// 驗證密碼
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword;
}

// 本地登錄驗證
export async function authenticateLocal(username: string, password: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot authenticate: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  
  if (result.length === 0) {
    return null;
  }

  const user = result[0];
  if (!user.password || !verifyPassword(password, user.password)) {
    return null;
  }

  // 更新最後登錄時間和在線狀態
  await db.update(users)
    .set({ lastSignedIn: new Date(), isOnline: true })
    .where(eq(users.id, user.id));

  return user;
}

// 更新用戶在線狀態
export async function updateUserOnlineStatus(userId: number, isOnline: boolean) {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({ isOnline })
    .where(eq(users.id, userId));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "username"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.password !== undefined) {
      values.password = user.password;
      updateSet.password = user.password;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// 用戶管理
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

export async function createUser(userData: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(userData);
  return result;
}

export async function updateUser(id: number, userData: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(userData).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, id));
}

// 團組管理
export async function getAllGroups() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(groups);
}

export async function getGroupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createGroup(groupData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(groups).values(groupData);
  return result;
}

export async function updateGroup(id: number, groupData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(groups).set(groupData).where(eq(groups.id, id));
}

export async function deleteGroup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(groups).where(eq(groups.id, id));
}

// 行程管理
export async function getItinerariesByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(itineraries).where(eq(itineraries.groupId, groupId));
}

export async function getAllItineraries() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(itineraries);
}

export async function createItinerary(itineraryData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(itineraries).values(itineraryData);
  return result;
}

export async function updateItinerary(id: number, itineraryData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(itineraries).set(itineraryData).where(eq(itineraries.id, id));
}

export async function deleteItinerary(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(itineraries).where(eq(itineraries.id, id));
}

// 食行卡片管理
export async function getDailyCardsByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(dailyCards).where(eq(dailyCards.groupId, groupId));
}

export async function getDailyCardByGroupAndDate(groupId: number, date: Date) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(dailyCards)
    .where(and(eq(dailyCards.groupId, groupId), eq(dailyCards.date, date)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertDailyCard(cardData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getDailyCardByGroupAndDate(cardData.groupId, cardData.date);
  
  if (existing) {
    await db.update(dailyCards).set(cardData).where(eq(dailyCards.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(dailyCards).values(cardData);
    return result;
  }
}

// 人員管理
export async function getMembersByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(members).where(eq(members.groupId, groupId));
}

export async function createMember(memberData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(members).values(memberData);
  return result;
}

export async function updateMember(id: number, memberData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(members).set(memberData).where(eq(members.id, id));
}

export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(members).where(eq(members.id, id));
}

// 景點資源管理
export async function getAllLocations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(locations);
}

export async function createLocation(locationData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(locations).values(locationData);
  return result;
}

export async function updateLocation(id: number, locationData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(locations).set(locationData).where(eq(locations.id, id));
}

export async function deleteLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(locations).where(eq(locations.id, id));
}

// 快照管理
export async function getAllSnapshots() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(snapshots);
}

export async function createSnapshot(snapshotData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(snapshots).values(snapshotData);
  return result;
}

// 通知管理
export async function getNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function createNotification(notificationData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(notificationData);
  return result;
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// 文件管理
export async function getFilesByGroupId(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(files).where(eq(files.groupId, groupId));
}

export async function getAllFiles() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(files);
}

export async function createFile(fileData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(files).values(fileData);
  return result;
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(files).where(eq(files.id, id));
}

// 景點資源管理
export async function getAllAttractions() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(attractions);
}

export async function getAttractionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(attractions).where(eq(attractions.id, id));
  return result[0] || null;
}

export async function createAttraction(attractionData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(attractions).values(attractionData);
  return result;
}

export async function updateAttraction(id: number, attractionData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(attractions).set(attractionData).where(eq(attractions.id, id));
}

export async function deleteAttraction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(attractions).where(eq(attractions.id, id));
}

// 酒店資源管理
export async function getAllHotels() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(hotels);
}

export async function getHotelById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(hotels).where(eq(hotels.id, id));
  return result[0] || null;
}

export async function createHotel(hotelData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(hotels).values(hotelData);
  return result;
}

export async function updateHotel(id: number, hotelData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(hotels).set(hotelData).where(eq(hotels.id, id));
}

export async function deleteHotel(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(hotels).where(eq(hotels.id, id));
}

// 車輛資源管理
export async function getAllVehicles() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(vehicles);
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(vehicles).where(eq(vehicles.id, id));
  return result[0] || null;
}

export async function createVehicle(vehicleData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(vehicles).values(vehicleData);
  return result;
}

export async function updateVehicle(id: number, vehicleData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(vehicles).set(vehicleData).where(eq(vehicles.id, id));
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(vehicles).where(eq(vehicles.id, id));
}

// 導遊資源管理
export async function getAllGuides() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(guides);
}

export async function getGuideById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(guides).where(eq(guides.id, id));
  return result[0] || null;
}

export async function createGuide(guideData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(guides).values(guideData);
  return result;
}

export async function updateGuide(id: number, guideData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(guides).set(guideData).where(eq(guides.id, id));
}

export async function deleteGuide(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(guides).where(eq(guides.id, id));
}

// 安保人員資源管理
export async function getAllSecurities() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(securities);
}

export async function getSecurityById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(securities).where(eq(securities.id, id));
  return result[0] || null;
}

export async function createSecurity(securityData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(securities).values(securityData);
  return result;
}

export async function updateSecurity(id: number, securityData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(securities).set(securityData).where(eq(securities.id, id));
}

export async function deleteSecurity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(securities).where(eq(securities.id, id));
}
