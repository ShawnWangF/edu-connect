import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "editor" | "viewer" = "editor"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Daily Cards Management", () => {
  it("should allow editors to create/update daily cards", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const cardData = {
      groupId: 1,
      date: "2024-01-01",
      hotelName: "測試酒店",
      hotelAddress: "測試地址",
      vehiclePlate: "粵A12345",
      driverName: "張三",
      driverPhone: "13800138000",
      breakfastRestaurant: "早餐餐廳",
      lunchRestaurant: "午餐餐廳",
      dinnerRestaurant: "晚餐餐廳",
      specialNotes: "特殊備註",
    };

    const result = await caller.dailyCards.upsert(cardData);
    expect(result.success).toBe(true);
  });

  it("should allow users to list daily cards by group", async () => {
    const { ctx } = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dailyCards.listByGroup({ groupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Members Management", () => {
  it("should allow editors to create members", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const memberData = {
      groupId: 1,
      name: "測試學生",
      identity: "student" as const,
      gender: "male" as const,
      phone: "13800138000",
      idCard: "440000199001011234",
      notes: "測試備註",
    };

    const result = await caller.members.create(memberData);
    expect(result.success).toBe(true);
  });

  it("should allow users to list members by group", async () => {
    const { ctx } = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.members.listByGroup({ groupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow editors to update members", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.members.update({
      id: 1,
      name: "更新後的名字",
      phone: "13900139000",
    });
    expect(result.success).toBe(true);
  });

  it("should allow editors to delete members", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.members.delete({ id: 999 }); // 使用不存在的ID避免影響其他測試
    expect(result.success).toBe(true);
  });
});

describe("Files Management", () => {
  it("should allow editors to create file records", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const fileData = {
      groupId: 1,
      name: "測試文件.pdf",
      fileKey: "group-1/test-file.pdf",
      url: "https://storage.example.com/test-file.pdf",
      mimeType: "application/pdf",
      size: 102400,
    };

    const result = await caller.files.create(fileData);
    expect(result.success).toBe(true);
  });

  it("should allow users to list files", async () => {
    const { ctx } = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.files.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow users to list files by group", async () => {
    const { ctx } = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.files.listByGroup({ groupId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow editors to delete files", async () => {
    const { ctx } = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.files.delete({ id: 999 }); // 使用不存在的ID避免影響其他測試
    expect(result.success).toBe(true);
  });
});
