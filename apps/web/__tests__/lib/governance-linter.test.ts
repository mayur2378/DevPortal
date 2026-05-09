import { describe, it, expect } from "vitest";
import { lintApi } from "@/lib/governance-linter";

describe("lintApi", () => {
  it("passes when all fields are present and slug is kebab-case", () => {
    const result = lintApi({ name: "Customer API", slug: "customer-api", description: "Desc", type: "REST", visibility: "PUBLIC", supportContact: "team@co.com", specKey: "spec.json" });
    expect(result.score).toBeGreaterThan(70);
    expect(result.issues.length).toBe(0);
  });

  it("flags missing description", () => {
    const result = lintApi({ name: "X", slug: "x", description: "", type: "REST", visibility: "INTERNAL" });
    expect(result.issues).toContain("Missing description");
  });

  it("flags non-kebab-case slug", () => {
    const result = lintApi({ name: "My API", slug: "MyAPI", description: "ok", type: "REST", visibility: "INTERNAL" });
    expect(result.issues.some(i => i.includes("slug"))).toBe(true);
  });

  it("flags missing support contact", () => {
    const result = lintApi({ name: "X", slug: "x", description: "ok", type: "REST", visibility: "INTERNAL" });
    expect(result.issues).toContain("Missing support contact");
  });
});
