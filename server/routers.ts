import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { nanoid } from "nanoid";

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
        name: z.string(),
        code: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        days: z.number(),
        type: z.enum(['elementary', 'middle', 'vip']),
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
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createGroup({
          ...input,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        days: z.number().optional(),
        type: z.enum(['elementary', 'middle', 'vip']).optional(),
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateGroup(id, updateData);
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
        return { success: true };
      }),
    
    update: editorProcedure
      .input(z.object({
        id: z.number(),
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
  }),
  
  // 食行卡片管理
  dailyCards: router({
    listByGroup: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDailyCardsByGroupId(input.groupId);
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
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
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
        return { success: true };
      }),
    
    delete: editorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFile(input.id);
        return { success: true };
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
});

export type AppRouter = typeof appRouter;
