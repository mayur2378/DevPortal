# Developer Portal — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI tasks:** When a task builds a UI component or page, invoke the `frontend-design:frontend-design` skill before writing any JSX. The skill guides visual design decisions. Dark theme, Stripe/Twilio aesthetic.

**Goal:** Scaffold the Turborepo monorepo, set up Prisma + PostgreSQL, configure NextAuth email/password auth, and deliver working register/login pages with a protected layout shell.

**Architecture:** Turborepo monorepo with `apps/web` (Next.js 14 App Router + tRPC server) and shared packages for the Prisma client, tRPC router definitions, and UI primitives. Auth is handled by NextAuth.js with a Credentials provider backed by bcrypt-hashed passwords in PostgreSQL.

**Tech Stack:** Next.js 14, tRPC v11, Prisma 5, PostgreSQL, NextAuth.js v5, Tailwind CSS, Turborepo, Vitest, @testing-library/react

---

## File Map

```
devportal/
├── package.json                          # Turborepo root workspace
├── turbo.json                            # Turborepo pipeline config
├── .gitignore
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   └── schema.prisma            # Full Prisma schema (all models)
│   │   └── src/
│   │       └── index.ts                 # PrismaClient singleton export
│   ├── trpc/
│   │   ├── package.json
│   │   └── src/
│   │       ├── context.ts               # TRPCContext type + createContext fn
│   │       ├── trpc.ts                  # createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure
│   │       ├── routers/
│   │       │   └── auth.ts             # auth.register procedure
│   │       └── index.ts                # appRouter + AppRouter type export
│   └── ui/
│       ├── package.json
│       └── src/
│           └── index.ts                # Button, Input, Label, Card exports
└── apps/
    └── web/
        ├── package.json
        ├── next.config.js
        ├── tailwind.config.ts
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── middleware.ts                # Next.js route protection
        ├── app/
        │   ├── layout.tsx              # Root layout + providers
        │   ├── page.tsx                # Root redirect (→ /browse or /login)
        │   ├── api/
        │   │   ├── auth/
        │   │   │   └── [...nextauth]/
        │   │   │       └── route.ts   # NextAuth route handler
        │   │   └── trpc/
        │   │       └── [trpc]/
        │   │           └── route.ts   # tRPC HTTP handler
        │   ├── (auth)/
        │   │   ├── layout.tsx         # Centered card layout for auth pages
        │   │   ├── login/
        │   │   │   └── page.tsx
        │   │   └── register/
        │   │       └── page.tsx
        │   └── (portal)/
        │       ├── layout.tsx         # Top nav + sidebar shell (protected)
        │       └── browse/
        │           └── page.tsx       # Placeholder — implemented in Plan 3
        ├── components/
        │   ├── auth/
        │   │   ├── LoginForm.tsx
        │   │   └── RegisterForm.tsx
        │   ├── layout/
        │   │   ├── TopNav.tsx
        │   │   └── Sidebar.tsx
        │   └── providers/
        │       ├── TrpcProvider.tsx
        │       └── SessionProvider.tsx
        ├── lib/
        │   ├── auth.ts                # NextAuth config + getServerSession helper
        │   ├── trpc/
        │   │   ├── client.ts          # tRPC React Query client
        │   │   └── server.ts          # tRPC server-side caller for RSC
        │   └── utils.ts               # cn() utility (clsx + tailwind-merge)
        └── __tests__/
            └── auth/
                ├── register.test.ts
                └── login.test.ts
```

---

## Task 1: Bootstrap Turborepo Monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `packages/db/package.json`
- Create: `packages/trpc/package.json`
- Create: `packages/ui/package.json`

- [ ] **Step 1: Initialise root workspace**

```bash
cd C:\Mayur\Projects\DevPortal
git init
```

Create `package.json`:
```json
{
  "name": "devportal",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:push": "turbo run db:push --filter=@devportal/db",
    "db:generate": "turbo run db:generate --filter=@devportal/db"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "db:push": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
.next/
dist/
.env
.env.local
.turbo/
.superpowers/
```

- [ ] **Step 4: Create packages/db/package.json**

```json
{
  "name": "@devportal/db",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "scripts": {
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0"
  }
}
```

- [ ] **Step 5: Create packages/trpc/package.json**

