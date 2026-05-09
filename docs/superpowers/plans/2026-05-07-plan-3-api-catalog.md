# Developer Portal — Plan 3: API Catalog & Publishing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI tasks:** Invoke `frontend-design:frontend-design` skill before writing any JSX. Dark theme, Stripe/Twilio aesthetic.

**Goal:** Build the API catalog (browsing with filters), the API detail page (versioned docs + spec explorer tabs), and the multi-step publish flow (spec upload, versioning, markdown doc pages).

**Architecture:** tRPC procedures for API and version CRUD. Spec files stored on the local filesystem (keyed by `apiVersionId`). Swagger UI renders OpenAPI specs client-side; GraphiQL renders GraphQL specs. Markdown doc pages rendered with `react-markdown`. The "Try It" tab is a placeholder wired up in Plan 4.

**Tech Stack:** tRPC, Prisma, Next.js App Router, Tailwind CSS, `swagger-ui-react`, `graphiql`, `react-markdown`, `multer`-style file handling via Next.js route handler, Vitest

**Prerequisite:** Plan 2 complete.

---

## File Map

```
packages/trpc/src/routers/
├── api.ts               # list (filters), getBySlug, create, update, delete
└── apiVersion.ts        # create (with spec key), publish, deprecate, listByApi, getById

packages/db/src/
└── storage.ts           # saveSpec(key, buffer), readSpec(key), deleteSpec(key) — local filesystem

apps/web/
├── app/
│   ├── api/
│   │   └── upload-spec/
│   │       └── route.ts         # POST handler for multipart spec file upload
│   └── (portal)/
│       ├── browse/
│       │   └── page.tsx         # Replace placeholder with real API card grid
│       ├── publish/
│       │   └── page.tsx         # Multi-step publish wizard
│       └── api/
│           └── [orgSlug]/
│               └── [apiSlug]/
│                   └── [version]/
│                       ├── layout.tsx          # Version switcher + tab nav
│                       ├── docs/
│                       │   └── [[...slug]]/
│                       │       └── page.tsx    # Markdown doc page
│                       ├── reference/
│                       │   └── page.tsx        # Swagger UI or GraphiQL
│                       └── try/
│                           └── page.tsx        # Placeholder (Plan 4)
├── components/
│   ├── catalog/
│   │   ├── ApiCard.tsx
│   │   └── ApiGrid.tsx
│   ├── api-detail/
│   │   ├── VersionSwitcher.tsx
│   │   ├── ApiTabs.tsx
│   │   ├── DocPageNav.tsx
│   │   ├── DocPageRenderer.tsx
│   │   └── SpecExplorer.tsx     # Swagger UI / GraphiQL wrapper
│   └── publish/
│       ├── PublishWizard.tsx    # Orchestrates steps
│       ├── StepMetadata.tsx
│       ├── StepSpecUpload.tsx
│       ├── StepDocPages.tsx
│       └── MarkdownEditor.tsx
└── __tests__/
    ├── routers/api.test.ts
    ├── routers/apiVersion.test.ts
    └── catalog/ApiCard.test.tsx
```

---

## Task 1: File Storage Service

**Files:**
- Create: `packages/db/src/storage.ts`

- [ ] **Step 1: Create storage.ts**

```typescript
// packages/db/src/storage.ts
import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = process.env.SPEC_STORAGE_DIR ?? path.join(process.cwd(), ".spec-storage");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function saveSpec(key: string, buffer: Buffer): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(STORAGE_DIR, key), buffer);
}

export async function readSpec(key: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_DIR, key));
}

export async function deleteSpec(key: string): Promise<void> {
  await fs.unlink(path.join(STORAGE_DIR, key)).catch(() => {});
}
```

- [ ] **Step 2: Export from packages/db/src/index.ts**

Add to `packages/db/src/index.ts`:
```typescript
export { saveSpec, readSpec, deleteSpec } from "./storage";
```

- [ ] **Step 3: Add .spec-storage to .gitignore**

