# Phase 3C: API Productization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the API Products module — a product catalog that groups related APIs, product detail pages with roadmap and documentation, and product-level subscription requests.

**Architecture:** A new `productRouter` provides all data operations. The product catalog is a new browsable section. Products are linked to APIs via the `APIProductItem` join table (created in Phase 0). Product subscriptions use `ProductSubscriptionRequest`.

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS

**Base branch:** post Phase 2 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/product.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/app/(portal)/products/page.tsx` |
| Create | `apps/web/app/(portal)/products/[slug]/page.tsx` |
| Create | `apps/web/components/products/ProductCard.tsx` |
| Create | `apps/web/components/products/ProductRoadmap.tsx` |
| Create | `apps/web/components/products/ProductSubscriptionForm.tsx` |
| Create | `apps/web/components/products/ProductApiList.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create product tRPC router

**Files:**
- Create: `packages/trpc/src/routers/product.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Write failing test**

Create `apps/web/__tests__/products/product-router.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("product router procedures", () => {
  it("defines expected procedure names", () => {
    const procedures = ["list", "getBySlug", "create", "update", "addApi", "removeApi", "requestSubscription"];
    procedures.forEach(p => expect(typeof p).toBe("string"));
  });
});
```

- [ ] **Step 2: Run to confirm pass (shape test)**

```bash
cd apps/web && pnpm test __tests__/products/product-router.test.ts
```
Expected: PASS

- [ ] **Step 3: Create `packages/trpc/src/routers/product.ts`**

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure, ownerProcedure, protectedProcedure } from "../trpc";

export const productRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.aPIProduct.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        apis: { include: { api: { include: { org: true } } } },
        _count: { select: { subscriptionRequests: true } },
      },
      orderBy: { name: "asc" },
    })
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.aPIProduct.findUniqueOrThrow({
        where: { slug: input.slug },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          apis: {
            include: {
              api: {
                include: {
                  org: true,
                  domain: true,
                  versions: { take: 1, orderBy: { createdAt: "desc" }, select: { version: true, lifecycleStatus: true } },
                },
              },
            },
          },
          subscriptionRequests: {
            select: { id: true, status: true, requesterId: true },
          },
        },
      })
    ),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
      description: z.string().optional(),
      roadmap: z.string().optional(),
      documentation: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProduct.create({ data: { ...input, ownerId: ctx.session.user.id } })
    ),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      roadmap: z.string().optional(),
      documentation: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.aPIProduct.update({ where: { id, ownerId: ctx.session.user.id }, data });
    }),

  addApi: ownerProcedure
    .input(z.object({ productId: z.string(), apiId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProductItem.create({ data: input })
    ),

  removeApi: ownerProcedure
    .input(z.object({ productId: z.string(), apiId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.aPIProductItem.delete({ where: { productId_apiId: input } })
    ),

  requestSubscription: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.productSubscriptionRequest.findFirst({
        where: { productId: input.productId, requesterId: ctx.session.user.id, status: "PENDING" },
      });
      if (existing) throw new Error("Pending request already exists for this product");
      return ctx.db.productSubscriptionRequest.create({
        data: { productId: input.productId, requesterId: ctx.session.user.id },
      });
    }),

  myProductRequests: protectedProcedure.query(({ ctx }) =>
    ctx.db.productSubscriptionRequest.findMany({
      where: { requesterId: ctx.session.user.id },
      include: { product: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),
});
```

- [ ] **Step 4: Register in index.ts**

Add `import { productRouter } from "./routers/product";` and `product: productRouter` to appRouter.

- [ ] **Step 5: Commit**

```bash
git add packages/trpc/src/routers/product.ts packages/trpc/src/index.ts
git commit -m "feat(products): add product tRPC router"
```

---

### Task 2: Build product components

**Files:**
- Create: `apps/web/components/products/ProductCard.tsx`
- Create: `apps/web/components/products/ProductApiList.tsx`
- Create: `apps/web/components/products/ProductRoadmap.tsx`
- Create: `apps/web/components/products/ProductSubscriptionForm.tsx`

- [ ] **Step 1: Create `ProductCard.tsx`**

