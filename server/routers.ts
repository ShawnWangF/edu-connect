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
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createGroup({
          ...input,
          createdBy: ctx.user.id,
        });
        
        // 獲取創建的團組信息
        const groups = await db.getAllGroups();
        const newGroup = groups[groups.length - 1]; // 最新創建的團組
        
        // 發送通知給全體成員
        if (newGroup) {
          notificationService.notifyGroupCreated(newGroup).catch(console.error);
        }
        
        return { success: true };
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        
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
});

export type AppRouter = typeof appRouter;
