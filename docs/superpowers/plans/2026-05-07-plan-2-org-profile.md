# Developer Portal — Plan 2: Org & Profile Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI tasks:** Invoke `frontend-design:frontend-design` skill before writing any JSX. Dark theme, Stripe/Twilio aesthetic.

**Goal:** Replace the org router stub with real DB queries, implement user profile editing, org membership management (join/leave from profile), and forgot-password email reset.

**Architecture:** tRPC procedures for org listing and membership mutations. Profile and org membership pages in the `(portal)` route group. Forgot-password uses a short-lived token stored in the DB and delivered via Resend transactional email.

**Tech Stack:** tRPC, Prisma, Resend (email), Next.js App Router, Tailwind CSS, Vitest

**Prerequisite:** Plan 1 complete (monorepo, auth, layout shell running).

---

## File Map

```
packages/db/prisma/schema.prisma         # Add PasswordResetToken model
packages/db/src/index.ts                 # (no change — re-exports Prisma client)

packages/trpc/src/routers/
├── org.ts                               # Replace stub: listPublic, getBySlug, join, leave
└── user.ts                              # profile.get, profile.update, changePassword

apps/web/
├── .env.local                           # Add RESEND_API_KEY
├── lib/
│   └── email.ts                         # Resend client + sendPasswordReset()
├── app/
│   ├── (auth)/
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── reset-password/
│   │       └── page.tsx
│   └── (portal)/
│       └── profile/
│           └── page.tsx
├── components/
│   └── profile/
│       ├── ProfileForm.tsx
│       └── OrgMembershipPanel.tsx
└── __tests__/
    ├── routers/org.test.ts
    ├── routers/user.test.ts
    └── profile/OrgMembershipPanel.test.tsx
```

---

## Task 1: Add PasswordResetToken to Prisma Schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add model to schema.prisma**

Append to the bottom of `packages/db/prisma/schema.prisma` (before the enums):
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

Also add the reverse relation to the `User` model:
```prisma
model User {
  // ... existing fields ...
  passwordResetTokens PasswordResetToken[]
}
```

- [ ] **Step 2: Push schema change**

```bash
cd packages/db
npx prisma db push
npx prisma generate
```

Expected: `PasswordResetToken` table created, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat: add PasswordResetToken model for forgot-password flow"
```

---

## Task 2: Org Router — Real DB Implementation (TDD)

**Files:**
- Modify: `packages/trpc/src/routers/org.ts`
- Create: `packages/trpc/__tests__/org.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/trpc/__tests__/org.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTRPCContext } from "../src/context";
import { appRouter } from "../src/index";

const mockPrisma = {
  organization: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  orgMembership: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
};

function makeCtx(userId?: string) {
  const ctx = createTRPCContext(
    userId ? ({ user: { id: userId, role: "USER" } } as any) : null
  );
  return { ...ctx, prisma: mockPrisma as any };
}

describe("org.listPublic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all organizations ordered by name", async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: "o1", name: "Acme", slug: "acme" },
      { id: "o2", name: "TechCo", slug: "techco" },
    ]);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.org.listPublic();

    expect(result).toHaveLength(2);
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
  });
});