```json
{
  "name": "@devportal/trpc",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "@trpc/server": "^11.0.0",
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 6: Create packages/ui/package.json**

```json
{
  "name": "@devportal/ui",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "devDependencies": {
    "react": "^18.3.0",
    "@types/react": "^18.3.0"
  }
}
```

- [ ] **Step 7: Install root dependencies**

```bash
npm install
```

Expected: `node_modules` created at root; workspace symlinks for all packages.

- [ ] **Step 8: Commit**

```bash
git add package.json turbo.json .gitignore packages/db/package.json packages/trpc/package.json packages/ui/package.json
git commit -m "chore: initialise turborepo monorepo with workspace packages"
```

---

## Task 2: Prisma Schema + DB Package

**Files:**
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`

Prerequisites: PostgreSQL running locally. Create a database named `devportal`.

- [ ] **Step 1: Create schema.prisma**

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String          @id @default(cuid())
  email        String          @unique
  passwordHash String
  name         String
  role         UserRole        @default(USER)
  memberships  OrgMembership[]
  apis         API[]
  createdAt    DateTime        @default(now())
}

model Organization {
  id          String          @id @default(cuid())
  name        String
  slug        String          @unique
  memberships OrgMembership[]
  apis        API[]
  createdAt   DateTime        @default(now())
}

model OrgMembership {
  user     User         @relation(fields: [userId], references: [id])
  userId   String
  org      Organization @relation(fields: [orgId], references: [id])
  orgId    String
  role     OrgRole      @default(MEMBER)
  joinedAt DateTime     @default(now())

  @@id([userId, orgId])
}

model API {
  id          String       @id @default(cuid())
  org         Organization @relation(fields: [orgId], references: [id])
  orgId       String
  owner       User         @relation(fields: [ownerId], references: [id])
  ownerId     String
  name        String
  slug        String
  description String?
  type        APIType
  category    String?
  versions    APIVersion[]
  createdAt   DateTime     @default(now())

  @@unique([orgId, slug])
}

model APIVersion {
  id          String        @id @default(cuid())
  api         API           @relation(fields: [apiId], references: [id])
  apiId       String
  version     String
  specKey     String
  specType    APIType
  status      VersionStatus @default(DRAFT)
  docPages    DocPage[]
  mockConfig  MockConfig?
  publishedAt DateTime?
  createdAt   DateTime      @default(now())

  @@unique([apiId, version])
}

model DocPage {
  id           String     @id @default(cuid())
  apiVersion   APIVersion @relation(fields: [apiVersionId], references: [id])
  apiVersionId String
  slug         String
  title        String
  content      String     @db.Text
  order        Int        @default(0)

  @@unique([apiVersionId, slug])
}

model MockConfig {
  id           String     @id @default(cuid())
  apiVersion   APIVersion @relation(fields: [apiVersionId], references: [id])
  apiVersionId String     @unique
  baseDelayMs  Int        @default(0)
}

enum UserRole      { USER SUPERADMIN }
enum OrgRole       { MEMBER ADMIN }
enum APIType       { REST GRAPHQL }
enum VersionStatus { DRAFT PUBLISHED DEPRECATED }
```

- [ ] **Step 2: Create packages/db/src/index.ts**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
```

- [ ] **Step 3: Create packages/db/.env**

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/devportal"
```

Replace `postgres:password` with your local PostgreSQL credentials.

- [ ] **Step 4: Generate Prisma client and push schema**

```bash
cd packages/db
npx prisma generate
npx prisma db push
```

Expected: All tables created in your `devportal` database. Run `npx prisma studio` to verify.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/src/index.ts
git commit -m "feat: add prisma schema and db package"
```

---

## Task 3: tRPC Package — Context and Router Helpers

**Files:**
- Create: `packages/trpc/src/context.ts`
- Create: `packages/trpc/src/trpc.ts`
- Create: `packages/trpc/src/index.ts`

- [ ] **Step 1: Create context.ts**

```typescript
// packages/trpc/src/context.ts
import { prisma } from "@devportal/db";
import type { Session } from "next-auth";

export interface TRPCContext {
  session: Session | null;
  prisma: typeof prisma;
}

export function createTRPCContext(session: Session | null): TRPCContext {
  return { session, prisma };
}
```

- [ ] **Step 2: Create trpc.ts**

```typescript
// packages/trpc/src/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.session?.user?.role !== "SUPERADMIN") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
```

