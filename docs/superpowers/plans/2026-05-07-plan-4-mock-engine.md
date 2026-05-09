# Developer Portal — Plan 4: Mock Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **UI tasks:** Invoke `frontend-design:frontend-design` skill before writing any JSX. Dark theme, Stripe/Twilio aesthetic.

**Goal:** Build the standalone mock engine service that parses OpenAPI and GraphQL specs and returns synthetic responses. Wire it into the "Try It" tab with a spec-driven panel and a free-form request builder.

**Architecture:** A lightweight Express service (`apps/mock-engine`) exposes two endpoints: `POST /mock/rest` (OpenAPI) and `POST /mock/graphql` (GraphQL). It reads spec files from the shared `.spec-storage` directory. The Next.js web app proxies mock test requests through a tRPC procedure or a Next.js API route to the mock engine. The "Try It" tab has two modes: spec-driven (auto-lists operations from the spec) and free-form (Postman-style request builder).

**Tech Stack:** Express, `@readme/openapi-parser`, `openapi-response-mocker`, `graphql`, Vitest, React, Tailwind CSS

**Prerequisite:** Plan 3 complete (spec files stored, API detail page with placeholder Try It tab).

---

## File Map

```
apps/mock-engine/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                       # Express server entrypoint
│   ├── routes/
│   │   ├── rest.ts                    # POST /mock/rest
│   │   └── graphql.ts                 # POST /mock/graphql
│   └── generators/
│       ├── openapi.ts                 # Parse OpenAPI spec, pick operation, generate response
│       └── graphql.ts                 # Parse GraphQL SDL, generate mock resolver data
└── __tests__/
    ├── generators/openapi.test.ts
    └── generators/graphql.test.ts

apps/web/
├── app/
│   └── api/
│       ├── mock/
│       │   ├── rest/
│       │   │   └── route.ts           # POST — proxy to mock-engine /mock/rest
│       │   └── graphql/
│       │       └── [versionId]/
│       │           └── route.ts       # POST — proxy to mock-engine /mock/graphql
└── components/
    └── api-detail/
        ├── MockTester.tsx             # Tab container: spec-driven | request builder
        ├── SpecDrivenPanel.tsx        # Lists operations, fills params, fires mock
        └── RequestBuilder.tsx         # Free-form URL/method/headers/body editor

apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/try/
└── page.tsx                           # Replace placeholder with MockTester
```

---

## Task 1: Bootstrap Mock Engine Service

**Files:**
- Create: `apps/mock-engine/package.json`
- Create: `apps/mock-engine/tsconfig.json`
- Create: `apps/mock-engine/src/index.ts`

- [ ] **Step 1: Create apps/mock-engine/package.json**

```json
{
  "name": "@devportal/mock-engine",
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@devportal/db": "*",
    "express": "^4.19.0",
    "cors": "^2.8.5",
    "graphql": "^16.9.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "tsx": "^4.11.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

Run `npm install` from root.

- [ ] **Step 2: Create apps/mock-engine/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*", "__tests__/**/*"]
}
```

- [ ] **Step 3: Create src/index.ts**

```typescript
import express from "express";
import cors from "cors";
import { restRouter } from "./routes/rest";
import { graphqlRouter } from "./routes/graphql";

const app = express();
const PORT = process.env.MOCK_ENGINE_PORT ?? 3001;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/mock", restRouter);
app.use("/mock", graphqlRouter);

app.listen(PORT, () => {
  console.log(`Mock engine running on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Add to turbo.json dev pipeline and update root dev script**

In `turbo.json`, the existing `"dev"` pipeline entry already covers all apps. Add the mock-engine start port to `.env.local` for the web app:

```
MOCK_ENGINE_URL="http://localhost:3001"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mock-engine/
git commit -m "chore: bootstrap mock-engine express service"
```

---

## Task 2: OpenAPI Response Generator (TDD)

**Files:**
- Create: `apps/mock-engine/src/generators/openapi.ts`
- Create: `apps/mock-engine/__tests__/generators/openapi.test.ts`

- [ ] **Step 1: Install OpenAPI parser**

```bash
cd apps/mock-engine && npm install @readme/openapi-parser
```

- [ ] **Step 2: Write failing test**

