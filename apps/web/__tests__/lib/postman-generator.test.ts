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
