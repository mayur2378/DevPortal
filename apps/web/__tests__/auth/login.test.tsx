import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock("next-auth/react", () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true }),
}));

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