Create `apps/mock-engine/__tests__/generators/openapi.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateOpenApiResponse } from "../../src/generators/openapi";

const petStoreSpec = {
  openapi: "3.0.0",
  info: { title: "Pets", version: "1.0.0" },
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        responses: {
          "200": {
            description: "A list of pets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                    },
                    required: ["id", "name"],
                  },
                },
                example: [{ id: 1, name: "Fluffy" }],
              },
            },
          },
        },
      },
    },
    "/pets/{id}": {
      get: {
        operationId: "getPet",
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

describe("generateOpenApiResponse", () => {
  it("returns the spec example when present", async () => {
    const result = await generateOpenApiResponse(petStoreSpec as any, "listPets", "200");
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual([{ id: 1, name: "Fluffy" }]);
  });

  it("generates data from schema when no example is present", async () => {
    const result = await generateOpenApiResponse(petStoreSpec as any, "getPet", "200");
    expect(result.statusCode).toBe(200);
    expect(result.body).toHaveProperty("id");
    expect(result.body).toHaveProperty("name");
  });

  it("throws when operationId is not found", async () => {
    await expect(
      generateOpenApiResponse(petStoreSpec as any, "nonExistent", "200")
    ).rejects.toThrow("Operation not found");
  });
});
```

- [ ] **Step 3: Run test — verify it FAILS**

```bash
cd apps/mock-engine && npm test
```

Expected: FAIL — `generateOpenApiResponse` not found.

- [ ] **Step 4: Implement openapi.ts**

Create `apps/mock-engine/src/generators/openapi.ts`:
```typescript
interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

function generateFromSchema(schema: any): unknown {
  if (!schema) return null;

  switch (schema.type) {
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        obj[key] = generateFromSchema(prop as any);
      }
      return obj;
    }
    case "array":
      return [generateFromSchema(schema.items)];
    case "string":
      if (schema.enum) return schema.enum[0];
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      return schema.example ?? "string";
    case "integer":
    case "number":
      return schema.example ?? 1;
    case "boolean":
      return schema.example ?? true;
    default:
      return null;
  }
}

function findOperation(spec: any, operationId: string): { method: string; path: string; operation: any } | null {
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if ((op as any).operationId === operationId) {
        return { method, path, operation: op };
      }
    }
  }
  return null;
}

export async function generateOpenApiResponse(
  spec: any,
  operationId: string,
  preferredStatus = "200"
): Promise<MockResponse> {
  const found = findOperation(spec, operationId);
  if (!found) throw new Error(`Operation not found: ${operationId}`);

  const { operation } = found;
  const responses = operation.responses ?? {};
  const statusKey = responses[preferredStatus] ? preferredStatus : Object.keys(responses)[0];
  const response = responses[statusKey];
  const statusCode = parseInt(statusKey, 10);

  const content = response?.content?.["application/json"];
  if (!content) return { statusCode, headers: { "Content-Type": "application/json" }, body: null };

  const body = content.example ?? content.examples?.[Object.keys(content.examples)[0]]?.value
    ?? generateFromSchema(content.schema);

  return { statusCode, headers: { "Content-Type": "application/json" }, body };
}
```

- [ ] **Step 5: Run tests — verify they PASS**

```bash
npm test
```

Expected: All 3 OpenAPI generator tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/mock-engine/src/generators/openapi.ts apps/mock-engine/__tests__/generators/openapi.test.ts
git commit -m "feat: openapi response generator with example and schema-based mocking"
```

---

## Task 3: GraphQL Response Generator (TDD)

**Files:**
- Create: `apps/mock-engine/src/generators/graphql.ts`
- Create: `apps/mock-engine/__tests__/generators/graphql.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/mock-engine/__tests__/generators/graphql.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { generateGraphQLResponse } from "../../src/generators/graphql";

const sdl = `
  type Query {
    user(id: ID!): User
    users: [User!]!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    age: Int
    active: Boolean!
  }
`;