Add to root `.gitignore`:
```
.spec-storage/
```

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/storage.ts packages/db/src/index.ts .gitignore
git commit -m "feat: local filesystem spec storage service"
```

---

## Task 2: Spec Upload Route Handler

**Files:**
- Create: `apps/web/app/api/upload-spec/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
// apps/web/app/api/upload-spec/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveSpec } from "@devportal/db";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("spec") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 413 });

  const ext = file.name.endsWith(".yaml") || file.name.endsWith(".yml") ? "yaml"
    : file.name.endsWith(".json") ? "json"
    : file.name.endsWith(".graphql") || file.name.endsWith(".sdl") ? "graphql"
    : null;

  if (!ext) return NextResponse.json({ error: "Unsupported file type. Use .json, .yaml, or .graphql" }, { status: 400 });

  const key = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveSpec(key, buffer);

  return NextResponse.json({ key });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/upload-spec/
git commit -m "feat: spec file upload route handler with size and type validation"
```

---

## Task 3: API Router (TDD)

**Files:**
- Create: `packages/trpc/src/routers/api.ts`
- Create: `packages/trpc/__tests__/api.test.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/trpc/__tests__/api.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTRPCContext } from "../src/context";
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
    ...createTRPCContext(userId ? ({ user: { id: userId, role: "USER" } } as any) : null),
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
      caller.api.create({ orgId: "o1", name: "X", slug: "x", type: "REST" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd packages/trpc && npm test
```

Expected: FAIL — `api.list`, `api.create` not defined.

- [ ] **Step 3: Implement api.ts**

Create `packages/trpc/src/routers/api.ts`:
```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

const apiSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  category: true,
  org: { select: { id: true, name: true, slug: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { versions: true } },
  createdAt: true,
};

export const apiRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        orgSlug: z.string().optional(),
        type: z.enum(["REST", "GRAPHQL"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(({ ctx, input }) =>
      ctx.prisma.api.findMany({
        where: {
          ...(input?.orgSlug ? { org: { slug: input.orgSlug } } : {}),
          ...(input?.type ? { type: input.type } : {}),
          ...(input?.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { description: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
          versions: { some: { status: "PUBLISHED" } },
        },
        select: apiSelect,
        orderBy: { createdAt: "desc" },
      })
    ),

  getBySlug: publicProcedure
    .input(z.object({ orgSlug: z.string(), apiSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findFirst({
        where: { slug: input.apiSlug, org: { slug: input.orgSlug } },
        select: {
          ...apiSelect,
          versions: {
            where: { status: "PUBLISHED" },
            select: { id: true, version: true, status: true, publishedAt: true },
            orderBy: { publishedAt: "desc" },
          },
        },
      });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      return api;
    }),

  create: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(2),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        type: z.enum(["REST", "GRAPHQL"]),
        description: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "You must be an org member to publish APIs." });

      return ctx.prisma.api.create({
        data: { ...input, ownerId: ctx.session.user.id },
        select: apiSelect,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ apiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findUnique({ where: { id: input.apiId } });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      if (api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.prisma.api.delete({ where: { id: input.apiId } });
      return { success: true };
    }),
});
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test
```

Expected: All API tests pass.

- [ ] **Step 5: Add apiRouter to appRouter**

Update `packages/trpc/src/index.ts`:
```typescript
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";
import { apiRouter } from "./routers/api";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Commit**

```bash
git add packages/trpc/src/routers/api.ts packages/trpc/__tests__/api.test.ts packages/trpc/src/index.ts
git commit -m "feat: api router with list, getBySlug, create, delete"
```

---

## Task 4: APIVersion + DocPage Routers (TDD)

**Files:**
- Create: `packages/trpc/src/routers/apiVersion.ts`
- Create: `packages/trpc/__tests__/apiVersion.test.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/trpc/__tests__/apiVersion.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTRPCContext } from "../src/context";
import { appRouter } from "../src/index";

const mockPrisma = {
  api: { findUnique: vi.fn() },
  apiVersion: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  docPage: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
};

function makeCtx(userId = "u1") {
  return {
    ...createTRPCContext({ user: { id: userId, role: "USER" } } as any),
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
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test
```

Expected: FAIL — `apiVersion.create` not defined.

- [ ] **Step 3: Implement apiVersion.ts**

Create `packages/trpc/src/routers/apiVersion.ts`:
```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const versionSelect = {
  id: true,
  version: true,
  specKey: true,
  specType: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  docPages: { orderBy: { order: "asc" as const }, select: { id: true, slug: true, title: true, order: true } },
};

export const apiVersionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        apiId: z.string(),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        specKey: z.string(),
        specType: z.enum(["REST", "GRAPHQL"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const api = await ctx.prisma.api.findUnique({ where: { id: input.apiId } });
      if (!api) throw new TRPCError({ code: "NOT_FOUND" });
      if (api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.apiVersion.create({
        data: { apiId: input.apiId, version: input.version, specKey: input.specKey, specType: input.specType },
        select: versionSelect,
      });
    }),

  publish: protectedProcedure
    .input(z.object({ versionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.prisma.apiVersion.findUnique({
        where: { id: input.versionId },
        include: { api: { select: { ownerId: true } } },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });
      if (version.api.ownerId !== ctx.session.user.id && ctx.session.user.role !== "SUPERADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.apiVersion.update({
        where: { id: input.versionId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
        select: versionSelect,
      });
    }),

  listByApi: publicProcedure
    .input(z.object({ apiId: z.string(), includedrafts: z.boolean().optional() }))
    .query(({ ctx, input }) =>
      ctx.prisma.apiVersion.findMany({
        where: {
          apiId: input.apiId,
          ...(!input.includedrafts ? { status: "PUBLISHED" } : {}),
        },
        select: versionSelect,
        orderBy: { createdAt: "desc" },
      })
    ),

  getSpecContent: publicProcedure
    .input(z.object({ versionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const version = await ctx.prisma.apiVersion.findUnique({
        where: { id: input.versionId },
        select: { specKey: true, specType: true },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });
      return version; // specKey returned; caller reads file from storage
    }),

  // DocPage sub-procedures
  docPage: createTRPCRouter({
    upsert: protectedProcedure
      .input(
        z.object({
          apiVersionId: z.string(),
          slug: z.string(),
          title: z.string(),
          content: z.string(),
          order: z.number().int().default(0),
        })
      )
      .mutation(({ ctx, input }) =>
        ctx.prisma.docPage.upsert({
          where: { apiVersionId_slug: { apiVersionId: input.apiVersionId, slug: input.slug } },
          create: input,
          update: { title: input.title, content: input.content, order: input.order },
        })
      ),

    list: publicProcedure
      .input(z.object({ apiVersionId: z.string() }))
      .query(({ ctx, input }) =>
        ctx.prisma.docPage.findMany({
          where: { apiVersionId: input.apiVersionId },
          orderBy: { order: "asc" },
        })
      ),
  }),
});
```

- [ ] **Step 4: Add to appRouter**

Update `packages/trpc/src/index.ts`:
```typescript
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";
import { apiRouter } from "./routers/api";
import { apiVersionRouter } from "./routers/apiVersion";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
  apiVersion: apiVersionRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Run tests — verify they PASS**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/trpc/src/routers/apiVersion.ts packages/trpc/__tests__/apiVersion.test.ts packages/trpc/src/index.ts
git commit -m "feat: apiVersion router with create, publish, list, and docPage upsert"
```

---

## Task 5: Browse Page — API Card Grid

> Invoke `frontend-design:frontend-design` before writing JSX.

**Files:**
- Create: `apps/web/components/catalog/ApiCard.tsx`
- Create: `apps/web/components/catalog/ApiGrid.tsx`
- Modify: `apps/web/app/(portal)/browse/page.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/__tests__/catalog/ApiCard.test.tsx`:
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiCard } from "@/components/catalog/ApiCard";

const api = {
  id: "a1",
  name: "Payments API",
  slug: "payments",
  type: "REST" as const,
  description: "Process payments",
  category: "Payments",
  org: { id: "o1", name: "Acme Corp", slug: "acme" },
  owner: { id: "u1", name: "Ada" },
  _count: { versions: 3 },
  createdAt: new Date(),
};

describe("ApiCard", () => {
  it("renders API name, org, type badge, and version count", () => {
    render(<ApiCard api={api} />);
    expect(screen.getByText("Payments API")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("REST")).toBeInTheDocument();
    expect(screen.getByText(/3 version/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd apps/web && npm test
```

Expected: FAIL.

- [ ] **Step 3: Invoke frontend-design skill then implement ApiCard**

Create `apps/web/components/catalog/ApiCard.tsx`:
```typescript
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Api {
  id: string;
  name: string;
  slug: string;
  type: "REST" | "GRAPHQL";
  description?: string | null;
  category?: string | null;
  org: { name: string; slug: string };
  _count: { versions: number };
  createdAt: Date;
}

export function ApiCard({ api }: { api: Api }) {
  return (
    <Link
      href={`/api/${api.org.slug}/${api.slug}`}
      className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            api.type === "REST"
              ? "bg-sky-950 text-sky-400 border border-sky-800"
              : "bg-purple-950 text-purple-400 border border-purple-800"
          )}
        >
          {api.type === "GRAPHQL" ? "GraphQL" : "REST"}
        </span>
        {api.category && (
          <span className="text-xs text-slate-500">{api.category}</span>
        )}
      </div>

      <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors mb-1">
        {api.name}
      </h3>

      {api.description && (
        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{api.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{api.org.name}</span>
        <span>{api._count.versions} version{api._count.versions !== 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Create ApiGrid**

Create `apps/web/components/catalog/ApiGrid.tsx`:
```typescript
import { ApiCard } from "./ApiCard";

type Api = Parameters<typeof ApiCard>[0]["api"];

interface Props {
  apis: Api[];
  searchQuery?: string;
}

export function ApiGrid({ apis, searchQuery }: Props) {
  if (apis.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500">
        <p className="text-lg font-medium text-slate-400 mb-1">No APIs found</p>
        <p className="text-sm">
          {searchQuery ? `No results for "${searchQuery}"` : "Be the first to publish one."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {apis.map((api) => (
        <ApiCard key={api.id} api={api} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Invoke frontend-design skill then replace browse/page.tsx**

```typescript
// apps/web/app/(portal)/browse/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ApiGrid } from "@/components/catalog/ApiGrid";
import Link from "next/link";

interface Props {
  searchParams: { org?: string; type?: string; q?: string };
}

export default async function BrowsePage({ searchParams }: Props) {
  const caller = await createCaller();
  const apis = await caller.api.list({
    orgSlug: searchParams.org,
    type: searchParams.type as "REST" | "GRAPHQL" | undefined,
    search: searchParams.q,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Catalog</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {apis.length} API{apis.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Link
          href="/publish"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Publish API
        </Link>
      </div>

      {searchParams.q && (
        <p className="text-slate-400 text-sm mb-4">
          Results for <span className="text-white">"{searchParams.q}"</span>
        </p>
      )}

      <ApiGrid apis={apis as any} searchQuery={searchParams.q} />
    </div>
  );
}
```

- [ ] **Step 6: Run tests — verify they PASS**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/catalog/ apps/web/app/\(portal\)/browse/ apps/web/__tests__/catalog/
git commit -m "feat: browse page with api card grid and org/type/search filters"
```

---

## Task 6: API Detail Page — Layout + Version Switcher + Tabs

> Invoke `frontend-design:frontend-design` before writing JSX.

**Files:**
- Create: `apps/web/components/api-detail/VersionSwitcher.tsx`
- Create: `apps/web/components/api-detail/ApiTabs.tsx`
- Create: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/layout.tsx`
- Create: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/page.tsx`

- [ ] **Step 1: Create VersionSwitcher**

```typescript
// apps/web/components/api-detail/VersionSwitcher.tsx
"use client";

import { useRouter } from "next/navigation";

interface Props {
  versions: { id: string; version: string }[];
  currentVersion: string;
  orgSlug: string;
  apiSlug: string;
}

export function VersionSwitcher({ versions, currentVersion, orgSlug, apiSlug }: Props) {
  const router = useRouter();

  return (
    <select
      value={currentVersion}
      onChange={(e) => router.push(`/api/${orgSlug}/${apiSlug}/${e.target.value}/docs`)}
      className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
    >
      {versions.map((v) => (
        <option key={v.id} value={v.version}>
          v{v.version}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Create ApiTabs**

```typescript
// apps/web/components/api-detail/ApiTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  orgSlug: string;
  apiSlug: string;
  version: string;
}

const tabs = [
  { label: "Docs", path: "docs" },
  { label: "Reference", path: "reference" },
  { label: "Try It", path: "try" },
];

export function ApiTabs({ orgSlug, apiSlug, version }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-800 mb-6">
      {tabs.map((tab) => {
        const href = `/api/${orgSlug}/${apiSlug}/${version}/${tab.path}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.path}
            href={href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create API detail version layout**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/layout.tsx
import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { VersionSwitcher } from "@/components/api-detail/VersionSwitcher";
import { ApiTabs } from "@/components/api-detail/ApiTabs";

interface Props {
  children: React.ReactNode;
  params: { orgSlug: string; apiSlug: string; version: string };
}

export default async function ApiVersionLayout({ children, params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-slate-500 mb-1">{api.org.name}</p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{api.name}</h1>
            {api.description && <p className="text-slate-400 text-sm mt-1">{api.description}</p>}
          </div>
          <VersionSwitcher
            versions={api.versions as any}
            currentVersion={params.version}
            orgSlug={params.orgSlug}
            apiSlug={params.apiSlug}
          />
        </div>
      </div>

      <ApiTabs orgSlug={params.orgSlug} apiSlug={params.apiSlug} version={params.version} />
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create redirect from /api/[org]/[api] to latest version docs**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { redirect, notFound } from "next/navigation";

export default async function ApiRootPage({
  params,
}: {
  params: { orgSlug: string; apiSlug: string };
}) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug(params).catch(() => null);
  if (!api || !api.versions.length) notFound();

  redirect(`/api/${params.orgSlug}/${params.apiSlug}/${api.versions[0].version}/docs`);
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/api-detail/VersionSwitcher.tsx apps/web/components/api-detail/ApiTabs.tsx apps/web/app/\(portal\)/api/
git commit -m "feat: api detail layout with version switcher and tab navigation"
```

---

## Task 7: Docs Tab — Markdown Rendering

> Invoke `frontend-design:frontend-design` before writing JSX.

**Files:**
- Create: `apps/web/components/api-detail/DocPageRenderer.tsx`
- Create: `apps/web/components/api-detail/DocPageNav.tsx`
- Create: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/docs/[[...slug]]/page.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
cd apps/web && npm install react-markdown
```

- [ ] **Step 2: Create DocPageRenderer**

```typescript
// apps/web/components/api-detail/DocPageRenderer.tsx
import ReactMarkdown from "react-markdown";

export function DocPageRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-sky-400 prose-code:bg-slate-800 prose-code:rounded prose-code:px-1">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Install Tailwind typography plugin**

```bash
cd apps/web && npm install @tailwindcss/typography
```

Add to `apps/web/tailwind.config.ts` plugins:
```typescript
plugins: [require("@tailwindcss/typography")],
```

- [ ] **Step 4: Create DocPageNav**

```typescript
// apps/web/components/api-detail/DocPageNav.tsx
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocPage { id: string; slug: string; title: string; order: number }

interface Props {
  pages: DocPage[];
  currentSlug: string;
  orgSlug: string;
  apiSlug: string;
  version: string;
}

export function DocPageNav({ pages, currentSlug, orgSlug, apiSlug, version }: Props) {
  return (
    <nav className="w-48 shrink-0">
      <ul className="space-y-0.5">
        {pages.map((page) => (
          <li key={page.id}>
            <Link
              href={`/api/${orgSlug}/${apiSlug}/${version}/docs/${page.slug}`}
              className={cn(
                "block px-3 py-1.5 rounded-md text-sm transition-colors",
                currentSlug === page.slug
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {page.title}
            </Link>
          </li>
        ))}
        {pages.length === 0 && (
          <li className="text-slate-600 text-sm italic px-3 py-1.5">No pages yet</li>
        )}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: Create docs page**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/docs/[[...slug]]/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { DocPageRenderer } from "@/components/api-detail/DocPageRenderer";
import { DocPageNav } from "@/components/api-detail/DocPageNav";

interface Props {
  params: { orgSlug: string; apiSlug: string; version: string; slug?: string[] };
}

export default async function DocsPage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const pages = await caller.apiVersion.docPage.list({ apiVersionId: publishedVersion.id });
  const currentSlug = params.slug?.[0] ?? pages[0]?.slug;
  const page = pages.find((p) => p.slug === currentSlug);

  return (
    <div className="flex gap-8">
      <DocPageNav
        pages={pages}
        currentSlug={currentSlug ?? ""}
        orgSlug={params.orgSlug}
        apiSlug={params.apiSlug}
        version={params.version}
      />
      <div className="flex-1 min-w-0">
        {page ? (
          <>
            <h2 className="text-xl font-bold text-white mb-4">{page.title}</h2>
            <DocPageRenderer content={page.content} />
          </>
        ) : (
          <p className="text-slate-400 italic">No documentation pages yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/api-detail/DocPageRenderer.tsx apps/web/components/api-detail/DocPageNav.tsx apps/web/app/\(portal\)/api/
git commit -m "feat: docs tab with markdown rendering and per-page navigation"
```

---

## Task 8: Reference Tab — Swagger UI + GraphiQL

> Invoke `frontend-design:frontend-design` before writing JSX.

**Files:**
- Create: `apps/web/components/api-detail/SpecExplorer.tsx`
- Create: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx`
- Create: `apps/web/app/api/spec/[versionId]/route.ts`

- [ ] **Step 1: Install spec rendering libraries**

```bash
cd apps/web && npm install swagger-ui-react graphiql graphql
npm install -D @types/swagger-ui-react
```

- [ ] **Step 2: Create spec content API route**

This route reads the spec file from storage and returns it — used by Swagger UI and GraphiQL to load the spec.

```typescript
// apps/web/app/api/spec/[versionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma, readSpec } from "@devportal/db";
import { auth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { versionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const version = await prisma.apiVersion.findUnique({
    where: { id: params.versionId },
    select: { specKey: true, specType: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await readSpec(version.specKey);
  const contentType = version.specType === "REST"
    ? (version.specKey.endsWith(".json") ? "application/json" : "application/yaml")
    : "text/plain";

  return new NextResponse(buffer, { headers: { "Content-Type": contentType } });
}
```

- [ ] **Step 3: Create SpecExplorer (client component)**

```typescript
// apps/web/components/api-detail/SpecExplorer.tsx
"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });
const GraphiQL = dynamic(() => import("graphiql").then((m) => m.GraphiQL), { ssr: false });

interface Props {
  versionId: string;
  specType: "REST" | "GRAPHQL";
}

export function SpecExplorer({ versionId, specType }: Props) {
  const specUrl = `/api/spec/${versionId}`;

  if (specType === "REST") {
    return (
      <div className="rounded-xl overflow-hidden border border-slate-800">
        <SwaggerUI url={specUrl} />
      </div>
    );
  }

  return (
    <div className="h-[600px] rounded-xl overflow-hidden border border-slate-800">
      <GraphiQL
        fetcher={async (graphQLParams) => {
          const res = await fetch(`/api/mock/graphql/${versionId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(graphQLParams),
          });
          return res.json();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create reference page**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { SpecExplorer } from "@/components/api-detail/SpecExplorer";

interface Props {
  params: { orgSlug: string; apiSlug: string; version: string };
}

export default async function ReferencePage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  return <SpecExplorer versionId={publishedVersion.id} specType={api.type as "REST" | "GRAPHQL"} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/api-detail/SpecExplorer.tsx apps/web/app/\(portal\)/api/\[orgSlug\]/\[apiSlug\]/\[version\]/reference/ apps/web/app/api/spec/
git commit -m "feat: reference tab with swagger ui (REST) and graphiql (GraphQL)"
```

---

## Task 9: Publish API — Multi-Step Wizard

> Invoke `frontend-design:frontend-design` before writing JSX. Three-step wizard: (1) API metadata, (2) spec upload + version, (3) optional markdown doc pages.

**Files:**
- Create: `apps/web/components/publish/PublishWizard.tsx`
- Create: `apps/web/components/publish/StepMetadata.tsx`
- Create: `apps/web/components/publish/StepSpecUpload.tsx`
- Create: `apps/web/components/publish/StepDocPages.tsx`
- Create: `apps/web/components/publish/MarkdownEditor.tsx`
- Create: `apps/web/app/(portal)/publish/page.tsx`

- [ ] **Step 1: Install markdown editor**

```bash
cd apps/web && npm install @uiw/react-md-editor
```

- [ ] **Step 2: Create MarkdownEditor**

```typescript
// apps/web/components/publish/MarkdownEditor.tsx
"use client";

import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export function MarkdownEditor({ value, onChange }: Props) {
  return (
    <div data-color-mode="dark">
      <MDEditor value={value} onChange={(v) => onChange(v ?? "")} height={300} />
    </div>
  );
}
```

- [ ] **Step 3: Create StepMetadata**

```typescript
// apps/web/components/publish/StepMetadata.tsx
"use client";

interface Org { id: string; name: string; slug: string }

interface Props {
  orgs: Org[];
  value: { orgId: string; name: string; slug: string; type: string; description: string; category: string };
  onChange: (v: Props["value"]) => void;
  onNext: () => void;
}

export function StepMetadata({ orgs, value, onChange, onNext }: Props) {
  const set = (k: keyof Props["value"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Step 1 — API Details</h2>

      <div>
        <label className={labelCls}>Organization</label>
        <select value={value.orgId} onChange={set("orgId")} className={inputCls}>
          <option value="">Select an organization…</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>API name</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value, slug: autoSlug(e.target.value) })}
          placeholder="Payments API"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Slug <span className="text-slate-600">(auto-generated, editable)</span></label>
        <input type="text" value={value.slug} onChange={set("slug")} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Type</label>
        <select value={value.type} onChange={set("type")} className={inputCls}>
          <option value="REST">REST (OpenAPI)</option>
          <option value="GRAPHQL">GraphQL</option>
        </select>
      </div>

      <div>
        <label className={labelCls}>Description <span className="text-slate-600">(optional)</span></label>
        <textarea value={value.description} onChange={set("description")} rows={3} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Category <span className="text-slate-600">(optional)</span></label>
        <input type="text" value={value.category} onChange={set("category")} placeholder="Payments, Identity…" className={inputCls} />
      </div>

      <button
        onClick={onNext}
        disabled={!value.orgId || !value.name || !value.slug}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        Continue →
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create StepSpecUpload**

```typescript
// apps/web/components/publish/StepSpecUpload.tsx
"use client";

import { useState } from "react";

interface Props {
  value: { specKey: string; version: string };
  onChange: (v: Props["value"]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSpecUpload({ value, onChange, onNext, onBack }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("spec", file);
      const res = await fetch("/api/upload-spec", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange({ ...value, specKey: data.key });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Step 2 — Spec & Version</h2>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Spec file <span className="text-slate-600">(.json, .yaml, .graphql)</span>
        </label>
        <input type="file" accept=".json,.yaml,.yml,.graphql,.sdl" onChange={handleFileChange} className="text-slate-300 text-sm" />
        {uploading && <p className="text-sky-400 text-xs mt-1">Uploading…</p>}
        {value.specKey && !uploading && <p className="text-emerald-400 text-xs mt-1">✓ Uploaded</p>}
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Version <span className="text-slate-600">(semver: 1.0.0)</span></label>
        <input
          type="text"
          value={value.version}
          onChange={(e) => onChange({ ...value, version: e.target.value })}
          placeholder="1.0.0"
          className={inputCls}
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!value.specKey || !value.version}
          className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create StepDocPages**

```typescript
// apps/web/components/publish/StepDocPages.tsx
"use client";

import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";

interface DocPageDraft { slug: string; title: string; content: string }

interface Props {
  pages: DocPageDraft[];
  onChange: (pages: DocPageDraft[]) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}

export function StepDocPages({ pages, onChange, onSubmit, onBack, submitting }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  function addPage() {
    const newPage: DocPageDraft = { slug: `page-${pages.length + 1}`, title: "New Page", content: "" };
    onChange([...pages, newPage]);
    setActiveIdx(pages.length);
  }

  function updatePage(idx: number, field: keyof DocPageDraft, val: string) {
    const updated = [...pages];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  }

  const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Step 3 — Documentation <span className="text-slate-500 text-sm font-normal">(optional)</span></h2>
        <button onClick={addPage} className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1.5 rounded-lg transition-colors">
          + Add page
        </button>
      </div>

      {pages.length > 0 && (
        <div className="flex gap-3">
          <div className="w-36 shrink-0">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`block w-full text-left text-sm px-3 py-2 rounded-lg mb-1 transition-colors ${
                  activeIdx === i ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3">
            <input
              type="text"
              value={pages[activeIdx].title}
              onChange={(e) => updatePage(activeIdx, "title", e.target.value)}
              placeholder="Page title"
              className={inputCls}
            />
            <input
              type="text"
              value={pages[activeIdx].slug}
              onChange={(e) => updatePage(activeIdx, "slug", e.target.value)}
              placeholder="page-slug"
              className={inputCls}
            />
            <MarkdownEditor
              value={pages[activeIdx].content}
              onChange={(v) => updatePage(activeIdx, "content", v)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
          ← Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {submitting ? "Publishing…" : "Publish API"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create PublishWizard**

```typescript
// apps/web/components/publish/PublishWizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { StepMetadata } from "./StepMetadata";
import { StepSpecUpload } from "./StepSpecUpload";
import { StepDocPages } from "./StepDocPages";

interface Org { id: string; name: string; slug: string }

export function PublishWizard({ orgs, orgSlugMap }: { orgs: Org[]; orgSlugMap: Record<string, string> }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ orgId: "", name: "", slug: "", type: "REST", description: "", category: "" });
  const [spec, setSpec] = useState({ specKey: "", version: "1.0.0" });
  const [docPages, setDocPages] = useState<{ slug: string; title: string; content: string }[]>([]);

  const createApi = trpc.api.create.useMutation();
  const createVersion = trpc.apiVersion.create.useMutation();
  const upsertDoc = trpc.apiVersion.docPage.upsert.useMutation();
  const publish = trpc.apiVersion.publish.useMutation();

  const [submitting, setSubmitting] = useState(false);

  async function handlePublish() {
    setSubmitting(true);
    try {
      const api = await createApi.mutateAsync({
        orgId: meta.orgId,
        name: meta.name,
        slug: meta.slug,
        type: meta.type as "REST" | "GRAPHQL",
        description: meta.description || undefined,
        category: meta.category || undefined,
      });

      const version = await createVersion.mutateAsync({
        apiId: api.id,
        version: spec.version,
        specKey: spec.specKey,
        specType: meta.type as "REST" | "GRAPHQL",
      });

      for (let i = 0; i < docPages.length; i++) {
        await upsertDoc.mutateAsync({ apiVersionId: version.id, ...docPages[i], order: i });
      }

      await publish.mutateAsync({ versionId: version.id });

      const orgSlug = orgSlugMap[meta.orgId];
      router.push(`/api/${orgSlug}/${meta.slug}/${spec.version}/docs`);
    } catch (err: any) {
      alert(err.message ?? "Failed to publish. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex gap-2 mb-8">
        {["Details", "Spec", "Docs"].map((label, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? "bg-sky-500" : "bg-slate-800"}`} />
        ))}
      </div>

      {step === 0 && <StepMetadata orgs={orgs} value={meta} onChange={setMeta} onNext={() => setStep(1)} />}
      {step === 1 && <StepSpecUpload value={spec} onChange={setSpec} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && (
        <StepDocPages
          pages={docPages}
          onChange={setDocPages}
          onSubmit={handlePublish}
          onBack={() => setStep(1)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create publish page**

```typescript
// apps/web/app/(portal)/publish/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { PublishWizard } from "@/components/publish/PublishWizard";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function PublishPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const caller = await createCaller();
  const profile = await caller.user.profile.get();
  const myOrgs = profile?.memberships.map((m: any) => m.org) ?? [];
  const orgSlugMap = Object.fromEntries(myOrgs.map((o: any) => [o.id, o.slug]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Publish an API</h1>
      <PublishWizard orgs={myOrgs} orgSlugMap={orgSlugMap} />
    </div>
  );
}
```

- [ ] **Step 8: Create Try It placeholder**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/try/page.tsx
export default function TryItPage() {
  return (
    <div className="text-center py-24 text-slate-400">
      <p className="text-lg font-medium text-slate-300 mb-1">Mock Tester</p>
      <p className="text-sm">Implemented in Plan 4</p>
    </div>
  );
}
```

- [ ] **Step 9: Smoke test end-to-end**

Start the dev server:
```bash
npm run dev
```

Verify:
1. `/browse` shows empty state
2. `/publish` shows 3-step wizard
3. Complete all 3 steps with a sample OpenAPI spec (use the Petstore spec: https://petstore3.swagger.io/api/v3/openapi.json)
4. After publish, API card appears at `/browse`
5. API detail page shows tabs: Docs, Reference (Swagger UI renders), Try It (placeholder)

- [ ] **Step 10: Commit**

```bash
git add apps/web/components/publish/ apps/web/app/\(portal\)/publish/ apps/web/app/\(portal\)/api/
git commit -m "feat: multi-step publish wizard with spec upload, versioning, and markdown docs"
```

---

## Plan 3 Complete

**What was built:**
- File storage service for spec uploads
- Spec file upload route with type/size validation
- API router (`list`, `getBySlug`, `create`, `delete`) — all tested
- APIVersion router (`create`, `publish`, `listByApi`, `getSpecContent`) + DocPage `upsert/list` — all tested
- Browse page with API card grid, filtering by org/type/search, and "Publish API" button
- API detail page with version switcher and Docs/Reference/Try It tabs
- Docs tab with markdown rendering and per-page navigation
- Reference tab with Swagger UI (REST) and GraphiQL (GraphQL)
- Multi-step publish wizard (metadata → spec upload → doc pages → publish)

**Next:** Plan 4 — Mock Engine (`docs/superpowers/plans/2026-05-07-plan-4-mock-engine.md`)
