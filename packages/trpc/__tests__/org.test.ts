import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  organization: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  orgMembership: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

function makeCtx(userId?: string) {
  return {
    session: userId ? ({ user: { id: userId, role: "USER" } } as any) : null,
    prisma: mockPrisma as any,
  };
}

describe("org.listPublic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all organizations ordered by name", async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: "o1", name: "Acme", slug: "acme" },
      { id: "o2", name: "TechCo", slug: "techco" },
    ]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.org.listPublic();

    expect(result).toHaveLength(2);
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  });
});

describe("org.join", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates membership for authenticated user", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue(null);
    mockPrisma.orgMembership.create.mockResolvedValue({ userId: "u1", orgId: "o1" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    const result = await caller.org.join({ orgId: "o1" });

    expect(result.success).toBe(true);
    expect(mockPrisma.orgMembership.create).toHaveBeenCalledWith({
      data: { userId: "u1", orgId: "o1" },
    });
  });

  it("throws CONFLICT if already a member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue({ userId: "u1", orgId: "o1" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(caller.org.join({ orgId: "o1" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("throws UNAUTHORIZED if not logged in", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.org.join({ orgId: "o1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("org.leave", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes membership", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue({ userId: "u1", orgId: "o1", role: "MEMBER" });
    mockPrisma.orgMembership.delete.mockResolvedValue({});

    const caller = appRouter.createCaller(makeCtx("u1"));
    const result = await caller.org.leave({ orgId: "o1" });

    expect(result.success).toBe(true);
  });

  it("throws NOT_FOUND if not a member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(caller.org.leave({ orgId: "o1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
