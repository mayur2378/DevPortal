# Phase 1C: Admin Console Upgrades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the admin console with API management CRUD, tag and domain management, spec import, and an access request review queue.

**Architecture:** Extends the existing `adminRouter` with new sub-routers for API management, domains, and tags. Adds four new admin pages. The import spec page reuses the existing upload spec API route.

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS, Zod

**Base branch:** post Phase 0 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Modify | `packages/trpc/src/routers/admin.ts` |
| Create | `apps/web/app/(portal)/admin/apis/page.tsx` |
| Create | `apps/web/app/(portal)/admin/apis/[id]/page.tsx` |
| Create | `apps/web/app/(portal)/admin/tags/page.tsx` |
| Create | `apps/web/app/(portal)/admin/import-spec/page.tsx` |
| Create | `apps/web/app/(portal)/admin/approvals/page.tsx` |
| Create | `apps/web/components/admin/ApiManagementTable.tsx` |
| Create | `apps/web/components/admin/TagDomainManager.tsx` |
| Create | `apps/web/components/admin/ImportSpecForm.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Add API management procedures to adminRouter

**Files:**
- Modify: `packages/trpc/src/routers/admin.ts`

- [ ] **Step 1: Add API CRUD, domain, and tag procedures to `admin.ts`**

Read the current `packages/trpc/src/routers/admin.ts` and add the following sub-routers inside the existing `createTRPCRouter({})` call:

```typescript
// API management (CRUD for admins)
apiManagement: {
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.api.findMany({
      include: { org: true, owner: { select: { id: true, name: true } }, domain: true, tags: { include: { tag: true } }, versions: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    })
  ),
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.api.findUniqueOrThrow({
        where: { id: input.id },
        include: { org: true, owner: { select: { id: true, name: true, email: true } }, domain: true, tags: { include: { tag: true } }, versions: { orderBy: { createdAt: "desc" } } },
      })
    ),
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      visibility: z.enum(["INTERNAL", "PARTNER", "PUBLIC"]).optional(),
      domainId: z.string().optional(),
      businessCapability: z.string().optional(),
      systemOfRecord: z.string().optional(),
      supportContact: z.string().optional(),
      piiIndicator: z.boolean().optional(),
      phiIndicator: z.boolean().optional(),
      dataClassification: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).optional(),
      gatewayRef: z.string().optional(),
      runtimeEndpoint: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.api.update({ where: { id }, data });
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.api.delete({ where: { id: input.id } })),
},

// Domain management
domain: {
  list: publicProcedure.query(({ ctx }) => ctx.db.domain.findMany({ orderBy: { name: "asc" } })),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(({ ctx, input }) => ctx.db.domain.create({ data: input })),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.domain.delete({ where: { id: input.id } })),
},

// Tag management
tag: {
  list: publicProcedure.query(({ ctx }) => ctx.db.tag.findMany({ orderBy: { name: "asc" } })),
  create: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) => ctx.db.tag.create({ data: input })),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.db.tag.delete({ where: { id: input.id } })),
},

