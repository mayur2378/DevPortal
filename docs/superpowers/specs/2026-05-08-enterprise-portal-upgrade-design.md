# Enterprise API Developer Portal — Upgrade Design

**Date:** 2026-05-08  
**Status:** Approved  
**Scope:** Upgrade current DevPortal MVP to full Enterprise API Developer Portal per spec

---

## 1. Overview

The current DevPortal is a functional API publishing and browsing tool. This upgrade transforms it into a full enterprise API developer portal covering: API catalog governance, developer onboarding, subscription workflows, lifecycle management, consumer analytics, support/collaboration, and API productization.

**What this is NOT:** An API gateway. No runtime traffic routing, throttling enforcement, proxying, or policy execution will be built. Fields describing those capabilities (auth type, rate limit policy, SLA) exist as documentation only.

---

## 2. Current State

### Existing Pages
| Page | Route | Status |
|------|-------|--------|
| Home | `/` | Exists |
| API Catalog | `/browse` | Partial |
| API Detail (Reference, Try, Docs tabs) | `/api/[orgSlug]/[apiSlug]/[version]/` | Partial |
| Publish Wizard | `/publish` | Exists |
| User Profile | `/profile` | Exists |
| Admin Dashboard | `/admin` | Partial |
| Admin — Orgs | `/admin/orgs` | Exists |
| Admin — Users | `/admin/users` | Exists |
| Auth pages (login, register, reset) | `/(auth)/` | Exists |

### Existing DB Models
`User`, `Organization`, `OrgMembership`, `Api`, `ApiVersion`, `DocPage`, `MockConfig`, `PasswordResetToken`

### Existing Roles
- `UserRole`: USER, SUPERADMIN
- `OrgRole`: MEMBER, ADMIN

### Existing Tech Stack
Next.js 14 + TypeScript, tRPC, Prisma + PostgreSQL, Tailwind CSS, NextAuth, Swagger UI, GraphiQL, Recharts, Zod, Anthropic SDK (doc gen), Mock Engine (Express)

---

## 3. Target State

Full implementation of 10 enterprise portal modules as specified:

1. API Catalog (upgraded)
2. API Documentation (upgraded)
3. Developer Onboarding (new)
4. Sandbox / Try Experience (upgraded)
5. Governance (new)
6. Lifecycle Management (new)
7. Consumer Analytics (new)
8. Support & Collaboration (new)
9. Admin Console (upgraded)
10. API Productization (new)

---

## 4. Gap Analysis

### Module 1 — API Catalog

**Exists:** Searchable catalog, filter by org/type/search, ApiCard + ApiGrid components, basic API metadata.

**Gaps:**
- No visibility flag (Internal / Partner / Public)
- No domain filter
- No tags system
- Only REST + GRAPHQL types; missing AsyncAPI, Events, Webhooks, SOAP
- Lifecycle status is DRAFT/PUBLISHED/DEPRECATED; needs Beta, Active, Retired
- No business capability field
- No system of record field
- No owner / support contact fields on API
- No version filter in catalog

---

### Module 2 — API Documentation

**Exists:** Swagger UI (OpenAPI rendering), GraphiQL, custom markdown DocPages, version switcher, AI doc generation.

**Gaps:**
- No AsyncAPI spec rendering
- No version history / changelog view
- No structured section for auth method, rate-limit policy, SLA (as doc fields)
- Spec can only be uploaded; no option to link by URL
- No pagination/filtering/sorting guidance section

---

### Module 3 — Developer Onboarding

**Exists:** Nothing relevant.

**Gaps (all new):**
- Application registration form + list (`/my-apps`, `/my-apps/register`)
- API subscription request workflow (`/subscribe/[apiId]`)
- Environment selection: Dev, Test, Stage, Prod
- Approval status tracking (consumer view)
- API owner approval queue (`/approvals`)
- Access request comments and history
- Mock client credentials display (not real gateway creds)

---

### Module 4 — Sandbox / Try Experience

**Exists:** MockTester, RequestBuilder, mock engine backend.

**Gaps:**
- No Postman collection export
- No structured cURL example section
- No test payload examples panel
- No sample request/response viewer separate from the live tester

---

### Module 5 — Governance

