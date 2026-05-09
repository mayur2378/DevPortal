import { describe, it, expect } from "vitest";
import { hasRole, canApproveRequests, canReviewGovernance, isAdmin } from "@/lib/rbac";

const mockSession = (role: string) => ({ user: { role, id: "u1", email: "a@b.com", name: "A" } });

describe("hasRole", () => {
  it("returns true when user has the exact role", () => {
    expect(hasRole(mockSession("GOVERNANCE_REVIEWER"), "GOVERNANCE_REVIEWER")).toBe(true);
  });
  it("SUPERADMIN passes any role check", () => {
    expect(hasRole(mockSession("SUPERADMIN"), "GOVERNANCE_REVIEWER")).toBe(true);
  });
  it("returns false for wrong role", () => {
    expect(hasRole(mockSession("USER"), "API_PRODUCT_OWNER")).toBe(false);
  });
});

describe("canApproveRequests", () => {
  it("true for API_PRODUCT_OWNER", () => {
    expect(canApproveRequests(mockSession("API_PRODUCT_OWNER"))).toBe(true);
  });
  it("true for SUPERADMIN", () => {
    expect(canApproveRequests(mockSession("SUPERADMIN"))).toBe(true);
  });
  it("false for USER", () => {
    expect(canApproveRequests(mockSession("USER"))).toBe(false);
  });
});

describe("canReviewGovernance", () => {
  it("true for GOVERNANCE_REVIEWER", () => {
    expect(canReviewGovernance(mockSession("GOVERNANCE_REVIEWER"))).toBe(true);
  });
});

describe("isAdmin", () => {
  it("true for SUPERADMIN", () => {
    expect(isAdmin(mockSession("SUPERADMIN"))).toBe(true);
  });
  it("false for API_PRODUCT_OWNER", () => {
    expect(isAdmin(mockSession("API_PRODUCT_OWNER"))).toBe(false);
  });
});