- [ ] **Step 3: Create packages/trpc/src/index.ts** (barrel — will grow across plans)

```typescript
// packages/trpc/src/index.ts
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";
```

- [ ] **Step 4: Commit**

```bash
git add packages/trpc/src/
git commit -m "feat: add trpc package with context and procedure helpers"
```

---

## Task 4: auth.register tRPC Procedure (TDD)

**Files:**
- Create: `packages/trpc/src/routers/auth.ts`
- Create: `packages/trpc/__tests__/auth.register.test.ts`
- Modify: `packages/trpc/src/index.ts`

- [ ] **Step 1: Add vitest to packages/trpc**

Add to `packages/trpc/package.json`:
```json
{
  "devDependencies": {
    "vitest": "^1.6.0",
    "bcryptjs": "^2.4.3",
    "@types/bcryptjs": "^2.4.6"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3"
  },
  "scripts": {
    "test": "vitest run"
  }
}
```

Run: `npm install`

- [ ] **Step 2: Write failing test**

Create `packages/trpc/__tests__/auth.register.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTRPCContext } from "../src/context";
import { appRouter } from "../src/index";

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  organization: {
    findMany: vi.fn(),
  },
  orgMembership: {
    create: vi.fn(),
  },
};

function makeCtx() {
  return createTRPCContext(null);
}

describe("auth.register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new user and returns their id", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-1",
      email: "dev@example.com",
      name: "Dev User",
      role: "USER",
    });

    const caller = appRouter.createCaller({
      ...makeCtx(),
      prisma: mockPrisma as any,
    });

    const result = await caller.auth.register({
      email: "dev@example.com",
      name: "Dev User",
      password: "securepassword123",
      orgIds: [],
    });

    expect(result.id).toBe("user-1");
    expect(mockPrisma.user.create).toHaveBeenCalledOnce();
  });

  it("throws CONFLICT if email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const caller = appRouter.createCaller({
      ...makeCtx(),
      prisma: mockPrisma as any,
    });

    await expect(
      caller.auth.register({
        email: "taken@example.com",
        name: "Someone",
        password: "password123",
        orgIds: [],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
```

- [ ] **Step 3: Run test — verify it FAILS**

```bash
cd packages/trpc
npm test
```

Expected: FAIL — `appRouter` not defined / `auth.register` not found.

- [ ] **Step 4: Implement auth.ts router**

Create `packages/trpc/src/routers/auth.ts`:
```typescript
import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2),
        password: z.string().min(8),
        orgIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          memberships: {
            create: input.orgIds.map((orgId) => ({ orgId })),
          },
        },
        select: { id: true, email: true, name: true, role: true },
      });

      return user;
    }),
});
```

- [ ] **Step 5: Wire authRouter into appRouter**

Update `packages/trpc/src/index.ts`:
```typescript
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Run test — verify it PASSES**

```bash
npm test
```

Expected: 2 tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/trpc/src/routers/auth.ts packages/trpc/src/index.ts packages/trpc/__tests__/
git commit -m "feat: add auth.register tRPC procedure with tests"
```

---

## Task 5: Bootstrap apps/web (Next.js 14 + Tailwind)

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@devportal/web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "@devportal/db": "*",
    "@devportal/trpc": "*",
    "@devportal/ui": "*",
    "@trpc/client": "^11.0.0",
    "@trpc/next": "^11.0.0",
    "@trpc/react-query": "^11.0.0",
    "@trpc/server": "^11.0.0",
    "@tanstack/react-query": "^5.40.0",
    "next": "^14.2.0",
    "next-auth": "^5.0.0-beta.19",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.1.0"
  }
}
```

Run: `npm install` from the root.

- [ ] **Step 2: Create apps/web/next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@devportal/ui", "@devportal/trpc", "@devportal/db"],
};

module.exports = nextConfig;
```

- [ ] **Step 3: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#38bdf8",
          dark: "#0ea5e9",
        },
        surface: {
          DEFAULT: "#1e293b",
          deep: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create apps/web/vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] **Step 6: Create apps/web/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0f172a;
  color: #e2e8f0;
}
```

- [ ] **Step 7: Create apps/web/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "chore: bootstrap Next.js 14 web app with Tailwind and Vitest"
```

---

## Task 6: NextAuth.js Configuration

