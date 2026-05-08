import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgMembershipPanel } from "@/components/profile/OrgMembershipPanel";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    org: {
      leave: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      join: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const myOrgs = [{ org: { id: "o1", name: "Acme Corp", slug: "acme" }, role: "MEMBER" as const }];
const allOrgs = [
  { id: "o1", name: "Acme Corp", slug: "acme" },
  { id: "o2", name: "TechCo", slug: "techco" },
];

describe("OrgMembershipPanel", () => {
  it("shows orgs the user belongs to", () => {
    render(<OrgMembershipPanel memberships={myOrgs} allOrgs={allOrgs} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows joinable orgs not yet joined", () => {
    render(<OrgMembershipPanel memberships={myOrgs} allOrgs={allOrgs} />);
    expect(screen.getByText("TechCo")).toBeInTheDocument();
  });
});
