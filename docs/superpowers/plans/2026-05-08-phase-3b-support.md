# Phase 3B: Support & Collaboration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the support and collaboration features — per-API comment threads, support ticket submission, FAQ sections, portal-wide announcement banner, and known issues section on API detail pages.

**Architecture:** A new `supportRouter` handles tickets, comments, and announcements. The `AnnouncementBanner` renders at the portal layout level (fetched server-side). Comments are threaded per API. FAQ sections are stored as static initial data in the API's doc pages (extensible later).

**Tech Stack:** Next.js 14, tRPC, Prisma, Tailwind CSS

**Base branch:** post Phase 2 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `packages/trpc/src/routers/support.ts` |
| Modify | `packages/trpc/src/index.ts` |
| Create | `apps/web/app/(portal)/support/page.tsx` |
| Create | `apps/web/components/support/AnnouncementBanner.tsx` |
| Create | `apps/web/components/support/CommentThread.tsx` |
| Create | `apps/web/components/support/SupportTicketForm.tsx` |
| Create | `apps/web/components/support/FaqSection.tsx` |
| Modify | `apps/web/app/(portal)/layout.tsx` |
| Modify | `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx` |
| Modify | `apps/web/components/layout/Sidebar.tsx` |

---

### Task 1: Create support tRPC router

**Files:**
- Create: `packages/trpc/src/routers/support.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Create `support.ts`**

```typescript
// packages/trpc/src/routers/support.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure, adminProcedure } from "../trpc";

export const supportRouter = createTRPCRouter({
  // Announcements
  getActiveAnnouncements: publicProcedure.query(({ ctx }) =>
    ctx.db.announcement.findMany({
      where: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    })
  ),

  createAnnouncement: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      expiresAt: z.date().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.db.announcement.create({ data: { ...input, createdById: ctx.session.user.id } })
    ),

  deactivateAnnouncement: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.announcement.update({ where: { id: input.id }, data: { active: false } })
    ),

  // Comments
  getComments: publicProcedure
    .input(z.object({ apiId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db.comment.findMany({
        where: { apiId: input.apiId },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    ),

  addComment: protectedProcedure
    .input(z.object({ apiId: z.string(), body: z.string().min(1).max(2000) }))
    .mutation(({ ctx, input }) =>
      ctx.db.comment.create({
        data: { apiId: input.apiId, body: input.body, authorId: ctx.session.user.id },
        include: { author: { select: { id: true, name: true } } },
      })
    ),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db.comment.delete({
        where: { id: input.id, authorId: ctx.session.user.id },
      })
    ),

  // Support tickets
  submitTicket: protectedProcedure
    .input(z.object({ subject: z.string().min(3), body: z.string().min(10) }))
    .mutation(({ ctx, input }) =>
      ctx.db.supportTicket.create({ data: { ...input, submitterId: ctx.session.user.id } })
    ),

  myTickets: protectedProcedure.query(({ ctx }) =>
    ctx.db.supportTicket.findMany({
      where: { submitterId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    })
  ),

  allTickets: adminProcedure.query(({ ctx }) =>
    ctx.db.supportTicket.findMany({
      include: { submitter: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })
  ),

  updateTicketStatus: adminProcedure
    .input(z.object({ id: z.string(), status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]) }))
    .mutation(({ ctx, input }) =>
      ctx.db.supportTicket.update({ where: { id: input.id }, data: { status: input.status } })
    ),
});
```

- [ ] **Step 2: Register in index.ts**

Add `import { supportRouter } from "./routers/support";` and `support: supportRouter` to appRouter.

- [ ] **Step 3: Commit**

```bash
git add packages/trpc/src/routers/support.ts packages/trpc/src/index.ts
git commit -m "feat(support): add support tRPC router"
```

---

### Task 2: Build AnnouncementBanner and add to portal layout

**Files:**
- Create: `apps/web/components/support/AnnouncementBanner.tsx`
- Modify: `apps/web/app/(portal)/layout.tsx`

- [ ] **Step 1: Create `AnnouncementBanner.tsx`**

```typescript
// apps/web/components/support/AnnouncementBanner.tsx
"use client";
import { useState } from "react";

interface Announcement { id: string; title: string; body: string }
interface Props { announcements: Announcement[] }

export function AnnouncementBanner({ announcements }: Props) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;
  const latest = visible[0];
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-sky-900/40 border-b border-sky-700/40 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-sky-400 shrink-0 mt-0.5">📢</span>
        <div>
          <span className="text-sky-300 font-semibold">{latest.title}: </span>
          <span className="text-sky-200/80">{latest.body}</span>
        </div>
      </div>
      <button type="button" onClick={() => setDismissed((d) => [...d, latest.id])}
        className="text-sky-500 hover:text-sky-300 shrink-0 text-xs">Dismiss</button>
    </div>
  );
}
```

- [ ] **Step 2: Add AnnouncementBanner to portal layout**

Read `apps/web/app/(portal)/layout.tsx` then add above the TopNav or below it:

```typescript
import { AnnouncementBanner } from "@/components/support/AnnouncementBanner";
// In the server component, fetch announcements:
const announcements = await caller.support.getActiveAnnouncements();
// Then render before the main content area:
<AnnouncementBanner announcements={announcements} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/support/AnnouncementBanner.tsx apps/web/app/\(portal\)/layout.tsx
git commit -m "feat(support): add AnnouncementBanner to portal layout"
```

---

### Task 3: Build CommentThread component

**Files:**
- Create: `apps/web/components/support/CommentThread.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/__tests__/support/CommentThread.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { CommentThread } from "@/components/support/CommentThread";
import { describe, it, expect, vi } from "vitest";

