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
