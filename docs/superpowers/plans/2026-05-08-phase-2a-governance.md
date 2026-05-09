# Phase 2A: Governance Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the governance module — API design checklist, quality scorecard, data classification display, PII/PHI indicators, linting-style rule checks, and governance review workflow.

**Architecture:** A new `governanceRouter` handles checklist scoring and reviews. A computed `GovernanceScore` is derived from checklist results. The governance dashboard shows all APIs with their scores. The review form is accessible to GOVERNANCE_REVIEWER role users.

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS, Zod

**Base branch:** post Phase 1 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/governance.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/lib/governance-linter.ts` |
| Create | `apps/web/app/(portal)/governance/page.tsx` |
| Create | `apps/web/app/(portal)/governance/[apiId]/page.tsx` |
| Create | `apps/web/components/governance/GovernanceScoreCard.tsx` |
| Create | `apps/web/components/governance/ChecklistPanel.tsx` |
| Create | `apps/web/components/governance/LintingReport.tsx` |
| Create | `apps/web/components/governance/DataClassificationPanel.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create governance linter utility

**Files:**
- Create: `apps/web/lib/governance-linter.ts`
- Test: `apps/web/__tests__/lib/governance-linter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/__tests__/lib/governance-linter.test.ts
import { describe, it, expect } from "vitest";
import { lintApi } from "@/lib/governance-linter";

describe("lintApi", () => {
  it("passes when all fields are present and slug is kebab-case", () => {
    const result = lintApi({ name: "Customer API", slug: "customer-api", description: "Desc", type: "REST", visibility: "PUBLIC", supportContact: "team@co.com", specKey: "spec.json" });
    expect(result.score).toBeGreaterThan(70);
    expect(result.issues.length).toBe(0);
  });

  it("flags missing description", () => {
    const result = lintApi({ name: "X", slug: "x", description: "", type: "REST", visibility: "INTERNAL" });
    expect(result.issues).toContain("Missing description");
  });

  it("flags non-kebab-case slug", () => {
    const result = lintApi({ name: "My API", slug: "MyAPI", description: "ok", type: "REST", visibility: "INTERNAL" });
    expect(result.issues.some(i => i.includes("slug"))).toBe(true);
  });

  it("flags missing support contact", () => {
    const result = lintApi({ name: "X", slug: "x", description: "ok", type: "REST", visibility: "INTERNAL" });
    expect(result.issues).toContain("Missing support contact");
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd apps/web && pnpm test __tests__/lib/governance-linter.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `apps/web/lib/governance-linter.ts`**

```typescript
export interface LintInput {
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  visibility: string;
  supportContact?: string | null;
  specKey?: string | null;
  specUrl?: string | null;
  piiIndicator?: boolean;
  dataClassification?: string | null;
}

export interface LintResult {
  score: number;
  issues: string[];
  warnings: string[];
}

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function lintApi(api: LintInput): LintResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (!api.description || api.description.trim().length < 10) {
    issues.push("Missing description"); score -= 15;
  }
  if (!KEBAB_RE.test(api.slug)) {
    issues.push("slug must be kebab-case (lowercase letters, numbers, hyphens)"); score -= 10;
  }
  if (!api.supportContact) {
    issues.push("Missing support contact"); score -= 10;
  }
  if (!api.specKey && !api.specUrl) {
    issues.push("No spec uploaded or linked"); score -= 20;
  }
  if (api.type === "REST" && !api.visibility) {
    warnings.push("Visibility not set — defaults to INTERNAL");
  }
  if (api.piiIndicator && !api.dataClassification) {
    warnings.push("API contains PII but no data classification set"); score -= 5;
  }
  if (api.visibility === "PUBLIC" && api.dataClassification === "RESTRICTED") {
    issues.push("PUBLIC visibility conflicts with RESTRICTED data classification"); score -= 15;
  }

  return { score: Math.max(0, score), issues, warnings };
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd apps/web && pnpm test __tests__/lib/governance-linter.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/governance-linter.ts apps/web/__tests__/lib/governance-linter.test.ts
git commit -m "feat(governance): add API linter with scoring rules"
```

---

### Task 2: Create governance tRPC router

**Files:**
- Create: `packages/trpc/src/routers/governance.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Create `governance.ts`**