describe("generateGraphQLResponse", () => {
  it("generates a mock response for a simple query", async () => {
    const result = await generateGraphQLResponse(sdl, "{ user(id: \"1\") { id name email } }");
    expect(result.data).toHaveProperty("user");
    expect(result.data.user).toHaveProperty("id");
    expect(result.data.user).toHaveProperty("name");
  });

  it("generates array responses for list queries", async () => {
    const result = await generateGraphQLResponse(sdl, "{ users { id name } }");
    expect(Array.isArray(result.data.users)).toBe(true);
  });

  it("returns graphql errors for invalid queries", async () => {
    const result = await generateGraphQLResponse(sdl, "{ nonExistentField }");
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — verify it FAILS**

```bash
npm test
```

Expected: FAIL.

- [ ] **Step 3: Implement graphql.ts**

Create `apps/mock-engine/src/generators/graphql.ts`:
```typescript
import {
  buildSchema,
  graphql,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  isObjectType,
  isScalarType,
  isListType,
  isNonNullType,
  GraphQLSchema,
  GraphQLType,
} from "graphql";

function mockValue(type: GraphQLType): unknown {
  if (isNonNullType(type)) return mockValue(type.ofType);
  if (isListType(type)) return [mockValue(type.ofType)];
  if (isScalarType(type)) {
    const name = (type as GraphQLScalarType).name;
    if (name === "ID") return "mock-id-1";
    if (name === "String") return "mock-string";
    if (name === "Int") return 42;
    if (name === "Float") return 3.14;
    if (name === "Boolean") return true;
    return null;
  }
  if (isObjectType(type)) {
    const obj: Record<string, unknown> = {};
    const fields = (type as GraphQLObjectType).getFields();
    for (const [key, field] of Object.entries(fields)) {
      obj[key] = mockValue(field.type);
    }
    return obj;
  }
  return null;
}

function buildMockResolvers(schema: GraphQLSchema): Record<string, () => unknown> {
  const queryType = schema.getQueryType();
  if (!queryType) return {};

  const resolvers: Record<string, () => unknown> = {};
  for (const [fieldName, field] of Object.entries(queryType.getFields())) {
    resolvers[fieldName] = () => mockValue(field.type);
  }
  return resolvers;
}

export async function generateGraphQLResponse(
  sdl: string,
  query: string
): Promise<{ data?: any; errors?: readonly any[] }> {
  const schema = buildSchema(sdl);
  const rootValue = buildMockResolvers(schema);
  const result = await graphql({ schema, source: query, rootValue });
  return result as any;
}
```

- [ ] **Step 4: Run tests — verify they PASS**

```bash
npm test
```

Expected: All 3 GraphQL generator tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mock-engine/src/generators/graphql.ts apps/mock-engine/__tests__/generators/graphql.test.ts
git commit -m "feat: graphql response generator with schema-driven mock resolvers"
```

---

## Task 4: REST Mock Route

**Files:**
- Create: `apps/mock-engine/src/routes/rest.ts`

- [ ] **Step 1: Create REST route**

```typescript
// apps/mock-engine/src/routes/rest.ts
import { Router } from "express";
import { readSpec } from "@devportal/db";
import { generateOpenApiResponse } from "../generators/openapi";

export const restRouter = Router();

restRouter.post("/rest", async (req, res) => {
  const { specKey, operationId, preferredStatus } = req.body as {
    specKey: string;
    operationId: string;
    preferredStatus?: string;
  };

  if (!specKey || !operationId) {
    return res.status(400).json({ error: "specKey and operationId are required" });
  }

  try {
    const buffer = await readSpec(specKey);
    const spec = JSON.parse(buffer.toString("utf8").trim().startsWith("{")
      ? buffer.toString("utf8")
      : JSON.stringify(require("js-yaml").load(buffer.toString("utf8")))
    );

    const mock = await generateOpenApiResponse(spec, operationId, preferredStatus ?? "200");

    return res
      .status(mock.statusCode)
      .set(mock.headers)
      .json(mock.body);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
```

**Note:** Install `js-yaml` for YAML spec support:
```bash
cd apps/mock-engine && npm install js-yaml && npm install -D @types/js-yaml
```

- [ ] **Step 2: Commit**

```bash
git add apps/mock-engine/src/routes/rest.ts
git commit -m "feat: rest mock route — parses openapi spec and returns synthetic response"
```

---

## Task 5: GraphQL Mock Route

**Files:**
- Create: `apps/mock-engine/src/routes/graphql.ts`

- [ ] **Step 1: Create GraphQL route**

```typescript
// apps/mock-engine/src/routes/graphql.ts
import { Router } from "express";
import { readSpec } from "@devportal/db";
import { generateGraphQLResponse } from "../generators/graphql";

export const graphqlRouter = Router();

graphqlRouter.post("/graphql", async (req, res) => {
  const { specKey, query, variables } = req.body as {
    specKey: string;
    query: string;
    variables?: Record<string, unknown>;
  };

  if (!specKey || !query) {
    return res.status(400).json({ error: "specKey and query are required" });
  }

  try {
    const buffer = await readSpec(specKey);
    const sdl = buffer.toString("utf8");
    const result = await generateGraphQLResponse(sdl, query);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ errors: [{ message: err.message }] });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mock-engine/src/routes/graphql.ts
git commit -m "feat: graphql mock route — parses sdl and returns mock resolver response"
```

---

## Task 6: Web App Mock Proxy Routes

**Files:**
- Create: `apps/web/app/api/mock/rest/route.ts`
- Create: `apps/web/app/api/mock/graphql/[versionId]/route.ts`

These proxy requests from the browser to the mock engine, resolving the specKey server-side so the browser never sees internal storage keys.

- [ ] **Step 1: Create REST proxy route**

```typescript
// apps/web/app/api/mock/rest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@devportal/db";

const MOCK_ENGINE_URL = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { versionId, operationId, preferredStatus } = await req.json();

  const version = await prisma.apiVersion.findUnique({
    where: { id: versionId },
    select: { specKey: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Version not found or not published" }, { status: 404 });
  }

  const response = await fetch(`${MOCK_ENGINE_URL}/mock/rest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ specKey: version.specKey, operationId, preferredStatus }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

- [ ] **Step 2: Create GraphQL proxy route**

```typescript
// apps/web/app/api/mock/graphql/[versionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@devportal/db";

const MOCK_ENGINE_URL = process.env.MOCK_ENGINE_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest, { params }: { params: { versionId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ errors: [{ message: "Unauthorized" }] }, { status: 401 });

  const version = await prisma.apiVersion.findUnique({
    where: { id: params.versionId },
    select: { specKey: true, status: true },
  });
  if (!version || version.status !== "PUBLISHED") {
    return NextResponse.json({ errors: [{ message: "Not found" }] }, { status: 404 });
  }

  const body = await req.json();
  const response = await fetch(`${MOCK_ENGINE_URL}/mock/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ specKey: version.specKey, ...body }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/mock/
git commit -m "feat: mock proxy routes in web app — resolve specKey server-side"
```

---

## Task 7: Extract Operations from OpenAPI Spec

**Files:**
- Create: `apps/web/lib/spec-utils.ts`

The spec-driven panel needs to list all operations from the spec so the user can pick one. This runs client-side using the spec fetched from `/api/spec/[versionId]`.

- [ ] **Step 1: Create spec-utils.ts**

```typescript
// apps/web/lib/spec-utils.ts

export interface OperationInfo {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

export function extractOperations(spec: any): OperationInfo[] {
  const ops: OperationInfo[] = [];

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods as any)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        const operation = op as any;
        ops.push({
          operationId: operation.operationId ?? `${method}${path}`,
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses ?? {},
        });
      }
    }
  }

  return ops;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/spec-utils.ts
git commit -m "feat: spec-utils to extract operations list from openapi spec"
```

---

## Task 8: MockTester UI — Spec-Driven Panel + Request Builder

> Invoke `frontend-design:frontend-design` before writing JSX. Two-tab layout: "Spec Explorer" tab lists operations from the spec; selecting one shows params and a Send button. "Request Builder" tab is a free-form Postman-style panel.

**Files:**
- Create: `apps/web/components/api-detail/SpecDrivenPanel.tsx`
- Create: `apps/web/components/api-detail/RequestBuilder.tsx`
- Create: `apps/web/components/api-detail/MockTester.tsx`

- [ ] **Step 1: Invoke frontend-design skill then implement SpecDrivenPanel**

```typescript
// apps/web/components/api-detail/SpecDrivenPanel.tsx
"use client";

import { useState } from "react";
import type { OperationInfo } from "@/lib/spec-utils";
import { cn } from "@/lib/utils";

interface Props {
  operations: OperationInfo[];
  versionId: string;
  specType: "REST" | "GRAPHQL";
}

interface MockResult {
  status: number;
  body: unknown;
}

export function SpecDrivenPanel({ operations, versionId, specType }: Props) {
  const [selected, setSelected] = useState<OperationInfo | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendRequest() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/mock/rest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, operationId: selected.operationId }),
      });
      const body = await res.json();
      setResult({ status: res.status, body });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const methodColor: Record<string, string> = {
    GET: "text-emerald-400",
    POST: "text-sky-400",
    PUT: "text-amber-400",
    PATCH: "text-orange-400",
    DELETE: "text-red-400",
  };

  return (
    <div className="grid grid-cols-5 gap-4 h-[520px]">
      {/* Operations list */}
      <div className="col-span-2 overflow-y-auto border border-slate-800 rounded-xl">
        {operations.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm italic">No operations found in spec.</p>
        ) : (
          operations.map((op) => (
            <button
              key={op.operationId}
              onClick={() => { setSelected(op); setResult(null); }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800 transition-colors",
                selected?.operationId === op.operationId ? "bg-slate-800" : ""
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-xs font-bold font-mono", methodColor[op.method] ?? "text-slate-400")}>
                  {op.method}
                </span>
                <span className="text-xs text-slate-500 font-mono truncate">{op.path}</span>
              </div>
              {op.summary && <p className="text-xs text-slate-400 truncate">{op.summary}</p>}
            </button>
          ))
        )}
      </div>

      {/* Request + response panel */}
      <div className="col-span-3 flex flex-col gap-3">
        {selected ? (
          <>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold font-mono", methodColor[selected.method] ?? "text-slate-400")}>
                    {selected.method}
                  </span>
                  <span className="text-sm text-slate-300 font-mono">{selected.path}</span>
                </div>
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  {loading ? "Sending…" : "Send"}
                </button>
              </div>
              {selected.summary && <p className="text-xs text-slate-400">{selected.summary}</p>}
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-auto">
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {result ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded",
                      result.status < 300 ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                    )}>
                      {result.status}
                    </span>
                    <span className="text-xs text-slate-500">Mock response</span>
                  </div>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(result.body, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-slate-600 text-sm italic">Hit Send to see the mock response.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm italic border border-slate-800 rounded-xl">
            Select an operation from the list
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Invoke frontend-design skill then implement RequestBuilder**

```typescript
// apps/web/components/api-detail/RequestBuilder.tsx
"use client";

import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface Header { key: string; value: string }

export function RequestBuilder() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://");
  const [headers, setHeaders] = useState<Header[]>([{ key: "Content-Type", value: "application/json" }]);
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ status: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addHeader() {
    setHeaders([...headers, { key: "", value: "" }]);
  }

  function updateHeader(i: number, field: keyof Header, val: string) {
    const updated = [...headers];
    updated[i] = { ...updated[i], [field]: val };
    setHeaders(updated);
  }

  async function send() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const hdrs: Record<string, string> = {};
      for (const h of headers) {
        if (h.key) hdrs[h.key] = h.value;
      }

      const res = await fetch(url, {
        method,
        headers: hdrs,
        body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      });

      const text = await res.text();
      setResult({ status: res.status, body: text });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <div className="space-y-4">
      {/* URL bar */}
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sky-400 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={`${inputCls} flex-1 font-mono`}
          placeholder="https://api.example.com/endpoint"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold px-5 rounded-lg transition-colors text-sm"
        >
          {loading ? "…" : "Send"}
        </button>
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-slate-400">Headers</p>
          <button onClick={addHeader} className="text-xs text-sky-400 hover:text-sky-300">+ Add</button>
        </div>
        <div className="space-y-2">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
                placeholder="Key"
                className={`${inputCls} flex-1`}
              />
              <input
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
                placeholder="Value"
                className={`${inputCls} flex-1`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      {["POST", "PUT", "PATCH"].includes(method) && (
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Body (JSON)</p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className={`${inputCls} w-full font-mono`}
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {/* Response */}
      {(result || error) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {result && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  result.status < 300 ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                }`}>
                  {result.status}
                </span>
              </div>
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-60">
                {(() => { try { return JSON.stringify(JSON.parse(result.body), null, 2); } catch { return result.body; } })()}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Invoke frontend-design skill then implement MockTester**

```typescript
// apps/web/components/api-detail/MockTester.tsx
"use client";

import { useState } from "react";
import { SpecDrivenPanel } from "./SpecDrivenPanel";
import { RequestBuilder } from "./RequestBuilder";
import { cn } from "@/lib/utils";
import type { OperationInfo } from "@/lib/spec-utils";

const tabs = ["Spec Explorer", "Request Builder"] as const;

interface Props {
  operations: OperationInfo[];
  versionId: string;
  specType: "REST" | "GRAPHQL";
}

export function MockTester({ operations, versionId, specType }: Props) {
  const [tab, setTab] = useState<typeof tabs[number]>("Spec Explorer");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Spec Explorer" && (
        <SpecDrivenPanel operations={operations} versionId={versionId} specType={specType} />
      )}
      {tab === "Request Builder" && <RequestBuilder />}
    </div>
  );
}
```

- [ ] **Step 4: Replace Try It placeholder page**

```typescript
// apps/web/app/(portal)/api/[orgSlug]/[apiSlug]/[version]/try/page.tsx
import { createCaller } from "@/lib/trpc/server";
import { notFound } from "next/navigation";
import { MockTester } from "@/components/api-detail/MockTester";
import { extractOperations } from "@/lib/spec-utils";
import { readSpec } from "@devportal/db";

interface Props {
  params: { orgSlug: string; apiSlug: string; version: string };
}

export default async function TryItPage({ params }: Props) {
  const caller = await createCaller();
  const api = await caller.api.getBySlug({ orgSlug: params.orgSlug, apiSlug: params.apiSlug }).catch(() => null);
  if (!api) notFound();

  const publishedVersion = api.versions.find((v) => v.version === params.version);
  if (!publishedVersion) notFound();

  const versionFull = await caller.apiVersion.getSpecContent({ versionId: publishedVersion.id });
  let operations = [];

  if (api.type === "REST") {
    const buffer = await readSpec(versionFull.specKey);
    const text = buffer.toString("utf8");
    const spec = text.trim().startsWith("{") ? JSON.parse(text) : {};
    operations = extractOperations(spec);
  }

  return (
    <MockTester
      operations={operations}
      versionId={publishedVersion.id}
      specType={api.type as "REST" | "GRAPHQL"}
    />
  );
}
```

- [ ] **Step 5: Run all web tests**

```bash
cd apps/web && npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/api-detail/SpecDrivenPanel.tsx apps/web/components/api-detail/RequestBuilder.tsx apps/web/components/api-detail/MockTester.tsx apps/web/app/\(portal\)/api/ apps/web/lib/spec-utils.ts
git commit -m "feat: mock tester with spec-driven panel and free-form request builder"
```

---

## Task 9: Smoke Test End-to-End

- [ ] **Step 1: Start both services**

```bash
# Terminal 1
cd apps/mock-engine && npm run dev

# Terminal 2 (root)
npm run dev
```

- [ ] **Step 2: Verify mock engine health**

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 3: Test with a published REST API**

1. Go to http://localhost:3000/browse
2. Open any published REST API
3. Click "Try It" tab
4. Select an operation from the Spec Explorer
5. Click "Send" — verify a mock JSON response appears in the response panel
6. Switch to "Request Builder" — verify the free-form form renders and can send a request

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "test: mock engine smoke test passed end-to-end"
```

---

## Plan 4 Complete

**What was built:**
- `apps/mock-engine`: standalone Express service with OpenAPI and GraphQL mock generators (both tested)
- `/api/mock/rest` and `/api/mock/graphql/[versionId]` proxy routes in the web app
- `SpecDrivenPanel`: lists operations from spec, sends mock requests, shows synthetic response
- `RequestBuilder`: free-form Postman-style request panel
- `MockTester`: tabbed container wiring both panels into the Try It tab

**Next:** Plan 5 — Super Admin Panel (`docs/superpowers/plans/2026-05-07-plan-5-admin.md`)