// Mock tRPC hooks
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    support: {
      addComment: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      deleteComment: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

describe("CommentThread", () => {
  it("renders existing comments", () => {
    const comments = [{ id: "c1", body: "Great API!", author: { id: "u1", name: "Alice" }, createdAt: new Date() }];
    render(<CommentThread apiId="api1" initialComments={comments} currentUserId="u2" />);
    expect(screen.getByText("Great API!")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows comment form", () => {
    render(<CommentThread apiId="api1" initialComments={[]} currentUserId="u1" />);
    expect(screen.getByPlaceholderText(/comment/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/web && pnpm test __tests__/support/CommentThread.test.tsx
```

- [ ] **Step 3: Create `CommentThread.tsx`**

```typescript
// apps/web/components/support/CommentThread.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

interface Comment { id: string; body: string; author: { id: string; name: string }; createdAt: Date }
interface Props { apiId: string; initialComments: Comment[]; currentUserId?: string }

export function CommentThread({ apiId, initialComments, currentUserId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const addComment = trpc.support.addComment.useMutation({ onSuccess: () => { setBody(""); router.refresh(); } });
  const deleteComment = trpc.support.deleteComment.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold">Discussion ({initialComments.length})</h3>
      {initialComments.length === 0 && <p className="text-slate-500 text-sm">No comments yet. Be the first!</p>}
      {initialComments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {c.author.name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-sm font-medium">{c.author.name}</span>
              <span className="text-slate-500 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>
              {currentUserId === c.author.id && (
                <button type="button" onClick={() => deleteComment.mutate({ id: c.id })}
                  className="text-slate-600 hover:text-red-400 text-xs ml-auto">Delete</button>
              )}
            </div>
            <p className="text-slate-300 text-sm">{c.body}</p>
          </div>
        </div>
      ))}
      {currentUserId && (
        <form onSubmit={(e) => { e.preventDefault(); addComment.mutate({ apiId, body }); }} className="flex gap-2 mt-4">
          <input value={body} onChange={(e) => setBody(e.target.value)} required
            placeholder="Add a comment..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
          <button type="submit" disabled={addComment.isPending}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
            Post
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/web && pnpm test __tests__/support/CommentThread.test.tsx
```
Expected: PASS

- [ ] **Step 5: Add CommentThread to API detail pages**

In the reference page (`apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/reference/page.tsx`), fetch and render:

```typescript
import { CommentThread } from "@/components/support/CommentThread";
import { auth } from "@/lib/auth";

// At the bottom of the page JSX:
const [session, comments] = await Promise.all([auth(), caller.support.getComments({ apiId: api.id })]);

<div className="mt-10 pt-8 border-t border-slate-700/50">
  <CommentThread apiId={api.id} initialComments={comments as any} currentUserId={session?.user?.id} />
</div>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/support/CommentThread.tsx apps/web/__tests__/support/
git commit -m "feat(support): add CommentThread component and embed in API detail pages"
```

---

### Task 4: Build Support Center page

**Files:**
- Create: `apps/web/app/(portal)/support/page.tsx`
- Create: `apps/web/components/support/SupportTicketForm.tsx`
- Create: `apps/web/components/support/FaqSection.tsx`

- [ ] **Step 1: Create `SupportTicketForm.tsx`**

```typescript
// apps/web/components/support/SupportTicketForm.tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function SupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = trpc.support.submitTicket.useMutation({ onSuccess: () => { setSubject(""); setBody(""); setSubmitted(true); } });
  if (submitted) return (
    <div className="p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-xl">
      <p className="text-emerald-300 font-semibold">✓ Ticket submitted</p>
      <p className="text-emerald-400/80 text-sm mt-1">We'll review your request and respond via email.</p>
      <button type="button" onClick={() => setSubmitted(false)} className="text-xs text-emerald-500 mt-2 hover:text-emerald-400">Submit another</button>
    </div>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit.mutate({ subject, body }); }} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3}
          placeholder="Briefly describe your issue"
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">Description</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={10} rows={5}
          placeholder="Describe your issue in detail..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500" />
      </div>
      {submit.error && <p className="text-red-400 text-sm">{submit.error.message}</p>}
      <button type="submit" disabled={submit.isPending}
        className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm">
        {submit.isPending ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `FaqSection.tsx`**

```typescript
// apps/web/components/support/FaqSection.tsx
"use client";
import { useState } from "react";

interface FaqItem { q: string; a: string }
interface Props { items: FaqItem[] }

export function FaqSection({ items }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-slate-700/50 overflow-hidden">
          <button type="button" onClick={() => setOpen(open === idx ? null : idx)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-800/50 hover:bg-slate-800 transition-colors">
            <span className="text-white font-medium text-sm">{item.q}</span>
            <span className="text-slate-400 text-sm">{open === idx ? "−" : "+"}</span>
          </button>
          {open === idx && <div className="px-4 py-3 bg-slate-900/30 text-slate-300 text-sm">{item.a}</div>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create support center page**

```typescript
// apps/web/app/(portal)/support/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { FaqSection } from "@/components/support/FaqSection";
import { StatusBadge } from "@/components/ui/StatusBadge";

const FAQ_ITEMS = [
  { q: "How do I request access to an API?", a: "Browse the API catalog, find the API you need, then click 'Request Access'. You'll need to register an application first under 'My Applications'." },
  { q: "How long does access approval take?", a: "API owners typically review requests within 1–2 business days. You'll see the status update under 'My Subscriptions'." },
  { q: "What are mock credentials?", a: "Mock credentials are demo-only client IDs and secrets shown in your Application details. They are not real gateway credentials and cannot be used to call production APIs." },
  { q: "What does 'Deprecated' mean for an API?", a: "A deprecated API is still functional but is scheduled for retirement. You should plan to migrate to the recommended replacement. Check the API's lifecycle page for the retirement date." },
  { q: "How is the Governance Score calculated?", a: "The governance score is based on completed checklist reviews and automated linting checks. A score of 80%+ indicates the API meets enterprise standards." },
];

export default async function SupportPage() {
  const caller = await createCaller();
  const myTickets = await caller.support.myTickets().catch(() => []);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Center</h1>
        <p className="text-slate-400 text-sm mt-1">Get help with the API Developer Portal</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Frequently Asked Questions</h2>
        <FaqSection items={FAQ_ITEMS} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Submit a Support Ticket</h2>
        <SupportTicketForm />
      </div>
      {myTickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">My Tickets</h2>
          <div className="space-y-2">
            {myTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-white text-sm font-medium">{t.subject}</p>
                  <p className="text-slate-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add support link to Sidebar**

```typescript
{ href: "/support", label: "Support", icon: "HelpCircle" },
```

- [ ] **Step 5: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-3b): Phase 3B Support & Collaboration complete"
```
