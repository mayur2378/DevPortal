import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  organization: {
    findMany: vi.fn(),
  },
  orgMembership: {
    create: vi.fn(),
  },
};

function makeCtx() {
  return { session: null, prisma: mockPrisma as any };
}

describe("auth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new user and returns their id", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.organization.findMany.mockResolvedValue([]);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "dev@example.com",
      name: "Dev User",
      role: "USER",
    });

    const caller = appRouter.createCaller(makeCtx());

    const result = await caller.auth.register({
      email: "dev@example.com",
      name: "Dev User",
      password: "securepassword123",
      orgIds: [],
    });

    expect(result.id).toBe("user-1");
    expect((result as any).passwordHash).toBeUndefined();
    expect(mockPrisma.user.create).toHaveBeenCalledOnce();

    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).not.toBe("securepassword123");
  });

  it("throws CONFLICT if email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.auth.register({
        email: "taken@example.com",
        name: "Someone",
        password: "password123",
        orgIds: [],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