**Exists:** Nothing.

**Gaps (all new):**
- API design checklist (configurable per API type)
- Required metadata validation
- OpenAPI linting-style rule checks (naming, versioning, security docs)
- Data classification tags: Public, Internal, Confidential, Restricted
- PII / PHI indicator fields on API
- API quality scorecard (computed from checklist + linting)
- Governance dashboard (`/governance`)
- Governance review form for reviewers

---

### Module 6 — Lifecycle Management

**Exists:** VersionStatus enum (DRAFT, PUBLISHED, DEPRECATED). No UI beyond status badge.

**Gaps (all new):**
- API lifecycle dashboard (`/lifecycle`)
- Version management page per API
- Deprecation notices with target retirement date
- Consumer impact view (who uses deprecated APIs)
- Change request log
- Release notes per version
- API maturity score

---

### Module 7 — Consumer Analytics

**Exists:** Nothing.

**Gaps (all new):**
- Analytics dashboard (`/analytics`)
- Mock/imported usage data display
- API subscriptions by consumer chart
- Popular APIs chart (Recharts)
- Deprecated API consumers list
- API documentation views metric
- Access request trends chart
- Consumer application list

---

### Module 8 — Support & Collaboration

**Exists:** Nothing.

**Gaps (all new):**
- API owner contact card (on API detail page)
- FAQ section per API
- Support request form (`/support`)
- Discussion/comments section per API
- Known issues section
- Announcement banner (portal-wide, admin-managed)
- Release notes link

---

### Module 9 — Admin Console

**Exists:** Org list/detail, user list. Basic stats dashboard.

**Gaps:**
- API management (CRUD for APIs from admin)
- Tag and domain management
- Lifecycle state management
- Access request review queue
- Governance checklist configuration
- Import API spec page
- Announcement management
- API product management

---

### Module 10 — API Productization

**Exists:** Nothing.

**Gaps (all new):**
- API product catalog (`/products`)
- Product detail page (`/products/[slug]`)
- Product owner + roadmap
- Product documentation
- Associated APIs list
- Consumer eligibility
- Product-level subscription workflow

---

## 5. New Database Models

```
Application          — developer app registrations
SubscriptionRequest  — access request with status/comments/history
Subscription         — active API access grants
GovernanceChecklist  — checklist item definitions (admin-configured)
GovernanceReview     — completed review per API version
LifecycleEvent       — audit log of lifecycle state transitions
UsageMetric          — mock/imported usage data per API
SupportTicket        — support requests from consumers
Comment              — threaded comments per API
Announcement         — portal-wide banners (admin-managed)
Tag                  — taxonomy tags
Domain               — business domain groupings
APIProduct           — grouped API products
APIProductItem       — join table: APIProduct ↔ Api
```

### Additions to Existing Models
- `Api`: add `visibility` (INTERNAL/PARTNER/PUBLIC), `domain`, `tags`, `businessCapability`, `systemOfRecord`, `supportContact`, `piiIndicator`, `phiIndicator`, `dataClassification`, `gatewayRef`, `runtimeEndpoint`
- `ApiVersion`: add `lifecycleStatus` (DRAFT/BETA/ACTIVE/DEPRECATED/RETIRED), `retirementDate`, `changelog`, `releaseNotes`, `maturityScore`

---

## 6. New Roles

```
API_PRODUCT_OWNER    — manages APIs and approves access requests
API_DEVELOPER        — publishes and maintains APIs
API_CONSUMER         — registers apps and requests API access
GOVERNANCE_REVIEWER  — scores APIs and manages checklists
SUPPORT_USER         — handles support tickets
```

The existing `SUPERADMIN` + `OrgRole` (MEMBER/ADMIN) remain. A unified RBAC middleware layer will enforce page-level and action-level permissions.

---

## 7. New Pages

