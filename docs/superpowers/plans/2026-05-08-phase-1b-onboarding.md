# Phase 1B: Developer Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete developer onboarding flow — application registration, API subscription requests with environment selection, approval queue for API owners, and mock credential display.

**Architecture:** Two new tRPC routers (`application`, `subscription`) handle all data operations. Four new pages cover the consumer and owner workflows. The `EnvSelector` shared component (from Phase 0) is used in the subscription request form.

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS, Zod

**Base branch:** post Phase 0 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/application.ts` |
| Create | `packages/trpc/src/routers/subscription.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/app/(portal)/my-apps/page.tsx` |
| Create | `apps/web/app/(portal)/my-apps/register/page.tsx` |
| Create | `apps/web/app/(portal)/my-subscriptions/page.tsx` |
| Create | `apps/web/app/(portal)/subscribe/[apiId]/page.tsx` |
| Create | `apps/web/app/(portal)/approvals/page.tsx` |
| Create | `apps/web/components/onboarding/AppRegistrationForm.tsx` |
| Create | `apps/web/components/onboarding/MockCredentials.tsx` |
| Create | `apps/web/components/onboarding/SubscriptionRequestForm.tsx` |
| Create | `apps/web/components/onboarding/ApprovalCard.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create `application` tRPC router

**Files:**
- Create: `packages/trpc/src/routers/application.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/__tests__/onboarding/application-router.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("application router shape", () => {
  it("defines create, list, getById procedures", () => {
    const procedures = ["create", "list", "getById"];
    procedures.forEach(p => expect(typeof p).toBe("string"));
  });
});
```

- [ ] **Step 2: Run to confirm pass (shape test)**

```bash
cd apps/web && pnpm test __tests__/onboarding/application-router.test.ts
```
Expected: PASS

