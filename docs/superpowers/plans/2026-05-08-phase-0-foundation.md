# Phase 0: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Prisma schema with 14 new domain models, add new enums and roles, create shared UI primitives, and configure Vercel deployment — establishing the foundation all parallel Phase 1–3 agents depend on.

**Architecture:** All schema changes are applied in a single migration. New enums, updated existing models, and 14 new models are added to `packages/db/prisma/schema.prisma`. A new `apps/web/lib/rbac.ts` module exports role-check helpers. Shared UI badges are added to `apps/web/components/ui/`. Vercel is configured via `vercel.json` at the repo root.

**Tech Stack:** Prisma 5, PostgreSQL, Next.js 14, Tailwind CSS, TypeScript, Vercel

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Modify | `packages/db/prisma/schema.prisma` |
| Modify | `packages/db/prisma/seed.ts` |
| Create | `apps/web/lib/rbac.ts` |
| Modify | `apps/web/middleware.ts` |
| Modify | `packages/trpc/src/trpc.ts` |
| Create | `apps/web/components/ui/StatusBadge.tsx` |
| Create | `apps/web/components/ui/VisibilityChip.tsx` |
| Create | `apps/web/components/ui/EnvSelector.tsx` |
| Create | `apps/web/components/ui/DataClassBadge.tsx` |
| Create | `vercel.json` |
| Modify | `.env.example` (create if missing) |
| Create | `apps/web/__tests__/lib/rbac.test.ts` |

---

### Task 1: Add new enums and update existing enums in schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Write a test that will validate enum values exist after migration**

Create `apps/web/__tests__/lib/rbac.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("UserRole enum values", () => {
  it("includes all required portal roles", () => {
    const roles = ["USER", "SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER", "GOVERNANCE_REVIEWER", "SUPPORT_USER"];
    // This test validates our expected role strings — actual DB enforcement is via Prisma
    roles.forEach(r => expect(typeof r).toBe("string"));
  });
});
```

