# Phase 2B: Lifecycle Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build lifecycle management — lifecycle dashboard showing all APIs and their status, per-API lifecycle timeline, deprecation notices on API detail pages, consumer impact view (who uses deprecated APIs), changelog/release notes per version, and maturity scoring.

**Architecture:** A new `lifecycleRouter` provides data. The lifecycle dashboard uses the existing `StatusBadge` from Phase 0. A `DeprecationBanner` is injected into the API detail page layout when `lifecycleStatus === DEPRECATED`. Consumer impact uses the existing `Subscription` model.

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS

**Base branch:** post Phase 1 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/lifecycle.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/app/(portal)/lifecycle/page.tsx` |
| Create | `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/versions/page.tsx` |
| Create | `apps/web/components/lifecycle/LifecycleTimeline.tsx` |
| Create | `apps/web/components/lifecycle/DeprecationBanner.tsx` |
| Create | `apps/web/components/lifecycle/ConsumerImpactTable.tsx` |
| Create | `apps/web/components/lifecycle/ChangelogPanel.tsx` |
| Modify | `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/layout.tsx` (or the closest layout file) |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create lifecycle tRPC router

**Files:**
- Create: `packages/trpc/src/routers/lifecycle.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Create `lifecycle.ts`**

```typescript
// packages/trpc/src/routers/lifecycle.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, ownerProcedure } from "../trpc";

export const lifecycleRouter = createTRPCRouter({
  getDashboard: publicProcedure.query(({ ctx }) =>
    ctx.db.api.findMany({
      include: {
        org: true,
        domain: true,
        owner: { select: { id: true, name: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, version: true, lifecycleStatus: true, retirementDate: true, createdAt: true },
        },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { name: "asc" },
    })
  ),

  getVersionHistory: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.apiVersion.findMany({
        where: { apiId: input.apiId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, version: true, lifecycleStatus: true, status: true,
          changelog: true, releaseNotes: true, maturityScore: true,
          retirementDate: true, publishedAt: true, createdAt: true,
        },
      })
    ),

  getConsumerImpact: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.subscription.findMany({
        where: { apiId: input.apiId, revokedAt: null },
        include: {
          application: { include: { owner: { select: { id: true, name: true, email: true } } } },
        },
      })
    ),

  getEvents: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.lifecycleEvent.findMany({
        where: { apiId: input.apiId },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    ),

  updateVersionLifecycle: ownerProcedure
    .input(z.object({
      versionId: z.string(),
      lifecycleStatus: z.enum(["DRAFT", "BETA", "ACTIVE", "DEPRECATED", "RETIRED"]),
      retirementDate: z.date().optional(),
      changelog: z.string().optional(),
      releaseNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { versionId, ...data } = input;
      const version = await ctx.db.apiVersion.update({ where: { id: versionId }, data });
      await ctx.db.lifecycleEvent.create({
        data: {
          apiId: version.apiId,
          actorId: ctx.session.user.id,
          type: "STATUS_CHANGED",
          notes: `Version ${version.version} moved to ${input.lifecycleStatus}`,
        },
      });
      return version;
    }),
});
```

- [ ] **Step 2: Register in index.ts**

Add `import { lifecycleRouter } from "./routers/lifecycle";` and `lifecycle: lifecycleRouter` to appRouter.

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/routers/lifecycle.ts packages/trpc/src/index.ts
git commit -m "feat(lifecycle): add lifecycle tRPC router"
```

---

### Task 2: Build shared lifecycle components

**Files:**
- Create: `apps/web/components/lifecycle/DeprecationBanner.tsx`
- Create: `apps/web/components/lifecycle/LifecycleTimeline.tsx`
- Create: `apps/web/components/lifecycle/ChangelogPanel.tsx`
- Create: `apps/web/components/lifecycle/ConsumerImpactTable.tsx`

- [ ] **Step 1: Create `DeprecationBanner.tsx`**

```typescript
// apps/web/components/lifecycle/DeprecationBanner.tsx
interface Props { apiName: string; retirementDate?: Date | null; replacementHint?: string | null }