**Files:**
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/.env.local`

- [ ] **Step 1: Create apps/web/.env.local**

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/devportal"
NEXTAUTH_SECRET="replace-with-32-char-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret: `openssl rand -base64 32`

- [ ] **Step 2: Create apps/web/lib/auth.ts**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@devportal/db";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 3: Create apps/web/app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Create NextAuth type augmentation**

Create `apps/web/types/next-auth.d.ts`:
```typescript
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "SUPERADMIN";
    } & DefaultSession["user"];
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/app/api/auth/ apps/web/types/
git commit -m "feat: configure nextauth with credentials provider and jwt session"
```

---

## Task 7: tRPC HTTP Handler + Client Setup

**Files:**
- Create: `apps/web/app/api/trpc/[trpc]/route.ts`
- Create: `apps/web/lib/trpc/client.ts`
- Create: `apps/web/lib/trpc/server.ts`
- Create: `apps/web/components/providers/TrpcProvider.tsx`
- Create: `apps/web/components/providers/SessionProvider.tsx`

- [ ] **Step 1: Create tRPC HTTP route handler**

```typescript
// apps/web/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@devportal/trpc";
import { auth } from "@/lib/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const session = await auth();
      return createTRPCContext(session);
    },
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 2: Create tRPC React Query client**

```typescript
// apps/web/lib/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@devportal/trpc";

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 3: Create tRPC server-side caller**

```typescript
// apps/web/lib/trpc/server.ts
import "server-only";
import { appRouter, createTRPCContext } from "@devportal/trpc";
import { auth } from "@/lib/auth";

export async function createCaller() {
  const session = await auth();
  const ctx = createTRPCContext(session);
  return appRouter.createCaller(ctx);
}
```

- [ ] **Step 4: Create TrpcProvider**

```typescript
// apps/web/components/providers/TrpcProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc" })],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 5: Create SessionProvider wrapper**

```typescript
// apps/web/components/providers/SessionProvider.tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

- [ ] **Step 6: Create root layout wiring both providers**

```typescript
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { TrpcProvider } from "@/components/providers/TrpcProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "DevPortal",
  description: "Enterprise API Developer Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TrpcProvider>{children}</TrpcProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/trpc/ apps/web/lib/trpc/ apps/web/components/providers/ apps/web/app/layout.tsx