```typescript
// packages/trpc/src/routers/governance.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, reviewerProcedure, publicProcedure } from "../trpc";

export const governanceRouter = createTRPCRouter({
  getApiScore: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.governanceReview.findMany({
        where: { apiId: input.apiId },
        include: { checklist: true },
      });
      const total = reviews.length;
      const passed = reviews.filter((r) => r.passed).length;
      const score = total > 0 ? Math.round((passed / total) * 100) : null;
      return { score, total, passed, reviews };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    const apis = await ctx.db.api.findMany({
      include: {
        org: true,
        domain: true,
        versions: { take: 1, orderBy: { createdAt: "desc" }, select: { lifecycleStatus: true, maturityScore: true } },
        governanceReviews: { select: { passed: true } },
      },
      orderBy: { name: "asc" },
    });
    return apis.map((api) => {
      const total = api.governanceReviews.length;
      const passed = api.governanceReviews.filter((r) => r.passed).length;
      const score = total > 0 ? Math.round((passed / total) * 100) : null;
      return { ...api, governanceScore: score };
    });
  }),

  getChecklistItems: publicProcedure.query(({ ctx }) =>
    ctx.db.governanceChecklist.findMany({ orderBy: { name: "asc" } })
  ),

  submitReview: reviewerProcedure
    .input(z.object({
      apiId: z.string(),
      checklistId: z.string(),
      passed: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.governanceReview.create({
        data: { ...input, reviewerId: ctx.session.user.id },
      })
    ),
});
```

- [ ] **Step 2: Register in `packages/trpc/src/index.ts`**

Add `import { governanceRouter } from "./routers/governance";` and `governance: governanceRouter` to the appRouter.

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/routers/governance.ts packages/trpc/src/index.ts
git commit -m "feat(governance): add governance tRPC router"
```

---

### Task 3: Build shared governance components

**Files:**
- Create: `apps/web/components/governance/GovernanceScoreCard.tsx`
- Create: `apps/web/components/governance/ChecklistPanel.tsx`
- Create: `apps/web/components/governance/LintingReport.tsx`
- Create: `apps/web/components/governance/DataClassificationPanel.tsx`

- [ ] **Step 1: Create `GovernanceScoreCard.tsx`**

```typescript
// apps/web/components/governance/GovernanceScoreCard.tsx
interface Props { score: number | null; passed: number; total: number }

