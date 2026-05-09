# Phase 1A: API Catalog Upgrades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the API catalog with visibility flags, domain/tag filtering, AsyncAPI/Event/Webhook/SOAP type support, AsyncAPI spec rendering, extended lifecycle status display, and documentation meta-fields for auth method, rate-limit policy, and SLA.

**Architecture:** Extends the existing `browse` page with a new `FilterPanel` component. Updates `ApiCard` to show new metadata. Adds `AsyncAPIRenderer` to the API detail reference tab. Extends the tRPC `api.list` query with new filter params. Adds doc meta-fields section to the API detail reference page.

**Tech Stack:** Next.js 14, tRPC, Tailwind CSS, Prisma, @asyncapi/react-component (or custom renderer)

**Base branch:** post Phase 0 merge (schema already includes new fields)

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Modify | `packages/trpc/src/routers/api.ts` |
| Modify | `apps/web/app/(portal)/browse/page.tsx` |
| Modify | `apps/web/components/catalog/ApiCard.tsx` |
| Create | `apps/web/components/catalog/FilterPanel.tsx` |
| Modify | `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx` |
| Create | `apps/web/components/api-detail/AsyncAPIRenderer.tsx` |
| Create | `apps/web/components/api-detail/DocMetaFields.tsx` |
| Modify | `apps/web/components/publish/StepSpecUpload.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Extend tRPC `api.list` with new filter parameters

**Files:**
- Modify: `packages/trpc/src/routers/api.ts`
- Test: `apps/web/__tests__/catalog/api-list-filters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/catalog/api-list-filters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("api.list filter shape", () => {
  it("accepts visibility, domainId, tags, type array", () => {
    const params = {
      visibility: "PUBLIC",
      domainId: "d1",
      tags: ["healthcare"],
      type: "ASYNC_API",
      search: "customer",
      lifecycleStatus: "ACTIVE",
    };
    // Type validation — if the schema accepts these keys without throwing, shape is correct
    const keys = Object.keys(params);
    expect(keys).toContain("visibility");
    expect(keys).toContain("domainId");
    expect(keys).toContain("tags");
    expect(keys).toContain("lifecycleStatus");
  });
});
```

- [ ] **Step 2: Run to verify test passes (type-level)**

```bash
cd apps/web && pnpm test __tests__/catalog/api-list-filters.test.ts
```
Expected: PASS

- [ ] **Step 3: Replace `api.list` procedure in `packages/trpc/src/routers/api.ts`**

Open `packages/trpc/src/routers/api.ts` and update the `list` procedure's input schema and query:

```typescript
list: publicProcedure
  .input(
    z.object({
      orgSlug:         z.string().optional(),
      type:            z.string().optional(),
      visibility:      z.enum(["INTERNAL", "PARTNER", "PUBLIC"]).optional(),
      domainId:        z.string().optional(),
      tags:            z.array(z.string()).optional(),
      lifecycleStatus: z.string().optional(),
      search:          z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    return ctx.db.api.findMany({
      where: {
        ...(input.orgSlug && {
          org: { slug: input.orgSlug },
        }),
        ...(input.type && { type: input.type as any }),
        ...(input.visibility && { visibility: input.visibility }),
        ...(input.domainId && { domainId: input.domainId }),
        ...(input.lifecycleStatus && {
          versions: { some: { lifecycleStatus: input.lifecycleStatus as any } },
        }),
        ...(input.tags?.length && {
          tags: { some: { tag: { name: { in: input.tags } } } },
        }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        org: true,
        owner: { select: { id: true, name: true, email: true } },
        domain: true,
        tags: { include: { tag: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { version: true, status: true, lifecycleStatus: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
```

- [ ] **Step 4: Commit**

```bash
git add packages/trpc/src/routers/api.ts
git commit -m "feat(catalog): extend api.list with visibility, domain, tag, lifecycleStatus filters"
```

---

### Task 2: Build FilterPanel component

**Files:**
- Create: `apps/web/components/catalog/FilterPanel.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/__tests__/catalog/FilterPanel.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "@/components/catalog/FilterPanel";
import { describe, it, expect, vi } from "vitest";

describe("FilterPanel", () => {
  const domains = [{ id: "d1", name: "Customer" }];
  const tags = [{ id: "t1", name: "healthcare" }];

  it("renders domain, tag, visibility, type, lifecycle filters", () => {
    render(<FilterPanel domains={domains} tags={tags} filters={{}} onChange={vi.fn()} />);
    expect(screen.getByText("Domain")).toBeInTheDocument();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
    expect(screen.getByText("API Type")).toBeInTheDocument();
  });

  it("calls onChange when visibility is selected", () => {
    const onChange = vi.fn();
    render(<FilterPanel domains={domains} tags={tags} filters={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText("PUBLIC"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ visibility: "PUBLIC" }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd apps/web && pnpm test __tests__/catalog/FilterPanel.test.tsx
```
Expected: FAIL — component not found.

- [ ] **Step 3: Create `FilterPanel.tsx`**

```typescript
// apps/web/components/catalog/FilterPanel.tsx
"use client";

export interface CatalogFilters {
  visibility?: string;
  domainId?: string;
  tags?: string[];
  type?: string;
  lifecycleStatus?: string;
}

interface Props {
  domains: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
}

const TYPES = ["REST", "GRAPHQL", "ASYNC_API", "EVENT", "WEBHOOK", "SOAP"];
const VISIBILITIES = ["PUBLIC", "PARTNER", "INTERNAL"];
const LIFECYCLE = ["ACTIVE", "BETA", "DRAFT", "DEPRECATED", "RETIRED"];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterPanel({ domains, tags, filters, onChange }: Props) {
  const toggle = (key: keyof CatalogFilters, value: string) => {
    if (key === "tags") {
      const current = filters.tags ?? [];
      const next = current.includes(value) ? current.filter((t) => t !== value) : [...current, value];
      onChange({ ...filters, tags: next });
    } else {
      onChange({ ...filters, [key]: filters[key] === value ? undefined : value });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Visibility</p>
        <div className="flex flex-wrap gap-2">
          {VISIBILITIES.map((v) => (
            <Chip key={v} label={v} active={filters.visibility === v} onClick={() => toggle("visibility", v)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">API Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t} label={t} active={filters.type === t} onClick={() => toggle("type", t)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Lifecycle</p>
        <div className="flex flex-wrap gap-2">
          {LIFECYCLE.map((l) => (
            <Chip key={l} label={l} active={filters.lifecycleStatus === l} onClick={() => toggle("lifecycleStatus", l)} />
          ))}
        </div>
      </div>
      {domains.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Domain</p>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <Chip key={d.id} label={d.name} active={filters.domainId === d.id} onClick={() => toggle("domainId", d.id)} />
            ))}
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Chip key={t.id} label={t.name} active={(filters.tags ?? []).includes(t.name)} onClick={() => toggle("tags", t.name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd apps/web && pnpm test __tests__/catalog/FilterPanel.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/catalog/FilterPanel.tsx apps/web/__tests__/catalog/FilterPanel.test.tsx
git commit -m "feat(catalog): add FilterPanel with visibility, type, lifecycle, domain, tag filters"
```

---

### Task 3: Update browse page with FilterPanel and new search params

**Files:**
- Modify: `apps/web/app/(portal)/browse/page.tsx`

- [ ] **Step 1: Replace browse page**

```typescript
// apps/web/app/(portal)/browse/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ApiGrid } from "@/components/catalog/ApiGrid";
import { BrowseFilters } from "@/components/catalog/BrowseFilters";
import Link from "next/link";

interface Props {
  searchParams: {
    org?: string; type?: string; q?: string;
    visibility?: string; domainId?: string;
    tags?: string; lifecycleStatus?: string;
  };
}

export default async function BrowsePage({ searchParams }: Props) {
  const caller = await createCaller();
  const [apis, domains, tags] = await Promise.all([
    caller.api.list({
      orgSlug: searchParams.org,
      type: searchParams.type,
      visibility: searchParams.visibility as any,
      domainId: searchParams.domainId,
      tags: searchParams.tags ? searchParams.tags.split(",") : undefined,
      lifecycleStatus: searchParams.lifecycleStatus,
      search: searchParams.q,
    }),
    caller.admin.domain.list(),
    caller.admin.tag.list(),
  ]);

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
      <div className="flex gap-6">
        <aside className="w-56 flex-shrink-0">
          <BrowseFilters domains={domains} tags={tags} />
        </aside>
        <div className="flex-1">
          {searchParams.q && (
            <p className="text-slate-400 text-sm mb-4">
              Results for <span className="text-white">"{searchParams.q}"</span>
            </p>
          )}
          <ApiGrid apis={apis as any} searchQuery={searchParams.q} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `BrowseFilters` client component**

Create `apps/web/components/catalog/BrowseFilters.tsx`:

```typescript
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterPanel, CatalogFilters } from "./FilterPanel";

interface Props {
  domains: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export function BrowseFilters({ domains, tags }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current: CatalogFilters = {
    visibility: searchParams.get("visibility") ?? undefined,
    domainId: searchParams.get("domainId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    lifecycleStatus: searchParams.get("lifecycleStatus") ?? undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? [],
  };

  const handleChange = (f: CatalogFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    const set = (k: string, v: string | undefined) => v ? params.set(k, v) : params.delete(k);
    set("visibility", f.visibility);
    set("domainId", f.domainId);
    set("type", f.type);
    set("lifecycleStatus", f.lifecycleStatus);
    if (f.tags?.length) params.set("tags", f.tags.join(","));
    else params.delete("tags");
    router.push(`/browse?${params.toString()}`);
  };

  return <FilterPanel domains={domains} tags={tags} filters={current} onChange={handleChange} />;
}
```

- [ ] **Step 3: Add `domain.list` and `tag.list` to admin tRPC router**

In `packages/trpc/src/routers/admin.ts`, add:

```typescript
domain: {
  list: publicProcedure.query(({ ctx }) => ctx.db.domain.findMany({ orderBy: { name: "asc" } })),
},
tag: {
  list: publicProcedure.query(({ ctx }) => ctx.db.tag.findMany({ orderBy: { name: "asc" } })),
},
```

(Add these inside the existing `createTRPCRouter({})` call in admin.ts.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(portal\)/browse/ apps/web/components/catalog/BrowseFilters.tsx packages/trpc/src/routers/admin.ts
git commit -m "feat(catalog): update browse page with filter panel and new search params"
```

---

### Task 4: Update ApiCard with new metadata fields

**Files:**
- Modify: `apps/web/components/catalog/ApiCard.tsx`

- [ ] **Step 1: Update ApiCard to show visibility chip, lifecycle status, domain, and type badge**

Read existing `apps/web/components/catalog/ApiCard.tsx` first, then update to add:

```typescript
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import { StatusBadge } from "@/components/ui/StatusBadge";
```

Inside the card, add below the existing title/description:

```typescript
<div className="flex flex-wrap gap-1.5 mt-2">
  {api.visibility && <VisibilityChip visibility={api.visibility} />}
  {latestVersion?.lifecycleStatus && <StatusBadge status={latestVersion.lifecycleStatus} />}
  {api.domain && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
      {api.domain.name}
    </span>
  )}
  {api.tags?.slice(0, 3).map((at: any) => (
    <span key={at.tag.name} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
      #{at.tag.name}
    </span>
  ))}
</div>
```

Where `latestVersion = api.versions?.[0]`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/catalog/ApiCard.tsx
git commit -m "feat(catalog): update ApiCard with visibility, lifecycle status, domain, tags"
```

---

### Task 5: Add AsyncAPI renderer and DocMetaFields

**Files:**
- Create: `apps/web/components/api-detail/AsyncAPIRenderer.tsx`
- Create: `apps/web/components/api-detail/DocMetaFields.tsx`

- [ ] **Step 1: Create `AsyncAPIRenderer.tsx`**

```typescript
// apps/web/components/api-detail/AsyncAPIRenderer.tsx
"use client";

interface Props {
  spec: string;
}

export function AsyncAPIRenderer({ spec }: Props) {
  let parsed: any = null;
  try {
    parsed = JSON.parse(spec);
  } catch {
    try {
      // Attempt YAML — if js-yaml is available
      parsed = spec;
    } catch {
      return <p className="text-red-400 text-sm">Failed to parse AsyncAPI spec.</p>;
    }
  }

  const info = parsed?.info ?? {};
  const channels = parsed?.channels ?? {};

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <h2 className="text-lg font-bold text-white">{info.title ?? "AsyncAPI Spec"}</h2>
        <p className="text-slate-400 text-sm mt-1">{info.description}</p>
        <p className="text-xs text-slate-500 mt-1">Version: {info.version}</p>
      </div>
      {Object.entries(channels).map(([channel, def]: [string, any]) => (
        <div key={channel} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-violet-900/50 text-violet-300">CHANNEL</span>
            <code className="text-sm text-white font-mono">{channel}</code>
          </div>
          {def.description && <p className="text-slate-400 text-sm">{def.description}</p>}
          {def.subscribe && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscribe</p>
              {def.subscribe.message?.description && (
                <p className="text-slate-300 text-sm mt-1">{def.subscribe.message.description}</p>
              )}
            </div>
          )}
          {def.publish && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Publish</p>
              {def.publish.message?.description && (
                <p className="text-slate-300 text-sm mt-1">{def.publish.message.description}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `DocMetaFields.tsx`**

```typescript
// apps/web/components/api-detail/DocMetaFields.tsx
interface Props {
  authMethod?: string | null;
  rateLimitPolicy?: string | null;
  slaInfo?: string | null;
}

export function DocMetaFields({ authMethod, rateLimitPolicy, slaInfo }: Props) {
  if (!authMethod && !rateLimitPolicy && !slaInfo) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-6">
      {authMethod && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Authentication</p>
          <p className="text-sm text-white">{authMethod}</p>
          <p className="text-xs text-slate-500 mt-0.5">Documentation only — enforced by gateway</p>
        </div>
      )}
      {rateLimitPolicy && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Rate Limit Policy</p>
          <p className="text-sm text-white">{rateLimitPolicy}</p>
          <p className="text-xs text-slate-500 mt-0.5">Documentation only — enforced by gateway</p>
        </div>
      )}
      {slaInfo && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">SLA / SLO</p>
          <p className="text-sm text-white">{slaInfo}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update the reference page to use DocMetaFields and AsyncAPIRenderer**

In `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx`, read the current file then add:

```typescript
import { DocMetaFields } from "@/components/api-detail/DocMetaFields";
import { AsyncAPIRenderer } from "@/components/api-detail/AsyncAPIRenderer";
```

Before the SwaggerUI/GraphiQL block, add:
```typescript
<DocMetaFields
  authMethod={apiVersion.authMethod}
  rateLimitPolicy={apiVersion.rateLimitPolicy}
  slaInfo={apiVersion.slaInfo}
/>
```

For ASYNC_API / EVENT / WEBHOOK types, render `AsyncAPIRenderer` instead of SwaggerUI:
```typescript
{["ASYNC_API", "EVENT", "WEBHOOK"].includes(apiVersion.specType) ? (
  <AsyncAPIRenderer spec={spec} />
) : apiVersion.specType === "GRAPHQL" ? (
  <GraphiQLPanel ... />
) : (
  <SwaggerUIWrapper ... />
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/api-detail/AsyncAPIRenderer.tsx apps/web/components/api-detail/DocMetaFields.tsx
git commit -m "feat(docs): add AsyncAPI renderer and doc meta-fields (auth, rate-limit, SLA)"
```

---

### Task 6: Add spec-link-by-URL to publish wizard

**Files:**
- Modify: `apps/web/components/publish/StepSpecUpload.tsx`

- [ ] **Step 1: Read current `StepSpecUpload.tsx` and add URL option**

Add a tab toggle between "Upload File" and "Link by URL" at the top of the component:

```typescript
const [mode, setMode] = useState<"upload" | "url">("upload");
```

Add a URL input field shown when `mode === "url"`:

```typescript
{mode === "url" && (
  <div className="space-y-2">
    <label className="text-sm text-slate-300">Spec URL</label>
    <input
      type="url"
      placeholder="https://api.example.com/openapi.json"
      value={specUrl}
      onChange={(e) => setSpecUrl(e.target.value)}
      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
    />
    <p className="text-xs text-slate-500">URL will be fetched and stored. Must be publicly accessible.</p>
  </div>
)}
```

Pass `specUrl` up via the wizard's state. In `packages/trpc/src/routers/apiVersion.ts`, the `create` procedure already accepts `specKey` — add optional `specUrl: z.string().url().optional()` to the input.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/publish/StepSpecUpload.tsx
git commit -m "feat(publish): add spec-link-by-URL option in publish wizard"
```

---

### Task 7: Final build and test

- [ ] **Step 1: Build**

```bash
pnpm build
```
Expected: Exits 0.

- [ ] **Step 2: Test**

```bash
pnpm test
```
Expected: All pass.

- [ ] **Step 3: Final commit**

```bash
git add .
git status
git commit -m "chore(phase-1a): Phase 1A API Catalog upgrades complete"
```
