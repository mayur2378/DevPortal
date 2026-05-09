# Developer Portal — Design Spec
**Date:** 2026-05-07  
**Status:** Approved  

---

## Overview

An enterprise developer portal where developers register, join organizations, publish APIs (with specs and rich documentation), and let other developers discover and mock-test those APIs. Designed to be the canonical API catalog for an organization or enterprise ecosystem.

---

## Architectural Decision Log

Every significant design choice made during brainstorming is recorded here with the options considered, the decision taken, and the reasoning.

---

### ADR-1: Authentication Strategy

**Options considered:**
- A) Azure Active Directory / Entra ID — SSO via OIDC/SAML
- B) Okta — standalone enterprise identity provider
- C) Auth0 — developer-friendly, flexible for internal + external users
- D) Internal/custom SSO
- **E) Email/password (no domain restriction)** ✅ chosen

**Decision:** Email-based registration with password authentication.

**Reasoning:** The portal is not tied to a specific company's identity infrastructure at this stage. Email registration is universally accessible, avoids external IdP dependencies, and can be augmented with SSO later. Organization membership is managed explicitly within the portal rather than inferred from corporate identity.

---

### ADR-2: API Spec Formats Supported

**Options considered:**
- A) OpenAPI / Swagger (JSON or YAML) only
- B) GraphQL SDL only
- **C) Both OpenAPI and GraphQL SDL** ✅ chosen

**Decision:** Support both OpenAPI/Swagger and GraphQL SDL spec formats.

**Reasoning:** Modern enterprises operate a mix of REST and GraphQL APIs. Limiting to one format would exclude significant portions of the API catalog from day one. Each format gets its own rendering and mock strategy (Swagger UI for REST, GraphiQL for GraphQL).

---

### ADR-3: Mock Test Experience

**Options considered:**
- A) Spec-driven explorer only (Swagger UI / GraphiQL)
- B) Custom request builder only (Postman-style)
- **C) Both — spec-driven explorer as primary, request builder as secondary** ✅ chosen

**Decision:** Dual-mode mock tester: spec-driven interactive explorer plus a free-form request builder tab.

**Reasoning:** The spec-driven explorer (auto-generated from the uploaded spec) covers the majority of use cases and lowers the barrier to testing. The free-form builder handles cases where developers want to craft raw requests, test edge cases not in the spec, or work with APIs whose specs are incomplete.

---

### ADR-4: Mock Response Source

**Options considered:**
- **A) Generated from the spec** ✅ chosen — portal reads schemas and examples to produce synthetic responses
- B) Proxied to a real backend — developer provides a base URL
- C) Developer's choice — configurable per API

**Decision:** Responses are generated synthetically from the spec.

**Reasoning:** Spec-generated mocks require no infrastructure from the API owner and work at any stage of API development, including pre-implementation. This makes the portal useful as a design-first tool. Proxy mode can be added as a future enhancement without changing the core architecture.

---

### ADR-5: Portal Layout

**Options considered:**
- **A) Top Nav + Left Sidebar (Stripe/Twilio style, dark theme)** ✅ chosen
- B) Icon Sidebar + Dashboard Home (Linear/GitLab style)
- C) Light Hero + Card Grid (RapidAPI style, search-first)

**Decision:** Top navigation bar with a persistent left sidebar for org and category filtering. Dark theme.

**Reasoning:** The sidebar-first layout is familiar to developers, keeps the API catalog always one click away, and scales well as the number of orgs and categories grows. The dark theme fits developer aesthetics and aligns with tools the audience already uses daily (VS Code, GitHub, Vercel).

---

### ADR-6: API Publishing Permissions

**Options considered:**
- **A) Any org member can publish APIs** ✅ chosen
- B) Only org admins can publish
- C) Any member can submit; org admin must approve

**Decision:** Any member of an organization can publish APIs under that org.

**Reasoning:** A collaborative, open model encourages adoption and reduces admin bottlenecks. Org admins retain the ability to remove APIs; approval workflows can be added later if governance becomes a concern.

---

### ADR-7: Organization Management

**Options considered:**
- A) Self-service — any user can create orgs
- **B) Admin-only — portal super-admin creates orgs and assigns members** ✅ chosen
- C) Hybrid — users create orgs; super-admin moderates

**Decision:** A portal super-admin role creates and manages all organizations. Users cannot create orgs themselves.

**Reasoning:** Controlled org creation prevents namespace sprawl and ensures the catalog remains organized. Users can belong to multiple orgs (selected at registration, editable from profile), but org lifecycle is super-admin governed. This is the appropriate default for an enterprise context.

---

### ADR-8: API Documentation Model

**Options considered:**
- A) Spec only — uploaded spec is the documentation
- B) Spec + markdown pages — additional authored content alongside the spec
- **C) Spec + markdown pages + explicit versioning** ✅ chosen

**Decision:** Each API supports multiple published versions. Each version has its own spec file, a set of authored markdown doc pages (guides, getting started, changelog, etc.), and independent mock configuration.

**Reasoning:** APIs evolve. Versioned specs and docs let consumers pin to a specific version while owners iterate. Markdown pages allow richer documentation than a spec alone (tutorials, authentication guides, migration notes) which is critical for developer experience.

---

### ADR-9: Application Architecture

**Options considered:**
- A) Next.js Fullstack (single app, API Routes, Prisma) — simplest, one deployment
- B) Next.js + Separate Express API + Dedicated Mock Service — cleanest separation, independent scaling
- **C) Next.js + tRPC + Prisma (type-safe monorepo, Turborepo)** ✅ chosen

**Decision:** Next.js App Router frontend with tRPC running inside Next.js API routes, Prisma ORM for PostgreSQL, and a lightweight standalone mock-engine service for spec parsing and response generation. Managed as a Turborepo monorepo.

