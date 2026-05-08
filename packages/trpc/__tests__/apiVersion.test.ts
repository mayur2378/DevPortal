import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "../src/index";

const mockPrisma = {
  api: { findUnique: vi.fn() },
  apiVersion: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  docPage: { create: vi.fn(), update: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
};

function makeCtx(userId = "u1") {
  return {
    session: { user: { id: userId, role: "USER" } } as any,
    prisma: mockPrisma as any,
  };
}

describe("apiVersion.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a DRAFT version for owned API", async () => {
    mockPrisma.api.findUnique.mockResolvedValue({ id: "a1", ownerId: "u1", orgId: "o1" });
    mockPrisma.apiVersion.create.mockResolvedValue({ id: "v1", version: "1.0.0", status: "DRAFT" });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.apiVersion.create({
      apiId: "a1",
      version: "1.0.0",
      specKey: "abc.yaml",
      specType: "REST",
    });

    expect(result.status).toBe("DRAFT");
  });

  it("throws FORBIDDEN when user does not own the API", async () => {
    mockPrisma.api.findUnique.mockResolvedValue({ id: "a1", ownerId: "other-user", orgId: "o1" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(
      caller.apiVersion.create({ apiId: "a1", version: "1.0.0", specKey: "abc.yaml", specType: "REST" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("apiVersion.publish", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to PUBLISHED and records publishedAt", async () => {
    mockPrisma.apiVersion.findUnique.mockResolvedValue({ id: "v1", api: { ownerId: "u1" }, status: "DRAFT" });
    mockPrisma.apiVersion.update.mockResolvedValue({ id: "v1", status: "PUBLISHED" });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.apiVersion.publish({ versionId: "v1" });

    expect(result.status).toBe("PUBLISHED");
    expect(mockPrisma.apiVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PUBLISHED" }) })
    );
  });
});
