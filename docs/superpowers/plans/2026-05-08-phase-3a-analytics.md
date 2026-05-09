# Phase 3A: Consumer Analytics Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the consumer analytics dashboard — popular APIs chart, subscriptions by consumer, access request trends, deprecated API consumer list, and doc views — using mock/imported `UsageMetric` data seeded in Phase 0.

**Architecture:** A new `analyticsRouter` aggregates UsageMetric and Subscription data. The dashboard uses Recharts (already in the project) for charts. No real gateway data is needed — all metrics are from the seeded UsageMetric table.

**Tech Stack:** Next.js 14, tRPC, Prisma, Recharts, Tailwind CSS

**Base branch:** post Phase 2 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/analytics.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/app/(portal)/analytics/page.tsx` |
| Create | `apps/web/components/analytics/PopularApisChart.tsx` |
| Create | `apps/web/components/analytics/SubscriptionsByConsumer.tsx` |
| Create | `apps/web/components/analytics/AccessRequestTrends.tsx` |
| Create | `apps/web/components/analytics/DeprecatedConsumersList.tsx` |
| Create | `apps/web/components/analytics/StatCard.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create analytics tRPC router

**Files:**
- Create: `packages/trpc/src/routers/analytics.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Create `analytics.ts`**

```typescript
// packages/trpc/src/routers/analytics.ts
import { createTRPCRouter, publicProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async ({ ctx }) => {
    const [totalApis, totalApps, totalSubscriptions, pendingRequests] = await Promise.all([
      ctx.db.api.count(),
      ctx.db.application.count(),
      ctx.db.subscription.count({ where: { revokedAt: null } }),
      ctx.db.subscriptionRequest.count({ where: { status: "PENDING" } }),
    ]);
    return { totalApis, totalApps, totalSubscriptions, pendingRequests };
  }),

  getPopularApis: publicProcedure.query(async ({ ctx }) => {
    const metrics = await ctx.db.usageMetric.groupBy({
      by: ["apiId"],
      _sum: { calls: true, consumers: true, docViews: true },
      orderBy: { _sum: { calls: "desc" } },
      take: 10,
    });
    const apiIds = metrics.map((m) => m.apiId);
    const apis = await ctx.db.api.findMany({
      where: { id: { in: apiIds } },
      select: { id: true, name: true, type: true },
    });
    const apiMap = Object.fromEntries(apis.map((a) => [a.id, a]));
    return metrics.map((m) => ({
      name: apiMap[m.apiId]?.name ?? m.apiId,
      type: apiMap[m.apiId]?.type ?? "REST",
      calls: m._sum.calls ?? 0,
      consumers: m._sum.consumers ?? 0,
      docViews: m._sum.docViews ?? 0,
    }));
  }),

  getMonthlyTrend: publicProcedure.query(async ({ ctx }) => {
    const metrics = await ctx.db.usageMetric.groupBy({
      by: ["month"],
      _sum: { calls: true, consumers: true },
      orderBy: { month: "asc" },
    });
    return metrics.map((m) => ({
      month: m.month,
      calls: m._sum.calls ?? 0,
      consumers: m._sum.consumers ?? 0,
    }));
  }),

  getSubscriptionsByConsumer: publicProcedure.query(async ({ ctx }) => {
    const apps = await ctx.db.application.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { subscriptions: { _count: "desc" } },
      take: 20,
    });
    return apps.map((a) => ({
      name: a.name,
      owner: a.owner.name,
      subscriptions: a._count.subscriptions,
    }));
  }),

  getAccessRequestTrends: publicProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db.subscriptionRequest.findMany({
      select: { status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const byMonth: Record<string, { approved: number; rejected: number; pending: number }> = {};
    for (const r of requests) {
      const month = r.createdAt.toISOString().slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { approved: 0, rejected: 0, pending: 0 };
      if (r.status === "APPROVED") byMonth[month].approved++;
      else if (r.status === "REJECTED") byMonth[month].rejected++;
      else byMonth[month].pending++;
    }
    return Object.entries(byMonth).map(([month, counts]) => ({ month, ...counts }));
  }),

  getDeprecatedConsumers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.subscription.findMany({
      where: {
        revokedAt: null,
        api: { versions: { some: { lifecycleStatus: "DEPRECATED" } } },
      },
      include: {
        api: { select: { id: true, name: true } },
        application: { include: { owner: { select: { id: true, name: true, email: true } } } },
      },
    });
  }),
});
```

- [ ] **Step 2: Register in index.ts**

Add `import { analyticsRouter } from "./routers/analytics";` and `analytics: analyticsRouter` to appRouter.

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/routers/analytics.ts packages/trpc/src/index.ts
git commit -m "feat(analytics): add analytics tRPC router"
```

---

### Task 2: Build analytics chart components

**Files:**
- Create: `apps/web/components/analytics/StatCard.tsx`
- Create: `apps/web/components/analytics/PopularApisChart.tsx`
- Create: `apps/web/components/analytics/AccessRequestTrends.tsx`
- Create: `apps/web/components/analytics/SubscriptionsByConsumer.tsx`
- Create: `apps/web/components/analytics/DeprecatedConsumersList.tsx`

- [ ] **Step 1: Create `StatCard.tsx`**

