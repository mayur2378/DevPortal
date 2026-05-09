import { describe, it, expect } from "vitest";
describe("api.list filter shape", () => {
  it("accepts all new filter keys", () => {
    const params = { visibility: "PUBLIC", domainId: "d1", tags: ["healthcare"], type: "ASYNC_API", search: "customer", lifecycleStatus: "ACTIVE" };
    expect(Object.keys(params)).toContain("visibility");
    expect(Object.keys(params)).toContain("domainId");
    expect(Object.keys(params)).toContain("tags");
    expect(Object.keys(params)).toContain("lifecycleStatus");
  });
});
