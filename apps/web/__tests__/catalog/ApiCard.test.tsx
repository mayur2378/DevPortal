import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApiCard } from "@/components/catalog/ApiCard";

const api = {
  id: "a1",
  name: "Payments API",
  slug: "payments",
  type: "REST" as const,
  description: "Process payments",
  category: "Payments",
  org: { id: "o1", name: "Acme Corp", slug: "acme" },
  owner: { id: "u1", name: "Ada" },
  _count: { versions: 3 },
  createdAt: new Date(),
};

describe("ApiCard", () => {
  it("renders API name, org, type badge, and version count", () => {
    render(<ApiCard api={api} />);
    expect(screen.getByText("Payments API")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("REST")).toBeInTheDocument();
    expect(screen.getByText(/3 version/i)).toBeInTheDocument();
  });
});
