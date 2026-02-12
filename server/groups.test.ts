import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "editor" | "viewer" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local",
    role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Groups Management", () => {
  it("should allow authenticated users to list groups", async () => {
    const ctx = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.groups.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow editors to create groups", async () => {
    const ctx = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const randomCode = `TEST${Date.now()}`;
    const groupData = {
      name: "Test Group",
      code: randomCode,
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      days: 7,
      type: "middle" as const,
      studentCount: 30,
      teacherCount: 3,
      totalCount: 33,
    };

    const result = await caller.groups.create(groupData);
    expect(result.success).toBe(true);
  });

  it("should prevent viewers from creating groups", async () => {
    const ctx = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const groupData = {
      name: "Test Group",
      code: "TEST002",
      startDate: "2024-01-01",
      endDate: "2024-01-07",
      days: 7,
      type: "middle" as const,
    };

    await expect(caller.groups.create(groupData)).rejects.toThrow();
  });
});

describe("User Management", () => {
  it("should allow admins to list users", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should prevent non-admins from listing users", async () => {
    const ctx = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.users.list()).rejects.toThrow();
  });

  it("should allow admins to create users", async () => {
    const ctx = createTestContext("admin");
    const caller = appRouter.createCaller(ctx);

    const randomUsername = `testuser_${Date.now()}`;
    const userData = {
      username: randomUsername,
      password: "testpass123",
      name: "Test User",
      email: `${randomUsername}@example.com`,
      role: "viewer" as const,
    };

    const result = await caller.users.create(userData);
    expect(result.success).toBe(true);
  });
});

describe("Locations Management", () => {
  it("should allow authenticated users to list locations", async () => {
    const ctx = createTestContext("viewer");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.locations.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0); // Should have initial locations from seed
  });

  it("should allow editors to create locations", async () => {
    const ctx = createTestContext("editor");
    const caller = appRouter.createCaller(ctx);

    const locationData = {
      name: "Test Location",
      address: "Test Address",
      capacity: 100,
      applicableType: "all" as const,
    };

    const result = await caller.locations.create(locationData);
    expect(result.success).toBe(true);
  });
});