```typescript
// apps/web/components/analytics/StatCard.tsx
interface Props { label: string; value: number | string; sub?: string; color?: string }
export function StatCard({ label, value, sub, color = "text-white" }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `PopularApisChart.tsx`**

```typescript
// apps/web/components/analytics/PopularApisChart.tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DataPoint { name: string; calls: number; consumers: number }
interface Props { data: DataPoint[] }

export function PopularApisChart({ data }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Popular APIs — Total Calls</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#f1f5f9" }} />
          <Bar dataKey="calls" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Total Calls" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `AccessRequestTrends.tsx`**

```typescript
// apps/web/components/analytics/AccessRequestTrends.tsx
"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DataPoint { month: string; approved: number; rejected: number; pending: number }
interface Props { data: DataPoint[] }

export function AccessRequestTrends({ data }: Props) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Access Request Trends</p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
          <Legend />
          <Line type="monotone" dataKey="approved" stroke="#4ade80" strokeWidth={2} name="Approved" />
          <Line type="monotone" dataKey="rejected" stroke="#f87171" strokeWidth={2} name="Rejected" />
          <Line type="monotone" dataKey="pending" stroke="#facc15" strokeWidth={2} name="Pending" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create `SubscriptionsByConsumer.tsx`**

```typescript
// apps/web/components/analytics/SubscriptionsByConsumer.tsx
interface App { name: string; owner: string; subscriptions: number }
interface Props { data: App[] }

export function SubscriptionsByConsumer({ data }: Props) {
  const max = Math.max(...data.map((d) => d.subscriptions), 1);
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <p className="text-white font-semibold mb-4">Subscriptions by Consumer Application</p>
      <div className="space-y-3">
        {data.slice(0, 10).map((app) => (
          <div key={app.name}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm text-white">{app.name}</span>
                <span className="text-xs text-slate-500 ml-2">{app.owner}</span>
              </div>
              <span className="text-sm font-semibold text-sky-400">{app.subscriptions}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(app.subscriptions / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `DeprecatedConsumersList.tsx`**

```typescript
// apps/web/components/analytics/DeprecatedConsumersList.tsx
interface Sub { id: string; api: { name: string }; application: { name: string; owner: { name: string; email: string } }; environment: string }
interface Props { subscriptions: Sub[] }

export function DeprecatedConsumersList({ subscriptions }: Props) {
  if (subscriptions.length === 0) return <p className="text-slate-500 text-sm">No consumers on deprecated APIs.</p>;
  return (
    <div className="p-5 bg-slate-800/50 rounded-xl border border-amber-700/30">
      <p className="text-amber-300 font-semibold mb-3">⚠ Consumers on Deprecated APIs ({subscriptions.length})</p>
      <div className="space-y-2">
        {subscriptions.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-700/30 last:border-0">
            <div>
              <span className="text-white">{s.application.name}</span>
              <span className="text-slate-500 text-xs ml-2">({s.application.owner.email})</span>
            </div>
            <div className="text-right">
              <p className="text-amber-400 text-xs">{s.api.name}</p>
              <p className="text-slate-500 text-xs">{s.environment.toUpperCase()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/analytics/
git commit -m "feat(analytics): add analytics chart and list components"
```

---

### Task 3: Build analytics dashboard page

**Files:**
- Create: `apps/web/app/(portal)/analytics/page.tsx`

- [ ] **Step 1: Create dashboard page**

```typescript
// apps/web/app/(portal)/analytics/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { StatCard } from "@/components/analytics/StatCard";
import { PopularApisChart } from "@/components/analytics/PopularApisChart";
import { AccessRequestTrends } from "@/components/analytics/AccessRequestTrends";
import { SubscriptionsByConsumer } from "@/components/analytics/SubscriptionsByConsumer";
import { DeprecatedConsumersList } from "@/components/analytics/DeprecatedConsumersList";

export default async function AnalyticsDashboardPage() {
  const caller = await createCaller();
  const [overview, popularApis, trends, subscriptionsByConsumer, deprecatedConsumers] = await Promise.all([
    caller.analytics.getOverview(),
    caller.analytics.getPopularApis(),
    caller.analytics.getAccessRequestTrends(),
    caller.analytics.getSubscriptionsByConsumer(),
    caller.analytics.getDeprecatedConsumers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Portal-level metrics and trends (mock/imported data)</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total APIs" value={overview.totalApis} color="text-sky-400" />
        <StatCard label="Registered Apps" value={overview.totalApps} color="text-violet-400" />
        <StatCard label="Active Subscriptions" value={overview.totalSubscriptions} color="text-emerald-400" />
        <StatCard label="Pending Requests" value={overview.pendingRequests} color="text-amber-400" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PopularApisChart data={popularApis} />
        <SubscriptionsByConsumer data={subscriptionsByConsumer} />
      </div>
      <AccessRequestTrends data={trends} />
      <DeprecatedConsumersList subscriptions={deprecatedConsumers as any} />
    </div>
  );
}
```

- [ ] **Step 2: Add analytics link to Sidebar**

```typescript
{ href: "/analytics", label: "Analytics", icon: "BarChart2" },
```

- [ ] **Step 3: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-3a): Phase 3A Consumer Analytics complete"
```
