import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { nanoid } from "nanoid";
import * as notificationService from "./notificationService";

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
      return await db.getAllGroups();
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
        tags: z.string().optional(),
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
        tags: z.string().optional(),
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
        schoolList: z.array(z.object({
          name: z.string(),
          studentCount: z.number(),
          teacherCount: z.number().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, batchId, batchCode, startCity, crossingDate, sisterSchoolId, flightInfo, schoolList, ...rest } = input as any;
        const updateData = {
          ...rest,
          ...(batchId !== undefined && { batch_id: batchId }),
          ...(batchCode !== undefined && { batch_code: batchCode }),
          ...(startCity !== undefined && { start_city: startCity }),
          ...(crossingDate !== undefined && { crossing_date: crossingDate }),
          ...(sisterSchoolId !== undefined && { sister_school_id: sisterSchoolId }),
          ...(flightInfo !== undefined && { flight_info: flightInfo }),
          ...(schoolList !== undefined && { school_list: schoolList }),
        };
        
        // 獲取更新前的團組信息
        const oldGroup = await db.getGroupById(id);
        
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
        breakfastRestaurant: z.string().optional(),
        breakfastAddress: z.string().optional(),
        lunchRestaurant: z.string().optional(),
        lunchAddress: z.string().optional(),
        dinnerRestaurant: z.string().optional(),
        dinnerAddress: z.string().optional(),
        specialNotes: z.string().optional(),
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
        capacity: z.number(),
        applicableType: z.enum(['all', 'elementary', 'middle', 'vip']),
        restrictedDays: z.string().optional(),
        contact: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createLocation(input);
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
        contact: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
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
        isAlwaysUnavailable: z.boolean(),
        unavailableTimeSlots: z.array(z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createAttraction(input);
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
  
  // 交流學校（港澳）管理
  exchangeSchools: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllExchangeSchools();
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
        availableDates: z.array(z.string()).optional(),
        schoolType: z.string().optional(),
        maxGroupSize: z.number().optional(),
        capacity: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createExchangeSchool({ ...input, createdBy: ctx.user.id });
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
        availableDates: z.array(z.string()).optional(),
        schoolType: z.string().optional(),
        maxGroupSize: z.number().optional(),
        capacity: z.number().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateExchangeSchool(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteExchangeSchool(input.id);
        return { success: true };
      }),
  }),
  
  // 前來交流學校（內地）管理
  domesticSchools: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDomesticSchoolsByProject(input.projectId);
      }),
    
    create: editorProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string(),
        address: z.string().optional(),
        studentCount: z.number().default(0),
        teacherCount: z.number().default(0),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        schoolType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createDomesticSchool({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        address: z.string().optional(),
        studentCount: z.number().optional(),
        teacherCount: z.number().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        schoolType: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateDomesticSchool(id, updateData);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDomesticSchool(input.id);
        return { success: true };
      }),
  }),
  
  // 此路由已府简，請使用 exchangeSchools 或 domesticSchools
  // 學校交流管理
  schoolExchanges: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSchoolExchangesByGroup(input.groupId);
      }),
    
    create: editorProcedure
      .input(z.object({
        groupId: z.number(),
        schoolId: z.number(),
        exchangeDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        activities: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createSchoolExchange(input);
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSchoolExchange(input.id);
        return { success: true };
      }),
  }),
  
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

  // ===== 工作人員庫 =====
  staff: router({
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const { staff } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      return await dbConn.select().from(staff).where(eq(staff.isActive, true));
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

    // 獲取工作人員的指派列表
    getAssignments: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { batchStaff, groups } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const assignments = await dbConn.select({
          assignment: batchStaff,
          group: groups,
        }).from(batchStaff)
          .leftJoin(groups, eq(batchStaff.groupId, groups.id))
          .where(eq(batchStaff.staffId, input.staffId));
        return assignments;
      }),
  }),

  // ===== 批次工作人員指派 =====
  batchStaff: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const { batchStaff, staff } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const result = await dbConn.select({
          assignment: batchStaff,
          staffMember: staff,
        }).from(batchStaff)
          .leftJoin(staff, eq(batchStaff.staffId, staff.id))
          .where(eq(batchStaff.groupId, input.groupId));
        return result;
      }),

    assign: editorProcedure
      .input(z.object({
        groupId: z.number(),
        staffId: z.number(),
        role: z.enum(['coordinator','staff','guide','driver']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const { batchStaff } = await import('../drizzle/schema');
        const result = await dbConn.insert(batchStaff).values({
          ...input,
          startDate: input.startDate as any,
          endDate: input.endDate as any,
        });
        return { id: Number(result[0].insertId) };
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
});

export type AppRouter = typeof appRouter;