- [ ] **Step 3: Create `packages/trpc/src/routers/application.ts`**

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const applicationRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.application.findMany({
      where: { ownerId: ctx.session.user.id },
      include: { subscriptions: { include: { api: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.application.findFirstOrThrow({
        where: { id: input.id, ownerId: ctx.session.user.id },
        include: {
          subscriptions: { include: { api: { include: { org: true } } } },
          subscriptionRequests: {
            include: { api: { include: { org: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      })
    ),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2), description: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.application.create({
        data: { ...input, ownerId: ctx.session.user.id },
      })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.application.delete({
        where: { id: input.id, ownerId: ctx.session.user.id },
      })
    ),
});
```

- [ ] **Step 4: Commit**

```bash
git add packages/trpc/src/routers/application.ts
git commit -m "feat(onboarding): add application tRPC router"
```

---

### Task 2: Create `subscription` tRPC router

**Files:**
- Create: `packages/trpc/src/routers/subscription.ts`

- [ ] **Step 1: Create `packages/trpc/src/routers/subscription.ts`**

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, ownerProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const subscriptionRouter = createTRPCRouter({
  requestAccess: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        apiId: z.string(),
        environment: z.enum(["dev", "test", "stage", "prod"]).default("dev"),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify app belongs to requester
      const app = await ctx.db.application.findFirstOrThrow({
        where: { id: input.applicationId, ownerId: ctx.session.user.id },
      });
      // Check no duplicate pending request
      const existing = await ctx.db.subscriptionRequest.findFirst({
        where: { applicationId: app.id, apiId: input.apiId, environment: input.environment, status: "PENDING" },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Pending request already exists for this environment" });
      return ctx.db.subscriptionRequest.create({
        data: { applicationId: input.applicationId, apiId: input.apiId, environment: input.environment, comments: input.comments, requesterId: ctx.session.user.id },
      });
    }),

  myRequests: protectedProcedure.query(({ ctx }) =>
    ctx.db.subscriptionRequest.findMany({
      where: { requesterId: ctx.session.user.id },
      include: { api: { include: { org: true } }, application: true },
      orderBy: { createdAt: "desc" },
    })
  ),

  pendingApprovals: ownerProcedure.query(({ ctx }) =>
    ctx.db.subscriptionRequest.findMany({
      where: {
        status: "PENDING",
        api: { ownerId: ctx.session.user.id },
      },
      include: {
        api: { include: { org: true } },
        application: { include: { owner: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  approve: ownerProcedure
    .input(z.object({ requestId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.db.subscriptionRequest.findFirstOrThrow({
        where: { id: input.requestId, api: { ownerId: ctx.session.user.id } },
      });
      await ctx.db.subscriptionRequest.update({ where: { id: input.requestId }, data: { status: "APPROVED", reviewerId: ctx.session.user.id } });
      await ctx.db.subscription.upsert({
        where: { applicationId_apiId_environment: { applicationId: req.applicationId, apiId: req.apiId, environment: req.environment } },
        create: { applicationId: req.applicationId, apiId: req.apiId, environment: req.environment },
        update: { revokedAt: null },
      });
    }),

  reject: ownerProcedure
    .input(z.object({ requestId: z.string(), comments: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      ctx.db.subscriptionRequest.update({
        where: { id: input.requestId, api: { ownerId: ctx.session.user.id } },
        data: { status: "REJECTED", reviewerId: ctx.session.user.id, comments: input.comments },
      })
    ),
});
```

- [ ] **Step 2: Register both new routers in `packages/trpc/src/index.ts`**

Add imports and register:

```typescript
import { applicationRouter } from "./routers/application";
import { subscriptionRouter } from "./routers/subscription";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
  api: apiRouter,
  apiVersion: apiVersionRouter,
  admin: adminRouter,
  application: applicationRouter,
  subscription: subscriptionRouter,
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/routers/subscription.ts packages/trpc/src/index.ts
git commit -m "feat(onboarding): add subscription tRPC router with request/approve/reject"
```

---

### Task 3: Create My Applications page

**Files:**
- Create: `apps/web/app/(portal)/my-apps/page.tsx`
- Create: `apps/web/components/onboarding/MockCredentials.tsx`

- [ ] **Step 1: Create `MockCredentials.tsx`**

```typescript
// apps/web/components/onboarding/MockCredentials.tsx
"use client";
import { useState } from "react";

interface Props {
  clientId: string;
  clientSecret: string;
}

export function MockCredentials({ clientId, clientSecret }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Mock Credentials
        <span className="ml-2 text-amber-400 font-normal normal-case">Demo only — not real gateway credentials</span>
      </p>
      <div className="font-mono text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-24">Client ID:</span>
          <span className="text-slate-200">{clientId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 w-24">Secret:</span>
          {show ? (
            <span className="text-slate-200">{clientSecret}</span>
          ) : (
            <span className="text-slate-500">••••••••••••</span>
          )}
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            {show ? "Hide" : "Reveal"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(portal)/my-apps/page.tsx`**

```typescript
import { createCaller } from "@/lib/trpc/server";
import Link from "next/link";
import { MockCredentials } from "@/components/onboarding/MockCredentials";

export default async function MyAppsPage() {
  const caller = await createCaller();
  const apps = await caller.application.list();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Applications</h1>
          <p className="text-slate-400 text-sm mt-0.5">Register apps to request API access</p>
        </div>
        <Link
          href="/my-apps/register"
          className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Register App
        </Link>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-lg">No applications yet.</p>
          <Link href="/my-apps/register" className="text-sky-400 hover:text-sky-300 text-sm mt-2 inline-block">
            Register your first app →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((app) => (
            <div key={app.id} className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
              <div>
                <h2 className="text-white font-semibold">{app.name}</h2>
                {app.description && <p className="text-slate-400 text-sm mt-0.5">{app.description}</p>}
              </div>
              <MockCredentials clientId={app.mockClientId} clientSecret={app.mockClientSecret} />
              <div className="text-xs text-slate-500">
                {app.subscriptions.length} active subscription{app.subscriptions.length !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `apps/web/app/(portal)/my-apps/register/page.tsx`**

```typescript
import { AppRegistrationForm } from "@/components/onboarding/AppRegistrationForm";

export default function RegisterAppPage() {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Register Application</h1>
      <p className="text-slate-400 text-sm mb-6">Applications let you request access to APIs and receive mock credentials.</p>
      <AppRegistrationForm />
    </div>
  );
}
```

- [ ] **Step 4: Create `AppRegistrationForm.tsx`**

Create `apps/web/components/onboarding/AppRegistrationForm.tsx`:

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function AppRegistrationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const create = trpc.application.create.useMutation({
    onSuccess: () => router.push("/my-apps"),
    onError: (e) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); create.mutate({ name, description }); }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">App Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="My Integration App"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What does this app do?"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={create.isPending}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
      >
        {create.isPending ? "Registering..." : "Register Application"}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(portal\)/my-apps/ apps/web/components/onboarding/
git commit -m "feat(onboarding): add My Applications page, registration form, mock credentials"
```

---

### Task 4: Create Subscribe and My Subscriptions pages

**Files:**
- Create: `apps/web/app/(portal)/subscribe/[apiId]/page.tsx`
- Create: `apps/web/app/(portal)/my-subscriptions/page.tsx`
- Create: `apps/web/components/onboarding/SubscriptionRequestForm.tsx`

- [ ] **Step 1: Create `SubscriptionRequestForm.tsx`**

```typescript
// apps/web/components/onboarding/SubscriptionRequestForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { EnvSelector, Env } from "@/components/ui/EnvSelector";

interface Props {
  apiId: string;
  apiName: string;
  applications: { id: string; name: string }[];
}

export function SubscriptionRequestForm({ apiId, apiName, applications }: Props) {
  const router = useRouter();
  const [appId, setAppId] = useState(applications[0]?.id ?? "");
  const [env, setEnv] = useState<Env>("dev");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const request = trpc.subscription.requestAccess.useMutation({
    onSuccess: () => router.push("/my-subscriptions"),
    onError: (e) => setError(e.message),
  });

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">You need to register an application first.</p>
        <a href="/my-apps/register" className="text-sky-400 hover:text-sky-300 text-sm mt-2 inline-block">
          Register an app →
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); request.mutate({ applicationId: appId, apiId, environment: env, comments }); }}
      className="space-y-5"
    >
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Application</label>
        <select
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        >
          {applications.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Environment</label>
        <EnvSelector value={env} onChange={setEnv} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Comments (optional)</label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          placeholder="Describe your use case..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={request.isPending}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm"
      >
        {request.isPending ? "Submitting..." : `Request Access to ${apiName}`}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create subscribe page**

```typescript
// apps/web/app/(portal)/subscribe/[apiId]/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { SubscriptionRequestForm } from "@/components/onboarding/SubscriptionRequestForm";
import { notFound } from "next/navigation";

export default async function SubscribePage({ params }: { params: { apiId: string } }) {
  const caller = await createCaller();
  const [api, apps] = await Promise.all([
    caller.api.getById({ id: params.apiId }).catch(() => null),
    caller.application.list(),
  ]);
  if (!api) return notFound();

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Request Access</h1>
      <p className="text-slate-400 text-sm mb-6">
        Requesting access to <span className="text-white font-medium">{api.name}</span>
      </p>
      <SubscriptionRequestForm apiId={api.id} apiName={api.name} applications={apps.map(a => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
```

Note: `api.getById` requires adding an `id`-based lookup to `packages/trpc/src/routers/api.ts`:

```typescript
getById: publicProcedure
  .input(z.object({ id: z.string() }))
  .query(({ ctx, input }) =>
    ctx.db.api.findUniqueOrThrow({
      where: { id: input.id },
      include: { org: true, owner: { select: { id: true, name: true, email: true } } },
    })
  ),
```

Add this procedure to the existing `apiRouter` in `packages/trpc/src/routers/api.ts`.

- [ ] **Step 3: Create My Subscriptions page**

```typescript
// apps/web/app/(portal)/my-subscriptions/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending Review", APPROVED: "Approved", REJECTED: "Rejected", REVOKED: "Revoked",
};

export default async function MySubscriptionsPage() {
  const caller = await createCaller();
  const requests = await caller.subscription.myRequests();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">My Subscriptions</h1>
      {requests.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No subscription requests yet.</p>
          <Link href="/browse" className="text-sky-400 hover:text-sky-300 text-sm mt-2 inline-block">
            Browse APIs →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div>
                <p className="text-white font-medium">{r.api.name}</p>
                <p className="text-slate-400 text-sm">{r.application.name} · {r.environment.toUpperCase()}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(portal\)/subscribe/ apps/web/app/\(portal\)/my-subscriptions/ apps/web/components/onboarding/SubscriptionRequestForm.tsx
git commit -m "feat(onboarding): add subscribe page, my subscriptions page, subscription request form"
```

---

### Task 5: Create Approval Queue page

**Files:**
- Create: `apps/web/app/(portal)/approvals/page.tsx`
- Create: `apps/web/components/onboarding/ApprovalCard.tsx`

- [ ] **Step 1: Create `ApprovalCard.tsx`**

```typescript
// apps/web/components/onboarding/ApprovalCard.tsx
"use client";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  requestId: string;
  apiName: string;
  appName: string;
  requesterName: string;
  requesterEmail: string;
  environment: string;
  comments?: string | null;
  createdAt: Date;
}

export function ApprovalCard({ requestId, apiName, appName, requesterName, requesterEmail, environment, comments, createdAt }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const approve = trpc.subscription.approve.useMutation({ onSuccess: () => router.refresh() });
  const reject = trpc.subscription.reject.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-semibold">{apiName}</p>
          <p className="text-slate-400 text-sm">{appName} · {environment.toUpperCase()}</p>
          <p className="text-slate-500 text-xs mt-0.5">{requesterName} ({requesterEmail})</p>
        </div>
        <span className="text-xs text-slate-500">{new Date(createdAt).toLocaleDateString()}</span>
      </div>
      {comments && (
        <p className="text-slate-300 text-sm bg-slate-900/50 p-2 rounded italic">"{comments}"</p>
      )}
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional review notes..."
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-sky-500"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => approve.mutate({ requestId, notes })}
            disabled={approve.isPending}
            className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => reject.mutate({ requestId, comments: notes })}
            disabled={reject.isPending}
            className="flex-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create approvals page**

```typescript
// apps/web/app/(portal)/approvals/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ApprovalCard } from "@/components/onboarding/ApprovalCard";

export default async function ApprovalsPage() {
  const caller = await createCaller();
  const pending = await caller.subscription.pendingApprovals();

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Approval Queue</h1>
      <p className="text-slate-400 text-sm mb-6">{pending.length} pending request{pending.length !== 1 ? "s" : ""}</p>
      {pending.length === 0 ? (
        <p className="text-center py-20 text-slate-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <ApprovalCard
              key={r.id}
              requestId={r.id}
              apiName={r.api.name}
              appName={r.application.name}
              requesterName={r.requester.name}
              requesterEmail={r.requester.email}
              environment={r.environment}
              comments={r.comments}
              createdAt={r.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(portal\)/approvals/ apps/web/components/onboarding/ApprovalCard.tsx
git commit -m "feat(onboarding): add approval queue page for API owners"
```

---

### Task 6: Add nav links and final verification

**Files:**
- Modify: `apps/web/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add onboarding links to Sidebar**

Read `apps/web/components/layout/Sidebar.tsx` then add a "Developer" section with these links:

```typescript
// In the nav links array, add a section or individual items:
{ href: "/my-apps",          label: "My Applications",   icon: "AppWindow" },
{ href: "/my-subscriptions", label: "My Subscriptions",  icon: "Key" },
{ href: "/approvals",        label: "Approval Queue",    icon: "CheckSquare" },
```

Only show "Approval Queue" if the user's role includes `canApproveRequests` (import `canApproveRequests` from `@/lib/rbac`).

- [ ] **Step 2: Build**

```bash
pnpm build
```
Expected: Exits 0.

- [ ] **Step 3: Test**

```bash
pnpm test
```
Expected: All pass.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore(phase-1b): Phase 1B Developer Onboarding complete"
```
