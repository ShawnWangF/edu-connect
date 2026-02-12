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

describe("批量導入人員功能", () => {
  it("可以批量創建多個成員", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-批量導入",
      code: "BATCH-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-批量導入");
    expect(testGroup).toBeDefined();

    // 批量創建成員
    const result = await caller.members.batchCreate({
      groupId: testGroup!.id,
      members: [
        {
          name: "張三",
          identity: "student",
          gender: "male",
          phone: "13800138001",
        },
        {
          name: "李四",
          identity: "student",
          gender: "female",
          phone: "13800138002",
        },
        {
          name: "王老師",
          identity: "teacher",
          gender: "male",
          phone: "13800138003",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(3);

    // 驗證成員已創建
    const members = await caller.members.listByGroup({ groupId: testGroup!.id });
    expect(members.length).toBeGreaterThanOrEqual(3);
    
    const zhangsan = members.find((m) => m.name === "張三");
    expect(zhangsan).toBeDefined();
    expect(zhangsan?.identity).toBe("student");
    expect(zhangsan?.gender).toBe("male");
  });

  it("批量導入時可以處理部分字段為空的情況", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-空值處理",
      code: "NULL-TEST-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-空值處理");
    expect(testGroup).toBeDefined();

    // 批量創建成員（部分字段為空）
    const result = await caller.members.batchCreate({
      groupId: testGroup!.id,
      members: [
        {
          name: "趙六",
          identity: "student",
          // gender, phone, idCard, notes 都為空
        },
        {
          name: "孫七",
          identity: "teacher",
          phone: "13800138004",
          // gender, idCard, notes 為空
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);

    // 驗證成員已創建
    const members = await caller.members.listByGroup({ groupId: testGroup!.id });
    const zhaoliu = members.find((m) => m.name === "趙六");
    expect(zhaoliu).toBeDefined();
    expect(zhaoliu?.identity).toBe("student");
    // 數據庫返回null而不是undefined
    expect(zhaoliu?.gender).toBeNull();
    expect(zhaoliu?.phone).toBeNull();
  });
});
