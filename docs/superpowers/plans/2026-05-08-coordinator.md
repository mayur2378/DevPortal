# Enterprise Portal Upgrade — Coordinator Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orchestrate the 4-phase parallel-agent upgrade of DevPortal from MVP to full Enterprise API Developer Portal.

**Architecture:** This coordinator owns the plan files, dispatches isolated subagents per phase via git worktrees, enforces verification gates between phases, and merges completed branches. Phases 1–3 each run 3 agents in parallel. Phase 0 runs sequentially on the main branch.

**Tech Stack:** Claude Code CLI, git worktrees, pnpm, Prisma, Next.js 14, Vercel

---

## Sub-plan Files

| File | Agent | Phase |
|------|-------|-------|
| `docs/superpowers/plans/2026-05-08-phase-0-foundation.md` | Phase 0 | 0 (sequential) |
| `docs/superpowers/plans/2026-05-08-phase-1a-catalog.md` | Agent A | 1 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-1b-onboarding.md` | Agent B | 1 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-1c-admin.md` | Agent C | 1 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-2a-governance.md` | Agent D | 2 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-2b-lifecycle.md` | Agent E | 2 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-2c-sandbox.md` | Agent F | 2 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-3a-analytics.md` | Agent G | 3 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-3b-support.md` | Agent H | 3 (parallel) |
| `docs/superpowers/plans/2026-05-08-phase-3c-products.md` | Agent I | 3 (parallel) |

---

### Task 1: Verify starting state

**Files:** None

- [ ] **Step 1: Confirm git status is clean**

```bash
git status
```
Expected: `nothing to commit, working tree clean`. If not, commit or stash before proceeding.

- [ ] **Step 2: Confirm all plan files exist**

```bash
ls docs/superpowers/plans/
```
Expected: All 10 sub-plan files listed above are present.

- [ ] **Step 3: Verify the build passes before starting**

```bash
pnpm build
```
Expected: Exits 0 with no TypeScript errors.

- [ ] **Step 4: Note current branch name**

```bash
git branch --show-current
```
Save this as the base branch (e.g., `main`). All phase agents branch from here after Phase 0 merges.

---

### Task 2: Execute Phase 0 — Foundation (sequential)

- [ ] **Step 1: Dispatch Phase 0 agent on the current branch (no worktree)**

Use skill: `superpowers:dispatching-parallel-agents`

Prompt the single Phase 0 agent:
> "You are the Phase 0 Foundation agent for the Enterprise Portal upgrade. Read and execute ALL tasks in `docs/superpowers/plans/2026-05-08-phase-0-foundation.md`. Work directly on the current branch (do not create a worktree — Phase 0 is sequential and its output is the base for all Phase 1 agents). Use the `superpowers:executing-plans` skill to step through every task. When done, confirm the build passes and report completion."

- [ ] **Step 2: Wait for Phase 0 to complete before continuing**

Do not continue to Task 3 until the Phase 0 agent explicitly confirms completion.

---

### Task 3: Verify Phase 0 gate

- [ ] **Step 1: Validate Prisma schema**

```bash
cd packages/db && npx prisma validate
```
Expected: `The schema at .../schema.prisma is valid 🚀`

- [ ] **Step 2: Confirm generated Prisma client includes new types**

```bash
grep -l "Application\|GovernanceChecklist\|APIProduct" packages/db/node_modules/.prisma/client/index.d.ts
```
Expected: Prints the file path (types exist in generated client).

- [ ] **Step 3: Full build**

```bash
pnpm build
```
Expected: Exits 0.

- [ ] **Step 4: Full test suite**

```bash
pnpm test
```
Expected: All tests pass.

---

### Task 4: Dispatch Phase 1 — three agents in parallel

- [ ] **Step 1: Dispatch Agents A, B, and C simultaneously**

Use skill: `superpowers:dispatching-parallel-agents`

**Agent A prompt:**
> "You are Agent A — API Catalog for the Enterprise Portal upgrade. Create an isolated git worktree from the current main branch, then read and execute ALL tasks in `docs/superpowers/plans/2026-05-08-phase-1a-catalog.md` using `superpowers:using-git-worktrees` and `superpowers:executing-plans`. Your worktree branch name must be `phase-1a-catalog`. When done, confirm the build passes inside your worktree and report your branch name."

**Agent B prompt:**
> "You are Agent B — Developer Onboarding for the Enterprise Portal upgrade. Create an isolated git worktree from the current main branch with branch name `phase-1b-onboarding`, then read and execute ALL tasks in `docs/superpowers/plans/2026-05-08-phase-1b-onboarding.md`. Use `superpowers:using-git-worktrees` and `superpowers:executing-plans`. When done, confirm the build passes and report your branch name."

**Agent C prompt:**
> "You are Agent C — Admin Console for the Enterprise Portal upgrade. Create an isolated git worktree from the current main branch with branch name `phase-1c-admin`, then read and execute ALL tasks in `docs/superpowers/plans/2026-05-08-phase-1c-admin.md`. Use `superpowers:using-git-worktrees` and `superpowers:executing-plans`. When done, confirm the build passes and report your branch name."

- [ ] **Step 2: Wait for all three agents to report completion**

---

### Task 5: Merge Phase 1 branches and verify gate

- [ ] **Step 1: Merge Agent A**

```bash
git merge phase-1a-catalog --no-ff -m "feat: Phase 1A — API Catalog upgrades"
```

- [ ] **Step 2: Merge Agent B**

```bash
git merge phase-1b-onboarding --no-ff -m "feat: Phase 1B — Developer Onboarding"
```

- [ ] **Step 3: Merge Agent C**

```bash
git merge phase-1c-admin --no-ff -m "feat: Phase 1C — Admin Console upgrades"
```

- [ ] **Step 4: Resolve expected merge conflicts**

Likely conflict files (all agents add sidebar links and tRPC routers):
- `apps/web/components/layout/Sidebar.tsx` — keep all nav links from all three agents
- `packages/trpc/src/index.ts` — keep all new router imports and registrations
- `packages/db/prisma/seed.ts` — keep all seed additions

After resolving:
```bash
git add .
git commit -m "merge: resolve Phase 1 parallel agent conflicts"
```

- [ ] **Step 5: Phase 1 gate verification**

```bash
pnpm build && pnpm test
```
Expected: All pass.

---

### Task 6: Dispatch Phase 2 — three agents in parallel

- [ ] **Step 1: Dispatch Agents D, E, and F simultaneously**

Use skill: `superpowers:dispatching-parallel-agents`

**Agent D prompt:**
> "You are Agent D — Governance for the Enterprise Portal upgrade. Create a worktree with branch `phase-2a-governance` from the current main branch (post Phase 1 merge). Execute `docs/superpowers/plans/2026-05-08-phase-2a-governance.md` fully. Report completion and branch name."

**Agent E prompt:**
> "You are Agent E — Lifecycle Management for the Enterprise Portal upgrade. Create a worktree with branch `phase-2b-lifecycle` from the current main branch (post Phase 1 merge). Execute `docs/superpowers/plans/2026-05-08-phase-2b-lifecycle.md` fully. Report completion and branch name."

**Agent F prompt:**
> "You are Agent F — Sandbox/Try Experience for the Enterprise Portal upgrade. Create a worktree with branch `phase-2c-sandbox` from the current main branch (post Phase 1 merge). Execute `docs/superpowers/plans/2026-05-08-phase-2c-sandbox.md` fully. Report completion and branch name."

- [ ] **Step 2: Wait for all three agents to report completion**

---

### Task 7: Merge Phase 2 branches and verify gate

- [ ] **Step 1: Merge all Phase 2 branches**

```bash
git merge phase-2a-governance --no-ff -m "feat: Phase 2A — Governance module"
git merge phase-2b-lifecycle --no-ff -m "feat: Phase 2B — Lifecycle management"
git merge phase-2c-sandbox --no-ff -m "feat: Phase 2C — Sandbox polish"
```

- [ ] **Step 2: Resolve conflicts and verify gate**

```bash
pnpm build && pnpm test
```
Expected: All pass.

---

### Task 8: Dispatch Phase 3 — three agents in parallel

- [ ] **Step 1: Dispatch Agents G, H, and I simultaneously**

Use skill: `superpowers:dispatching-parallel-agents`

**Agent G prompt:**
> "You are Agent G — Consumer Analytics. Create worktree branch `phase-3a-analytics` from current main (post Phase 2). Execute `docs/superpowers/plans/2026-05-08-phase-3a-analytics.md` fully."

**Agent H prompt:**
> "You are Agent H — Support & Collaboration. Create worktree branch `phase-3b-support` from current main (post Phase 2). Execute `docs/superpowers/plans/2026-05-08-phase-3b-support.md` fully."

**Agent I prompt:**
> "You are Agent I — API Productization. Create worktree branch `phase-3c-products` from current main (post Phase 2). Execute `docs/superpowers/plans/2026-05-08-phase-3c-products.md` fully."

---

### Task 9: Merge Phase 3, final verification, and deploy

- [ ] **Step 1: Merge all Phase 3 branches**

```bash
git merge phase-3a-analytics --no-ff -m "feat: Phase 3A — Consumer Analytics"
git merge phase-3b-support --no-ff -m "feat: Phase 3B — Support & Collaboration"
git merge phase-3c-products --no-ff -m "feat: Phase 3C — API Productization"
```

- [ ] **Step 2: Final gate**

```bash
pnpm build && pnpm test
```
Expected: All pass.

- [ ] **Step 3: Deploy to Vercel**

```bash
cd apps/web && npx vercel --prod
```
Or push to the Vercel-connected git branch for auto-deploy.

- [ ] **Step 4: Smoke-test live URL**

Visit the live Vercel URL and confirm:
- Home dashboard loads
- `/browse` shows API catalog
- `/my-apps` loads (for consumers)
- `/governance` loads (for reviewers)
- `/analytics` loads
- `/products` loads
- No console errors on any page
