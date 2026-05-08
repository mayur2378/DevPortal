import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

function makeCtx(userId = "u1") {
  return {
    session: { user: { id: userId, role: "USER" } } as any,
    prisma: mockPrisma as any,
  };
}

describe("user.profile.get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the current user with their org memberships", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "ada@example.com",
      name: "Ada",
      role: "USER",
      memberships: [{ org: { id: "o1", name: "Acme", slug: "acme" }, role: "MEMBER" }],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.user.profile.get();

    expect(result?.email).toBe("ada@example.com");
    expect(result?.memberships).toHaveLength(1);
  });
});

describe("user.profile.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates name and returns updated user", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      role: "USER",
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.user.profile.update({ name: "Ada Lovelace" });

    expect(result.name).toBe("Ada Lovelace");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Ada Lovelace" },
      select: { id: true, email: true, name: true, role: true },
    });
  });
});
