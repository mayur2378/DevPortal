# Phase 2C: Sandbox / Try Experience Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the sandbox/try experience by adding Postman collection export, structured cURL example generation, and a sample payload panel alongside the existing mock tester.

**Architecture:** A new `postman-generator.ts` utility converts OpenAPI specs to Postman Collection v2.1 format. A `curl-generator.ts` generates curl examples from OpenAPI operations. A new `/api/export-postman/[versionId]` route serves the collection as a downloadable JSON file. New components are added to the existing Try tab.

**Tech Stack:** Next.js 14, Tailwind CSS, TypeScript (no new npm packages required)

**Base branch:** post Phase 1 merge

---

## Files Created / Modified

| Action | Path |
|--------|------|
| Create | `apps/web/lib/postman-generator.ts` |
| Create | `apps/web/lib/curl-generator.ts` |
| Create | `apps/web/app/api/export-postman/[versionId]/route.ts` |
| Create | `apps/web/components/api-detail/PostmanExporter.tsx` |
| Create | `apps/web/components/api-detail/CurlExamples.tsx` |
| Create | `apps/web/components/api-detail/SamplePayloads.tsx` |
| Modify | `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/try/page.tsx` |

---

### Task 1: Build Postman collection generator

**Files:**
- Create: `apps/web/lib/postman-generator.ts`
- Test: `apps/web/__tests__/lib/postman-generator.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/__tests__/lib/postman-generator.test.ts
import { describe, it, expect } from "vitest";
import { generatePostmanCollection } from "@/lib/postman-generator";

const mockSpec = {
  info: { title: "Pet API", version: "1.0.0" },
  paths: {
    "/pets": {
      get: { operationId: "listPets", summary: "List pets", parameters: [], responses: { "200": { description: "OK" } } },
      post: { operationId: "createPet", summary: "Create pet", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: {} },
    },
  },
};

describe("generatePostmanCollection", () => {
  it("produces a Postman collection with info block", () => {
    const col = generatePostmanCollection(mockSpec as any, "https://api.example.com");
    expect(col.info.name).toBe("Pet API");
    expect(col.info.schema).toContain("postman");
  });

  it("creates an item for each path+method", () => {
    const col = generatePostmanCollection(mockSpec as any, "https://api.example.com");
    expect(col.item.length).toBeGreaterThanOrEqual(2);
  });

  it("sets the correct method on each item", () => {
    const col = generatePostmanCollection(mockSpec as any, "https://api.example.com");
    const get = col.item.find((i: any) => i.request.method === "GET");
    const post = col.item.find((i: any) => i.request.method === "POST");
    expect(get).toBeDefined();
    expect(post).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd apps/web && pnpm test __tests__/lib/postman-generator.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create `apps/web/lib/postman-generator.ts`**

```typescript
export interface PostmanCollection {
  info: { name: string; schema: string; description?: string };
  item: any[];
  variable: { key: string; value: string }[];
}

export function generatePostmanCollection(spec: any, baseUrl: string): PostmanCollection {
  const info = spec.info ?? {};
  const paths = spec.paths ?? {};
  const items: any[] = [];

  for (const [path, methods] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(methods) as [string, any][]) {
      if (!["get","post","put","patch","delete","head","options"].includes(method)) continue;
      const parameters = op.parameters ?? [];
      const queryParams = parameters.filter((p: any) => p.in === "query").map((p: any) => ({
        key: p.name, value: p.example ?? "", description: p.description ?? "", disabled: !p.required,
      }));
      const headers = parameters.filter((p: any) => p.in === "header").map((p: any) => ({
        key: p.name, value: p.example ?? "", description: p.description ?? "",
      }));
      headers.push({ key: "Content-Type", value: "application/json", description: "" });
      const body = op.requestBody?.content?.["application/json"]
        ? { mode: "raw", raw: JSON.stringify(op.requestBody.content["application/json"].example ?? { "_note": "Replace with actual payload" }, null, 2), options: { raw: { language: "json" } } }
        : undefined;

      items.push({
        name: op.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: headers,
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split("/").filter(Boolean),
            query: queryParams,
          },
          ...(body && { body }),
          description: op.description ?? op.summary ?? "",
        },
      });
    }
  }

  return {
    info: {
      name: info.title ?? "API Collection",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: info.description,
    },
    item: items,
    variable: [{ key: "baseUrl", value: baseUrl }],
  };
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd apps/web && pnpm test __tests__/lib/postman-generator.test.ts
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/postman-generator.ts apps/web/__tests__/lib/postman-generator.test.ts
git commit -m "feat(sandbox): add Postman collection generator"
```

---

### Task 2: Build cURL example generator

**Files:**
- Create: `apps/web/lib/curl-generator.ts`
- Test: `apps/web/__tests__/lib/curl-generator.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/web/__tests__/lib/curl-generator.test.ts
import { describe, it, expect } from "vitest";
import { generateCurlExamples } from "@/lib/curl-generator";

