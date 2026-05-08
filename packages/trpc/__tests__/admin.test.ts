import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  organization: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  orgMembership: {
    upsert: vi.fn(),
    delete: vi.fn(),
  },
};

function makeCtx(role: "USER" | "SUPERADMIN" = "SUPERADMIN") {
  return {
    session: { user: { id: "admin-1", role } } as any,
    prisma: mockPrisma as any,
  };
}

describe("admin.org.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an org when called by SUPERADMIN", async () => {
    mockPrisma.organization.create.mockResolvedValue({ id: "o1", name: "New Org", slug: "new-org" });
    const caller = appRouter.createCaller(makeCtx("SUPERADMIN"));
    const result = await caller.admin.org.create({ name: "New Org", slug: "new-org" });
    expect(result.id).toBe("o1");
  });

  it("throws UNAUTHORIZED when called by a regular USER", async () => {
    const caller = appRouter.createCaller(makeCtx("USER"));
    await expect(caller.admin.org.create({ name: "New Org", slug: "new-org" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("admin.org.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all orgs with member and API counts", async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: "o1", name: "Acme", slug: "acme", _count: { memberships: 5, apis: 3 }, createdAt: new Date() },
    ]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.admin.org.listAll();
    expect(result).toHaveLength(1);
    expect(result[0]._count.memberships).toBe(5);
  });
});

describe("admin.user.listAll", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all users with org membership counts", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Ada", email: "ada@example.com", role: "USER", _count: { memberships: 2 }, createdAt: new Date() },
    ]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.admin.user.listAll();
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("USER");
  });
});

describe("admin.org.setMemberRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts org membership with given role", async () => {
    mockPrisma.orgMembership.upsert.mockResolvedValue({ userId: "u1", orgId: "o1", role: "ADMIN" });
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.admin.org.setMemberRole({ userId: "u1", orgId: "o1", role: "ADMIN" });
    expect(result.role).toBe("ADMIN");
  });
});
