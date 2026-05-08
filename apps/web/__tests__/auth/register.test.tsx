import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "@/components/auth/RegisterForm";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    auth: {
      register: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({ id: "user-1" }),
          isPending: false,
        }),
      },
    },
  },
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("RegisterForm", () => {
  it("renders all required fields", () => {
    render(<RegisterForm orgs={[{ id: "org-1", name: "Acme Corp", slug: "acme" }]} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows error when email is missing", async () => {
    render(<RegisterForm orgs={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    );
  });
});