export function GovernanceScoreCard({ score, passed, total }: Props) {
  const color = score === null ? "text-slate-400" : score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const ring = score === null ? "border-slate-600" : score >= 80 ? "border-emerald-500" : score >= 60 ? "border-amber-500" : "border-red-500";
  return (
    <div className={`flex items-center gap-4 p-5 bg-slate-800/50 rounded-xl border ${ring}`}>
      <div className={`text-4xl font-black ${color}`}>
        {score !== null ? `${score}` : "—"}
        {score !== null && <span className="text-xl font-normal text-slate-500">%</span>}
      </div>
      <div>
        <p className="text-white font-semibold">Governance Score</p>
        <p className="text-slate-400 text-sm">{passed}/{total} checks passed</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `ChecklistPanel.tsx`**

```typescript
// apps/web/components/governance/ChecklistPanel.tsx
"use client";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ChecklistItem { id: string; name: string; description?: string | null; required: boolean }
interface Review { checklistId: string; passed: boolean; notes?: string | null }
interface Props { apiId: string; items: ChecklistItem[]; existingReviews: Review[]; canReview: boolean }

export function ChecklistPanel({ apiId, items, existingReviews, canReview }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const submit = trpc.governance.submitReview.useMutation({ onSuccess: () => router.refresh() });
  const reviewMap = Object.fromEntries(existingReviews.map((r) => [r.checklistId, r]));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const existing = reviewMap[item.id];
        return (
          <div key={item.id} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  {item.required && <span className="text-xs text-red-400">Required</span>}
                </div>
                {item.description && <p className="text-slate-400 text-xs mt-0.5">{item.description}</p>}
              </div>
              {existing ? (
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${existing.passed ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}>
                  {existing.passed ? "✓ Pass" : "✗ Fail"}
                </span>
              ) : canReview ? (
                <div className="flex items-center gap-2 shrink-0">
                  <textarea value={notes[item.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [item.id]: e.target.value }))}
                    rows={1} placeholder="Notes..." className="w-40 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
                  <button type="button" onClick={() => submit.mutate({ apiId, checklistId: item.id, passed: true, notes: notes[item.id] })}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-xs text-white font-semibold">Pass</button>
                  <button type="button" onClick={() => submit.mutate({ apiId, checklistId: item.id, passed: false, notes: notes[item.id] })}
                    className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs text-white font-semibold">Fail</button>
                </div>
              ) : <span className="text-slate-500 text-xs">Not reviewed</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `LintingReport.tsx`**

```typescript
// apps/web/components/governance/LintingReport.tsx
import { LintResult } from "@/lib/governance-linter";

export function LintingReport({ result }: { result: LintResult }) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">Automated Lint Check</p>
        <span className={`text-lg font-black ${result.score >= 80 ? "text-emerald-400" : result.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
          {result.score}/100
        </span>
      </div>
      {result.issues.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase mb-1">Issues</p>
          <ul className="space-y-1">
            {result.issues.map((i, idx) => <li key={idx} className="text-sm text-red-300 flex gap-2"><span>✗</span>{i}</li>)}
          </ul>
        </div>
      )}
      {result.warnings.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-400 uppercase mb-1">Warnings</p>
          <ul className="space-y-1">
            {result.warnings.map((w, idx) => <li key={idx} className="text-sm text-amber-300 flex gap-2"><span>⚠</span>{w}</li>)}
          </ul>
        </div>
      )}
      {result.issues.length === 0 && result.warnings.length === 0 && (
        <p className="text-emerald-400 text-sm">✓ All automated checks passed</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `DataClassificationPanel.tsx`**

```typescript
// apps/web/components/governance/DataClassificationPanel.tsx
import { DataClassBadge } from "@/components/ui/DataClassBadge";

interface Props {
  dataClassification: string;
  piiIndicator: boolean;
  phiIndicator: boolean;
  visibility: string;
}

export function DataClassificationPanel({ dataClassification, piiIndicator, phiIndicator, visibility }: Props) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <p className="text-white font-semibold text-sm">Data & Security Classification</p>
      <div className="flex flex-wrap gap-3">
        <DataClassBadge classification={dataClassification} />
        {piiIndicator && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/40 text-orange-300">
            ⚠ Contains PII
          </span>
        )}
        {phiIndicator && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-300">
            ⚠ Contains PHI (HIPAA)
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Visibility: <span className="text-slate-300">{visibility}</span> ·
        These classifications are for documentation and access control guidance. Runtime enforcement is managed by the API gateway.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/governance/
git commit -m "feat(governance): add GovernanceScoreCard, ChecklistPanel, LintingReport, DataClassificationPanel"
```

---

### Task 4: Build governance pages

**Files:**
- Create: `apps/web/app/(portal)/governance/page.tsx`
- Create: `apps/web/app/(portal)/governance/[apiId]/page.tsx`

- [ ] **Step 1: Create governance dashboard**

```typescript
// apps/web/app/(portal)/governance/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { GovernanceScoreCard } from "@/components/governance/GovernanceScoreCard";
import Link from "next/link";

export default async function GovernanceDashboardPage() {
  const caller = await createCaller();
  const apis = await caller.governance.getDashboard();

  const avgScore = apis.filter((a) => a.governanceScore !== null).reduce((sum, a) => sum + (a.governanceScore ?? 0), 0) / (apis.filter((a) => a.governanceScore !== null).length || 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Governance Dashboard</h1>
      <p className="text-slate-400 text-sm mb-6">API quality scores across the catalog</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-white">{apis.length}</p>
          <p className="text-slate-400 text-sm mt-1">Total APIs</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-emerald-400">{Math.round(avgScore)}%</p>
          <p className="text-slate-400 text-sm mt-1">Avg Governance Score</p>
        </div>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-3xl font-black text-amber-400">{apis.filter((a) => (a.governanceScore ?? 100) < 60).length}</p>
          <p className="text-slate-400 text-sm mt-1">APIs below 60%</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              {["API", "Type", "Domain", "Status", "Score", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {apis.map((api) => (
              <tr key={api.id} className="hover:bg-slate-800/20">
                <td className="px-4 py-3 text-white font-medium">{api.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{api.type}</td>
                <td className="px-4 py-3 text-slate-400">{api.domain?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {api.versions[0] && <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">{api.versions[0].lifecycleStatus}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${api.governanceScore === null ? "text-slate-500" : api.governanceScore >= 80 ? "text-emerald-400" : api.governanceScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {api.governanceScore !== null ? `${api.governanceScore}%` : "Not reviewed"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/governance/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">Review →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create governance review page**

```typescript
// apps/web/app/(portal)/governance/[apiId]/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { GovernanceScoreCard } from "@/components/governance/GovernanceScoreCard";
import { ChecklistPanel } from "@/components/governance/ChecklistPanel";
import { LintingReport } from "@/components/governance/LintingReport";
import { DataClassificationPanel } from "@/components/governance/DataClassificationPanel";
import { lintApi } from "@/lib/governance-linter";
import { canReviewGovernance } from "@/lib/rbac";

export default async function GovernanceReviewPage({ params }: { params: { apiId: string } }) {
  const [caller, session] = await Promise.all([createCaller(), auth()]);
  const [score, checklistItems, apiData] = await Promise.all([
    caller.governance.getApiScore({ apiId: params.apiId }),
    caller.governance.getChecklistItems(),
    caller.admin.apiManagement.getById({ id: params.apiId }).catch(() => null),
  ]);
  if (!apiData) return notFound();

  const lintResult = lintApi({
    name: apiData.name, slug: apiData.slug, description: apiData.description,
    type: apiData.type, visibility: apiData.visibility, supportContact: apiData.supportContact,
    specKey: apiData.versions[0]?.specKey, specUrl: apiData.versions[0]?.specUrl,
    piiIndicator: apiData.piiIndicator, dataClassification: apiData.dataClassification,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{apiData.name} — Governance Review</h1>
        <p className="text-slate-400 text-sm mt-1">{apiData.org.name}</p>
      </div>
      <GovernanceScoreCard score={score.score} passed={score.passed} total={score.total} />
      <DataClassificationPanel
        dataClassification={apiData.dataClassification}
        piiIndicator={apiData.piiIndicator}
        phiIndicator={apiData.phiIndicator}
        visibility={apiData.visibility}
      />
      <LintingReport result={lintResult} />
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Governance Checklist</h2>
        <ChecklistPanel
          apiId={params.apiId}
          items={checklistItems}
          existingReviews={score.reviews as any}
          canReview={canReviewGovernance(session)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add governance link to Sidebar**

In `apps/web/components/layout/Sidebar.tsx`, add:
```typescript
{ href: "/governance", label: "Governance", icon: "ShieldCheck" },
```

- [ ] **Step 4: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-2a): Phase 2A Governance module complete"
```