describe("org.join", () => {
  it("creates membership for authenticated user", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue(null);
    mockPrisma.orgMembership.create.mockResolvedValue({ userId: "u1", orgId: "o1" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    const result = await caller.org.join({ orgId: "o1" });

    expect(result.success).toBe(true);
    expect(mockPrisma.orgMembership.create).toHaveBeenCalledWith({
      data: { userId: "u1", orgId: "o1" },
    });
  });

  it("throws CONFLICT if already a member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue({ userId: "u1", orgId: "o1" });

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(caller.org.join({ orgId: "o1" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("throws UNAUTHORIZED if not logged in", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.org.join({ orgId: "o1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("org.leave", () => {
  it("deletes membership", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue({ userId: "u1", orgId: "o1", role: "MEMBER" });
    mockPrisma.orgMembership.delete.mockResolvedValue({});

    const caller = appRouter.createCaller(makeCtx("u1"));
    const result = await caller.org.leave({ orgId: "o1" });

    expect(result.success).toBe(true);
  });

  it("throws NOT_FOUND if not a member", async () => {
    mockPrisma.orgMembership.findUnique.mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx("u1"));
    await expect(caller.org.leave({ orgId: "o1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd packages/trpc && npm test
```

Expected: FAIL — `org.join`, `org.leave` not implemented.

- [ ] **Step 3: Implement org.ts**

Replace `packages/trpc/src/routers/org.ts` with:
```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const orgRouter = createTRPCRouter({
  listPublic: publicProcedure.query(({ ctx }) =>
    ctx.prisma.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    })
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { slug: input.slug },
        include: { _count: { select: { apis: true, memberships: true } } },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  join: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Already a member." });

      await ctx.prisma.orgMembership.create({
        data: { userId: ctx.session.user.id, orgId: input.orgId },
      });
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.prisma.orgMembership.findUnique({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.orgMembership.delete({
        where: { userId_orgId: { userId: ctx.session.user.id, orgId: input.orgId } },
      });
      return { success: true };
    }),
});
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test
```

Expected: All org tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/trpc/src/routers/org.ts packages/trpc/__tests__/org.test.ts
git commit -m "feat: implement org router with join/leave and real db queries"
```

---

## Task 3: User Profile Router (TDD)

**Files:**
- Create: `packages/trpc/src/routers/user.ts`
- Create: `packages/trpc/__tests__/user.test.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/trpc/__tests__/user.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTRPCContext } from "../src/context";
import { appRouter } from "../src/index";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

function makeCtx(userId = "u1") {
  return {
    ...createTRPCContext({ user: { id: userId, role: "USER" } } as any),
    prisma: mockPrisma as any,
  };
}

describe("user.profile.get", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the current user with their org memberships", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "ada@example.com",
      name: "Ada",
      role: "USER",
      memberships: [{ org: { id: "o1", name: "Acme", slug: "acme" }, role: "MEMBER" }],
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.user.profile.get();

    expect(result.email).toBe("ada@example.com");
    expect(result.memberships).toHaveLength(1);
  });
});

describe("user.profile.update", () => {
  it("updates name and returns updated user", async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      role: "USER",
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.user.profile.update({ name: "Ada Lovelace" });

    expect(result.name).toBe("Ada Lovelace");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Ada Lovelace" },
      select: { id: true, email: true, name: true, role: true },
    });
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test
```

Expected: FAIL — `user.profile` not defined.

- [ ] **Step 3: Implement user.ts**

Create `packages/trpc/src/routers/user.ts`:
```typescript
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  profile: createTRPCRouter({
    get: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          memberships: {
            include: { org: { select: { id: true, name: true, slug: true } } },
          },
        },
      })
    ),

    update: protectedProcedure
      .input(z.object({ name: z.string().min(2).optional(), email: z.string().email().optional() }))
      .mutation(({ ctx, input }) =>
        ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { ...input },
          select: { id: true, email: true, name: true, role: true },
        })
      ),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string(),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { passwordHash: true },
        });
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });

        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await ctx.prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { passwordHash },
        });
        return { success: true };
      }),
  }),
});
```

- [ ] **Step 4: Add userRouter to appRouter**

Update `packages/trpc/src/index.ts`:
```typescript
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
  user: userRouter,
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
git add packages/trpc/src/routers/user.ts packages/trpc/__tests__/user.test.ts packages/trpc/src/index.ts
git commit -m "feat: user profile router with get, update, and changePassword procedures"
```

---

## Task 4: Forgot Password — Email Service + Reset Token

**Files:**
- Create: `apps/web/lib/email.ts`
- Modify: `apps/web/.env.local`
- Modify: `packages/trpc/src/routers/auth.ts`

- [ ] **Step 1: Install Resend**

```bash
cd apps/web && npm install resend
```

- [ ] **Step 2: Add RESEND_API_KEY to .env.local**

```
RESEND_API_KEY="re_your_api_key_here"
```

Get a free API key at https://resend.com (no credit card for dev).

- [ ] **Step 3: Create apps/web/lib/email.ts**

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordReset(to: string, resetUrl: string) {
  await resend.emails.send({
    from: "DevPortal <noreply@devportal.dev>",
    to,
    subject: "Reset your DevPortal password",
    html: `
      <p>You requested a password reset for your DevPortal account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}
```

- [ ] **Step 4: Add forgotPassword and resetPassword to auth router**

Add to `packages/trpc/src/routers/auth.ts` (append to the authRouter):
```typescript
import crypto from "crypto";

// Inside authRouter, after register:
forgotPassword: publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({ where: { email: input.email } });
    // Always return success — don't leak whether email exists
    if (!user) return { success: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await ctx.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Email is sent from the API route, not here, to avoid importing server-only modules
    return { success: true, token }; // token only returned server-side; page calls email util
  }),

resetPassword: publicProcedure
  .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
  .mutation(async ({ ctx, input }) => {
    const record = await ctx.prisma.passwordResetToken.findUnique({
      where: { token: input.token },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link." });
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await ctx.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await ctx.prisma.passwordResetToken.delete({ where: { token: input.token } });

    return { success: true };
  }),
```

**Note:** `forgotPassword` returns the token so the Next.js page (server component) can call `sendPasswordReset()` after the mutation. The email utility is `server-only` and is called in the page, not inside the tRPC router.

- [ ] **Step 5: Create forgot-password page**

> Invoke `frontend-design:frontend-design` before writing JSX.

Create `apps/web/app/(auth)/forgot-password/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-emerald-400 mb-4">If that email exists, we've sent a reset link.</p>
        <Link href="/login" className="text-sky-400 hover:text-sky-300 text-sm">Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-2">Reset your password</h1>
      <p className="text-slate-400 text-sm mb-6">Enter your email and we'll send a reset link.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          forgot.mutate({ email });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="ada@example.com"
          />
        </div>
        <button
          type="submit"
          disabled={forgot.isPending}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {forgot.isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-center mt-6">
        <Link href="/login" className="text-sky-400 hover:text-sky-300 text-sm">Back to sign in</Link>
      </p>
    </>
  );
}
```

- [ ] **Step 6: Create reset-password page**

> Invoke `frontend-design:frontend-design` before writing JSX.

Create `apps/web/app/(auth)/reset-password/page.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Suspense } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => router.push("/login?reset=1"),
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    reset.mutate({ token, newPassword: password });
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-6">Set a new password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">New password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Min 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1">Confirm password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={reset.isPending}
          className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {reset.isPending ? "Saving…" : "Set new password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/trpc/src/routers/auth.ts apps/web/lib/email.ts apps/web/app/\(auth\)/forgot-password/ apps/web/app/\(auth\)/reset-password/
git commit -m "feat: forgot-password and reset-password flow with Resend email"
```

---

## Task 5: Profile Page UI

> Invoke `frontend-design:frontend-design` before writing JSX. Two-section layout: account details on the left, org membership panel on the right.

**Files:**
- Create: `apps/web/components/profile/ProfileForm.tsx`
- Create: `apps/web/components/profile/OrgMembershipPanel.tsx`
- Create: `apps/web/app/(portal)/profile/page.tsx`

- [ ] **Step 1: Write failing component test**

Create `apps/web/__tests__/profile/OrgMembershipPanel.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgMembershipPanel } from "@/components/profile/OrgMembershipPanel";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    org: {
      leave: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      join: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

const myOrgs = [{ org: { id: "o1", name: "Acme Corp", slug: "acme" }, role: "MEMBER" as const }];
const allOrgs = [
  { id: "o1", name: "Acme Corp", slug: "acme" },
  { id: "o2", name: "TechCo", slug: "techco" },
];

describe("OrgMembershipPanel", () => {
  it("shows orgs the user belongs to", () => {
    render(<OrgMembershipPanel memberships={myOrgs} allOrgs={allOrgs} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows joinable orgs not yet joined", () => {
    render(<OrgMembershipPanel memberships={myOrgs} allOrgs={allOrgs} />);
    expect(screen.getByText("TechCo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd apps/web && npm test
```

Expected: FAIL — `OrgMembershipPanel` not found.

- [ ] **Step 3: Invoke frontend-design skill then implement OrgMembershipPanel**

Create `apps/web/components/profile/OrgMembershipPanel.tsx`:
```typescript
"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Membership {
  org: { id: string; name: string; slug: string };
  role: "MEMBER" | "ADMIN";
}

interface Props {
  memberships: Membership[];
  allOrgs: { id: string; name: string; slug: string }[];
}

export function OrgMembershipPanel({ memberships, allOrgs }: Props) {
  const router = useRouter();
  const myOrgIds = new Set(memberships.map((m) => m.org.id));
  const joinable = allOrgs.filter((o) => !myOrgIds.has(o.id));

  const leave = trpc.org.leave.useMutation({ onSuccess: () => router.refresh() });
  const join = trpc.org.join.useMutation({ onSuccess: () => router.refresh() });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Your organizations</h3>
        {memberships.length === 0 ? (
          <p className="text-slate-500 text-sm italic">You haven't joined any organizations yet.</p>
        ) : (
          <ul className="space-y-2">
            {memberships.map(({ org, role }) => (
              <li key={org.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{org.name}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
                <button
                  onClick={() => leave.mutate({ orgId: org.id })}
                  disabled={leave.isPending}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  Leave
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {joinable.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Join an organization</h3>
          <ul className="space-y-2">
            {joinable.map((org) => (
              <li key={org.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-white">{org.name}</p>
                <button
                  onClick={() => join.mutate({ orgId: org.id })}
                  disabled={join.isPending}
                  className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Invoke frontend-design skill then implement ProfileForm**

Create `apps/web/components/profile/ProfileForm.tsx`:
```typescript
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";

interface Props {
  user: { id: string; name: string; email: string };
}

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const update = trpc.user.profile.update.useMutation({
    onSuccess: () => { setMsg("Profile updated."); router.refresh(); },
  });
  const changePassword = trpc.user.profile.changePassword.useMutation({
    onSuccess: () => { setMsg("Password changed."); setCurrentPassword(""); setNewPassword(""); },
    onError: (e) => setMsg(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Account details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              value={user.email}
              disabled
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm opacity-60 cursor-not-allowed"
            />
          </div>
          <button
            onClick={() => update.mutate({ name })}
            disabled={update.isPending || name === user.name}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Change password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => changePassword.mutate({ currentPassword, newPassword })}
            disabled={changePassword.isPending || !currentPassword || newPassword.length < 8}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Change password
          </button>
        </div>
      </div>

      {msg && <p className="text-emerald-400 text-sm">{msg}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Create profile page (server component)**

```typescript
// apps/web/app/(portal)/profile/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { OrgMembershipPanel } from "@/components/profile/OrgMembershipPanel";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const caller = await createCaller();
  const [profile, allOrgs] = await Promise.all([
    caller.user.profile.get(),
    caller.org.listPublic(),
  ]);

  if (!profile) redirect("/login");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-8">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <ProfileForm user={profile} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Organizations</h2>
          <OrgMembershipPanel memberships={profile.memberships as any} allOrgs={allOrgs} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run all tests**

```bash
cd apps/web && npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/profile/ apps/web/app/\(portal\)/profile/ apps/web/__tests__/profile/
git commit -m "feat: profile page with account editing and org membership management"
```

---

## Plan 2 Complete

**What was built:**
- Org router: `listPublic`, `getBySlug`, `join`, `leave` (all tested)
- User router: `profile.get`, `profile.update`, `profile.changePassword` (tested)
- Forgot password + email reset flow via Resend
- Profile page with inline account editing and org join/leave panel

**Next:** Plan 3 — API Catalog & Publishing (`docs/superpowers/plans/2026-05-07-plan-3-api-catalog.md`)
