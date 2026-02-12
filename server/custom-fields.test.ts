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

describe("自定義字段導入功能", () => {
  it("可以導入包含任意自定義字段的成員數據", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-自定義字段",
      code: "CUSTOM-FIELDS-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-自定義字段");
    expect(testGroup).toBeDefined();

    // 批量創建成員，包含自定義字段
    const result = await caller.members.batchCreate({
      groupId: testGroup!.id,
      members: [
        {
          "姓名": "張三",
          "身份": "學生",
          "性別": "男",
          "聯系電話": "13800138001",
          "年齡": "15",
          "班級": "初一(3)班",
          "家長姓名": "張父",
          "家長電話": "13900139001",
          "過敏史": "花生過敏",
        },
        {
          "姓名": "李四",
          "身份": "學生",
          "性別": "女",
          "聯系電話": "13800138002",
          "年齡": "14",
          "班級": "初一(2)班",
          "特殊需求": "素食",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r: any) => r.success)).toBe(true);

    // 驗證成員已創建
    const members = await caller.members.listByGroup({ groupId: testGroup!.id });
    const zhangsan = members.find((m) => m.name === "張三");
    expect(zhangsan).toBeDefined();
    expect(zhangsan?.customFields).toBeDefined();
    expect(zhangsan?.customFields).toMatchObject({
      "年齡": "15",
      "班級": "初一(3)班",
      "家長姓名": "張父",
      "家長電話": "13900139001",
      "過敏史": "花生過敏",
    });

    const lisi = members.find((m) => m.name === "李四");
    expect(lisi).toBeDefined();
    expect(lisi?.customFields).toBeDefined();
    expect(lisi?.customFields).toMatchObject({
      "年齡": "14",
      "班級": "初一(2)班",
      "特殊需求": "素食",
    });
  });

  it("標準字段會正確映射，其他字段存入customFields", async () => {
    const { ctx } = createAuthContext("editor");
    const caller = appRouter.createCaller(ctx);

    // 創建測試團組
    await caller.groups.create({
      name: "測試團組-字段映射",
      code: "FIELD-MAPPING-" + Date.now(),
      startDate: "2024-06-01",
      endDate: "2024-06-05",
      days: 5,
      type: "elementary",
    });

    const groups = await caller.groups.list();
    const testGroup = groups.find((g) => g.name === "測試團組-字段映射");
    expect(testGroup).toBeDefined();

    // 批量創建成員
    const result = await caller.members.batchCreate({
      groupId: testGroup!.id,
      members: [
        {
          "姓名": "王五",
          "身份": "教師",
          "電話": "13800138003",
          "身份證號": "110101199001011234",
          "備註": "帶隊老師",
          "職稱": "高級教師",
          "科目": "數學",
        },
      ],
    });

    expect(result.success).toBe(true);

    // 驗證字段映射
    const members = await caller.members.listByGroup({ groupId: testGroup!.id });
    const wangwu = members.find((m) => m.name === "王五");
    expect(wangwu).toBeDefined();
    expect(wangwu?.identity).toBe("teacher"); // "教師" 應該映射為 "teacher"
    expect(wangwu?.phone).toBe("13800138003");
    expect(wangwu?.idCard).toBe("110101199001011234");
    expect(wangwu?.notes).toBe("帶隊老師");
    expect(wangwu?.customFields).toMatchObject({
      "職稱": "高級教師",
      "科目": "數學",
    });
  });
});