export function DeprecationBanner({ apiName, retirementDate, replacementHint }: Props) {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl mb-6">
      <span className="text-amber-400 text-lg shrink-0">⚠</span>
      <div>
        <p className="text-amber-300 font-semibold text-sm">
          {apiName} is deprecated
          {retirementDate && ` — scheduled for retirement on ${new Date(retirementDate).toLocaleDateString()}`}
        </p>
        {replacementHint && <p className="text-amber-400/80 text-xs mt-0.5">{replacementHint}</p>}
        <p className="text-amber-500 text-xs mt-1">Please migrate to the recommended alternative. Contact the API owner for migration guidance.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `LifecycleTimeline.tsx`**

```typescript
// apps/web/components/lifecycle/LifecycleTimeline.tsx
const STATUS_ORDER = ["DRAFT", "BETA", "ACTIVE", "DEPRECATED", "RETIRED"];

interface Props { currentStatus: string }

export function LifecycleTimeline({ currentStatus }: Props) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0">
      {STATUS_ORDER.map((status, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${isCurrent ? "bg-sky-600 text-white ring-2 ring-sky-400/50" :
                  isPast ? "bg-slate-600 text-slate-300" : "bg-slate-800 text-slate-600 border border-slate-700"}`}>
                {idx + 1}
              </div>
              <p className={`text-xs mt-1 whitespace-nowrap font-medium
                ${isCurrent ? "text-sky-400" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                {status}
              </p>
            </div>
            {idx < STATUS_ORDER.length - 1 && (
              <div className={`h-0.5 w-8 mx-1 mt-[-10px] ${isPast ? "bg-slate-600" : "bg-slate-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `ChangelogPanel.tsx`**

```typescript
// apps/web/components/lifecycle/ChangelogPanel.tsx
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Version {
  id: string; version: string; lifecycleStatus: string;
  changelog?: string | null; releaseNotes?: string | null;
  maturityScore?: number | null; createdAt: Date;
}
interface Props { versions: Version[] }

export function ChangelogPanel({ versions }: Props) {
  return (
    <div className="space-y-4">
      {versions.map((v) => (
        <div key={v.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold font-mono text-sm">v{v.version}</span>
              <StatusBadge status={v.lifecycleStatus} />
            </div>
            <div className="flex items-center gap-3">
              {v.maturityScore !== null && v.maturityScore !== undefined && (
                <span className="text-xs text-slate-400">Maturity: <span className="text-white font-semibold">{v.maturityScore}%</span></span>
              )}
              <span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {v.changelog && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Changelog</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{v.changelog}</p>
            </div>
          )}
          {v.releaseNotes && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Release Notes</p>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{v.releaseNotes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `ConsumerImpactTable.tsx`**

```typescript
// apps/web/components/lifecycle/ConsumerImpactTable.tsx
interface Subscription {
  id: string;
  environment: string;
  grantedAt: Date;
  application: { name: string; owner: { name: string; email: string } };
}
interface Props { subscriptions: Subscription[] }

export function ConsumerImpactTable({ subscriptions }: Props) {
  if (subscriptions.length === 0) {
    return <p className="text-slate-500 text-sm">No active consumers for this API.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/80">
          <tr>
            {["Application", "Owner", "Environment", "Granted"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {subscriptions.map((s) => (
            <tr key={s.id} className="hover:bg-slate-800/20">
              <td className="px-4 py-3 text-white">{s.application.name}</td>
              <td className="px-4 py-3 text-slate-400">{s.application.owner.name}</td>
              <td className="px-4 py-3 text-slate-400 uppercase text-xs">{s.environment}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{new Date(s.grantedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/lifecycle/
git commit -m "feat(lifecycle): add DeprecationBanner, LifecycleTimeline, ChangelogPanel, ConsumerImpactTable"
```

---

### Task 3: Build lifecycle pages

**Files:**
- Create: `apps/web/app/(portal)/lifecycle/page.tsx`
- Create: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/versions/page.tsx`

- [ ] **Step 1: Create lifecycle dashboard page**

```typescript
// apps/web/app/(portal)/lifecycle/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LifecycleTimeline } from "@/components/lifecycle/LifecycleTimeline";
import Link from "next/link";

export default async function LifecycleDashboardPage() {
  const caller = await createCaller();
  const apis = await caller.lifecycle.getDashboard();
  const deprecated = apis.filter((a) => a.versions[0]?.lifecycleStatus === "DEPRECATED");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Lifecycle Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">Monitor API lifecycle status across the catalog</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {(["ACTIVE", "BETA", "DEPRECATED", "RETIRED"] as const).map((status) => {
          const count = apis.filter((a) => a.versions[0]?.lifecycleStatus === status).length;
          return (
            <div key={status} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-2xl font-black text-white">{count}</p>
              <StatusBadge status={status} />
            </div>
          );
        })}
      </div>

      {deprecated.length > 0 && (
        <div className="mb-6 p-4 bg-amber-900/10 border border-amber-700/30 rounded-xl">
          <p className="text-amber-300 font-semibold text-sm mb-2">⚠ Deprecated APIs with active consumers</p>
          <div className="space-y-1">
            {deprecated.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{a.name}</span>
                <span className="text-slate-500 text-xs">{a._count.subscriptions} consumer{a._count.subscriptions !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apis.map((api) => (
          <div key={api.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-semibold">{api.name}</p>
                <p className="text-slate-400 text-xs">{api.org.name} · {api.owner.name}</p>
              </div>
              <Link href={`/lifecycle/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">
                Manage →
              </Link>
            </div>
            {api.versions[0] && <LifecycleTimeline currentStatus={api.versions[0].lifecycleStatus} />}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create per-API versions page with changelog**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/versions/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ChangelogPanel } from "@/components/lifecycle/ChangelogPanel";
import { ConsumerImpactTable } from "@/components/lifecycle/ConsumerImpactTable";
import { notFound } from "next/navigation";

export default async function ApiVersionsPage({ params }: { params: { orgSlug: string; apiSlug: string; version: string } }) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) return notFound();

  const [versions, consumers] = await Promise.all([
    caller.lifecycle.getVersionHistory({ apiId: api.id }),
    caller.lifecycle.getConsumerImpact({ apiId: api.id }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Version History — {api.name}</h1>
        <p className="text-slate-400 text-sm mt-1">{versions.length} version{versions.length !== 1 ? "s" : ""}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Changelog</h2>
        <ChangelogPanel versions={versions as any} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Active Consumers ({consumers.length})</h2>
        <ConsumerImpactTable subscriptions={consumers as any} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Inject DeprecationBanner into API detail layout**

Find the API detail layout or the reference page and add the deprecation banner at the top when the API is deprecated.

In `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx` (or the layout that wraps it), fetch the version's `lifecycleStatus` and conditionally render:

```typescript
import { DeprecationBanner } from "@/components/lifecycle/DeprecationBanner";

// Inside the component, after fetching apiVersion:
{apiVersion.lifecycleStatus === "DEPRECATED" && (
  <DeprecationBanner
    apiName={api.name}
    retirementDate={apiVersion.retirementDate}
  />
)}
```

- [ ] **Step 4: Add lifecycle link to Sidebar**

```typescript
{ href: "/lifecycle", label: "Lifecycle", icon: "GitBranch" },
```

- [ ] **Step 5: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-2b): Phase 2B Lifecycle Management complete"
```
