import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  api: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  orgMembership: {
    findUnique: vi.fn(),
  },
};

function makeCtx(userId?: string) {
  return {
    session: userId ? ({ user: { id: userId, role: "USER" } } as any) : null,
    prisma: mockPrisma as any,
  };
}

describe("api.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns published APIs with optional org filter", async () => {
    mockPrisma.api.findMany.mockResolvedValue([
      { id: "a1", name: "Payments API", slug: "payments", type: "REST", org: { name: "Acme", slug: "acme" }, _count: { versions: 2 } },
    ]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.api.list({ orgSlug: "acme" });

    expect(result).toHaveLength(1);
    expect(mockPrisma.api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ org: { slug: "acme" } }) })
    );
  });
});

describe("api.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an API when user is org member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue({ userId: "u1", orgId: "o1" });
    mockPrisma.api.create.mockResolvedValue({ id: "a1", name: "New API", slug: "new-api" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    const result = await caller.api.create({
      orgId: "o1",
      name: "New API",
      slug: "new-api",
      type: "REST",
      description: "My new API",
      category: "Payments",
    });

    expect(result.id).toBe("a1");
  });

  it("throws FORBIDDEN when user is not org member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(
      caller.api.create({ orgId: "o1", name: "My API", slug: "my-api", type: "REST" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