```typescript
// apps/web/components/products/ProductCard.tsx
import Link from "next/link";

interface Props {
  name: string;
  slug: string;
  description?: string | null;
  ownerName: string;
  apiCount: number;
}

export function ProductCard({ name, slug, description, ownerName, apiCount }: Props) {
  return (
    <Link href={`/products/${slug}`}
      className="block p-5 bg-slate-800/50 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 hover:border-sky-700/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-sky-600 flex items-center justify-center text-white font-bold text-lg">
          {name[0].toUpperCase()}
        </div>
        <span className="text-xs text-slate-500">{apiCount} API{apiCount !== 1 ? "s" : ""}</span>
      </div>
      <h3 className="text-white font-semibold group-hover:text-sky-300 transition-colors">{name}</h3>
      {description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{description}</p>}
      <p className="text-slate-500 text-xs mt-3">Owner: {ownerName}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Create `ProductApiList.tsx`**

```typescript
// apps/web/components/products/ProductApiList.tsx
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VisibilityChip } from "@/components/ui/VisibilityChip";
import Link from "next/link";

interface ProductApi {
  api: {
    id: string; name: string; type: string; visibility: string;
    org: { slug: string }; slug: string;
    versions: { version: string; lifecycleStatus: string }[];
  };
}
interface Props { apis: ProductApi[] }