| Page | Route | Phase |
|------|-------|-------|
| My Applications | `/my-apps` | 1 |
| Register Application | `/my-apps/register` | 1 |
| My Subscriptions | `/my-subscriptions` | 1 |
| Request API Access | `/subscribe/[apiId]` | 1 |
| Approval Queue | `/approvals` | 1 |
| Admin — API Management | `/admin/apis` | 1 |
| Admin — Tags & Domains | `/admin/tags` | 1 |
| Admin — Import Spec | `/admin/import-spec` | 1 |
| Governance Dashboard | `/governance` | 2 |
| Governance Review | `/governance/[apiId]` | 2 |
| Lifecycle Dashboard | `/lifecycle` | 2 |
| API Version Manager | `/api/[org]/[api]/versions` | 2 |
| Analytics Dashboard | `/analytics` | 3 |
| Support Center | `/support` | 3 |
| API Product Catalog | `/products` | 3 |
| API Product Detail | `/products/[slug]` | 3 |

---

## 8. Execution Architecture — Parallel Agents

### Coordinator Agent
A Claude Code agent running in the terminal that:
- Owns the implementation plan file (the writing-plans output)
- Dispatches parallel subagents via the `superpowers:dispatching-parallel-agents` skill
- Each subagent runs in an isolated git worktree (`superpowers:using-git-worktrees`)
- Monitors completion and runs verification gates between phases
- Merges completed worktrees back to main and resolves conflicts
- Enforces phase gates before dispatching the next phase's agents

### Phase Structure

```
Phase 0: Foundation (sequential — 1 agent)
  └─ DB schema migrations (13 new models + field additions)
  └─ Role/permission system (5 new roles + RBAC middleware)
  └─ Shared UI primitives (status badges, visibility chips, env selectors)

  ↓ GATE: schema merged + types regenerated

Phase 1: Core Developer Experience (parallel — 3 agents)
  ├─ Agent A: API Catalog upgrades (visibility, domains, tags, new API types, extended status)
  ├─ Agent B: Developer Onboarding (app registration, subscription requests, approval queue)
  └─ Agent C: Admin Console upgrades (API mgmt, tags/domains, import spec, request review)

  ↓ GATE: Phase 1 merged + smoke tests pass

Phase 2: Governance + Lifecycle + Sandbox (parallel — 3 agents)
  ├─ Agent D: Governance module (checklist, linting, data classification, scorecard)
  ├─ Agent E: Lifecycle management (lifecycle dashboard, deprecation, consumer impact, maturity score)
  └─ Agent F: Sandbox / Try polish (Postman export, cURL examples, sample payloads)

  ↓ GATE: Phase 2 merged + smoke tests pass

Phase 3: Analytics + Collaboration + Products (parallel — 3 agents)
  ├─ Agent G: Consumer Analytics (dashboard, charts, usage data, trends)
  ├─ Agent H: Support & Collaboration (comments, tickets, FAQ, announcements)
  └─ Agent I: API Productization (product catalog, detail, roadmap, product subscriptions)

  ↓ GATE: Phase 3 merged + full smoke tests pass → DONE
```

### Phasing Summary Table

| Phase | Name | Agents | Runs | Prerequisite | Deliverables |
|-------|------|--------|------|--------------|--------------|
| 0 | Foundation | 1 (sequential) | Sequential | None | DB schema, roles, shared UI primitives |
| 1 | Core Developer Experience | A, B, C (parallel) | After Phase 0 gate | Schema merged + types generated | Catalog upgrades, Onboarding, Admin upgrades |
| 2 | Governance + Lifecycle + Sandbox | D, E, F (parallel) | After Phase 1 gate | Phase 1 smoke tests pass | Governance, Lifecycle, Sandbox polish |
| 3 | Analytics + Collaboration + Products | G, H, I (parallel) | After Phase 2 gate | Phase 2 smoke tests pass | Analytics, Support, API Products |

### Agent Responsibility Map