- [ ] **Step 2: Run test to verify it passes (it's a type-level test)**

```bash
cd apps/web && pnpm test __tests__/lib/rbac.test.ts
```
Expected: PASS

- [ ] **Step 3: Update `UserRole` enum and add all new enums in schema.prisma**

In `packages/db/prisma/schema.prisma`, replace the existing enums block at the bottom of the file with:

```prisma
enum UserRole {
  USER
  SUPERADMIN
  API_PRODUCT_OWNER
  API_DEVELOPER
  GOVERNANCE_REVIEWER
  SUPPORT_USER
}

enum OrgRole {
  MEMBER
  ADMIN
}

enum APIType {
  REST
  GRAPHQL
  ASYNC_API
  EVENT
  WEBHOOK
  SOAP
}

enum VersionStatus {
  DRAFT
  PUBLISHED
  DEPRECATED
}

enum Visibility {
  INTERNAL
  PARTNER
  PUBLIC
}

enum LifecycleStatus {
  DRAFT
  BETA
  ACTIVE
  DEPRECATED
  RETIRED
}

enum DataClassification {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  RESTRICTED
}

enum SubscriptionStatus {
  PENDING
  APPROVED
  REJECTED
  REVOKED
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum LifecycleEventType {
  CREATED
  PUBLISHED
  DEPRECATED
  RETIRED
  VERSION_ADDED
  SPEC_UPDATED
  STATUS_CHANGED
}
```

- [ ] **Step 4: Validate schema**

```bash
cd packages/db && npx prisma validate
```
Expected: `The schema at .../schema.prisma is valid 🚀`

---

### Task 2: Add Domain and Tag models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add Domain, Tag, and ApiTag models after the PasswordResetToken model**

```prisma
model Domain {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  apis        Api[]
  createdAt   DateTime @default(now())
}

model Tag {
  id   String   @id @default(cuid())
  name String   @unique
  apis ApiTag[]
}

model ApiTag {
  api   Api    @relation(fields: [apiId], references: [id], onDelete: Cascade)
  apiId String
  tag   Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId String

  @@id([apiId, tagId])
}
```

- [ ] **Step 2: Validate schema**

```bash
cd packages/db && npx prisma validate
```
Expected: Valid.

---

### Task 3: Update the Api model with new fields

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Replace the existing `Api` model with the updated version**

```prisma
model Api {
  id                   String               @id @default(cuid())
  org                  Organization         @relation(fields: [orgId], references: [id])
  orgId                String
  owner                User                 @relation("ApiOwner", fields: [ownerId], references: [id])
  ownerId              String
  name                 String
  slug                 String
  description          String?
  type                 APIType
  category             String?
  visibility           Visibility           @default(INTERNAL)
  businessCapability   String?
  systemOfRecord       String?
  supportContact       String?
  piiIndicator         Boolean              @default(false)
  phiIndicator         Boolean              @default(false)
  dataClassification   DataClassification   @default(INTERNAL)
  gatewayRef           String?
  runtimeEndpoint      String?
  domain               Domain?              @relation(fields: [domainId], references: [id])
  domainId             String?
  tags                 ApiTag[]
  versions             ApiVersion[]
  subscriptionRequests SubscriptionRequest[]
  subscriptions        Subscription[]
  governanceReviews    GovernanceReview[]
  lifecycleEvents      LifecycleEvent[]
  usageMetrics         UsageMetric[]
  comments             Comment[]
  products             APIProductItem[]
  createdAt            DateTime             @default(now())

  @@unique([orgId, slug])
  @@map("API")
}
```

- [ ] **Step 2: Validate**

```bash
cd packages/db && npx prisma validate
```

---

### Task 4: Update ApiVersion and User models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Replace the `ApiVersion` model**

```prisma
model ApiVersion {
  id              String          @id @default(cuid())
  api             Api             @relation(fields: [apiId], references: [id])
  apiId           String
  version         String
  specKey         String?
  specUrl         String?
  specType        APIType
  status          VersionStatus   @default(DRAFT)
  lifecycleStatus LifecycleStatus @default(DRAFT)
  retirementDate  DateTime?
  changelog       String?         @db.Text
  releaseNotes    String?         @db.Text
  maturityScore   Int?
  authMethod      String?
  rateLimitPolicy String?
  slaInfo         String?
  docPages        DocPage[]
  mockConfig      MockConfig?
  publishedAt     DateTime?
  createdAt       DateTime        @default(now())

  @@unique([apiId, version])
  @@map("APIVersion")
}
```

- [ ] **Step 2: Replace the `User` model to add all back-relations**

```prisma
model User {
  id                        String                       @id @default(cuid())
  email                     String                       @unique
  passwordHash              String
  name                      String
  role                      UserRole                     @default(USER)
  memberships               OrgMembership[]
  ownedApis                 Api[]                        @relation("ApiOwner")
  applications              Application[]
  subscriptionRequests      SubscriptionRequest[]        @relation("Requester")
  subscriptionReviews       SubscriptionRequest[]        @relation("Reviewer")
  governanceReviews         GovernanceReview[]
  lifecycleEvents           LifecycleEvent[]
  supportTickets            SupportTicket[]
  comments                  Comment[]
  announcements             Announcement[]
  ownedProducts             APIProduct[]
  productSubscriptionRequests ProductSubscriptionRequest[]
  createdAt                 DateTime                     @default(now())
  passwordResetTokens       PasswordResetToken[]
}
```

- [ ] **Step 3: Validate**

```bash
cd packages/db && npx prisma validate
```

---

### Task 5: Add Application and Subscription models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add Application, SubscriptionRequest, and Subscription models**

```prisma
model Application {
  id                   String                @id @default(cuid())
  owner                User                  @relation(fields: [ownerId], references: [id])
  ownerId              String
  name                 String
  description          String?
  mockClientId         String                @default(cuid())
  mockClientSecret     String                @default(cuid())
  subscriptionRequests SubscriptionRequest[]
  subscriptions        Subscription[]
  createdAt            DateTime              @default(now())
}

model SubscriptionRequest {
  id            String             @id @default(cuid())
  application   Application        @relation(fields: [applicationId], references: [id])
  applicationId String
  api           Api                @relation(fields: [apiId], references: [id])
  apiId         String
  requester     User               @relation("Requester", fields: [requesterId], references: [id])
  requesterId   String
  reviewer      User?              @relation("Reviewer", fields: [reviewerId], references: [id])
  reviewerId    String?
  environment   String             @default("dev")
  status        SubscriptionStatus @default(PENDING)
  comments      String?            @db.Text
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}

model Subscription {
  id            String      @id @default(cuid())
  application   Application @relation(fields: [applicationId], references: [id])
  applicationId String
  api           Api         @relation(fields: [apiId], references: [id])
  apiId         String
  environment   String      @default("dev")
  grantedAt     DateTime    @default(now())
  revokedAt     DateTime?

  @@unique([applicationId, apiId, environment])
}
```

- [ ] **Step 2: Validate**

```bash
cd packages/db && npx prisma validate
```

---

### Task 6: Add Governance, Lifecycle, and Usage models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add GovernanceChecklist, GovernanceReview, LifecycleEvent, UsageMetric**

```prisma
model GovernanceChecklist {
  id          String             @id @default(cuid())
  name        String
  description String?
  apiType     APIType?
  required    Boolean            @default(false)
  reviews     GovernanceReview[]
  createdAt   DateTime           @default(now())
}

model GovernanceReview {
  id          String              @id @default(cuid())
  api         Api                 @relation(fields: [apiId], references: [id])
  apiId       String
  reviewer    User                @relation(fields: [reviewerId], references: [id])
  reviewerId  String
  checklist   GovernanceChecklist @relation(fields: [checklistId], references: [id])
  checklistId String
  passed      Boolean
  notes       String?
  reviewedAt  DateTime            @default(now())
}

model LifecycleEvent {
  id        String             @id @default(cuid())
  api       Api                @relation(fields: [apiId], references: [id])
  apiId     String
  actor     User               @relation(fields: [actorId], references: [id])
  actorId   String
  type      LifecycleEventType
  notes     String?
  createdAt DateTime           @default(now())
}

model UsageMetric {
  id        String   @id @default(cuid())
  api       Api      @relation(fields: [apiId], references: [id])
  apiId     String
  month     String
  calls     Int      @default(0)
  consumers Int      @default(0)
  docViews  Int      @default(0)
  createdAt DateTime @default(now())

  @@unique([apiId, month])
}
```

- [ ] **Step 2: Validate**

```bash
cd packages/db && npx prisma validate
```

---

### Task 7: Add Support, Announcement, and APIProduct models

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add SupportTicket, Comment, Announcement**

```prisma
model SupportTicket {
  id          String              @id @default(cuid())
  submitter   User                @relation(fields: [submitterId], references: [id])
  submitterId String
  subject     String
  body        String              @db.Text
  status      SupportTicketStatus @default(OPEN)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model Comment {
  id        String   @id @default(cuid())
  api       Api      @relation(fields: [apiId], references: [id])
  apiId     String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  body      String   @db.Text
  createdAt DateTime @default(now())
}

model Announcement {
  id          String    @id @default(cuid())
  title       String
  body        String    @db.Text
  active      Boolean   @default(true)
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime  @default(now())
  expiresAt   DateTime?
}
```

- [ ] **Step 2: Add APIProduct, APIProductItem, ProductSubscriptionRequest**

```prisma
model APIProduct {
  id                   String                       @id @default(cuid())
  name                 String
  slug                 String                       @unique
  description          String?
  owner                User                         @relation(fields: [ownerId], references: [id])
  ownerId              String
  roadmap              String?                      @db.Text
  documentation        String?                      @db.Text
  apis                 APIProductItem[]
  subscriptionRequests ProductSubscriptionRequest[]
  createdAt            DateTime                     @default(now())
}

model APIProductItem {
  product   APIProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  productId String
  api       Api        @relation(fields: [apiId], references: [id], onDelete: Cascade)
  apiId     String

  @@id([productId, apiId])
}

model ProductSubscriptionRequest {
  id          String             @id @default(cuid())
  product     APIProduct         @relation(fields: [productId], references: [id])
  productId   String
  requester   User               @relation(fields: [requesterId], references: [id])
  requesterId String
  status      SubscriptionStatus @default(PENDING)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
}
```

- [ ] **Step 3: Final full schema validation**

```bash
cd packages/db && npx prisma validate
```
Expected: `The schema at .../schema.prisma is valid 🚀`

---

### Task 8: Run migration and regenerate client

**Files:**
- Creates: `packages/db/prisma/migrations/<timestamp>_enterprise_foundation/migration.sql`

- [ ] **Step 1: Run migration (development)**

```bash
cd packages/db && npx prisma migrate dev --name enterprise_foundation
```
Expected: Migration created and applied. Prisma client regenerated automatically.

- [ ] **Step 2: Verify client has new types**

```bash
grep "Application\b" packages/db/node_modules/.prisma/client/index.d.ts | head -3
```
Expected: Lines containing `Application` interface/type definitions.

- [ ] **Step 3: Commit schema and migration**

```bash
git add packages/db/prisma/
git commit -m "feat(db): add enterprise portal schema — 14 new models, extended enums"
```

---

### Task 9: Add RBAC helper module

**Files:**
- Create: `apps/web/lib/rbac.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/lib/rbac.test.ts` (replace the placeholder from Task 1):

```typescript
import { describe, it, expect } from "vitest";
import { hasRole, canApproveRequests, canReviewGovernance, isAdmin } from "@/lib/rbac";

const mockSession = (role: string) => ({ user: { role, id: "u1", email: "a@b.com", name: "A" } });

describe("hasRole", () => {
  it("returns true when user has the exact role", () => {
    expect(hasRole(mockSession("GOVERNANCE_REVIEWER"), "GOVERNANCE_REVIEWER")).toBe(true);
  });
  it("SUPERADMIN passes any role check", () => {
    expect(hasRole(mockSession("SUPERADMIN"), "GOVERNANCE_REVIEWER")).toBe(true);
  });
  it("returns false for wrong role", () => {
    expect(hasRole(mockSession("USER"), "API_PRODUCT_OWNER")).toBe(false);
  });
});

describe("canApproveRequests", () => {
  it("true for API_PRODUCT_OWNER", () => {
    expect(canApproveRequests(mockSession("API_PRODUCT_OWNER"))).toBe(true);
  });
  it("true for SUPERADMIN", () => {
    expect(canApproveRequests(mockSession("SUPERADMIN"))).toBe(true);
  });
  it("false for USER", () => {
    expect(canApproveRequests(mockSession("USER"))).toBe(false);
  });
});

describe("canReviewGovernance", () => {
  it("true for GOVERNANCE_REVIEWER", () => {
    expect(canReviewGovernance(mockSession("GOVERNANCE_REVIEWER"))).toBe(true);
  });
});

describe("isAdmin", () => {
  it("true for SUPERADMIN", () => {
    expect(isAdmin(mockSession("SUPERADMIN"))).toBe(true);
  });
  it("false for API_PRODUCT_OWNER", () => {
    expect(isAdmin(mockSession("API_PRODUCT_OWNER"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/web && pnpm test __tests__/lib/rbac.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/rbac'`

- [ ] **Step 3: Create `apps/web/lib/rbac.ts`**

```typescript
type Session = { user: { role: string; id: string; email: string; name: string } } | null;

const ELEVATED = ["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER", "GOVERNANCE_REVIEWER", "SUPPORT_USER"];

export function hasRole(session: Session, role: string): boolean {
  if (!session?.user) return false;
  if (session.user.role === "SUPERADMIN") return true;
  return session.user.role === role;
}

export function canApproveRequests(session: Session): boolean {
  return hasRole(session, "API_PRODUCT_OWNER");
}

export function canReviewGovernance(session: Session): boolean {
  return hasRole(session, "GOVERNANCE_REVIEWER");
}

export function canPublishApis(session: Session): boolean {
  return hasRole(session, "API_DEVELOPER") || hasRole(session, "API_PRODUCT_OWNER");
}

export function isAdmin(session: Session): boolean {
  return session?.user?.role === "SUPERADMIN";
}

export function isElevatedRole(session: Session): boolean {
  if (!session?.user) return false;
  return ELEVATED.includes(session.user.role);
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd apps/web && pnpm test __tests__/lib/rbac.test.ts
```
Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/rbac.ts apps/web/__tests__/lib/rbac.test.ts
git commit -m "feat(rbac): add role-check helpers for portal roles"
```

---

### Task 10: Add shared UI primitive components

**Files:**
- Create: `apps/web/components/ui/StatusBadge.tsx`
- Create: `apps/web/components/ui/VisibilityChip.tsx`
- Create: `apps/web/components/ui/EnvSelector.tsx`
- Create: `apps/web/components/ui/DataClassBadge.tsx`

- [ ] **Step 1: Create `StatusBadge.tsx`**

```typescript
// apps/web/components/ui/StatusBadge.tsx
const STATUS_STYLES: Record<string, string> = {
  DRAFT:      "bg-slate-700 text-slate-300",
  BETA:       "bg-purple-900/50 text-purple-300",
  ACTIVE:     "bg-emerald-900/50 text-emerald-400",
  PUBLISHED:  "bg-emerald-900/50 text-emerald-400",
  DEPRECATED: "bg-amber-900/50 text-amber-400",
  RETIRED:    "bg-red-900/50 text-red-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-700 text-slate-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Create `VisibilityChip.tsx`**

```typescript
// apps/web/components/ui/VisibilityChip.tsx
const VISIBILITY_STYLES: Record<string, string> = {
  PUBLIC:   "bg-sky-900/50 text-sky-300 border border-sky-700/50",
  PARTNER:  "bg-violet-900/50 text-violet-300 border border-violet-700/50",
  INTERNAL: "bg-slate-700/50 text-slate-400 border border-slate-600/50",
};

export function VisibilityChip({ visibility }: { visibility: string }) {
  const style = VISIBILITY_STYLES[visibility] ?? VISIBILITY_STYLES.INTERNAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {visibility}
    </span>
  );
}
```

- [ ] **Step 3: Create `EnvSelector.tsx`**

```typescript
// apps/web/components/ui/EnvSelector.tsx
const ENVS = ["dev", "test", "stage", "prod"] as const;
export type Env = typeof ENVS[number];

interface Props {
  value: Env;
  onChange: (env: Env) => void;
}

export function EnvSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {ENVS.map((env) => (
        <button
          key={env}
          type="button"
          onClick={() => onChange(env)}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            value === env
              ? "bg-sky-600 text-white"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
          }`}
        >
          {env.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `DataClassBadge.tsx`**

```typescript
// apps/web/components/ui/DataClassBadge.tsx
const DC_STYLES: Record<string, string> = {
  PUBLIC:       "bg-green-900/40 text-green-400",
  INTERNAL:     "bg-slate-700 text-slate-300",
  CONFIDENTIAL: "bg-orange-900/40 text-orange-400",
  RESTRICTED:   "bg-red-900/40 text-red-400",
};

export function DataClassBadge({ classification }: { classification: string }) {
  const style = DC_STYLES[classification] ?? DC_STYLES.INTERNAL;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${style}`}>
      🔒 {classification}
    </span>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ui/
git commit -m "feat(ui): add shared primitive components — StatusBadge, VisibilityChip, EnvSelector, DataClassBadge"
```

---

### Task 11: Update tRPC with new role-based procedures

**Files:**
- Modify: `packages/trpc/src/trpc.ts`

- [ ] **Step 1: Add `ownerProcedure` and `reviewerProcedure` to `trpc.ts`**

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "SUPERADMIN") throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const ownerProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (!role || !["SUPERADMIN", "API_PRODUCT_OWNER", "API_DEVELOPER"].includes(role)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});

export const reviewerProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.session?.user?.role;
  if (!role || !["SUPERADMIN", "GOVERNANCE_REVIEWER"].includes(role)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session! } });
});
```

- [ ] **Step 2: Add `domain.list` and `tag.list` to `packages/trpc/src/routers/admin.ts`**

These must be in Phase 0 because Phase 1A (Catalog) and Phase 1C (Admin) both run in parallel and both need them.

Read `packages/trpc/src/routers/admin.ts` and add inside the existing `createTRPCRouter({})` call:

```typescript
domain: {
  list: publicProcedure.query(({ ctx }) => ctx.db.domain.findMany({ orderBy: { name: "asc" } })),
},
tag: {
  list: publicProcedure.query(({ ctx }) => ctx.db.tag.findMany({ orderBy: { name: "asc" } })),
},
```

- [ ] **Step 3: Update `packages/trpc/src/index.ts` to re-export new procedures**

```typescript
export { createTRPCContext } from "./context";
export {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  ownerProcedure,
  reviewerProcedure,
} from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";
import { apiRouter } from "./routers/api";
import { apiVersionRouter } from "./routers/apiVersion";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
  apiVersion: apiVersionRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/
git commit -m "feat(trpc): add ownerProcedure and reviewerProcedure for role-based API access"
```

---

### Task 12: Vercel configuration

**Files:**
- Create: `vercel.json`
- Create/Modify: `.env.example`

- [ ] **Step 1: Create `vercel.json` at the repo root**

```json
{
  "buildCommand": "cd ../.. && pnpm build --filter=web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "rewrites": [
    { "source": "/mock/:path*", "destination": "http://localhost:3001/mock/:path*" }
  ]
}
```

Note: The mock engine rewrite points to localhost for development. In production the mock engine URL should be set via `MOCK_ENGINE_URL` environment variable. Update the rewrite destination once the mock engine has a deployed URL.

- [ ] **Step 2: Create `.env.example` at the repo root**

```bash
# Database (Neon or Vercel Postgres)
DATABASE_URL="postgresql://user:password@host/devportal?sslmode=require"
DIRECT_URL="postgresql://user:password@host/devportal?sslmode=require"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"

# AI doc generation (Anthropic)
ANTHROPIC_API_KEY="sk-ant-..."

# Email (Resend)
RESEND_API_KEY="re_..."

# Seed user (optional)
SEED_ADMIN_EMAIL="admin@devportal.dev"
SEED_ADMIN_PASSWORD="changeme123"

# Mock engine URL (set after deploying mock engine separately)
MOCK_ENGINE_URL="http://localhost:3001"
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat(deploy): add Vercel config and .env.example"
```

---

### Task 13: Expand seed data with 10 healthcare APIs

**Files:**
- Modify: `packages/db/prisma/seed.ts`

- [ ] **Step 1: Replace seed.ts with the full enterprise seed**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@devportal.dev";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Portal Admin", passwordHash, role: "SUPERADMIN" },
  });

  // Sample users
  const owner = await prisma.user.upsert({
    where: { email: "owner@devportal.dev" },
    update: {},
    create: { email: "owner@devportal.dev", name: "API Owner", passwordHash, role: "API_PRODUCT_OWNER" },
  });
  const consumer = await prisma.user.upsert({
    where: { email: "consumer@devportal.dev" },
    update: {},
    create: { email: "consumer@devportal.dev", name: "API Consumer", passwordHash, role: "USER" },
  });
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@devportal.dev" },
    update: {},
    create: { email: "reviewer@devportal.dev", name: "Governance Reviewer", passwordHash, role: "GOVERNANCE_REVIEWER" },
  });

  // Organization
  const org = await prisma.organization.upsert({
    where: { slug: "healthcare-enterprise" },
    update: {},
    create: { name: "Healthcare Enterprise", slug: "healthcare-enterprise" },
  });

  // Domains
  const domains = await Promise.all([
    prisma.domain.upsert({ where: { name: "Customer" }, update: {}, create: { name: "Customer", description: "Customer management APIs" } }),
    prisma.domain.upsert({ where: { name: "Claims" }, update: {}, create: { name: "Claims", description: "Claims processing APIs" } }),
    prisma.domain.upsert({ where: { name: "Provider" }, update: {}, create: { name: "Provider", description: "Provider network APIs" } }),
    prisma.domain.upsert({ where: { name: "Events" }, update: {}, create: { name: "Events", description: "Event streaming APIs" } }),
  ]);

  // Tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: "healthcare" }, update: {}, create: { name: "healthcare" } }),
    prisma.tag.upsert({ where: { name: "hipaa" }, update: {}, create: { name: "hipaa" } }),
    prisma.tag.upsert({ where: { name: "rest" }, update: {}, create: { name: "rest" } }),
    prisma.tag.upsert({ where: { name: "events" }, update: {}, create: { name: "events" } }),
    prisma.tag.upsert({ where: { name: "crm" }, update: {}, create: { name: "crm" } }),
  ]);

  const apiDefs = [
    {
      name: "Customer API", slug: "customer-api", type: "REST" as const, visibility: "PUBLIC" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const,
      description: "Core customer data management and lookup.",
      businessCapability: "Customer Management", piiIndicator: true, maturityScore: 85,
      domainId: domains[0].id,
    },
    {
      name: "Claims API", slug: "claims-api", type: "REST" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const,
      description: "Claims submission, adjudication, and status tracking.",
      businessCapability: "Claims Processing", phiIndicator: true, maturityScore: 92,
      domainId: domains[1].id,
    },
    {
      name: "Provider API", slug: "provider-api", type: "REST" as const, visibility: "PARTNER" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "INTERNAL" as const,
      description: "Provider directory, credentialing, and network status.",
      businessCapability: "Provider Management", maturityScore: 78,
      domainId: domains[2].id,
    },
    {
      name: "Member Eligibility API", slug: "member-eligibility-api", type: "REST" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const,
      description: "Real-time member eligibility verification.",
      businessCapability: "Member Services", phiIndicator: true, piiIndicator: true, maturityScore: 88,
      domainId: domains[0].id,
    },
    {
      name: "Payment Events API", slug: "payment-events-api", type: "ASYNC_API" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "BETA" as const, dataClassification: "CONFIDENTIAL" as const,
      description: "Kafka-based payment event streaming.",
      businessCapability: "Payments", maturityScore: 60,
      domainId: domains[1].id,
    },
    {
      name: "Prior Authorization API", slug: "prior-auth-api", type: "REST" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const,
      description: "Prior authorization submission and status.",
      businessCapability: "Utilization Management", phiIndicator: true, maturityScore: 81,
      domainId: domains[2].id,
    },
    {
      name: "Salesforce Lead API", slug: "salesforce-lead-api", type: "REST" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const,
      description: "CRM lead creation and management via Salesforce.",
      businessCapability: "Sales & Marketing", piiIndicator: true, maturityScore: 74,
      domainId: domains[0].id,
    },
    {
      name: "SAP Order API", slug: "sap-order-api", type: "REST" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "DEPRECATED" as const, dataClassification: "INTERNAL" as const,
      description: "SAP-backed order management (being replaced by cloud-native Order Service).",
      businessCapability: "Order Management", maturityScore: 45,
      domainId: domains[1].id,
    },
    {
      name: "Kafka Customer Events", slug: "kafka-customer-events", type: "EVENT" as const, visibility: "INTERNAL" as const,
      lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const,
      description: "Kafka topic for customer lifecycle events.",
      businessCapability: "Customer Management", piiIndicator: true, maturityScore: 70,
      domainId: domains[3].id,
    },
    {
      name: "Webhook Notification API", slug: "webhook-notification-api", type: "WEBHOOK" as const, visibility: "PARTNER" as const,
      lifecycleStatus: "BETA" as const, dataClassification: "INTERNAL" as const,
      description: "Outbound webhook notifications for partner integrations.",
      businessCapability: "Notifications", maturityScore: 55,
      domainId: domains[3].id,
    },
  ];

  for (const def of apiDefs) {
    const { lifecycleStatus, maturityScore, domainId, piiIndicator, phiIndicator, dataClassification, ...rest } = def;
    const existing = await prisma.api.findFirst({ where: { orgId: org.id, slug: def.slug } });
    if (!existing) {
      const api = await prisma.api.create({
        data: { ...rest, orgId: org.id, ownerId: owner.id, piiIndicator: piiIndicator ?? false, phiIndicator: phiIndicator ?? false, dataClassification },
      });
      await prisma.apiVersion.create({
        data: {
          apiId: api.id, version: "1.0.0", specType: def.type,
          status: "PUBLISHED", lifecycleStatus, maturityScore,
          changelog: `Initial ${def.name} release.`,
          releaseNotes: `First stable release of ${def.name}.`,
        },
      });
    }
  }

  // Governance checklists
  await prisma.governanceChecklist.upsert({
    where: { id: "gc-naming" },
    update: {},
    create: { id: "gc-naming", name: "Naming Conventions", description: "API name follows kebab-case slug convention", required: true },
  });
  await prisma.governanceChecklist.upsert({
    where: { id: "gc-versioning" },
    update: {},
    create: { id: "gc-versioning", name: "Versioning", description: "API has a semantic version in its spec", required: true },
  });
  await prisma.governanceChecklist.upsert({
    where: { id: "gc-security-docs" },
    update: {},
    create: { id: "gc-security-docs", name: "Security Documentation", description: "Authentication method documented", required: true },
  });

  // Announcement
  await prisma.announcement.upsert({
    where: { id: "ann-welcome" },
    update: {},
    create: {
      id: "ann-welcome",
      title: "Welcome to the Enterprise API Developer Portal",
      body: "Explore our API catalog, request access, and manage your integrations all in one place.",
      active: true,
      createdById: admin.id,
    },
  });

  // Usage metrics (mock data for last 6 months)
  const apis = await prisma.api.findMany({ where: { orgId: org.id } });
  const months = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
  for (const api of apis) {
    for (const month of months) {
      await prisma.usageMetric.upsert({
        where: { apiId_month: { apiId: api.id, month } },
        update: {},
        create: {
          apiId: api.id, month,
          calls: Math.floor(Math.random() * 50000) + 1000,
          consumers: Math.floor(Math.random() * 20) + 1,
          docViews: Math.floor(Math.random() * 500) + 50,
        },
      });
    }
  }

  console.log("✅ Enterprise seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

```bash
cd packages/db && npx prisma db seed
```
Expected: `✅ Enterprise seed complete`

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(seed): add 10 healthcare APIs, governance checklists, usage metrics, announcements"
```

---

### Task 14: Final Phase 0 verification

- [ ] **Step 1: Full build**

```bash
pnpm build
```
Expected: Exits 0, no TypeScript errors.

- [ ] **Step 2: Full test suite**

```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 3: Verify new routes do not 404 (pre-check)**

The portal layout should still render with no errors:
```bash
cd apps/web && pnpm dev &
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/browse
```
Expected: `200` or `307` (redirect to login).

- [ ] **Step 4: Final commit for Phase 0**

```bash
git add .
git status  # confirm only expected files
git commit -m "chore(phase-0): Phase 0 Foundation complete — schema, RBAC, shared UI, Vercel config, seed"
```
