import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { nanoid } from "nanoid";
import * as notificationService from "./notificationService";
import webpush from "web-push";
import { pushSubscriptions as pushSubTable } from "../drizzle/schema";
import { eq, inArray, and, gte, lte, isNotNull } from "drizzle-orm";

// 初始化 VAPID 配置
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@hkeiu.org',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// 發送 Web Push 通知給所有訂閱者（或指定用戶）
async function sendWebPushToAll(payload: { title: string; body: string; url?: string }, userIds?: number[]) {
  try {
    const dbConn = await db.getDb();
    if (!dbConn) return 0;
    // 查詢訂閱列表
    let rows: any[];
    if (userIds && userIds.length > 0) {
      rows = await dbConn.select().from(pushSubTable).where(inArray(pushSubTable.userId, userIds));
    } else {
      rows = await dbConn.select().from(pushSubTable);
    }
    if (!rows || rows.length === 0) return 0;
    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      timestamp: Date.now(),
    });
    const results = await Promise.allSettled(
      rows.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        )
      )
    );
    // 清理失效訂閱（410 Gone）
    const toDelete: string[] = [];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as any;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          toDelete.push(rows[i].endpoint);
        }
      }
    });
    if (toDelete.length > 0) {
      for (const ep of toDelete) {
        await dbConn.delete(pushSubTable).where(eq(pushSubTable.endpoint, ep));
      }
    }
    return results.filter(r => r.status === 'fulfilled').length;
  } catch (e) {
    console.error('sendWebPushToAll error:', e);
    return 0;
  }
}

// 權限檢查中間件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

const editorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role === 'viewer') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '查看者無法執行此操作' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    // 本地登錄
    loginLocal: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.authenticateLocal(input.username, input.password);
        
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '用戶名或密碼錯誤' });
        }
        
        // 更新用戶在線狀態
        await db.updateUserOnlineStatus(user.id, true);
        
        // 創建 session token 並設置 cookie
        const { sdk } = await import('./_core/sdk');
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.username || '',
          expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1年
        });
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1年
        });
        
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
          },
        };
      }),
    
    logout: publicProcedure.mutation(async ({ ctx }) => {
      if (ctx.user) {
        await db.updateUserOnlineStatus(ctx.user.id, false);
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  
  // 用戶管理（僅管理員）
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    create: adminProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
        name: z.string(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'editor', 'viewer']),
      }))
      .mutation(async ({ input }) => {
        const hashedPassword = db.hashPassword(input.password);
        await db.createUser({
          openId: `local-${nanoid()}`,
          username: input.username,
          password: hashedPassword,
          name: input.name,
          email: input.email,
          role: input.role,
          loginMethod: 'local',
          isOnline: false,
        });
        return { success: true };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'editor', 'viewer']).optional(),
        password: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;
        if (input.role) updateData.role = input.role;
        if (input.password) updateData.password = db.hashPassword(input.password);
        
        await db.updateUser(input.id, updateData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),
  }),
  
  // 團組管理
  // 項目管理
  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjects();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id);
      }),
    
    create: editorProcedure
      .input(z.object({
        code: z.string(),
        name: z.string(),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
        totalStudents: z.number().optional(),
        totalTeachers: z.number().optional(),
        status: z.enum(['preparing', 'ongoing', 'completed', 'cancelled']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createProject({
          ...input,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          createdBy: ctx.user.id,
        });
        return { success: true, result };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        totalStudents: z.number().optional(),
        totalTeachers: z.number().optional(),
        status: z.enum(['preparing', 'ongoing', 'completed', 'cancelled']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.startDate) updateData.startDate = new Date(data.startDate);
        if (data.endDate) updateData.endDate = new Date(data.endDate);
        
        const result = await db.updateProject(id, updateData);
        return { success: true, result };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.deleteProject(input.id);
        return { success: true, result };
      }),
    
    getGroups: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupsByProjectId(input.projectId);
      }),
  }),
  
  // 批次管理（多個團組的打包容器，共享抵離窗口）
  batches: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { batches, groups: groupsTable } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) return [];
        // 查詢批次，並附帶每個批次下的團組
        const batchList = await dbConn.select().from(batches).where(eq(batches.projectId, input.projectId));
        const groupList = await dbConn.select().from(groupsTable).where(eq(groupsTable.projectId, input.projectId));
        return batchList.map(batch => ({
          ...batch,
          groups: groupList.filter(g => g.batch_id === batch.id),
        }));
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { batches, groups: groupsTable } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) return null;
        const result = await dbConn.select().from(batches).where(eq(batches.id, input.id)).limit(1);
        if (!result[0]) return null;
        const groups = await dbConn.select().from(groupsTable).where(eq(groupsTable.batch_id, input.id));
        return { ...result[0], groups };
      }),

    create: editorProcedure
      .input(z.object({
        projectId: z.number(),
        code: z.string(),
        name: z.string().optional(),
        arrivalDate: z.string().optional(),
        departureDate: z.string().optional(),
        arrivalFlight: z.string().optional(),
        departureFlight: z.string().optional(),
        arrivalTime: z.string().optional(),
        departureTime: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { batches } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database not available');
        const result = await dbConn.insert(batches).values({
          ...input,
          arrivalDate: input.arrivalDate ? new Date(input.arrivalDate) as any : undefined,
          departureDate: input.departureDate ? new Date(input.departureDate) as any : undefined,
          createdBy: ctx.user.id,
        });
        return { success: true, id: Number((result as any).insertId) };
      }),

    update: editorProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().optional(),
        name: z.string().optional(),
        arrivalDate: z.string().optional(),
        departureDate: z.string().optional(),
        arrivalFlight: z.string().optional(),
        departureFlight: z.string().optional(),
        arrivalTime: z.string().optional(),
        departureTime: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { batches } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database not available');
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.arrivalDate) updateData.arrivalDate = new Date(data.arrivalDate);
        if (data.departureDate) updateData.departureDate = new Date(data.departureDate);
        await dbConn.update(batches).set(updateData).where(eq(batches.id, id));
        return { success: true };
      }),

    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { batches, groups: groupsTable } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database not available');
        // 解除該批次下所有團組的 batchId 關聯
        await dbConn.update(groupsTable).set({ batch_id: null } as any).where(eq(groupsTable.batch_id, input.id));
        await dbConn.delete(batches).where(eq(batches.id, input.id));
        return { success: true };
      }),

    // 排程統計接口：返回每日航班需求和住宿需求
    getScheduleStats: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const { scheduleBlocks, groups: groupsTable } = await import('../drizzle/schema');
        const { getDb } = await import('./db');
        const { eq, inArray } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) return { dailyFlights: {}, dailyAccommodation: {} };

        const projectGroups = await dbConn.select().from(groupsTable).where(eq(groupsTable.projectId, input.projectId));
        if (!projectGroups.length) return { dailyFlights: {}, dailyAccommodation: {} };

        const groupIds = projectGroups.map(g => g.id);
        const blocks = await dbConn.select().from(scheduleBlocks).where(inArray(scheduleBlocks.groupId, groupIds));

        // 按日期統計航班需求
        const dailyFlights: Record<string, { arrivals: string[]; departures: string[]; arrivalCount: number; departureCount: number }> = {};
        const dailyAccommodation: Record<string, { hk: number; sz: number; total: number }> = {};

        for (const block of blocks) {
          const dateStr = typeof block.date === 'string' ? block.date : (block.date as Date).toISOString().split('T')[0];
          const group = projectGroups.find(g => g.id === block.groupId);
          const groupTotal = (group?.totalCount || 0);

          // 航班統計
          if (block.blockType === 'sz_arrive' || block.blockType === 'hk_arrive') {
            if (!dailyFlights[dateStr]) dailyFlights[dateStr] = { arrivals: [], departures: [], arrivalCount: 0, departureCount: 0 };
            dailyFlights[dateStr].arrivalCount++;
            if (block.flightNumber) dailyFlights[dateStr].arrivals.push(block.flightNumber);
            else if (group?.code) dailyFlights[dateStr].arrivals.push(group.code);
          }
          if (block.blockType === 'departure') {
            if (!dailyFlights[dateStr]) dailyFlights[dateStr] = { arrivals: [], departures: [], arrivalCount: 0, departureCount: 0 };
            dailyFlights[dateStr].departureCount++;
            if (block.flightNumber) dailyFlights[dateStr].departures.push(block.flightNumber);
            else if (group?.code) dailyFlights[dateStr].departures.push(group.code);
          }

          // 住宿統計（根據 hotelCity 字段）
          if (block.hotelCity === 'hk' || block.hotelCity === 'sz') {
            if (!dailyAccommodation[dateStr]) dailyAccommodation[dateStr] = { hk: 0, sz: 0, total: 0 };
            if (block.hotelCity === 'hk') dailyAccommodation[dateStr].hk += groupTotal;
            if (block.hotelCity === 'sz') dailyAccommodation[dateStr].sz += groupTotal;
            dailyAccommodation[dateStr].total += groupTotal;
          }
        }

        return { dailyFlights, dailyAccommodation };
      }),
  }),

  groups: router({
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { groups: groupsTable } = await import('../drizzle/schema');
      const { sql } = await import('drizzle-orm');
      return await dbConn.select({
        id: groupsTable.id,
        projectId: groupsTable.projectId,
        name: groupsTable.name,
        code: groupsTable.code,
        startDate: sql<string>`DATE_FORMAT(${groupsTable.startDate}, '%Y-%m-%d')`,
        endDate: sql<string>`DATE_FORMAT(${groupsTable.endDate}, '%Y-%m-%d')`,
        days: groupsTable.days,
        type: groupsTable.type,
        status: groupsTable.status,
        studentCount: groupsTable.studentCount,
        teacherCount: groupsTable.teacherCount,
        totalCount: groupsTable.totalCount,
        hotel: groupsTable.hotel,
        color: groupsTable.color,
        tags: groupsTable.tags,
        contact: groupsTable.contact,
        phone: groupsTable.phone,
        emergencyContact: groupsTable.emergencyContact,
        emergencyPhone: groupsTable.emergencyPhone,
        notes: groupsTable.notes,
        requiredItineraries: groupsTable.requiredItineraries,
        batch_id: groupsTable.batch_id,
        batch_code: groupsTable.batch_code,
        start_city: groupsTable.start_city,
        crossing_date: sql<string>`DATE_FORMAT(${groupsTable.crossing_date}, '%Y-%m-%d')`,
        sister_school_id: groupsTable.sister_school_id,
        flight_info: groupsTable.flight_info,
        school_list: groupsTable.school_list,
        createdBy: groupsTable.createdBy,
      }).from(groupsTable);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getGroupById(input.id);
      }),
    
    create: editorProcedure
      .input(z.object({
        projectId: z.number().optional(),
        name: z.string(),
        code: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        days: z.number(),
        type: z.array(z.string()).min(1),
        studentCount: z.number().optional(),
        teacherCount: z.number().optional(),
        totalCount: z.number().optional(),
        hotel: z.string().optional(),
        color: z.string().optional(),
        tags: z.record(z.string(), z.string()).optional(), // JSON 物件，支持 exchangeDate 等結構化數據
        contact: z.string().optional(),
        phone: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        notes: z.string().optional(),
        // 排程總覽新字段
        batchId: z.number().optional(),
        batchCode: z.string().optional(),
        startCity: z.enum(['sz', 'hk', 'macau']).optional(),
        crossingDate: z.string().optional(),
        sisterSchoolId: z.number().optional(),
        flightInfo: z.object({
          arrivalFlight: z.string().optional(),
          arrivalTime: z.string().optional(),
          departureFlight: z.string().optional(),
          departureTime: z.string().optional(),
        }).optional(),
        schoolList: z.array(z.object({
          name: z.string(),
          studentCount: z.number(),
          teacherCount: z.number().optional(),
          domesticSchoolId: z.number().optional(), // 前來交流學校資源庫ID
          exchangeSchoolId: z.number().optional(), // 姊妹學校資源庫ID
          timeSlot: z.string().optional(), // 上午 / 下午 / 全天
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 將 camelCase 輸入字段映射為 schema 的 snake_case 屬性名
        const { batchId, batchCode, startCity, sisterSchoolId, flightInfo, schoolList, ...rest } = input as any;
        const mappedInput = {
          ...rest,
          ...(batchId !== undefined && { batch_id: batchId }),
          ...(batchCode !== undefined && { batch_code: batchCode }),
          ...(startCity !== undefined && { start_city: startCity }),
          ...(sisterSchoolId !== undefined && { sister_school_id: sisterSchoolId }),
          ...(flightInfo !== undefined && { flight_info: flightInfo }),
          ...(schoolList !== undefined && { school_list: schoolList }),
        };
        const result = await db.createGroup({
          ...mappedInput,
          createdBy: ctx.user.id,
        });
        
        // 獲取創建的團組信息
        const groups = await db.getAllGroups();
        const newGroup = groups[groups.length - 1]; // 最新創建的團組
        
        // 發送通知給全體成員
        if (newGroup) {
          notificationService.notifyGroupCreated(newGroup).catch(console.error);
        }
        
        return { success: true, groupId: newGroup?.id };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        days: z.number().optional(),
        type: z.array(z.string()).optional(),
        status: z.enum(['preparing', 'ongoing', 'completed', 'cancelled']).optional(),
        studentCount: z.number().optional(),
        teacherCount: z.number().optional(),
        totalCount: z.number().optional(),
        hotel: z.string().optional(),
        color: z.string().optional(),
        tags: z.record(z.string(), z.string()).optional(), // JSON 物件，支持 exchangeDate 等結構化數據
        contact: z.string().optional(),
        phone: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        notes: z.string().optional(),
        requiredItineraries: z.array(z.number()).optional(),
        // 排程總覽新字段
        batchId: z.number().optional(),
        batchCode: z.string().optional(),
        startCity: z.enum(['sz', 'hk', 'macau']).optional(),
        crossingDate: z.string().optional(),
        sisterSchoolId: z.number().optional(),
        flightInfo: z.object({
          arrivalFlight: z.string().optional(),
          arrivalTime: z.string().optional(),
          departureFlight: z.string().optional(),
          departureTime: z.string().optional(),
        }).optional(),
        exchangeDate: z.string().optional(), // 團組級別交流日期 YYYY-MM-DD
        schoolList: z.array(z.object({
          name: z.string(),
          studentCount: z.number(),
          teacherCount: z.number().optional(),
          domesticSchoolId: z.number().optional(), // 前來交流學校資源庫ID
          exchangeSchoolId: z.number().optional(), // 姊妹學校資源庫ID
          timeSlot: z.string().optional(), // 上午 / 下午 / 全天
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, batchId, batchCode, startCity, crossingDate, sisterSchoolId, flightInfo, schoolList, exchangeDate, ...rest } = input as any;
        
        // 獲取更新前的團組信息
        const oldGroup = await db.getGroupById(id);
        
        const updateData = {
          ...rest,
          ...(batchId !== undefined && { batch_id: batchId }),
          ...(batchCode !== undefined && { batch_code: batchCode }),
          ...(startCity !== undefined && { start_city: startCity }),
          ...(crossingDate !== undefined && { crossing_date: crossingDate }),
          ...(sisterSchoolId !== undefined && { sister_school_id: sisterSchoolId }),
          ...(flightInfo !== undefined && { flight_info: flightInfo }),
          ...(schoolList !== undefined && { school_list: schoolList }),
          ...(exchangeDate !== undefined && { tags: { ...(oldGroup?.tags as any || {}), exchangeDate } }),
        };
        
        await db.updateGroup(id, updateData);
        
        // 獲取更新後的團組信息
        const newGroup = await db.getGroupById(id);
        
        if (oldGroup && newGroup) {
          // 檢查重大變更
          const changes: string[] = [];
          if (updateData.startDate && oldGroup.startDate !== newGroup.startDate) {
            changes.push(`出發日期變更為 ${newGroup.startDate}`);
          }
          if (updateData.endDate && oldGroup.endDate !== newGroup.endDate) {
            changes.push(`結束日期變更為 ${newGroup.endDate}`);
          }
          if (updateData.hotel && oldGroup.hotel !== newGroup.hotel) {
            changes.push(`住宿酒店變更為 ${newGroup.hotel}`);
          }
          
          // 如果有重大變更，發送通知
          if (changes.length > 0) {
            notificationService.notifyGroupUpdated(newGroup, changes.join('；')).catch(console.error);
          }
          
          // 檢查狀態變更
          if (updateData.status && oldGroup.status !== newGroup.status) {
            notificationService.notifyGroupStatusChanged(newGroup, oldGroup.status, newGroup.status).catch(console.error);
          }
        }
        
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGroup(input.id);
        return { success: true };
      }),
  }),
  
  // 行程管理
  itineraries: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getItinerariesByGroupId(input.groupId);
      }),
    
    listAll: protectedProcedure
      .query(async () => {
        return await db.getAllItineraries();
      }),
    
    create: editorProcedure
      .input(z.object({
        groupId: z.number(),
        date: z.string(),
        dayNumber: z.number(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        locationId: z.number().optional(),
        locationName: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createItinerary(input);
        
        // 發送行程變更通知
        const locationName = input.locationName || '未指定地點';
        const timeInfo = input.startTime ? ` (${input.startTime})` : '';
        notificationService.notifyItineraryChange(
          input.groupId,
          `新增行程：${locationName}${timeInfo}`
        ).catch(console.error);
        
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        date: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        locationId: z.number().optional(),
        locationName: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateItinerary(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteItinerary(input.id);
        return { success: true };
      }),
    
    batchCreate: editorProcedure
      .input(z.object({
        groupId: z.number(),
        itineraries: z.array(z.object({
          date: z.string(),
          dayNumber: z.number(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          locationId: z.number().optional(),
          locationName: z.string().optional(),
          description: z.string().optional(),
          notes: z.string().optional(),
          sortOrder: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // 批量創建行程點
        for (const itinerary of input.itineraries) {
          await db.createItinerary({
            groupId: input.groupId,
            ...itinerary,
          });
        }
        
        // 發送批量添加通知
        notificationService.notifyItineraryChange(
          input.groupId,
          `批量添加了 ${input.itineraries.length} 個行程點`
        ).catch(console.error);
        
        return { success: true, count: input.itineraries.length };
      }),
  }),
  
  // 食行卡片管理
  dailyCards: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDailyCardsByGroupId(input.groupId);
      }),
    
    listAll: protectedProcedure
      .query(async () => {
        return await db.getAllDailyCards();
      }),
    
    upsert: editorProcedure
      .input(z.object({
        groupId: z.number(),
        date: z.string(),
        departureTime: z.string().optional(),
        arrivalTime: z.string().optional(),
        departurePlace: z.string().optional(),
        arrivalPlace: z.string().optional(),
        transportContact: z.string().optional(),
        flightNumber: z.string().optional(),
        airline: z.string().optional(),
        terminal: z.string().optional(),
        transportNotes: z.string().optional(),
        departureCity: z.string().optional(),
        arrivalCity: z.string().optional(),
        weatherData: z.any().optional(),
        hotelName: z.string().optional(),
        hotelAddress: z.string().optional(),
        vehiclePlate: z.string().optional(),
        driverName: z.string().optional(),
        driverPhone: z.string().optional(),
        guideName: z.string().optional(),
        guidePhone: z.string().optional(),
        securityName: z.string().optional(),
        securityPhone: z.string().optional(),
        breakfastRestaurantId: z.number().optional(),
        breakfastRestaurant: z.string().optional(),
        breakfastAddress: z.string().optional(),
        lunchRestaurantId: z.number().optional(),
        lunchRestaurant: z.string().optional(),
        lunchAddress: z.string().optional(),
        dinnerRestaurantId: z.number().optional(),
        dinnerRestaurant: z.string().optional(),
        dinnerAddress: z.string().optional(),
        specialNotes: z.string().optional(),
        hotelId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertDailyCard(input);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDailyCard(input.id);
        return { success: true };
      }),
  }),
  
  // 人員管理
  members: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMembersByGroupId(input.groupId);
      }),
    
    create: editorProcedure
      .input(z.object({
        groupId: z.number(),
        name: z.string(),
        identity: z.enum(['student', 'teacher', 'staff', 'other']),
        gender: z.enum(['male', 'female', 'other']).optional(),
        phone: z.string().optional(),
        idCard: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMember(input);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        identity: z.enum(['student', 'teacher', 'staff', 'other']).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        phone: z.string().optional(),
        idCard: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateMember(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMember(input.id);
        return { success: true };
      }),
    
    batchCreate: editorProcedure
      .input(z.object({
        groupId: z.number(),
        members: z.array(z.record(z.string(), z.any())), // 接受任意字段的對象數組
      }))
      .mutation(async ({ input }) => {
        const results = [];
        for (const memberData of input.members) {
          try {
            // 分離標準字段和自定義字段
            // 身份映射（支持繁體和簡體中文）
            const identityMapping: Record<string, string> = {
              // 繁體中文
              '學生': 'student',
              '教師': 'teacher',
              '工作人員': 'staff',
              '領隊': 'staff',  // 領隊映射為 staff
              '其他': 'other',
              // 簡體中文
              '学生': 'student',
              '教师': 'teacher',
              '工作人员': 'staff',
              '领队': 'staff',  // 领队映射為 staff
              // 英文
              'student': 'student',
              'teacher': 'teacher',
              'staff': 'staff',
              'other': 'other',
            };
            // 性別映射（支持繁體和簡體中文）
            const genderMapping: Record<string, string> = {
              '男': 'male',
              '女': 'female',
              '其他': 'other',
              'male': 'male',
              'female': 'female',
              'other': 'other',
            };
            
            const rawIdentity = memberData.identity || memberData['身份'] || 'other';
            const rawGender = memberData.gender || memberData['性別'];
            
            const standardFields = {
              groupId: input.groupId,
              name: memberData.name || memberData['姓名'] || '',
              identity: identityMapping[rawIdentity] || rawIdentity,
              gender: rawGender ? (genderMapping[rawGender] || rawGender) : undefined,
              phone: memberData.phone || memberData['聯系電話'] || memberData['電話'] || undefined,
              idCard: memberData.idCard || memberData['身份證'] || memberData['身份證號'] || undefined,
              notes: memberData.notes || memberData['備註'] || undefined,
            };
            
            // 所有其他字段存入customFields
            const customFields: Record<string, any> = {};
            const standardKeys = ['name', '姓名', 'identity', '身份', 'gender', '性別', 'phone', '聯系電話', '電話', 'idCard', '身份證', '身份證號', 'notes', '備註'];
            Object.keys(memberData).forEach((key) => {
              if (!standardKeys.includes(key) && memberData[key] !== null && memberData[key] !== undefined) {
                customFields[key] = memberData[key];
              }
            });
            
            await db.createMember({
              ...standardFields,
              customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
            });
            results.push({ success: true, member: memberData });
          } catch (error) {
            results.push({ success: false, member: memberData, error: String(error) });
          }
        }
        return { success: true, results };
      }),
  }),
  
  // 景點資源管理
  locations: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllLocations();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        capacity: z.number().default(0),
        applicableType: z.enum(['all', 'elementary', 'middle', 'vip']).default('all'),
        restrictedDays: z.string().optional(),
        maxCapacity: z.number().optional(),
        closedDays: z.array(z.number()).optional(),
        openingHours: z.string().optional(),
        contact: z.string().optional(),
        phone: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
        requiresBooking: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { contactPerson, contactPhone, closedDays, notes, requiresBooking, ...rest } = input;
        const data: any = {
          ...rest,
          contact: contactPerson || rest.contact,
          phone: contactPhone || rest.phone,
          closedDays: closedDays ? JSON.stringify(closedDays) : null,
        };
        await db.createLocation(data);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        capacity: z.number().optional(),
        applicableType: z.enum(['all', 'elementary', 'middle', 'vip']).optional(),
        restrictedDays: z.string().optional(),
        maxCapacity: z.number().optional(),
        closedDays: z.array(z.number()).optional(),
        openingHours: z.string().optional(),
        contact: z.string().optional(),
        phone: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
        requiresBooking: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, contactPerson, contactPhone, closedDays, notes, requiresBooking, ...rest } = input;
        const updateData: any = { ...rest };
        if (contactPerson !== undefined) updateData.contact = contactPerson;
        if (contactPhone !== undefined) updateData.phone = contactPhone;
        if (closedDays !== undefined) updateData.closedDays = closedDays ? JSON.stringify(closedDays) : null;
        await db.updateLocation(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLocation(input.id);
        return { success: true };
      }),
  }),
  
  // 通知管理
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsByUserId(ctx.user.id);
    }),
    
    create: editorProcedure
      .input(z.object({
        userId: z.number(),
        type: z.enum(["reminder", "deadline", "departure", "change"]),
        title: z.string(),
        content: z.string().optional(),
        relatedGroupId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createNotification(input);
        return { success: true };
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.markAllNotificationsAsRead(ctx.user.id);
        return { success: true };
      }),
  }),
  
  // 文件管理
  files: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllFiles();
    }),
    
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFilesByGroupId(input.groupId);
      }),
    
    // 上傳文件到S3
    upload: editorProcedure
      .input(z.object({
        groupId: z.number().optional(),
        fileName: z.string(),
        fileData: z.string(), // Base64編碼的文件數據
        mimeType: z.string(),
        size: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { storagePut } = await import('./storage');
        
        // 將Base64轉換為Buffer
        const base64Data = input.fileData.split(',')[1] || input.fileData;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 生成文件鍵
        const fileKey = `group-${input.groupId || 'common'}/${Date.now()}-${input.fileName}`;
        
        // 上傳到S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // 保存到數據庫
        await db.createFile({
          groupId: input.groupId,
          name: input.fileName,
          fileKey,
          url,
          mimeType: input.mimeType,
          size: input.size,
          uploadedBy: ctx.user.id,
        });
        
        // 如果文件關聯到團組，發送通知
        if (input.groupId) {
          notificationService.notifyFileUploaded(
            input.groupId,
            input.fileName,
            ctx.user.name || ctx.user.username || '某用戶'
          ).catch(console.error);
        }
        
        return { success: true, url, fileKey };
      }),
    
    create: editorProcedure
      .input(z.object({
        groupId: z.number().optional(),
        name: z.string(),
        fileKey: z.string(),
        url: z.string(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createFile({
          ...input,
          uploadedBy: ctx.user.id,
        });
        
        // 如果文件關聯到團組，發送通知
        if (input.groupId) {
          notificationService.notifyFileUploaded(
            input.groupId,
            input.name,
            ctx.user.name || ctx.user.username || '某用戶'
          ).catch(console.error);
        }
        
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFile(input.id);
        return { success: true };
      }),
  }),
  
  // 景點資源管理
  attractions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAttractions();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        location: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        maxCapacity: z.number().optional(), // 最大承接量
        closedDays: z.array(z.union([z.string(), z.number()])).optional(), // 每週休館日 ["monday","tuesday"] 或 [1,2]
        requiresBooking: z.boolean().optional(),
        bookingLeadTime: z.number().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        isAlwaysUnavailable: z.boolean(),
        unavailableTimeSlots: z.array(z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createAttraction({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string(),
        location: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        maxCapacity: z.number().optional(), // 最大承接量
        closedDays: z.array(z.union([z.string(), z.number()])).optional(), // 每週休館日
        requiresBooking: z.boolean().optional(),
        bookingLeadTime: z.number().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        isAlwaysUnavailable: z.boolean(),
        unavailableTimeSlots: z.array(z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAttraction(id, data);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAttraction(input.id);
        return { success: true };
      }),
    
    checkConstraints: protectedProcedure
      .input(z.object({
        attractionId: z.number(),
        date: z.string(), // YYYY-MM-DD
        startTime: z.string(), // HH:MM
        endTime: z.string(), // HH:MM
      }))
      .query(async ({ input }) => {
        const attraction = await db.getAttractionById(input.attractionId);
        if (!attraction) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '景點不存在' });
        }
        
        const warnings: string[] = [];
        const date = new Date(input.date);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        
        // 檢查休館日
        if (attraction.closedDays) {
          try {
            const closedDays = typeof attraction.closedDays === 'string'
              ? JSON.parse(attraction.closedDays)
              : attraction.closedDays;
            if (Array.isArray(closedDays)) {
              // 檢查是否為周期性休館日（如每周一）
              if (closedDays.includes(dayOfWeek)) {
                const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                warnings.push(`該景點${dayNames[dayOfWeek]}休館`);
              }
              // 檢查是否為特定日期休館
              if (closedDays.includes(input.date)) {
                warnings.push(`該景點在${input.date}休館`);
              }
            }
          } catch (e) {
            // 忽略JSON解析錯誤
          }
        }
        
        // 檢查開放時間
        if (attraction.openingHours) {
          try {
            const openingHours = typeof attraction.openingHours === 'string' 
              ? JSON.parse(attraction.openingHours) 
              : attraction.openingHours;
            if (openingHours && typeof openingHours === 'object' && openingHours[dayOfWeek]) {
              const { open, close } = openingHours[dayOfWeek];
              if (input.startTime < open || input.endTime > close) {
                warnings.push(`該景點開放時間為${open}-${close}，您選擇的時間超出範圍`);
              }
            }
          } catch (e) {
            // 忽略JSON解析錯誤
          }
        }
        
        // 檢查預約要求
        if (attraction.requiresBooking) {
          const today = new Date();
          const bookingDate = new Date(input.date);
          const daysUntilBooking = Math.floor((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilBooking < 0) {
            warnings.push('無法預約過去的日期');
          } else if (attraction.bookingLeadTime && daysUntilBooking < attraction.bookingLeadTime) {
            warnings.push(`該景點需要提前${attraction.bookingLeadTime}天預約，您只提前了${daysUntilBooking}天`);
          }
        }
        
        return {
          hasWarnings: warnings.length > 0,
          warnings,
          attraction: {
            name: attraction.name,
            contactPerson: attraction.contactPerson,
            contactPhone: attraction.contactPhone,
          },
        };
      }),

    // 排程衝突偵測：檢查指定日期範圍內所有景點的超載和休館日衝突
    checkConflicts: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(), // 限定在某個項目內
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),   // YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const { getDb } = await import('./db');
        const { sql: drizzleSql } = await import('drizzle-orm');
        const dbConn = await getDb();
        if (!dbConn) return { conflicts: [] };

        const { itineraries: itiTable, groups: groupsTable, locations: locTable } = await import('../drizzle/schema');

        // 取得日期範圍內所有有 locationId 的行程點
        const itin = await dbConn
          .select({
            id: itiTable.id,
            groupId: itiTable.groupId,
            date: itiTable.date,
            locationId: itiTable.locationId,
          })
          .from(itiTable)
          .where(
            and(
              drizzleSql`${itiTable.date} >= ${input.startDate}`,
              drizzleSql`${itiTable.date} <= ${input.endDate}`,
              isNotNull(itiTable.locationId),
            )
          );

        if (itin.length === 0) return { conflicts: [] };

        // 取得相關團組人數
        const groupIds = Array.from(new Set(itin.map((i: { groupId: number }) => i.groupId))) as number[];
        const groupRows = await dbConn
          .select({ id: groupsTable.id, name: groupsTable.name, totalCount: groupsTable.totalCount })
          .from(groupsTable)
          .where(inArray(groupsTable.id, groupIds));
        const groupMap = Object.fromEntries(groupRows.map((g: { id: number; name: string; totalCount: number }) => [g.id, g]));

        // 取得所有相關景點資料（使用 locations 表，即資源庫中的景點）
        const locationIds = Array.from(new Set(itin.map((i: { locationId: number | null }) => i.locationId!).filter(Boolean))) as number[];
        const attrRows = await dbConn
          .select({ id: locTable.id, name: locTable.name, maxCapacity: locTable.maxCapacity, closedDays: locTable.closedDays })
          .from(locTable)
          .where(inArray(locTable.id, locationIds));
        const attrMap = Object.fromEntries(attrRows.map((a: { id: number; name: string; maxCapacity: number | null; closedDays: unknown }) => [a.id, a]));

        // 按日期 + locationId 分組計算人數
        type ConflictItem = {
          date: string;
          attractionId: number;
          attractionName: string;
          conflictType: 'overload' | 'closed';
          totalPeople: number;
          maxCapacity: number | null;
          closedReason: string;
          groups: Array<{ id: number; name: string; count: number }>;
        };
        const conflicts: ConflictItem[] = [];

        // 按日期+景點分組
        const grouped: Record<string, typeof itin> = {};
        for (const row of itin) {
          const key = `${row.date}__${row.locationId}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        }

        const dayNames = ['\u9031\u65e5', '\u9031\u4e00', '\u9031\u4e8c', '\u9031\u4e09', '\u9031\u56db', '\u9031\u4e94', '\u9031\u516d'];
        const weekdayMap: Record<string, number> = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };

        for (const [key, rows] of Object.entries(grouped)) {
          const [dateStr, locIdStr] = key.split('__');
          const locId = Number(locIdStr);
          const attr = attrMap[locId];
          if (!attr) continue;

          // 計算當日到訪該景點的總人數
          const groupsOnDay = (rows as Array<{ groupId: number }>).map((r) => {
            const g = groupMap[r.groupId] as { id: number; name: string; totalCount: number } | undefined;
            return { id: r.groupId, name: g?.name || `團組#${r.groupId}`, count: g?.totalCount || 0 };
          });
          const totalPeople = groupsOnDay.reduce((sum: number, g: { count: number }) => sum + g.count, 0);

          // 檢查超載
          if (attr.maxCapacity && totalPeople > attr.maxCapacity) {
            conflicts.push({
              date: dateStr,
              attractionId: locId,
              attractionName: attr.name,
              conflictType: 'overload',
              totalPeople,
              maxCapacity: attr.maxCapacity,
              closedReason: '',
              groups: groupsOnDay,
            });
          }

          // 檢查休館日
          if (attr.closedDays) {
            try {
              const closedList = typeof attr.closedDays === 'string'
                ? JSON.parse(attr.closedDays)
                : (attr.closedDays as any[]);
              if (Array.isArray(closedList) && closedList.length > 0) {
                // 解析日期的星期幾
                const d = new Date(dateStr + 'T00:00:00');
                const dow = d.getDay(); // 0=週日
                const dateOnly = dateStr; // YYYY-MM-DD

                let closedReason = '';
                for (const entry of closedList) {
                  if (typeof entry === 'number' && entry === dow) {
                    closedReason = `每${dayNames[dow]}休館`;
                    break;
                  }
                  if (typeof entry === 'string') {
                    const lower = entry.toLowerCase();
                    if (weekdayMap[lower] !== undefined && weekdayMap[lower] === dow) {
                      closedReason = `每${dayNames[dow]}休館`;
                      break;
                    }
                    if (entry === dateOnly) {
                      closedReason = `${dateOnly} 特定休館日`;
                      break;
                    }
                  }
                }

                if (closedReason) {
                  conflicts.push({
                    date: dateStr,
                    attractionId: locId,
                    attractionName: attr.name,
                    conflictType: 'closed',
                    totalPeople,
                    maxCapacity: attr.maxCapacity ?? null,
                    closedReason,
                    groups: groupsOnDay,
                  });
                }
              }
            } catch (_) { /* 忽略解析錯誤 */ }
          }
        }

        // 按日期排序
        conflicts.sort((a, b) => a.date.localeCompare(b.date));
        return { conflicts };
      }),
  }),
  
  // 酒店資源管理
  hotels: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllHotels();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        contact: z.string().optional(),
        phone: z.string().optional(),
        roomCount: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createHotel(input);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        contact: z.string().optional(),
        phone: z.string().optional(),
        roomCount: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateHotel(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHotel(input.id);
        return { success: true };
      }),
  }),
  
  // 車輛資源管理
  vehicles: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllVehicles();
    }),
    
    create: editorProcedure
      .input(z.object({
        plate: z.string(),
        driverName: z.string().optional(),
        driverPhone: z.string().optional(),
        capacity: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createVehicle(input);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        plate: z.string().optional(),
        driverName: z.string().optional(),
        driverPhone: z.string().optional(),
        capacity: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateVehicle(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVehicle(input.id);
        return { success: true };
      }),
  }),
  
  // 導遊資源管理
  guides: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllGuides();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string().optional(),
        languages: z.string().optional(),
        specialties: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createGuide(input);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        languages: z.string().optional(),
        specialties: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateGuide(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGuide(input.id);
        return { success: true };
      }),
  }),
  
  // 安保人員資源管理
  securities: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSecurities();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string().optional(),
        idCard: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createSecurity(input);
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        idCard: z.string().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateSecurity(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSecurity(input.id);
        return { success: true };
      }),
  }),
  
  // 餐廳資源管理
  restaurants: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllRestaurants();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
        capacity: z.number().default(0),
        cuisine: z.string().optional(),
        priceRange: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createRestaurant({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        capacity: z.number().optional(),
        cuisine: z.string().optional(),
        priceRange: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateRestaurant(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRestaurant(input.id);
        return { success: true };
      }),
  }),
  
  // 學校資源管理
  schools: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSchools();
    }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        address: z.string().optional(),
        region: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        receptionProcess: z.string().optional(),
        availableTimeSlots: z.any().optional(),
        capacity: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createSchool({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        region: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        receptionProcess: z.string().optional(),
        availableTimeSlots: z.any().optional(),
        capacity: z.number().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateSchool(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSchool(input.id);
        return { success: true };
      }),
  }),
  
  // 學校交流管理 - 暫時移除，待後續實現
  // schoolExchanges: router({
  //   listByGroup: protectedProcedure
  //     .input(z.object({ groupId: z.number() }))
  //     .query(async ({ input }) => {
  //       return await db.getSchoolExchangesByGroup(input.groupId);
  //     }),
  //   
  //   create: editorProcedure
  //     .input(z.object({
  //       groupId: z.number(),
  //       schoolId: z.number(),
  //       exchangeDate: z.string(),
  //       startTime: z.string().optional(),
  //       endTime: z.string().optional(),
  //       activities: z.string().optional(),
  //       notes: z.string().optional(),
  //     }))
  //     .mutation(async ({ input }) => {
  //       await db.createSchoolExchange(input);
  //       return { success: true };
  //     }),
  //   
  //   delete: editorProcedure
  //     .input(z.object({ id: z.number() }))
  //     .mutation(async ({ input }) => {
  //       await db.deleteSchoolExchange(input.id);
  //       return { success: true };
  //     }),
  // }),
  
  // 行程模板管理
  templates: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTemplates();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateById(input.id);
      }),
    
    create: editorProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        days: z.number(),
        applicableTypes: z.array(z.string()).optional(),
        sourceGroupId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const templateId = await db.createTemplate({ ...input, createdBy: ctx.user.id });
        
        // 如果指定了sourceGroupId，從該團組複製行程點
        if (input.sourceGroupId) {
          const itineraries = await db.getItinerariesByGroupId(input.sourceGroupId);
          for (const itinerary of itineraries) {
            await db.createTemplateItinerary({
              templateId,
              dayNumber: itinerary.dayNumber,
              startTime: itinerary.startTime,
              endTime: itinerary.endTime,
              locationId: itinerary.locationId,
              locationName: itinerary.locationName,
              description: itinerary.description,
              sortOrder: itinerary.sortOrder || 0,
            });
          }
        }
        
        return { success: true, templateId };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        days: z.number().optional(),
        applicableTypes: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateTemplate(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTemplate(input.id);
        return { success: true };
      }),
    
    getItineraries: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateItineraries(input.templateId);
      }),
    
    applyTemplate: editorProcedure
      .input(z.object({
        templateId: z.number(),
        groupId: z.number(),
        startDate: z.string(), // ISO date string
      }))
      .mutation(async ({ input }) => {
        const { templateId, groupId, startDate } = input;
        
        // 獲取模板的所有行程點
        const templateItineraries = await db.getTemplateItineraries(templateId);
        
        // 根據團組的開始日期計算每個行程點的實際日期
        const baseDate = new Date(startDate);
        let createdCount = 0;
        
        for (const templateItem of templateItineraries) {
          // 計算實際日期：開始日期 + (dayNumber - 1)
          const actualDate = new Date(baseDate);
          actualDate.setDate(baseDate.getDate() + (templateItem.dayNumber - 1));
          
          // 創建行程點
          await db.createItinerary({
            groupId,
            date: actualDate.toISOString().split('T')[0],
            dayNumber: templateItem.dayNumber,
            startTime: templateItem.startTime,
            endTime: templateItem.endTime,
            locationId: templateItem.locationId,
            locationName: templateItem.locationName,
            description: templateItem.description,
            sortOrder: templateItem.sortOrder || 0,
          });
          
          createdCount++;
        }
        
        return { success: true, createdCount };
      }),
  }),
  
  // 快照管理（版本控制）
  snapshots: router({
    list: adminProcedure.query(async () => {
      return await db.getAllSnapshots();
    }),
    
    create: adminProcedure
      .input(z.object({
        type: z.enum(['manual', 'auto']),
        summary: z.string().optional(),
        data: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = nanoid(32);
        await db.createSnapshot({
          ...input,
          token,
          createdBy: ctx.user.id,
        });
        return { success: true, token };
      }),
  }),

  // ===== 排程色塊管理 =====
  scheduleBlocks: router({
    // 獲取項目的所有色塊
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { scheduleBlocks, groups } = await import('../drizzle/schema');
        const { eq, inArray } = await import('drizzle-orm');
        // 先獲取項目下的所有團組
        const projectGroups = await dbConn.select().from(groups).where(eq(groups.projectId, input.projectId));
        if (projectGroups.length === 0) return [];
        const groupIds = projectGroups.map(g => g.id);
        const blocks = await dbConn.select().from(scheduleBlocks).where(inArray(scheduleBlocks.groupId, groupIds));
        return blocks;
      }),

    // 獲取團組的色塊
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { scheduleBlocks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return await dbConn.select().from(scheduleBlocks).where(eq(scheduleBlocks.groupId, input.groupId));
      }),

    // 創建或更新色塊（upsert）
    upsert: editorProcedure
      .input(z.object({
        groupId: z.number(),
        date: z.string(), // YYYY-MM-DD
        blockType: z.enum(['sz_arrive','sz_stay','hk_arrive','hk_stay','exchange','border_sz_hk','border_hk_sz','departure','free']),
        isExchangeDay: z.boolean().optional(),
        exchangeSchoolId: z.number().optional().nullable(),
        flightNumber: z.string().optional().nullable(),
        flightTime: z.string().optional().nullable(),
        busInfo: z.string().optional().nullable(),
        hotelCity: z.enum(['sz','hk','macau','other']).optional().nullable(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { scheduleBlocks } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        // 檢查是否已存在
        const existing = await dbConn.select().from(scheduleBlocks)
          .where(and(eq(scheduleBlocks.groupId, input.groupId), eq(scheduleBlocks.date, input.date as any)))
          .limit(1);
        const data = {
          blockType: input.blockType,
          isExchangeDay: input.isExchangeDay ?? false,
          exchangeSchoolId: input.exchangeSchoolId ?? null,
          flightNumber: input.flightNumber ?? null,
          flightTime: input.flightTime ?? null,
          busInfo: input.busInfo ?? null,
          hotelCity: input.hotelCity ?? null,
          notes: input.notes ?? null,
        };
        if (existing.length > 0) {
          await dbConn.update(scheduleBlocks).set(data)
            .where(and(eq(scheduleBlocks.groupId, input.groupId), eq(scheduleBlocks.date, input.date as any)));
          return { id: existing[0].id, ...data };
        } else {
          const result = await dbConn.insert(scheduleBlocks).values({ groupId: input.groupId, date: input.date as any, ...data });
          return { id: Number(result[0].insertId), ...data };
        }
      }),

    // 批量設置批次的色塊（模板快速生成）
    batchUpsert: editorProcedure
      .input(z.object({
        groupId: z.number(),
        blocks: z.array(z.object({
          date: z.string(),
          blockType: z.enum(['sz_arrive','sz_stay','hk_arrive','hk_stay','exchange','border_sz_hk','border_hk_sz','departure','free']),
          isExchangeDay: z.boolean().optional(),
          hotelCity: z.enum(['sz','hk','macau','other']).optional().nullable(),
          notes: z.string().optional().nullable(),
        }))
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { scheduleBlocks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // 先刪除此批次的所有色塊
        await dbConn.delete(scheduleBlocks).where(eq(scheduleBlocks.groupId, input.groupId));
        // 批量插入
        if (input.blocks.length > 0) {
          await dbConn.insert(scheduleBlocks).values(
            input.blocks.map(b => ({
              groupId: input.groupId,
              date: b.date as any,
              blockType: b.blockType,
              isExchangeDay: b.isExchangeDay ?? false,
              hotelCity: b.hotelCity ?? null,
              notes: b.notes ?? null,
            }))
          );
        }
        return { success: true, count: input.blocks.length };
      }),

    // 根據團組信息自動生成色塊（startDate/endDate/start_city/crossing_date）
    autoGenerate: editorProcedure
      .input(z.object({
        projectId: z.number(),
        overwrite: z.boolean().optional().default(false), // 是否覆蓋已有色塊
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { scheduleBlocks, groups } = await import('../drizzle/schema');
        const { eq, and, inArray } = await import('drizzle-orm');
        // 查詢項目下所有團組
        const allGroups = await dbConn.select().from(groups).where(eq(groups.projectId, input.projectId));
        let totalGenerated = 0;
        const skipped: number[] = [];
        for (const group of allGroups) {
          if (!group.startDate || !group.endDate || !group.start_city) {
            skipped.push(group.id);
            continue;
          }
          // 如果不覆蓋，檢查是否已有色塊
          if (!input.overwrite) {
            const existing = await dbConn.select().from(scheduleBlocks).where(eq(scheduleBlocks.groupId, group.id));
            if (existing.length > 0) {
              skipped.push(group.id);
              continue;
            }
          }
          // 生成色塊
          // 注意：drizzle 返回的 date 字段是 Date 物件，需要轉為字串比較
          const toDateStr = (d: Date | string | null | undefined): string | null => {
            if (!d) return null;
            if (typeof d === 'string') return d.split('T')[0];
            return d.toISOString().split('T')[0];
          };
          const startDateStr = toDateStr(group.startDate)!;
          const endDateStr = toDateStr(group.endDate)!;
          const crossingDateStr = toDateStr(group.crossing_date);
          // 交流日儲存在 tags.exchangeDate 中
          const tagsObj = group.tags as Record<string, string> | null;
          const exchangeDateStr = tagsObj?.exchangeDate || null;
          const startCity = group.start_city; // 'hk' | 'sz'
          const newBlocks: Array<{ groupId: number; date: string; blockType: string; isExchangeDay: boolean; hotelCity: string | null; notes: string | null }> = [];
          // 遍歷每一天
          const startDate = new Date(startDateStr + 'T00:00:00');
          const endDate = new Date(endDateStr + 'T00:00:00');
          let cur = new Date(startDate);
          while (cur <= endDate) {
            const dateStr = cur.toISOString().split('T')[0];
            const isStart = dateStr === startDateStr;
            const isEnd = dateStr === endDateStr;
            const isCrossing = crossingDateStr && dateStr === crossingDateStr;
            const isExchange = exchangeDateStr && dateStr === exchangeDateStr;
            let blockType = 'free';
            let hotelCity: string | null = null;
            let isExchangeDay = false;
            if (isEnd) {
              blockType = 'departure';
              hotelCity = null;
            } else if (isCrossing) {
              blockType = startCity === 'hk' ? 'border_hk_sz' : 'border_sz_hk';
              hotelCity = startCity === 'hk' ? 'sz' : 'hk';
            } else if (isStart) {
              blockType = startCity === 'hk' ? 'hk_arrive' : 'sz_arrive';
              hotelCity = startCity === 'hk' ? 'hk' : 'sz';
            } else {
              // 判斷當前在哪個城市
              const afterCrossing = crossingDateStr && cur.toISOString().split('T')[0] > crossingDateStr;
              const inHk = startCity === 'hk' ? !afterCrossing : !!afterCrossing;
              blockType = inHk ? 'hk_stay' : 'sz_stay';
              hotelCity = inHk ? 'hk' : 'sz';
            }
            if (isExchange && blockType !== 'departure' && blockType !== 'border_hk_sz' && blockType !== 'border_sz_hk') {
              blockType = 'exchange';
              isExchangeDay = true;
              hotelCity = 'hk';
            }
            newBlocks.push({ groupId: group.id, date: dateStr, blockType, isExchangeDay, hotelCity, notes: null });
            cur.setDate(cur.getDate() + 1);
          }
          // 刪除舊色塊並插入新色塊
          await dbConn.delete(scheduleBlocks).where(eq(scheduleBlocks.groupId, group.id));
          if (newBlocks.length > 0) {
            await dbConn.insert(scheduleBlocks).values(newBlocks as any);
            totalGenerated += newBlocks.length;
          }
        }
        return { success: true, generated: totalGenerated, skipped: skipped.length };
      }),

    // 整體移動批次行程（將所有色塊往後移 n 天）
    shiftBatch: editorProcedure
      .input(z.object({
        groupId: z.number(),
        days: z.number(), // 正數=延後，負數=提前
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { scheduleBlocks } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        // 獲取所有色塊
        const blocks = await dbConn.select().from(scheduleBlocks).where(eq(scheduleBlocks.groupId, input.groupId));
        // 刪除所有色塊
        await dbConn.delete(scheduleBlocks).where(eq(scheduleBlocks.groupId, input.groupId));
        // 重新插入，日期往後移 n 天
        if (blocks.length > 0) {
          const shifted = blocks.map(b => {
            const d = new Date(b.date);
            d.setDate(d.getDate() + input.days);
            const newDate = d.toISOString().split('T')[0];
            return { ...b, id: undefined, date: newDate as any };
          });
          await dbConn.insert(scheduleBlocks).values(shifted);
        }
        return { success: true };
      }),
  }),

  // ===== 學校管理 =====
  exchangeSchools: router({
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { exchangeSchools } = await import('../drizzle/schema');
      return await dbConn.select().from(exchangeSchools).orderBy(exchangeSchools.name);
    }),
    create: editorProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        region: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        receptionProcess: z.string().optional(),
        availableDates: z.array(z.string()).optional(),
        schoolType: z.string().optional(),
        maxGroupSize: z.number().optional(),
        capacity: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { exchangeSchools } = await import('../drizzle/schema');
        const result = await dbConn.insert(exchangeSchools).values({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id: Number(result[0].insertId), ...input };
      }),
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional().nullable(),
        region: z.string().optional().nullable(),
        contactPerson: z.string().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        contactEmail: z.string().optional().nullable(),
        receptionProcess: z.string().optional().nullable(),
        availableDates: z.array(z.string()).optional().nullable(),
        schoolType: z.string().optional().nullable(),
        maxGroupSize: z.number().optional().nullable(),
        capacity: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { exchangeSchools } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        await dbConn.update(exchangeSchools).set(data).where(eq(exchangeSchools.id, id));
        return { success: true };
      }),
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { exchangeSchools } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.delete(exchangeSchools).where(eq(exchangeSchools.id, input.id));
        return { success: true };
      }),
  }),

  domesticSchools: router({
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { domesticSchools } = await import('../drizzle/schema');
      return await dbConn.select().from(domesticSchools).orderBy(domesticSchools.name);
    }),
    create: editorProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        studentCount: z.number().optional(),
        teacherCount: z.number().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { domesticSchools } = await import('../drizzle/schema');
        const result = await dbConn.insert(domesticSchools).values({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id: Number(result[0].insertId), ...input };
      }),
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional().nullable(),
        studentCount: z.number().optional().nullable(),
        teacherCount: z.number().optional().nullable(),
        contactPerson: z.string().optional().nullable(),
        contactPhone: z.string().optional().nullable(),
        contactEmail: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { domesticSchools } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        await dbConn.update(domesticSchools).set(data).where(eq(domesticSchools.id, id));
        return { success: true };
      }),
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { domesticSchools } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.delete(domesticSchools).where(eq(domesticSchools.id, input.id));
        return { success: true };
      }),
  }),

  // ===== 工作人員庫 =====
  staff: router({
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { staff } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await dbConn.select({
        id: staff.id,
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        email: staff.email,
        wechat: staff.wechat,
        languages: staff.languages,
        licenseNumber: staff.licenseNumber,
        notes: staff.notes,
        isActive: staff.isActive,
      }).from(staff).where(eq(staff.isActive, true));
      return rows;
    }),

    create: editorProcedure
      .input(z.object({
        name: z.string().min(1),
        role: z.enum(['coordinator','staff','guide','driver']),
        phone: z.string().optional(),
        email: z.string().optional(),
        wechat: z.string().optional(),
        languages: z.string().optional(),
        licenseNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { staff } = await import('../drizzle/schema');
        const result = await dbConn.insert(staff).values(input);
        return { id: Number(result[0].insertId), ...input };
      }),

    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        role: z.enum(['coordinator','staff','guide','driver']).optional(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        wechat: z.string().optional().nullable(),
        languages: z.string().optional().nullable(),
        licenseNumber: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { staff } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        await dbConn.update(staff).set(data).where(eq(staff.id, id));
        return { success: true };
      }),

    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { staff } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.update(staff).set({ isActive: false }).where(eq(staff.id, input.id));
        return { success: true };
      }),

    // 獲取工作人員統計數據
    stats: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return { total: 0, coordinator: 0, staff: 0, guide: 0, driver: 0, assigned: 0 };
      const { staff, batchStaff } = await import('../drizzle/schema');
      const { eq, count, countDistinct } = await import('drizzle-orm');
      // 按角色統計
      const staffRows = await dbConn.select({
        role: staff.role,
        count: count(),
      }).from(staff).where(eq(staff.isActive, true)).groupBy(staff.role);
      // 已指派工作人員數量（去重）
      const assignedRows = await dbConn.select({
        count: countDistinct(batchStaff.staffId),
      }).from(batchStaff);
      const roleMap: Record<string, number> = {};
      let total = 0;
      for (const row of staffRows) {
        roleMap[row.role] = Number(row.count);
        total += Number(row.count);
      }
      return {
        total,
        coordinator: roleMap['coordinator'] || 0,
        staff: roleMap['staff'] || 0,
        guide: roleMap['guide'] || 0,
        driver: roleMap['driver'] || 0,
        assigned: Number(assignedRows[0]?.count || 0),
      };
    }),

    // 獲取工作人員的指派列表
    getAssignments: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { batchStaff, groups } = await import('../drizzle/schema');
        const { eq, sql } = await import('drizzle-orm');
        const assignments = await dbConn.select({
          id: batchStaff.id,
          groupId: batchStaff.groupId,
          staffId: batchStaff.staffId,
          role: batchStaff.role,
          date: sql<string>`DATE_FORMAT(${batchStaff.date}, '%Y-%m-%d')`,
          taskName: batchStaff.taskName,
          startTime: batchStaff.startTime,
          endTime: batchStaff.endTime,
          notes: batchStaff.notes,
          groupName: groups.name,
          groupCode: groups.code,
          groupStartDate: sql<string>`DATE_FORMAT(${groups.startDate}, '%Y-%m-%d')`,
          groupEndDate: sql<string>`DATE_FORMAT(${groups.endDate}, '%Y-%m-%d')`,
        }).from(batchStaff)
          .leftJoin(groups, eq(batchStaff.groupId, groups.id))
          .where(eq(batchStaff.staffId, input.staffId))
          .orderBy((await import('drizzle-orm')).asc(batchStaff.date), (await import('drizzle-orm')).asc(batchStaff.startTime));
        return assignments;
      }),
  }),

  // ===== 批次工作人員指派 =====
  batchStaff: router({
    // 獲取某團組的所有指派（按日期分組）
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { batchStaff, staff } = await import('../drizzle/schema');
        const { eq, sql, asc } = await import('drizzle-orm');
        const result = await dbConn.select({
          id: batchStaff.id,
          groupId: batchStaff.groupId,
          staffId: batchStaff.staffId,
          role: batchStaff.role,
          date: sql<string>`DATE_FORMAT(${batchStaff.date}, '%Y-%m-%d')`,
          itineraryId: batchStaff.itineraryId,
          taskName: batchStaff.taskName,
          startTime: batchStaff.startTime,
          endTime: batchStaff.endTime,
          notes: batchStaff.notes,
          staffName: staff.name,
          staffPhone: staff.phone,
          staffRole: staff.role,
        }).from(batchStaff)
          .leftJoin(staff, eq(batchStaff.staffId, staff.id))
          .where(eq(batchStaff.groupId, input.groupId))
          .orderBy(asc(batchStaff.date), asc(batchStaff.startTime));
        return result;
      }),

    // 獲取項目中所有團組的工作人員指派（用於排程總覽）
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { batchStaff, staff, groups } = await import('../drizzle/schema');
        const { eq, inArray, sql } = await import('drizzle-orm');
        const projectGroups = await dbConn.select({ id: groups.id }).from(groups)
          .where(eq(groups.projectId, input.projectId));
        if (projectGroups.length === 0) return [];
        const groupIds = projectGroups.map(g => g.id);
        const result = await dbConn.select({
          id: batchStaff.id,
          groupId: batchStaff.groupId,
          staffId: batchStaff.staffId,
          role: batchStaff.role,
          date: sql<string>`DATE_FORMAT(${batchStaff.date}, '%Y-%m-%d')`,
          taskName: batchStaff.taskName,
          startTime: batchStaff.startTime,
          endTime: batchStaff.endTime,
          staffName: staff.name,
          staffRole: staff.role,
        }).from(batchStaff)
          .leftJoin(staff, eq(batchStaff.staffId, staff.id))
          .where(inArray(batchStaff.groupId, groupIds));
        return result;
      }),

    // 指派工作人員到團組的某天某行程點
    assign: editorProcedure
      .input(z.object({
        groupId: z.number(),
        staffId: z.number(),
        role: z.enum(['coordinator','staff','guide','driver']),
        date: z.string(), // 具體日期 YYYY-MM-DD
        itineraryId: z.number().optional(), // 關聯的行程點 ID（可選）
        taskName: z.string().optional(), // 行程點名稱
        startTime: z.string().optional(), // HH:mm
        endTime: z.string().optional(), // HH:mm
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { batchStaff } = await import('../drizzle/schema');
        const result = await dbConn.insert(batchStaff).values({
          groupId: input.groupId,
          staffId: input.staffId,
          role: input.role,
          date: input.date as any,
          itineraryId: input.itineraryId ?? null,
          taskName: input.taskName ?? null,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          notes: input.notes ?? null,
        });
        return { id: Number(result[0].insertId) };
      }),

    // 更新指派信息
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(['coordinator','staff','guide','driver']).optional(),
        date: z.string().optional(),
        taskName: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { batchStaff } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...updateData } = input;
        await dbConn.update(batchStaff).set({
          ...updateData,
          date: updateData.date as any,
        }).where(eq(batchStaff.id, id));
        return { success: true };
      }),

    remove: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { batchStaff } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.delete(batchStaff).where(eq(batchStaff.id, input.id));
        return { success: true };
      }),
  }),

  // ===== 人員管理 - 指派行程 & 狀態監控 =====
  memberManagement: router({
    // 獲取所有人員（含團組信息）
    listAll: protectedProcedure.query(async () => {
      return await db.getAllMembersWithGroups();
    }),

    // 獲取某行程的已指派人員
    listByItinerary: protectedProcedure
      .input(z.object({ itineraryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getItineraryMembers(input.itineraryId);
      }),

    // 獲取某人員的所有行程指派
    listByMember: protectedProcedure
      .input(z.object({ memberId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMemberItineraries(input.memberId);
      }),

    // 指派單個人員到行程
    assign: editorProcedure
      .input(z.object({
        itineraryId: z.number(),
        memberId: z.number(),
        role: z.enum(['guide', 'staff', 'security', 'coordinator', 'other']).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.assignMemberToItinerary(input);
        return result;
      }),

    // 批量指派多個人員到行程
    batchAssign: editorProcedure
      .input(z.object({
        itineraryId: z.number(),
        memberIds: z.array(z.number()),
        role: z.enum(['guide', 'staff', 'security', 'coordinator', 'other']).optional(),
      }))
      .mutation(async ({ input }) => {
        const results = await db.batchAssignMembersToItinerary(
          input.itineraryId,
          input.memberIds,
          input.role
        );
        return { success: true, results };
      }),

    // 從行程移除人員
    remove: editorProcedure
      .input(z.object({
        itineraryId: z.number(),
        memberId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeMemberFromItinerary(input.itineraryId, input.memberId);
        return { success: true };
      }),

    // 獲取某行程的人員狀態
    getStatusByItinerary: protectedProcedure
      .input(z.object({ itineraryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMemberStatusByItinerary(input.itineraryId);
      }),

    // 獲取某人員的所有狀態記錄
    getStatusByMember: protectedProcedure
      .input(z.object({ memberId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMemberStatusByMember(input.memberId);
      }),

    // 更新人員狀態（簽到/簽退/狀態變更）
    updateStatus: editorProcedure
      .input(z.object({
        memberId: z.number(),
        itineraryId: z.number(),
        status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'absent', 'cancelled']),
        checkInTime: z.string().optional().nullable(),
        checkOutTime: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.upsertMemberStatus({
          memberId: input.memberId,
          itineraryId: input.itineraryId,
          status: input.status,
          checkInTime: input.checkInTime ? new Date(input.checkInTime) : null,
          checkOutTime: input.checkOutTime ? new Date(input.checkOutTime) : null,
          notes: input.notes,
        });
        return result;
      }),
  }),

  // ===== 交流學校可用日管理 =====
  exchangeAvailability: router({
    listBySchool: protectedProcedure
      .input(z.object({ schoolId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { exchangeSchoolAvailability } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return await dbConn.select().from(exchangeSchoolAvailability)
          .where(eq(exchangeSchoolAvailability.schoolId, input.schoolId));
      }),

    upsert: editorProcedure
      .input(z.object({
        schoolId: z.number(),
        date: z.string(),
        isAvailable: z.boolean(),
        availableTimeStart: z.string().optional().nullable(),
        availableTimeEnd: z.string().optional().nullable(),
        maxGroups: z.number().optional(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { exchangeSchoolAvailability } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const existing = await dbConn.select().from(exchangeSchoolAvailability)
          .where(and(
            eq(exchangeSchoolAvailability.schoolId, input.schoolId),
            eq(exchangeSchoolAvailability.date, input.date as any)
          )).limit(1);
        const data = {
          isAvailable: input.isAvailable,
          availableTimeStart: input.availableTimeStart ?? null,
          availableTimeEnd: input.availableTimeEnd ?? null,
          maxGroups: input.maxGroups ?? 1,
          notes: input.notes ?? null,
        };
        if (existing.length > 0) {
          await dbConn.update(exchangeSchoolAvailability).set(data)
            .where(eq(exchangeSchoolAvailability.id, existing[0].id));
        } else {
          await dbConn.insert(exchangeSchoolAvailability).values({
            schoolId: input.schoolId, date: input.date as any, ...data
          });
        }
        return { success: true };
      }),

    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { exchangeSchoolAvailability } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.delete(exchangeSchoolAvailability).where(eq(exchangeSchoolAvailability.id, input.id));
        return { success: true };
      }),
   }),

  // ===== 实时运营仪表盘 =====
  dashboard: router({
    // 获取当前正在进行的项目和团组行程进度
    overview: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      // 智能日期逻辑：优先用今天，若今天无数据则找最近有行程的日期
      const realTodayStr = now.toISOString().slice(0, 10);
      const [todayCheck] = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM itineraries WHERE DATE_FORMAT(date, '%Y-%m-%d') = ${realTodayStr}`);
      const todayCount = ((todayCheck as unknown) as any[])[0]?.cnt ?? 0;
      let todayStr = realTodayStr;
      let isSimulatedDate = false;
      if (todayCount === 0) {
        // 找最近有数据的日期（优先找未来，其次找过去）
        const [nearestFuture] = await dbConn.execute(sql`SELECT DATE_FORMAT(MIN(date), '%Y-%m-%d') as d FROM itineraries WHERE date >= NOW()`);
        const futureDate = ((nearestFuture as unknown) as any[])[0]?.d;
        if (futureDate) {
          todayStr = futureDate;
          isSimulatedDate = true;
        } else {
          const [nearestPast] = await dbConn.execute(sql`SELECT DATE_FORMAT(MAX(date), '%Y-%m-%d') as d FROM itineraries WHERE date < NOW()`);
          const pastDate = ((nearestPast as unknown) as any[])[0]?.d;
          if (pastDate) { todayStr = pastDate; isSimulatedDate = true; }
        }
      }

      // 获取今天有行程的团组
      const [todayItins] = await dbConn.execute(sql`
        SELECT 
          i.id as itinId,
          i.groupId,
          i.description,
          i.startTime,
          i.endTime,
          i.locationName,
          g.name as groupName,
          g.code as groupCode,
          g.studentCount,
          g.teacherCount,
          g.batch_code as batchCode,
          DATE_FORMAT(i.date, '%Y-%m-%d') as date
        FROM itineraries i
        JOIN \`groups\` g ON i.groupId = g.id
        WHERE DATE_FORMAT(i.date, '%Y-%m-%d') = ${todayStr}
        ORDER BY i.startTime ASC
      `);

      // 获取明天有行程的团组（用于预告）
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
      const [tomorrowItins] = await dbConn.execute(sql`
        SELECT 
          i.id as itinId,
          i.groupId,
          i.description,
          i.startTime,
          i.locationName,
          g.name as groupName,
          g.code as groupCode,
          DATE_FORMAT(i.date, '%Y-%m-%d') as date
        FROM itineraries i
        JOIN \`groups\` g ON i.groupId = g.id
        WHERE DATE_FORMAT(i.date, '%Y-%m-%d') = ${tomorrowStr}
        ORDER BY i.startTime ASC
      `);

      // 计算每个今日行程的状态
      const itinsWithStatus = ((todayItins as unknown) as any[]).map((itin: any) => {
        let status: 'upcoming' | 'in_progress' | 'completed' = 'upcoming';
        let progressPercent = 0;
        if (itin.startTime && itin.endTime) {
          const [sh, sm] = itin.startTime.split(':').map(Number);
          const [eh, em] = itin.endTime.split(':').map(Number);
          const startMins = sh * 60 + sm;
          const endMins = eh * 60 + em;
          const nowMins = currentHour * 60 + currentMinute;
          if (nowMins < startMins) {
            status = 'upcoming';
            progressPercent = 0;
          } else if (nowMins >= endMins) {
            status = 'completed';
            progressPercent = 100;
          } else {
            status = 'in_progress';
            progressPercent = Math.round(((nowMins - startMins) / (endMins - startMins)) * 100);
          }
        }
        return { ...itin, status, progressPercent, currentTime: currentTimeStr };
      });

      return {
        today: todayStr,
        realToday: realTodayStr,
        isSimulatedDate,
        currentTime: currentTimeStr,
        todayItineraries: itinsWithStatus,
        tomorrowItineraries: (tomorrowItins as unknown) as any[],
      };
    }),

    // 获取工作人员实时状态
    staffStatus: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      // 智能日期逻辑
      const realTodayStr = now.toISOString().slice(0, 10);
      const [chk] = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM batchStaff WHERE DATE_FORMAT(date, '%Y-%m-%d') = ${realTodayStr}`);
      const chkCnt = ((chk as unknown) as any[])[0]?.cnt ?? 0;
      let todayStr = realTodayStr;
      if (chkCnt === 0) {
        const [nf] = await dbConn.execute(sql`SELECT DATE_FORMAT(MIN(date), '%Y-%m-%d') as d FROM batchStaff WHERE date >= NOW()`);
        const fd = ((nf as unknown) as any[])[0]?.d;
        if (fd) { todayStr = fd; }
        else {
          const [np] = await dbConn.execute(sql`SELECT DATE_FORMAT(MAX(date), '%Y-%m-%d') as d FROM batchStaff WHERE date < NOW()`);
          const pd = ((np as unknown) as any[])[0]?.d;
          if (pd) todayStr = pd;
        }
      }

      // 获取所有工作人员
      const [allStaff] = await dbConn.execute(sql`SELECT id, name, role, phone FROM staff ORDER BY role, name`);

      // 获取今天的工作人员指派
      const [todayAssignments] = await dbConn.execute(sql`
        SELECT 
          bs.staffId,
          bs.groupId,
          bs.role as assignedRole,
          bs.taskName,
          bs.startTime,
          bs.endTime,
          g.name as groupName,
          g.code as groupCode,
          DATE_FORMAT(bs.date, '%Y-%m-%d') as date
        FROM batchStaff bs
        JOIN \`groups\` g ON bs.groupId = g.id
        WHERE DATE_FORMAT(bs.date, '%Y-%m-%d') = ${todayStr}
        ORDER BY bs.startTime ASC
      `);

      const assignmentMap = new Map<number, any[]>();
      for (const a of (todayAssignments as unknown) as any[]) {
        if (!assignmentMap.has(a.staffId)) assignmentMap.set(a.staffId, []);
        assignmentMap.get(a.staffId)!.push(a);
      }

      return ((allStaff as unknown) as any[]).map((s: any) => {
        const assignments = assignmentMap.get(s.id) || [];
        // 检查当前是否在岗
        const currentAssignment = assignments.find((a: any) => {
          if (!a.startTime || !a.endTime) return false;
          const [sh, sm] = a.startTime.split(':').map(Number);
          const [eh, em] = a.endTime.split(':').map(Number);
          const nowMins = currentHour * 60 + currentMinute;
          return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
        });
        const nextAssignment = assignments.find((a: any) => {
          if (!a.startTime) return false;
          const [sh, sm] = a.startTime.split(':').map(Number);
          const nowMins = currentHour * 60 + currentMinute;
          return sh * 60 + sm > nowMins;
        });
        return {
          ...s,
          status: currentAssignment ? 'busy' : (assignments.length > 0 ? 'scheduled' : 'free'),
          currentAssignment: currentAssignment || null,
          nextAssignment: nextAssignment || null,
          todayAssignments: assignments,
        };
      });
    }),

    // 获取景点人流预警
    venueAlert: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      // 智能日期逻辑
      const realTodayStr = now.toISOString().slice(0, 10);
      const [vc] = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM itineraries WHERE DATE_FORMAT(date, '%Y-%m-%d') = ${realTodayStr}`);
      let todayStr = realTodayStr;
      if (((vc as unknown) as any[])[0]?.cnt === 0) {
        const [nf] = await dbConn.execute(sql`SELECT DATE_FORMAT(MIN(date), '%Y-%m-%d') as d FROM itineraries WHERE date >= NOW()`);
        const fd = ((nf as unknown) as any[])[0]?.d;
        if (fd) todayStr = fd;
        else { const [np] = await dbConn.execute(sql`SELECT DATE_FORMAT(MAX(date), '%Y-%m-%d') as d FROM itineraries WHERE date < NOW()`); const pd = ((np as unknown) as any[])[0]?.d; if (pd) todayStr = pd; }
      }

      // 获取今天所有行程的景点信息（优先通过 locationId JOIN，其次通过名称匹配）
      const [venueItins] = await dbConn.execute(sql`
        SELECT 
          COALESCE(a.name, i.locationName) as locationName,
          i.startTime,
          i.endTime,
          i.groupId,
          g.name as groupName,
          g.code as groupCode,
          COALESCE(g.studentCount, 0) + COALESCE(g.teacherCount, 0) as headcount,
          COALESCE(a.maxCapacity, a.capacity, 500) as maxCapacity,
          a.id as attractionId
        FROM itineraries i
        JOIN \`groups\` g ON i.groupId = g.id
        LEFT JOIN attractions a ON (i.locationId = a.id OR (i.locationId IS NULL AND a.name = i.locationName))
        WHERE DATE_FORMAT(i.date, '%Y-%m-%d') = ${todayStr}
          AND (i.locationId IS NOT NULL OR (i.locationName IS NOT NULL AND i.locationName != ''))
        ORDER BY i.startTime ASC
      `);

      // 按景点分组，计算当前人数和预计到达
      const venueMap = new Map<string, any>();
      for (const itin of (venueItins as unknown) as any[]) {
        const key = itin.locationName;
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: key,
            maxCapacity: itin.maxCapacity || 500,
            currentGroups: [],
            upcomingGroups: [],
          });
        }
        const venue = venueMap.get(key)!;
        const nowMins = currentHour * 60 + currentMinute;
        if (itin.startTime && itin.endTime) {
          const [sh, sm] = itin.startTime.split(':').map(Number);
          const [eh, em] = itin.endTime.split(':').map(Number);
          if (nowMins >= sh * 60 + sm && nowMins < eh * 60 + em) {
            venue.currentGroups.push({ ...itin, hoursUntil: 0 });
          } else if (sh * 60 + sm > nowMins) {
            const hoursUntil = ((sh * 60 + sm) - nowMins) / 60;
            venue.upcomingGroups.push({ ...itin, hoursUntil: Math.round(hoursUntil * 10) / 10 });
          }
        }
      }

      return Array.from(venueMap.values()).map(v => {
        const currentPax = v.currentGroups.reduce((sum: number, g: any) => sum + (g.headcount || 0), 0);
        const totalWithUpcoming = v.upcomingGroups.reduce((sum: number, g: any) => sum + (g.headcount || 0), 0) + currentPax;
        const alertLevel = currentPax > v.maxCapacity * 0.9 ? 'critical' :
          totalWithUpcoming > v.maxCapacity * 0.85 ? 'warning' : 'healthy';
        return { ...v, currentPax, totalWithUpcoming, alertLevel };
      }).filter(v => v.currentGroups.length > 0 || v.upcomingGroups.length > 0);
    }),

    // 获取餐饮预备提醒
    diningAlert: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // 智能日期逻辑：优先用今天，若无数据则找最近有数据的日期
      const realTodayStr2 = now.toISOString().slice(0, 10);
      const [dc] = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM dailyCards WHERE DATE_FORMAT(date, '%Y-%m-%d') = ${realTodayStr2}`);
      let smartTodayStr = realTodayStr2;
      if (((dc as unknown) as any[])[0]?.cnt === 0) {
        const [nf2] = await dbConn.execute(sql`SELECT DATE_FORMAT(MIN(date), '%Y-%m-%d') as d FROM dailyCards WHERE date >= NOW()`);
        const fd2 = ((nf2 as unknown) as any[])[0]?.d;
        if (fd2) smartTodayStr = fd2;
        else { const [np2] = await dbConn.execute(sql`SELECT DATE_FORMAT(MAX(date), '%Y-%m-%d') as d FROM dailyCards WHERE date < NOW()`); const pd2 = ((np2 as unknown) as any[])[0]?.d; if (pd2) smartTodayStr = pd2; }
      }
      const smartTomorrowDate = new Date(smartTodayStr);
      smartTomorrowDate.setDate(smartTomorrowDate.getDate() + 1);
      const smartTomorrowStr = smartTomorrowDate.toISOString().slice(0, 10);

      // 从 dailyCards 关联 restaurants 获取餐饮安排
      const [diningCards] = await dbConn.execute(sql`
        SELECT 
          dc.id as cardId,
          DATE_FORMAT(dc.date, '%Y-%m-%d') as bookingDate,
          dc.groupId,
          g.name as groupName,
          g.code as groupCode,
          COALESCE(g.studentCount, 0) + COALESCE(g.teacherCount, 0) as pax,
          -- 早餐
          br.id as breakfastId,
          COALESCE(br.name, dc.breakfastRestaurant) as breakfastName,
          COALESCE(br.address, dc.breakfastAddress) as breakfastAddr,
          -- 午餐
          lr.id as lunchId,
          COALESCE(lr.name, dc.lunchRestaurant) as lunchName,
          COALESCE(lr.address, dc.lunchAddress) as lunchAddr,
          -- 晚餐
          dr.id as dinnerId,
          COALESCE(dr.name, dc.dinnerRestaurant) as dinnerName,
          COALESCE(dr.address, dc.dinnerAddress) as dinnerAddr
        FROM dailyCards dc
        JOIN \`groups\` g ON dc.groupId = g.id
        LEFT JOIN restaurants br ON dc.breakfastRestaurantId = br.id
        LEFT JOIN restaurants lr ON dc.lunchRestaurantId = lr.id
        LEFT JOIN restaurants dr ON dc.dinnerRestaurantId = dr.id
        WHERE DATE_FORMAT(dc.date, '%Y-%m-%d') IN (${smartTodayStr}, ${smartTomorrowStr})
          AND (dc.breakfastRestaurant IS NOT NULL OR dc.lunchRestaurant IS NOT NULL OR dc.dinnerRestaurant IS NOT NULL
               OR dc.breakfastRestaurantId IS NOT NULL OR dc.lunchRestaurantId IS NOT NULL OR dc.dinnerRestaurantId IS NOT NULL)
        ORDER BY dc.date ASC
      `);

      // 将每天的三餐展开为独立餐饮记录
      const result: any[] = [];
      const mealTimes: Record<string, string> = { breakfast: '08:00', lunch: '12:00', dinner: '18:30' };
      for (const card of (diningCards as unknown) as any[]) {
        const meals = [
          { type: 'breakfast', name: card.breakfastName, addr: card.breakfastAddr, time: mealTimes.breakfast },
          { type: 'lunch', name: card.lunchName, addr: card.lunchAddr, time: mealTimes.lunch },
          { type: 'dinner', name: card.dinnerName, addr: card.dinnerAddr, time: mealTimes.dinner },
        ];
        for (const meal of meals) {
          if (!meal.name) continue;
          let hoursUntil = 0;
          let urgency: 'now' | 'soon' | 'later' | 'tomorrow' = 'later';
          if (card.bookingDate === smartTodayStr) {
            const [mh, mm] = meal.time.split(':').map(Number);
            const nowMins = currentHour * 60 + currentMinute;
            const mealMins = mh * 60 + mm;
            hoursUntil = (mealMins - nowMins) / 60;
            if (hoursUntil <= 0) urgency = 'now';
            else if (hoursUntil <= 1) urgency = 'soon';
            else urgency = 'later';
          } else {
            urgency = 'tomorrow';
            hoursUntil = 24;
          }
          result.push({
            id: `${card.cardId}-${meal.type}`,
            restaurantName: meal.name,
            address: meal.addr,
            bookingTime: meal.time,
            bookingPax: card.pax,
            bookingDate: card.bookingDate,
            groupName: card.groupName,
            groupCode: card.groupCode,
            mealType: meal.type,
            hoursUntil: Math.round(hoursUntil * 10) / 10,
            urgency,
          });
        }
      }

      // 如果 dailyCards 无数据，尝试从 restaurants.bookingDate 获取
      if (result.length === 0) {
        const [bookings] = await dbConn.execute(sql`
          SELECT 
            r.id,
            r.name as restaurantName,
            r.address,
            r.bookingTime,
            r.bookingPax,
            DATE_FORMAT(r.bookingDate, '%Y-%m-%d') as bookingDate,
            g.name as groupName,
            g.code as groupCode
          FROM restaurants r
          LEFT JOIN \`groups\` g ON r.bookingGroupId = g.id
          WHERE DATE_FORMAT(r.bookingDate, '%Y-%m-%d') IN (${todayStr}, ${tomorrowStr})
            AND r.bookingTime IS NOT NULL
          ORDER BY r.bookingDate ASC, r.bookingTime ASC
        `);
        return ((bookings as unknown) as any[]).map((b: any) => {
          let hoursUntil = 0;
          let urgency: 'now' | 'soon' | 'later' | 'tomorrow' = 'later';
          if (b.bookingDate === todayStr && b.bookingTime) {
            const [bh, bm] = b.bookingTime.split(':').map(Number);
            const nowMins = currentHour * 60 + currentMinute;
            const bookingMins = bh * 60 + bm;
            hoursUntil = (bookingMins - nowMins) / 60;
            if (hoursUntil <= 0) urgency = 'now';
            else if (hoursUntil <= 1) urgency = 'soon';
            else urgency = 'later';
          } else {
            urgency = 'tomorrow';
            hoursUntil = 24;
          }
          return { ...b, hoursUntil: Math.round(hoursUntil * 10) / 10, urgency };
        });
      }

      return result;
    }),

    // 获取今日住宿统计
    accommodationStats: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return { hk: 0, sz: 0, total: 0, groups: [] };
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      // 智能日期逻辑
      const realTodayStr = now.toISOString().slice(0, 10);
      const [ac] = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM scheduleBlocks WHERE DATE_FORMAT(date, '%Y-%m-%d') = ${realTodayStr}`);
      let todayStr = realTodayStr;
      if (((ac as unknown) as any[])[0]?.cnt === 0) {
        const [nf] = await dbConn.execute(sql`SELECT DATE_FORMAT(MIN(date), '%Y-%m-%d') as d FROM scheduleBlocks WHERE date >= NOW()`);
        const fd = ((nf as unknown) as any[])[0]?.d;
        if (fd) todayStr = fd;
        else { const [np] = await dbConn.execute(sql`SELECT DATE_FORMAT(MAX(date), '%Y-%m-%d') as d FROM scheduleBlocks WHERE date < NOW()`); const pd = ((np as unknown) as any[])[0]?.d; if (pd) todayStr = pd; }
      }

      // 通过 scheduleBlocks 判断今天各团组在哪个城市
      const [blocks] = await dbConn.execute(sql`
        SELECT 
          sb.groupId,
          sb.blockType,
          g.name as groupName,
          g.code as groupCode,
          COALESCE(g.studentCount, 0) + COALESCE(g.teacherCount, 0) as headcount
        FROM scheduleBlocks sb
        JOIN \`groups\` g ON sb.groupId = g.id
        WHERE DATE_FORMAT(sb.date, '%Y-%m-%d') = ${todayStr}
      `);

      let hkCount = 0, szCount = 0;
      const groupDetails: any[] = [];
      for (const b of (blocks as unknown) as any[]) {
        const isHK = ['hk', 'hk_arrive', 'exchange', 'departure_hk'].includes(b.blockType);
        const isSZ = ['sz', 'sz_arrive', 'border_cross', 'departure_sz'].includes(b.blockType);
        if (isHK) hkCount += b.headcount || 0;
        if (isSZ) szCount += b.headcount || 0;
        groupDetails.push({ ...b, city: isHK ? 'hk' : isSZ ? 'sz' : 'transit' });
      }
      return { hk: hkCount, sz: szCount, total: hkCount + szCount, groups: groupDetails };
    }),

    // 获取航班信息
    // 紧急调整行程点
    urgentAdjust: protectedProcedure
      .input(z.object({
        itineraryId: z.number(),
        locationName: z.string().optional(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        notes: z.string().optional(),
        reason: z.string(), // 调整原因（必填）
        notifyAll: z.boolean().default(false), // 是否通知全员
      }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error('DB not available');
        const { sql } = await import('drizzle-orm');
        // 1. 获取原行程点信息
        const [origRows] = await dbConn.execute(sql`
          SELECT i.id, i.locationName, i.description, i.startTime, i.endTime, i.notes,
            DATE_FORMAT(i.date, '%Y-%m-%d') as date,
            g.name as groupName, g.code as groupCode
          FROM itineraries i
          JOIN \`groups\` g ON g.id = i.groupId
          WHERE i.id = ${input.itineraryId}
        `);
        const orig = ((origRows as unknown) as any[])[0];
        if (!orig) throw new Error('行程點不存在');
        // 2. 更新行程點（使用 Drizzle sql 模板安全参数化）
        const hasUpdate = input.locationName !== undefined || input.description !== undefined ||
          input.startTime !== undefined || input.endTime !== undefined || input.notes !== undefined;
        if (hasUpdate) {
          await dbConn.execute(sql`
            UPDATE itineraries SET
              locationName = COALESCE(${input.locationName ?? null}, locationName),
              description = COALESCE(${input.description ?? null}, description),
              startTime = COALESCE(${input.startTime ?? null}, startTime),
              endTime = COALESCE(${input.endTime ?? null}, endTime),
              notes = COALESCE(${input.notes ?? null}, notes)
            WHERE id = ${input.itineraryId}
          `);
        }
        // 3. 如果通知全员，向所有用户写入通知
        if (input.notifyAll) {
          const [allUsers] = await dbConn.execute(sql`SELECT id FROM users`);
          const userList = (allUsers as unknown) as any[];
          const title = `【緊急調整】${orig.groupCode} ${orig.date} 行程點變更`;
          const content = `${orig.groupName} 在 ${orig.date} 的行程點「${orig.locationName || orig.description}」已緊急調整。\n調整原因：${input.reason}\n` +
            (input.locationName ? `地點：${orig.locationName} → ${input.locationName}\n` : '') +
            (input.startTime ? `時間：${orig.startTime}–${orig.endTime} → ${input.startTime}–${input.endTime ?? orig.endTime}\n` : '') +
            (input.description ? `內容：${input.description}\n` : '') +
            (input.notes ? `備註：${input.notes}` : '');
          for (const u of userList) {
            await dbConn.execute(sql`
              INSERT INTO notifications (userId, type, title, content, isRead, createdAt)
              VALUES (${u.id}, 'change', ${title}, ${content}, false, NOW())
            `);
          }
          // 同时通知 owner
          const { notifyOwner } = await import('./_core/notification');
          await notifyOwner({ title, content });
        }
        return { success: true, groupName: orig.groupName, date: orig.date };
      }),

    // 获取最近调整记录
    recentAdjustments: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { sql } = await import('drizzle-orm');
      // 从 notifications 表中获取最近的 change 类型通知作为调整记录
      const [rows] = await dbConn.execute(sql`
        SELECT n.title, n.content, DATE_FORMAT(n.createdAt, '%Y-%m-%d %H:%i') as createdAt
        FROM notifications n
        WHERE n.type = 'change'
        GROUP BY n.title, n.content, n.createdAt
        ORDER BY n.createdAt DESC
        LIMIT 5
      `);
      return (rows as unknown) as any[];
    }),

    flightInfo: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return { arrivals: [], departures: [] };
      const { sql } = await import('drizzle-orm');
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      // 获取今明两天的抵达/离开团组
      const [arrivals] = await dbConn.execute(sql`
        SELECT g.id, g.name, g.code, g.flight_info as flightInfo, g.studentCount, g.teacherCount,
          DATE_FORMAT(g.startDate, '%Y-%m-%d') as startDate
        FROM \`groups\` g
        WHERE DATE_FORMAT(g.startDate, '%Y-%m-%d') IN (${todayStr}, ${tomorrowStr})
        ORDER BY g.startDate ASC
      `);
      const [departures] = await dbConn.execute(sql`
        SELECT g.id, g.name, g.code, g.flight_info as flightInfo, g.studentCount, g.teacherCount,
          DATE_FORMAT(g.endDate, '%Y-%m-%d') as endDate
        FROM \`groups\` g
        WHERE DATE_FORMAT(g.endDate, '%Y-%m-%d') IN (${todayStr}, ${tomorrowStr})
        ORDER BY g.endDate ASC
      `);
      return { arrivals: (arrivals as unknown) as any[], departures: (departures as unknown) as any[] };
    }),
  }),
  pushNotifications: router({
    // 訂閱推送通知
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        // 先刪除同一 endpoint 的舊訂閱（避免重複）
        await dbConn.delete(pushSubTable).where(eq(pushSubTable.endpoint, input.endpoint));
        await dbConn.insert(pushSubTable).values({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent || null,
        });
        return { success: true };
      }),

    // 取消訂閱
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        await dbConn.delete(pushSubTable).where(eq(pushSubTable.endpoint, input.endpoint));
        return { success: true };
      }),

    // 查詢當前用戶的訂閱狀態
    mySubscriptions: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const rows = await dbConn
        .select({ id: pushSubTable.id, endpoint: pushSubTable.endpoint, userAgent: pushSubTable.userAgent, createdAt: pushSubTable.createdAt })
        .from(pushSubTable)
        .where(eq(pushSubTable.userId, ctx.user.id));
      return rows;
    }),

    // 管理員：向所有人發送測試通知
    sendTest: adminProcedure
      .input(z.object({
        title: z.string().default('HKEIU 測試通知'),
        body: z.string().default('這是一條測試推送通知，系統運行正常。'),
      }))
      .mutation(async ({ input }) => {
        const count = await sendWebPushToAll({ title: input.title, body: input.body, url: '/' });
        return { sent: count };
      }),

    // 向所有訂閱者廣播通知（供其他路由內部調用）
    broadcast: adminProcedure
      .input(z.object({
        title: z.string(),
        body: z.string(),
        url: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const count = await sendWebPushToAll(input);
        return { sent: count };
      }),
  }),
});
export type AppRouter = typeof appRouter;
export { sendWebPushToAll };
