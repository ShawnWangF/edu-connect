import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "editor" | "viewer" = "editor"): { ctx: TrpcContext } {
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
      cookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("團組編輯和刪除功能", () => {
  it("編輯者可以更新團組信息", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-編輯",
      code: "EDIT-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    // 獲取團組列表
    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-編輯");
    expect(testGroup).toBeDefined();

    // 更新團組
    const result = await caller.groups.update({
      id: testGroup!.id,
      name: "測試團組-已編輯",
      status: "ongoing",
    });

    expect(result.success).toBe(true);

    // 驗證更新
    const updatedGroup = await caller.groups.get({ id: testGroup!.id });
    expect(updatedGroup?.name).toBe("測試團組-已編輯");
    expect(updatedGroup?.status).toBe("ongoing");
  });

  it("編輯者可以刪除團組", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-刪除",
      code: "DEL-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    // 獲取團組
    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-刪除");
    expect(testGroup).toBeDefined();

    // 刪除團組
    const result = await caller.groups.delete({ id: testGroup!.id });
    expect(result.success).toBe(true);

    // 驗證刪除（應該拋出錯誤或返回null）
    const deletedGroup = await caller.groups.get({ id: testGroup!.id });
    expect(deletedGroup).toBeUndefined();
  });
});

describe("行程點管理功能", () => {
  it("可以添加、編輯和刪除行程點", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-行程",
      code: "ITIN-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-行程");
    expect(testGroup).toBeDefined();

    // 添加行程點
    await caller.itineraries.create({
      groupId: testGroup!.id,
      date: "2024-06-01",
      dayNumber: 1,
      startTime: "09:00",
      endTime: "12:00",
      locationName: "故宮博物院",
      description: "參觀故宮",
      notes: "需提前預約",
    });

    // 獲取行程列表
    const itineraries = await caller.itineraries.listByGroup({ groupId: testGroup!.id });
    expect(itineraries.length).toBeGreaterThan(0);

    const testItinerary = itineraries[0];
    expect(testItinerary?.locationName).toBe("故宮博物院");

    // 更新行程點
    await caller.itineraries.update({
      id: testItinerary!.id,
      locationName: "故宮博物院（已更新）",
      startTime: "10:00",
    });

    const updatedItineraries = await caller.itineraries.listByGroup({ groupId: testGroup!.id });
    const updatedItinerary = updatedItineraries.find((i) => i.id === testItinerary!.id);
    expect(updatedItinerary?.locationName).toBe("故宮博物院（已更新）");
    expect(updatedItinerary?.startTime).toBe("10:00");

    // 刪除行程點
    await caller.itineraries.delete({ id: testItinerary!.id });
    const finalItineraries = await caller.itineraries.listByGroup({ groupId: testGroup!.id });
    expect(finalItineraries.find((i) => i.id === testItinerary!.id)).toBeUndefined();
  });
});

describe("食行卡片複製功能", () => {
  it("可以創建和查詢食行卡片", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-食行卡片",
      code: "CARD-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-食行卡片");
    expect(testGroup).toBeDefined();

    // 創建食行卡片
    await caller.dailyCards.upsert({
      groupId: testGroup!.id,
      date: "2024-06-01",
      hotelName: "測試酒店",
      hotelAddress: "測試地址123號",
      vehiclePlate: "粵A12345",
      driverName: "張師傅",
      driverPhone: "13800138000",
      guideName: "李導遊",
      guidePhone: "13900139000",
      breakfastRestaurant: "早餐餐廳",
      lunchRestaurant: "午餐餐廳",
      dinnerRestaurant: "晚餐餐廳",
      specialNotes: "特殊備註",
    });

    // 查詢食行卡片
    const cards = await caller.dailyCards.listByGroup({ groupId: testGroup!.id });
    expect(cards.length).toBeGreaterThan(0);

    const testCard = cards[0];
    expect(testCard?.hotelName).toBe("測試酒店");
    expect(testCard?.vehiclePlate).toBe("粵A12345");
    expect(testCard?.guideName).toBe("李導遊");
  });
});