| Agent | Phase | Module | Key Deliverables |
|-------|-------|--------|------------------|
| Coordinator | All | Orchestration | Plan file, task assignment, gate enforcement, merge management |
| Phase 0 | 0 | Foundation | 14 new Prisma models, 5 new roles, RBAC middleware, shared badges/chips |
| Agent A | 1 | API Catalog + Docs | Visibility flags, domains, tags, AsyncAPI/Events/Webhooks/SOAP types, extended lifecycle status, AsyncAPI spec renderer, spec-link-by-URL in publish wizard, auth/rate-limit/SLA doc fields |
| Agent B | 1 | Developer Onboarding | App registration, subscription request workflow, approval queue, mock credentials |
| Agent C | 1 | Admin Console | API management CRUD, tag/domain mgmt, import spec, access request review |
| Agent D | 2 | Governance | Design checklist, linting rules, data classification, PII/PHI fields, quality scorecard |
| Agent E | 2 | Lifecycle | Lifecycle dashboard, deprecation notices, retirement dates, consumer impact, maturity score, version history / changelog view per API |
| Agent F | 2 | Sandbox | Postman export, cURL examples, sample payload panel, structured request/response viewer |
| Agent G | 3 | Analytics | Analytics dashboard, usage charts (Recharts), popular APIs, deprecated consumer list, trends |
| Agent H | 3 | Support & Collaboration | Comments per API, support tickets, FAQ, announcement banner, known issues |
| Agent I | 3 | API Products | Product catalog, product detail, product roadmap, product subscriptions |

### Worktree Strategy
Each parallel agent runs in an isolated git worktree. The coordinator merges each worktree back to main after the phase gate passes. Agents do NOT share worktrees within a phase.

### Verification Gates
Each gate requires:
1. `pnpm build` passes with no TypeScript errors
2. `pnpm test` passes
3. All new pages render without console errors
4. Prisma schema is valid (`prisma validate`)

---

## 9. Seed Data

The existing seed creates one admin user. Upgrade seed to include:
- 10 realistic healthcare/enterprise APIs (as specified: Customer, Claims, Provider, Member Eligibility, Payment Events, Prior Authorization, Salesforce Lead, SAP Order, Kafka Customer Events, Webhook Notification)
- Multiple lifecycle statuses, owners, versions, and governance scores
- Sample applications and subscriptions
- Sample governance reviews and scores
- Sample usage metrics
- Sample announcements

---

## 10. Non-Goals (Explicitly Out of Scope)

The following will NOT be built:
- API gateway / proxy / traffic routing
- Runtime throttling enforcement
- Real OAuth authorization server
- Real secrets vault / credential management
- Real mTLS handling
- Real policy enforcement engine
- Real monetization / billing engine

Fields documenting these capabilities (auth type, rate limit policy description, SLA, gateway reference) are included as metadata only.

---

## 11. Deployment

### Target: Vercel (Phase 0)

The portal is deployed to Vercel as the primary hosting target. The monorepo is already Turbo-based and Next.js 14 — both are natively supported by Vercel.

**What gets deployed:**
- `apps/web` → Vercel (Next.js app, serverless functions for API routes + tRPC)
- `apps/mock-engine` → Vercel as a separate project or as a Next.js API route rewrite (Express → serverless adapter)
- Database → Neon (serverless Postgres, Vercel-integrated) or Vercel Postgres

**Configuration required (Phase 0):**
- `vercel.json` at repo root pointing to `apps/web` as the build root
- All environment variables extracted to `.env.example` (no hardcoded localhost refs)
- `DATABASE_URL` + `DIRECT_URL` pointed at Neon/Vercel Postgres in production
- `NEXTAUTH_URL` set to the Vercel deployment URL
- Prisma generate step added to Vercel build command

**Future path to Docker (B):**
- Keep all config in environment variables (no Vercel-specific SDK usage)
- No `@vercel/blob`, `@vercel/analytics`, or other Vercel-locked packages unless behind an adapter interface
- This ensures the app can be containerized later without code changes

---

## 12. Gateway Integration Placeholders

The portal includes placeholder/connector stubs for future metadata sync with:
- MuleSoft Anypoint
- Apigee
- Kong
- Azure API Management
- AWS API Gateway

These are defined as interface contracts only — no runtime integration is implemented in this upgrade.

---

## 13. Success Criteria

- All 10 modules have at least one working page with real data from the database
- Seed data populates all 10 healthcare APIs with realistic metadata
- Role-based access enforces page visibility (consumer vs. owner vs. admin vs. reviewer)
- The portal passes a client demo: browse → discover → request access → approve → view governance score → view analytics
- TypeScript compiles clean, all tests pass
- UI is responsive and enterprise-grade (consistent with existing Tailwind styling)
- Portal is deployed to Vercel with a live public URL
- All environment variables are documented in `.env.example`
- No hardcoded `localhost` references remain in production code paths