// Subscription request review (admin-level view of all requests)
subscriptionRequests: {
  listAll: adminProcedure.query(({ ctx }) =>
    ctx.db.subscriptionRequest.findMany({
      include: {
        api: { include: { org: true } },
        application: { include: { owner: { select: { id: true, name: true, email: true } } } },
        requester: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  ),
},
```

- [ ] **Step 2: Commit**

```bash
git add packages/trpc/src/routers/admin.ts
git commit -m "feat(admin): add API management, domain, tag, and subscription request procedures"
```

---

### Task 2: Build API Management Table page

**Files:**
- Create: `apps/web/app/(portal)/admin/apis/page.tsx`
- Create: `apps/web/components/admin/ApiManagementTable.tsx`

- [ ] **Step 1: Create `ApiManagementTable.tsx`**

```typescript
// apps/web/components/admin/ApiManagementTable.tsx
"use client";
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";

interface Api {
  id: string; name: string; type: string;
  visibility: string; domain?: { name: string } | null;
  org: { name: string };
  versions: { lifecycleStatus: string }[];
}

interface Props { apis: Api[] }

export function ApiManagementTable({ apis }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/50">
      <table className="w-full text-sm">
        <thead className="bg-slate-800/80">
          <tr>
            {["Name", "Org", "Type", "Visibility", "Domain", "Status", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {apis.map((api) => (
            <tr key={api.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{api.name}</td>
              <td className="px-4 py-3 text-slate-400">{api.org.name}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-300">{api.type}</span>
              </td>
              <td className="px-4 py-3"><VisibilityChip visibility={api.visibility} /></td>
              <td className="px-4 py-3 text-slate-400">{api.domain?.name ?? "—"}</td>
              <td className="px-4 py-3">
                {api.versions[0] && <StatusBadge status={api.versions[0].lifecycleStatus} />}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/apis/${api.id}`} className="text-sky-400 hover:text-sky-300 text-xs">
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/(portal)/admin/apis/page.tsx`**

```typescript
import { createCaller } from "@/lib/trpc/server";
import { ApiManagementTable } from "@/components/admin/ApiManagementTable";
import Link from "next/link";

export default async function AdminApisPage() {
  const caller = await createCaller();
  const apis = await caller.admin.apiManagement.list();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">API Management</h1>
        <Link href="/admin/import-spec" className="bg-sky-500 hover:bg-sky-400 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          Import Spec
        </Link>
      </div>
      <ApiManagementTable apis={apis as any} />
    </div>
  );
}
```

- [ ] **Step 3: Create API detail edit page `apps/web/app/(portal)/admin/apis/[id]/page.tsx`**

```typescript
import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { AdminApiEditForm } from "@/components/admin/AdminApiEditForm";

export default async function AdminApiDetailPage({ params }: { params: { id: string } }) {
  const caller = await createCaller();
  const api = await caller.admin.apiManagement.getById({ id: params.id }).catch(() => null);
  if (!api) return notFound();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Edit API: {api.name}</h1>
      <AdminApiEditForm api={api as any} />
    </div>
  );
}
```

Create `apps/web/components/admin/AdminApiEditForm.tsx`:

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function AdminApiEditForm({ api }: { api: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    visibility: api.visibility, businessCapability: api.businessCapability ?? "",
    systemOfRecord: api.systemOfRecord ?? "", supportContact: api.supportContact ?? "",
    piiIndicator: api.piiIndicator, phiIndicator: api.phiIndicator,
    gatewayRef: api.gatewayRef ?? "", runtimeEndpoint: api.runtimeEndpoint ?? "",
  });
  const update = trpc.admin.apiManagement.update.useMutation({ onSuccess: () => router.push("/admin/apis") });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate({ id: api.id, ...form }); }} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Visibility</label>
        <select value={form.visibility} onChange={(e) => set("visibility", e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
          {["INTERNAL", "PARTNER", "PUBLIC"].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {(["businessCapability", "systemOfRecord", "supportContact", "gatewayRef", "runtimeEndpoint"] as const).map((field) => (
        <div key={field}>
          <label className="text-sm font-medium text-slate-300 block mb-1">{field.replace(/([A-Z])/g, " $1").trim()}</label>
          <input value={form[field]} onChange={(e) => set(field, e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      ))}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.piiIndicator} onChange={(e) => set("piiIndicator", e.target.checked)} className="rounded" />
          Contains PII
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.phiIndicator} onChange={(e) => set("phiIndicator", e.target.checked)} className="rounded" />
          Contains PHI
        </label>
      </div>
      <button type="submit" disabled={update.isPending}
        className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm">
        {update.isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(portal\)/admin/apis/ apps/web/components/admin/
git commit -m "feat(admin): add API management table and edit form"
```

---

### Task 3: Build Tag and Domain Manager

**Files:**
- Create: `apps/web/app/(portal)/admin/tags/page.tsx`
- Create: `apps/web/components/admin/TagDomainManager.tsx`

- [ ] **Step 1: Create `TagDomainManager.tsx`**

```typescript
// apps/web/components/admin/TagDomainManager.tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Item { id: string; name: string; description?: string | null }
interface Props { type: "tag" | "domain"; items: Item[] }

export function TagDomainManager({ type, items }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createTag = trpc.admin.tag.create.useMutation({ onSuccess: () => { setName(""); router.refresh(); } });
  const deleteTag = trpc.admin.tag.delete.useMutation({ onSuccess: () => router.refresh() });
  const createDomain = trpc.admin.domain.create.useMutation({ onSuccess: () => { setName(""); router.refresh(); } });
  const deleteDomain = trpc.admin.domain.delete.useMutation({ onSuccess: () => router.refresh() });
  const create = type === "tag" ? createTag : createDomain;
  const destroy = type === "tag" ? deleteTag : deleteDomain;
  const label = type === "tag" ? "Tag" : "Domain";

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate({ name, ...(type === "domain" && { description }) } as any); }}
        className="flex gap-2"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${label}`} required
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        {type === "domain" && (
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        )}
        <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          Add {label}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 rounded-lg">
            <span className="text-slate-200 text-sm">{item.name}</span>
            <button type="button" onClick={() => destroy.mutate({ id: item.id } as any)}
              className="text-slate-500 hover:text-red-400 text-xs ml-1">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create tags page**

```typescript
// apps/web/app/(portal)/admin/tags/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { TagDomainManager } from "@/components/admin/TagDomainManager";

export default async function AdminTagsPage() {
  const caller = await createCaller();
  const [tags, domains] = await Promise.all([
    caller.admin.tag.list(),
    caller.admin.domain.list(),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Tags & Domains</h1>
        <p className="text-slate-400 text-sm">Manage taxonomy tags and business domains for the API catalog.</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Domains</h2>
        <TagDomainManager type="domain" items={domains} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Tags</h2>
        <TagDomainManager type="tag" items={tags} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(portal\)/admin/tags/ apps/web/components/admin/TagDomainManager.tsx
git commit -m "feat(admin): add tag and domain management page"
```

---

### Task 4: Build Import Spec page

**Files:**
- Create: `apps/web/app/(portal)/admin/import-spec/page.tsx`
- Create: `apps/web/components/admin/ImportSpecForm.tsx`

- [ ] **Step 1: Create `ImportSpecForm.tsx`**

```typescript
// apps/web/components/admin/ImportSpecForm.tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

export function ImportSpecForm() {
  const router = useRouter();
  const orgs = trpc.org.listPublic.useQuery();
  const [orgId, setOrgId] = useState("");
  const [apiName, setApiName] = useState("");
  const [apiSlug, setApiSlug] = useState("");
  const [specType, setSpecType] = useState("REST");
  const [version, setVersion] = useState("1.0.0");
  const [specUrl, setSpecUrl] = useState("");
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"url" | "file">("url");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const createApi = trpc.api.create.useMutation();
  const createVersion = trpc.apiVersion.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setStatus("Creating API...");
    try {
      const api = await createApi.mutateAsync({ orgId, name: apiName, slug: apiSlug, type: specType as any });
      setStatus("Creating version...");
      let specKey = "";
      if (mode === "file" && specFile) {
        const form = new FormData();
        form.append("file", specFile);
        const res = await fetch("/api/upload-spec", { method: "POST", body: form });
        const data = await res.json();
        specKey = data.key;
      }
      await createVersion.mutateAsync({ apiId: api.id, version, specType: specType as any, specKey, specUrl: mode === "url" ? specUrl : undefined });
      setStatus("Done! Redirecting...");
      router.push(`/admin/apis`);
    } catch (e: any) {
      setError(e.message);
      setStatus("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Organization</label>
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} required
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
          <option value="">Select organization…</option>
          {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1">API Name</label>
          <input value={apiName} onChange={(e) => setApiName(e.target.value)} required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1">Slug</label>
          <input value={apiSlug} onChange={(e) => setApiSlug(e.target.value)} required placeholder="my-api"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1">Spec Type</label>
          <select value={specType} onChange={(e) => setSpecType(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm">
            {["REST", "GRAPHQL", "ASYNC_API", "EVENT", "WEBHOOK", "SOAP"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1">Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} required
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        </div>
      </div>
      <div>
        <div className="flex gap-2 mb-2">
          {(["url", "file"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1 rounded text-xs font-semibold ${mode === m ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400"}`}>
              {m === "url" ? "Link by URL" : "Upload File"}
            </button>
          ))}
        </div>
        {mode === "url" ? (
          <input type="url" value={specUrl} onChange={(e) => setSpecUrl(e.target.value)} placeholder="https://..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm" />
        ) : (
          <input type="file" accept=".json,.yaml,.yml" onChange={(e) => setSpecFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-slate-300" />
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {status && <p className="text-sky-400 text-sm">{status}</p>}
      <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-6 py-2 rounded-lg text-sm">
        Import API
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create import page**

```typescript
// apps/web/app/(portal)/admin/import-spec/page.tsx
import { ImportSpecForm } from "@/components/admin/ImportSpecForm";

export default function ImportSpecPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Import API Specification</h1>
      <p className="text-slate-400 text-sm mb-6">Create a new API entry by importing an OpenAPI, AsyncAPI, or other spec.</p>
      <ImportSpecForm />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(portal\)/admin/import-spec/ apps/web/components/admin/ImportSpecForm.tsx
git commit -m "feat(admin): add import API spec page"
```

---

### Task 5: Build Admin Approval Queue page

**Files:**
- Create: `apps/web/app/(portal)/admin/approvals/page.tsx`

- [ ] **Step 1: Create admin approvals page**

```typescript
// apps/web/app/(portal)/admin/approvals/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function AdminApprovalsPage() {
  const caller = await createCaller();
  const requests = await caller.admin.subscriptionRequests.listAll();

  const pending = requests.filter((r) => r.status === "PENDING");
  const others = requests.filter((r) => r.status !== "PENDING");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Subscription Requests</h1>
      <p className="text-slate-400 text-sm mb-6">{pending.length} pending · {requests.length} total</p>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80">
            <tr>
              {["API", "Application", "Requester", "Environment", "Status", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/20">
                <td className="px-4 py-3 text-white">{r.api.name}</td>
                <td className="px-4 py-3 text-slate-300">{r.application.owner.name}</td>
                <td className="px-4 py-3 text-slate-400">{r.requester.email}</td>
                <td className="px-4 py-3 text-slate-400 uppercase text-xs">{r.environment}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add admin nav links to Sidebar**

Read `apps/web/components/layout/Sidebar.tsx` and add admin links:
```typescript
{ href: "/admin/apis",        label: "API Management",  icon: "Database" },
{ href: "/admin/tags",        label: "Tags & Domains",  icon: "Tag" },
{ href: "/admin/import-spec", label: "Import Spec",     icon: "Upload" },
{ href: "/admin/approvals",   label: "All Approvals",   icon: "ClipboardList" },
```
These should only be shown when `isAdmin(session)` is true (import from `@/lib/rbac`).

- [ ] **Step 3: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-1c): Phase 1C Admin Console upgrades complete"
```