const mockSpec = {
  paths: {
    "/pets": {
      get: { operationId: "listPets", summary: "List pets", parameters: [{ name: "limit", in: "query", schema: { type: "integer" }, example: 10 }] },
      post: { operationId: "createPet", summary: "Create pet", requestBody: { content: { "application/json": { example: { name: "Rex", type: "dog" } } } } },
    },
  },
};

describe("generateCurlExamples", () => {
  it("generates curl for GET with query params", () => {
    const examples = generateCurlExamples(mockSpec as any, "https://api.example.com");
    const get = examples.find(e => e.method === "GET");
    expect(get?.curl).toContain("curl");
    expect(get?.curl).toContain("GET");
    expect(get?.curl).toContain("/pets");
  });

  it("generates curl for POST with body", () => {
    const examples = generateCurlExamples(mockSpec as any, "https://api.example.com");
    const post = examples.find(e => e.method === "POST");
    expect(post?.curl).toContain("-X POST");
    expect(post?.curl).toContain("--data");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd apps/web && pnpm test __tests__/lib/curl-generator.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create `apps/web/lib/curl-generator.ts`**

```typescript
export interface CurlExample {
  operationId: string;
  method: string;
  path: string;
  summary: string;
  curl: string;
}

export function generateCurlExamples(spec: any, baseUrl: string): CurlExample[] {
  const paths = spec.paths ?? {};
  const examples: CurlExample[] = [];

  for (const [path, methods] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(methods) as [string, any][]) {
      if (!["get","post","put","patch","delete"].includes(method)) continue;
      const queryParams = (op.parameters ?? []).filter((p: any) => p.in === "query");
      const queryString = queryParams.map((p: any) => `${p.name}=${p.example ?? `{${p.name}}`}`).join("&");
      const url = queryString ? `"${baseUrl}${path}?${queryString}"` : `"${baseUrl}${path}"`;
      const hasBody = !!op.requestBody;
      const bodyExample = op.requestBody?.content?.["application/json"]?.example;
      const bodyStr = bodyExample ? JSON.stringify(bodyExample) : "{}";

      const lines = ["curl -s \\", `  -X ${method.toUpperCase()} ${url} \\`, `  -H "Content-Type: application/json" \\`, `  -H "Authorization: Bearer {token}"`];
      if (hasBody) lines.push(` \\\n  --data '${bodyStr}'`);

      examples.push({
        operationId: op.operationId ?? `${method}-${path.replace(/\//g, "-")}`,
        method: method.toUpperCase(),
        path,
        summary: op.summary ?? "",
        curl: lines.join(" \\\n"),
      });
    }
  }
  return examples;
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
cd apps/web && pnpm test __tests__/lib/curl-generator.test.ts
```
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/curl-generator.ts apps/web/__tests__/lib/curl-generator.test.ts
git commit -m "feat(sandbox): add cURL example generator"
```

---

### Task 3: Create Postman export API route

**Files:**
- Create: `apps/web/app/api/export-postman/[versionId]/route.ts`

- [ ] **Step 1: Create export route**

```typescript
// apps/web/app/api/export-postman/[versionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCaller } from "@/lib/trpc/server";
import { generatePostmanCollection } from "@/lib/postman-generator";

export async function GET(req: NextRequest, { params }: { params: { versionId: string } }) {
  const caller = await createCaller();
  const version = await caller.apiVersion.getById({ id: params.versionId });

  let spec: any = null;
  if (version.specKey) {
    const specRes = await fetch(`${req.nextUrl.origin}/api/spec/${params.versionId}`);
    if (specRes.ok) spec = await specRes.json();
  } else if (version.specUrl) {
    const specRes = await fetch(version.specUrl);
    if (specRes.ok) spec = await specRes.json();
  }

  if (!spec) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  const baseUrl = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";
  const collection = generatePostmanCollection(spec, baseUrl);

  return new NextResponse(JSON.stringify(collection, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="postman-collection-v${version.version}.json"`,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/app/api/export-postman/"
git commit -m "feat(sandbox): add Postman collection export API route"
```

---

### Task 4: Build sandbox UI components

**Files:**
- Create: `apps/web/components/api-detail/PostmanExporter.tsx`
- Create: `apps/web/components/api-detail/CurlExamples.tsx`
- Create: `apps/web/components/api-detail/SamplePayloads.tsx`

- [ ] **Step 1: Create `PostmanExporter.tsx`**

```typescript
// apps/web/components/api-detail/PostmanExporter.tsx
interface Props { versionId: string; apiName: string }

export function PostmanExporter({ versionId, apiName }: Props) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div>
        <p className="text-white font-semibold text-sm">Postman Collection</p>
        <p className="text-slate-400 text-xs mt-0.5">Download a ready-to-import Postman collection for {apiName}</p>
      </div>
      <a
        href={`/api/export-postman/${versionId}`}
        download
        className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        Download Collection
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Create `CurlExamples.tsx`**

```typescript
// apps/web/components/api-detail/CurlExamples.tsx
"use client";
import { useState } from "react";
import { CurlExample } from "@/lib/curl-generator";

interface Props { examples: CurlExample[] }

export function CurlExamples({ examples }: Props) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(examples[selected].curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (examples.length === 0) return <p className="text-slate-500 text-sm">No cURL examples available.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, idx) => (
          <button key={ex.operationId} type="button" onClick={() => setSelected(idx)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selected === idx ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
            <span className={`mr-1 ${ex.method === "GET" ? "text-emerald-400" : ex.method === "POST" ? "text-sky-400" : ex.method === "DELETE" ? "text-red-400" : "text-amber-400"}`}>
              {ex.method}
            </span>
            {ex.path}
          </button>
        ))}
      </div>
      <div className="relative">
        <pre className="p-4 bg-slate-900 rounded-xl border border-slate-700/50 text-xs text-slate-300 overflow-x-auto font-mono whitespace-pre-wrap">
          {examples[selected].curl}
        </pre>
        <button type="button" onClick={copy}
          className="absolute top-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `SamplePayloads.tsx`**

```typescript
// apps/web/components/api-detail/SamplePayloads.tsx
"use client";
import { useState } from "react";

interface SamplePayload { operationId: string; method: string; path: string; request?: any; response?: any }
interface Props { payloads: SamplePayload[] }

export function SamplePayloads({ payloads }: Props) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"request" | "response">("request");
  if (payloads.length === 0) return <p className="text-slate-500 text-sm">No sample payloads available.</p>;
  const current = payloads[selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {payloads.map((p, idx) => (
          <button key={p.operationId} type="button" onClick={() => setSelected(idx)}
            className={`px-2.5 py-1 rounded text-xs font-medium ${selected === idx ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-400"}`}>
            {p.method} {p.path}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(["request", "response"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`px-3 py-1 rounded text-xs font-semibold ${view === v ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-500"}`}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      <pre className="p-4 bg-slate-900 rounded-xl border border-slate-700/50 text-xs text-slate-300 overflow-x-auto font-mono">
        {current[view] ? JSON.stringify(current[view], null, 2) : "No sample available"}
      </pre>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/api-detail/PostmanExporter.tsx apps/web/components/api-detail/CurlExamples.tsx apps/web/components/api-detail/SamplePayloads.tsx
git commit -m "feat(sandbox): add PostmanExporter, CurlExamples, SamplePayloads components"
```

---

### Task 5: Integrate components into the Try page

**Files:**
- Modify: `apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/try/page.tsx`

- [ ] **Step 1: Read the current try/page.tsx and add new sections**

After reading the file, add below the existing MockTester/RequestBuilder:

```typescript
import { PostmanExporter } from "@/components/api-detail/PostmanExporter";
import { CurlExamples } from "@/components/api-detail/CurlExamples";
import { SamplePayloads } from "@/components/api-detail/SamplePayloads";
import { generateCurlExamples } from "@/lib/curl-generator";
```

After fetching `apiVersion` and `spec`, add:

```typescript
const curlExamples = spec ? generateCurlExamples(spec, process.env.MOCK_ENGINE_URL ?? "http://localhost:3001") : [];

const samplePayloads = spec ? Object.entries(spec.paths ?? {}).flatMap(([path, methods]: [string, any]) =>
  Object.entries(methods).map(([method, op]: [string, any]) => ({
    operationId: op.operationId ?? `${method}-${path}`,
    method: method.toUpperCase(), path,
    request: op.requestBody?.content?.["application/json"]?.example,
    response: op.responses?.["200"]?.content?.["application/json"]?.example,
  }))
) : [];
```

Then render in the JSX below the existing tester:

```typescript
<div className="mt-8 space-y-6">
  <PostmanExporter versionId={apiVersion.id} apiName={api.name} />
  <div>
    <h2 className="text-lg font-semibold text-white mb-3">cURL Examples</h2>
    <CurlExamples examples={curlExamples} />
  </div>
  <div>
    <h2 className="text-lg font-semibold text-white mb-3">Sample Payloads</h2>
    <SamplePayloads payloads={samplePayloads} />
  </div>
</div>
```

- [ ] **Step 2: Build, test, commit**

```bash
pnpm build && pnpm test
git add .
git commit -m "chore(phase-2c): Phase 2C Sandbox polish complete"
```