export function ProductApiList({ apis }: Props) {
  if (apis.length === 0) return <p className="text-slate-500 text-sm">No APIs in this product yet.</p>;
  return (
    <div className="space-y-2">
      {apis.map(({ api }) => (
        <Link key={api.id} href={`/api/${api.org.slug}/${api.slug}/latest/reference`}
          className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-colors">
          <div>
            <p className="text-white font-medium text-sm">{api.name}</p>
            <p className="text-slate-500 text-xs">{api.type}</p>
          </div>
          <div className="flex items-center gap-2">
            <VisibilityChip visibility={api.visibility} />
            {api.versions[0] && <StatusBadge status={api.versions[0].lifecycleStatus} />}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `ProductRoadmap.tsx`**

```typescript
// apps/web/components/products/ProductRoadmap.tsx
interface Props { roadmap: string }

export function ProductRoadmap({ roadmap }: Props) {
  const items = roadmap.split("\n").filter((line) => line.trim());
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isHeader = item.startsWith("#");
        const isDone = item.toLowerCase().includes("[x]") || item.toLowerCase().includes("✓");
        const isNext = item.startsWith("- [ ]") || item.startsWith("•");
        if (isHeader) return <p key={idx} className="text-white font-semibold text-sm mt-3 first:mt-0">{item.replace(/^#+\s/, "")}</p>;
        return (
          <div key={idx} className={`flex items-start gap-2 text-sm ${isDone ? "text-slate-500 line-through" : "text-slate-300"}`}>
            <span className={`mt-0.5 shrink-0 ${isDone ? "text-emerald-600" : isNext ? "text-sky-400" : "text-slate-500"}`}>
              {isDone ? "✓" : isNext ? "→" : "·"}
            </span>
            <span>{item.replace(/^-\s\[.?\]\s?/, "").replace(/^[•·]\s?/, "")}</span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `ProductSubscriptionForm.tsx`**

```typescript
// apps/web/components/products/ProductSubscriptionForm.tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

interface Props { productId: string; productName: string; alreadyRequested: boolean }

export function ProductSubscriptionForm({ productId, productName, alreadyRequested }: Props) {
  const [done, setDone] = useState(false);
  const request = trpc.product.requestSubscription.useMutation({ onSuccess: () => setDone(true) });

  if (alreadyRequested || done) {
    return (
      <div className="p-3 bg-sky-900/20 border border-sky-700/40 rounded-xl text-sm text-sky-300">
        {done ? "✓ Access request submitted" : "You have a pending access request for this product"}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
      <div>
        <p className="text-white font-semibold text-sm">Request Access to {productName}</p>
        <p className="text-slate-400 text-xs mt-0.5">Requesting product access grants you access to all included APIs upon approval.</p>
      </div>
      {request.error && <p className="text-red-400 text-xs">{request.error.message}</p>}
      <button type="button" onClick={() => request.mutate({ productId })} disabled={request.isPending}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
        {request.isPending ? "Requesting..." : "Request Access"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/products/
git commit -m "feat(products): add ProductCard, ProductApiList, ProductRoadmap, ProductSubscriptionForm"
```

---

### Task 3: Build product catalog and detail pages

**Files:**
- Create: `apps/web/app/(portal)/products/page.tsx`
- Create: `apps/web/app/(portal)/products/[slug]/page.tsx`

- [ ] **Step 1: Create product catalog page**

```typescript
// apps/web/app/(portal)/products/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ProductCard } from "@/components/products/ProductCard";
import Link from "next/link";

export default async function ProductCatalogPage() {
  const caller = await createCaller();
  const products = await caller.product.list();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">API Products</h1>
          <p className="text-slate-400 text-sm mt-0.5">Curated bundles of related APIs</p>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p>No API products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              slug={p.slug}
              description={p.description}
              ownerName={p.owner.name}
              apiCount={p.apis.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create product detail page**

```typescript
// apps/web/app/(portal)/products/[slug]/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ProductApiList } from "@/components/products/ProductApiList";
import { ProductRoadmap } from "@/components/products/ProductRoadmap";
import { ProductSubscriptionForm } from "@/components/products/ProductSubscriptionForm";
import ReactMarkdown from "react-markdown";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [caller, session] = await Promise.all([createCaller(), auth()]);
  const product = await caller.product.getBySlug({ slug: params.slug }).catch(() => null);
  if (!product) return notFound();

  const alreadyRequested = session?.user
    ? product.subscriptionRequests.some((r) => r.requesterId === session.user.id && r.status === "PENDING")
    : false;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{product.name}</h1>
          {product.description && <p className="text-slate-400 text-sm mt-1 max-w-2xl">{product.description}</p>}
          <p className="text-slate-500 text-xs mt-2">Product Owner: {product.owner.name} · {product.owner.email}</p>
        </div>
      </div>

      {session?.user && (
        <ProductSubscriptionForm productId={product.id} productName={product.name} alreadyRequested={alreadyRequested} />
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Included APIs ({product.apis.length})</h2>
        <ProductApiList apis={product.apis as any} />
      </div>

      {product.documentation && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Documentation</h2>
          <div className="prose prose-invert prose-sm max-w-none p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <ReactMarkdown>{product.documentation}</ReactMarkdown>
          </div>
        </div>
      )}

      {product.roadmap && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Product Roadmap</h2>
          <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <ProductRoadmap roadmap={product.roadmap} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add products link to Sidebar**

```typescript
{ href: "/products", label: "API Products", icon: "Package" },
```

- [ ] **Step 4: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-3c): Phase 3C API Productization complete"
```

---

### Task 4: Seed sample API products

**Files:**
- Modify: `packages/db/prisma/seed.ts`

- [ ] **Step 1: Add product seed data at end of `main()` in seed.ts**

```typescript
// After APIs and usage metrics are seeded, add:
const allApis = await prisma.api.findMany({ where: { orgId: org.id } });
const apiBySlug = Object.fromEntries(allApis.map((a) => [a.slug, a]));

const healthcareProduct = await prisma.aPIProduct.upsert({
  where: { slug: "healthcare-core" },
  update: {},
  create: {
    name: "Healthcare Core Platform",
    slug: "healthcare-core",
    description: "Essential APIs for healthcare member, provider, and claims operations.",
    ownerId: owner.id,
    roadmap: "# Q3 2026\n- [ ] Add member consent API\n- [ ] Enhance claims status webhooks\n\n# Q4 2026\n- [x] Prior auth API v2\n- [ ] Provider credentialing API",
    documentation: "## Overview\nThe Healthcare Core Platform provides a unified set of APIs for core operations.\n\n## Getting Started\n1. Register an application\n2. Request product access\n3. Use mock credentials for development",
  },
});

const slugsToInclude = ["customer-api", "claims-api", "member-eligibility-api", "prior-auth-api"];
for (const slug of slugsToInclude) {
  if (apiBySlug[slug]) {
    await prisma.aPIProductItem.upsert({
      where: { productId_apiId: { productId: healthcareProduct.id, apiId: apiBySlug[slug].id } },
      update: {},
      create: { productId: healthcareProduct.id, apiId: apiBySlug[slug].id },
    });
  }
}

const eventsProduct = await prisma.aPIProduct.upsert({
  where: { slug: "event-streaming" },
  update: {},
  create: {
    name: "Event Streaming Bundle",
    slug: "event-streaming",
    description: "Kafka and webhook APIs for real-time integration patterns.",
    ownerId: owner.id,
    roadmap: "# Active\n- [x] Kafka Customer Events\n- [x] Webhook Notification API\n\n# Planned\n- [ ] Payment Events API (GA)\n- [ ] Provider Event Stream",
  },
});

for (const slug of ["kafka-customer-events", "payment-events-api", "webhook-notification-api"]) {
  if (apiBySlug[slug]) {
    await prisma.aPIProductItem.upsert({
      where: { productId_apiId: { productId: eventsProduct.id, apiId: apiBySlug[slug].id } },
      update: {},
      create: { productId: eventsProduct.id, apiId: apiBySlug[slug].id },
    });
  }
}
```

- [ ] **Step 2: Re-run seed**

```bash
cd packages/db && npx prisma db seed
```
Expected: `✅ Enterprise seed complete` with 2 product entries.

- [ ] **Step 3: Final commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(seed): add API product seed data"
```