**Reasoning:** tRPC gives end-to-end TypeScript type safety with no code generation step — the API contract is enforced at compile time, which dramatically reduces runtime errors on a project of this complexity. The mock-engine remains a separate service to isolate CPU-heavy spec parsing from the main web server. Turborepo manages shared packages (Prisma client, tRPC router types, UI components) across apps cleanly.

---

## System Architecture

### Monorepo Structure

```
devportal/
├── apps/
│   ├── web/                  # Next.js 14 (App Router) — UI + tRPC server
│   └── mock-engine/          # Express service — spec parsing + response generation
├── packages/
│   ├── db/                   # Prisma schema + generated client (shared)
│   ├── trpc/                 # tRPC router definitions + shared types
│   └── ui/                   # Shared React component library
├── turbo.json
└── package.json
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| API layer | tRPC (type-safe RPC over HTTP, hosted in Next.js API routes) |
| ORM | Prisma |
| Database | PostgreSQL |
| Mock engine | Express (standalone), `@readme/openapi-parser`, `graphql` package |
| Spec rendering | `swagger-ui-react` (OpenAPI), `graphiql` (GraphQL) |
| Auth | NextAuth.js (Credentials provider — email/password) |
| Monorepo | Turborepo |
| File storage | Local filesystem (dev) / S3-compatible (prod) for spec files |

### Request Data Flow

```
Browser
  │
  ├── Page load → Next.js RSC (server components fetch via tRPC server-side)
  │
  ├── Client interaction → tRPC client → Next.js API route → tRPC router
  │     └── Prisma → PostgreSQL
  │
  └── Mock test → tRPC route → HTTP call → mock-engine
        └── Parse spec → Generate response from schema/examples → Return JSON
```

---

## Data Model

```prisma
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
  user   User         @relation(fields: [userId], references: [id])
  userId String
  org    Organization @relation(fields: [orgId], references: [id])
  orgId  String
  role   OrgRole      @default(MEMBER)
  joinedAt DateTime   @default(now())
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
  id         String      @id @default(cuid())
  api        API         @relation(fields: [apiId], references: [id])
  apiId      String
  version    String
  specKey    String      // storage key for the uploaded spec file
  specType   APIType
  status     VersionStatus @default(DRAFT)
  docPages   DocPage[]
  mockConfig MockConfig?
  publishedAt DateTime?
  createdAt  DateTime    @default(now())
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

enum UserRole     { USER SUPERADMIN }
enum OrgRole      { MEMBER ADMIN }
enum APIType      { REST GRAPHQL }
enum VersionStatus { DRAFT PUBLISHED DEPRECATED }
```

---

## Features & Pages

### Authentication
- **Register** — email, name, password, select org(s) from list (super-admin pre-creates orgs)
- **Login** — email + password via NextAuth Credentials
- **Forgot password** — email-based reset flow (requires transactional email service; Resend or SendGrid recommended)

### Browse (visible to all authenticated users)
All registered users can discover all published APIs regardless of org membership. Org membership controls the right to *publish*, not to *browse*.
- Left sidebar: filter by organization, category, API type (REST/GraphQL)
- Main area: API card grid — name, org, type badge, description, version count
- Global search across API names, descriptions, and endpoint paths/operation names (not full schema search)

### API Detail
- Version switcher (dropdown, shows PUBLISHED versions; DRAFT visible to owner)
- Tab: **Docs** — markdown doc pages (sidebar nav within the API)
- Tab: **Reference** — auto-rendered Swagger UI (REST) or GraphiQL (GraphQL)
- Tab: **Try It** — mock tester (see below)

### Mock Tester
- **Spec-driven panel** — lists endpoints/operations from the spec; select one, fill params, click Send; mock-engine returns synthetic response generated from the spec's response schema and examples
- **Request builder tab** — free-form URL, method, headers, body editor; fires against mock-engine's generic handler
- Response panel shows status code, headers, JSON body with syntax highlighting

### Publish API
1. Select organization (from user's memberships)
2. Enter name, slug, category, description
3. Upload spec file (OpenAPI JSON/YAML or GraphQL SDL) — validated on upload
4. Set version string (semver)
5. Write markdown doc pages (optional, with live preview)
6. Publish or save as draft

### Profile
- Edit name, email, password
- **Org membership panel** — shows current orgs with roles; button to join additional orgs (select from list); leave org

### Super Admin
- Create / edit / archive organizations
- Assign org admin roles to users
- View all users and their org memberships
- View all APIs across all orgs

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- NextAuth session with JWT, short-lived tokens
- All tRPC procedures protected by session middleware; unauthorized calls return 401
- Super-admin procedures require `role === SUPERADMIN` check server-side
- Spec file uploads: validated against known OpenAPI and GraphQL parsers before storage; file size capped at 5 MB
- Mock engine accepts only spec keys (not arbitrary URLs) — no SSRF vector from request builder
- Browse is open to all authenticated users; published API metadata is not org-restricted
- Publish, edit, and delete operations are org-scoped — verified server-side against the user's `OrgMembership`
- Super-admin operations are protected by `role === SUPERADMIN` — not by org membership

---

## Error Handling

- tRPC procedures throw `TRPCError` with typed codes (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`)
- Frontend error boundary at layout level; procedure-level errors shown inline
- Spec upload failures surface parser error messages to the user
- Mock engine returns structured error JSON on parse failure or schema mismatch

---

## Out of Scope (future)

- SSO / enterprise identity provider integration
- Proxy mode for mock tests (forwarding to real backends)
- API approval workflows (admin review before publish)
- Self-service org creation
- API analytics / usage tracking
- CLI tool for spec upload
- Webhook subscriptions
