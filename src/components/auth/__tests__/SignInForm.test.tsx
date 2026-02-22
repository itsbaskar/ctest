import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignIn = vi.fn();
const mockUseAuth = vi.fn().mockReturnValue({
  signIn: mockSignIn,
  signUp: vi.fn(),
  isLoading: false,
});

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { SignInForm } from "../SignInForm";

describe("SignInForm", () => {
  beforeEach(() => {
    cleanup();
    mockSignIn.mockReset();
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: vi.fn(),
      isLoading: false,
    });
  });

  test("renders email and password fields", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  test("renders submit button", () => {
    render(<SignInForm />);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
  });

  test("submits form with email and password", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<SignInForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
  });

  test("calls onSuccess on successful sign in", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<SignInForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "pass1234");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(onSuccess).toHaveBeenCalled();
  });

  test("displays error on failed sign in", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const user = userEvent.setup();

    render(<SignInForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Invalid credentials")).toBeDefined();
  });

  test("shows loading state", () => {
    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: vi.fn(),
      isLoading: true,
    });

    render(<SignInForm />);
    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDefined();
    expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  });
});