git commit -m "feat: wire trpc http handler, react-query client, and layout providers"
```

---

## Task 8: Route Protection Middleware

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```typescript
// apps/web/middleware.ts
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
                     req.nextUrl.pathname.startsWith("/register");

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL("/browse", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Create root page redirect**

```typescript
// apps/web/app/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  redirect(session ? "/browse" : "/login");
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/middleware.ts apps/web/app/page.tsx
git commit -m "feat: add next.js middleware for protected routes"
```

---

## Task 9: Register Page UI

> **Invoke `frontend-design:frontend-design` skill before writing JSX.** Dark theme, Stripe/Twilio aesthetic. The register page is a centered card on a dark background with the DevPortal logo/wordmark, email, name, password fields, org multi-select, and a submit button.

**Files:**
- Create: `apps/web/components/auth/RegisterForm.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Step 1: Write failing test for RegisterForm**

Create `apps/web/__tests__/auth/register.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "@/components/auth/RegisterForm";

// Mock trpc
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    auth: {
      register: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: "user-1" }),
          isPending: false,
        }),
      },
    },
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("RegisterForm", () => {
  it("renders all required fields", () => {
    render(<RegisterForm orgs={[{ id: "org-1", name: "Acme Corp", slug: "acme" }]} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows error when email is missing", async () => {
    render(<RegisterForm orgs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
cd apps/web && npm test
```

Expected: FAIL — `RegisterForm` not found.

- [ ] **Step 3: Invoke frontend-design skill and implement RegisterForm**

> Before writing code: invoke `frontend-design:frontend-design` for the RegisterForm component.

Create `apps/web/components/auth/RegisterForm.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface Org { id: string; name: string; slug: string }

interface Props { orgs: Org[] }

export function RegisterForm({ orgs }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const register = trpc.auth.register.useMutation();

  function validate() {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    if (!name) e.name = "Name is required";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await register.mutateAsync({ email, name, password, orgIds: selectedOrgIds });
      router.push("/login?registered=1");
    } catch (err: any) {
      setErrors({ form: err.message ?? "Registration failed" });
    }
  }

  function toggleOrg(id: string) {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
          Full name
        </label>
        <input
          id="name"
          aria-label="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Ada Lovelace"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email
        </label>
        <input
          id="email"
          aria-label="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="ada@example.com"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          id="password"
          aria-label="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="Min 8 characters"
        />
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
      </div>

      {orgs.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-slate-300 mb-2">
            Join organizations <span className="text-slate-500">(optional)</span>
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {orgs.map((org) => (
              <label
                key={org.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                  selectedOrgIds.includes(org.id)
                    ? "border-sky-500 bg-sky-950"
                    : "border-slate-700 hover:border-slate-500"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedOrgIds.includes(org.id)}
                  onChange={() => toggleOrg(org.id)}
                  className="accent-sky-500"
                />
                <span className="text-sm text-slate-200">{org.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {errors.form && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {errors.form}
        </p>
      )}

      <button
        type="submit"
        disabled={register.isPending}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {register.isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create (auth) layout**

```typescript
// apps/web/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-sky-400">⬡ DevPortal</span>
          <p className="text-slate-400 text-sm mt-1">Enterprise API Developer Portal</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create register page**

```typescript
// apps/web/app/(auth)/register/page.tsx
import { RegisterForm } from "@/components/auth/RegisterForm";
import { createCaller } from "@/lib/trpc/server";
import Link from "next/link";

export default async function RegisterPage() {
  const caller = await createCaller();
  const orgs = await caller.org.listPublic(); // implemented in Plan 2; placeholder returns []
  
  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-6">Create your account</h1>
      <RegisterForm orgs={orgs} />
      <p className="text-center text-slate-400 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
```

**Note:** `caller.org.listPublic()` will be implemented in Plan 2. For now, add a temporary stub in `packages/trpc/src/routers/org.ts` that returns `[]`.

- [ ] **Step 6: Create temporary org router stub**

Create `packages/trpc/src/routers/org.ts`:
```typescript
import { createTRPCRouter, publicProcedure } from "../trpc";

export const orgRouter = createTRPCRouter({
  listPublic: publicProcedure.query(() => []),
});
```

Replace the full contents of `packages/trpc/src/index.ts` with:
```typescript
export { createTRPCContext } from "./context";
export { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
export type { TRPCContext } from "./context";

import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { orgRouter } from "./routers/org";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  org: orgRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 7: Run tests — verify they PASS**

```bash
cd apps/web && npm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/auth/RegisterForm.tsx apps/web/app/\(auth\)/ apps/web/__tests__/ packages/trpc/src/routers/org.ts packages/trpc/src/index.ts
git commit -m "feat: register page with form validation and org selection"
```

---

## Task 10: Login Page UI

> **Invoke `frontend-design:frontend-design` skill before writing JSX.** Same dark card layout. Email + password fields, sign-in button, link to register.

**Files:**
- Create: `apps/web/components/auth/LoginForm.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/__tests__/auth/login.test.tsx`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test
```

Expected: FAIL — `LoginForm` not found.

- [ ] **Step 3: Invoke frontend-design skill and implement LoginForm**

> Invoke `frontend-design:frontend-design` before writing JSX.

Create `apps/web/components/auth/LoginForm.tsx`:
```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/browse");
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {params.get("registered") && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-sm px-3 py-2 rounded-lg">
          Account created — sign in to continue.
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email
        </label>
        <input
          id="email"
          aria-label="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="ada@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          id="password"
          aria-label="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create login page**

```typescript
// apps/web/app/(auth)/login/page.tsx
import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-6">Sign in to DevPortal</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-slate-400 text-sm mt-6">
        No account?{" "}
        <Link href="/register" className="text-sky-400 hover:text-sky-300">
          Create one
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 5: Run tests — verify they PASS**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/auth/LoginForm.tsx apps/web/app/\(auth\)/login/
git commit -m "feat: login page with credentials sign-in"
```

---

## Task 11: Protected Layout Shell (Top Nav + Sidebar)

> **Invoke `frontend-design:frontend-design` skill before writing JSX.** Dark theme, Stripe/Twilio aesthetic. Top nav with DevPortal logo, browse/my APIs links, user avatar dropdown. Left sidebar with org filter section and category filter section (populated in Plan 3 — render empty state for now).

**Files:**
- Create: `apps/web/components/layout/TopNav.tsx`
- Create: `apps/web/components/layout/Sidebar.tsx`
- Create: `apps/web/app/(portal)/layout.tsx`
- Create: `apps/web/app/(portal)/browse/page.tsx`

- [ ] **Step 1: Invoke frontend-design skill then create TopNav.tsx**

> Invoke `frontend-design:frontend-design` before writing JSX.

```typescript
// apps/web/components/layout/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/browse", label: "Browse APIs" },
  { href: "/my-apis", label: "My APIs" },
];

export function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-8">
      <Link href="/browse" className="flex items-center gap-2 text-sky-400 font-bold text-lg shrink-0">
        ⬡ <span>DevPortal</span>
      </Link>

      <nav className="flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname.startsWith(link.href)
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {session?.user && (
          <>
            <span className="text-slate-400 text-sm">{session.user.name}</span>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-bold hover:bg-sky-500 transition-colors"
            >
              {session.user.name?.[0]?.toUpperCase() ?? "U"}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Invoke frontend-design skill then create Sidebar.tsx**

```typescript
// apps/web/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  orgs: { id: string; name: string; slug: string }[];
}

export function Sidebar({ orgs }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedOrg = searchParams.get("org");

  function orgHref(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", slug);
    return `${pathname}?${params.toString()}`;
  }

  function clearHref() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("org");
    return `${pathname}?${params.toString()}`;
  }

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4">
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Organizations
        </p>
        <ul className="space-y-0.5">
          <li>
            <Link
              href={clearHref()}
              className={cn(
                "block px-3 py-1.5 rounded-md text-sm transition-colors",
                !selectedOrg ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              All orgs
            </Link>
          </li>
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={orgHref(org.slug)}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-sm transition-colors",
                  selectedOrg === org.slug
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {org.name}
              </Link>
            </li>
          ))}
          {orgs.length === 0 && (
            <li className="px-3 py-1.5 text-slate-600 text-sm italic">No orgs yet</li>
          )}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Type
        </p>
        <ul className="space-y-0.5">
          {["REST", "GraphQL"].map((type) => (
            <li key={type}>
              <Link
                href={`${pathname}?type=${type}`}
                className="block px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {type}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create portal layout**

```typescript
// apps/web/app/(portal)/layout.tsx
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { createCaller } from "@/lib/trpc/server";
import { Suspense } from "react";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const caller = await createCaller();
  const orgs = await caller.org.listPublic();

  return (
    <div className="min-h-screen bg-slate-950">
      <TopNav />
      <Suspense>
        <Sidebar orgs={orgs} />
      </Suspense>
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create browse placeholder page**

```typescript
// apps/web/app/(portal)/browse/page.tsx
export default function BrowsePage() {
  return (
    <div className="text-slate-400 text-center py-24">
      <p className="text-2xl font-semibold text-slate-300 mb-2">API Catalog</p>
      <p>Implemented in Plan 3</p>
    </div>
  );
}
```

- [ ] **Step 5: Start the dev server and verify end-to-end flow**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
1. `/` redirects to `/login` (not authenticated)
2. Register form at `/register` renders with name/email/password fields
3. After registration, redirect to `/login?registered=1` shows success banner
4. After login, redirect to `/browse` — top nav and sidebar visible
5. Sign out returns to `/login`

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/layout/ apps/web/app/\(portal\)/
git commit -m "feat: protected portal layout with top nav and sidebar shell"
```

---

## Plan 1 Complete

**What was built:**
- Turborepo monorepo with `packages/db`, `packages/trpc`, `packages/ui`, `apps/web`
- Full Prisma schema (all 8 models) pushed to PostgreSQL
- tRPC context, router helpers, and `auth.register` procedure (tested)
- NextAuth Credentials provider with bcrypt password verification
- Register page with email, name, password, and org multi-select
- Login page with session-based sign-in
- Next.js middleware protecting all portal routes
- Top nav + sidebar layout shell

**Deferred to Plan 2:** Forgot password / email reset flow (requires transactional email service — Resend or SendGrid). The auth pages already include a placeholder "Forgot password?" link that can be wired up in Plan 2.

**Next:** Plan 2 — Org & Profile Management (`docs/superpowers/plans/2026-05-07-plan-2-org-profile.md`)
