import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSignUp = vi.fn();
const mockUseAuth = vi.fn().mockReturnValue({
  signIn: vi.fn(),
  signUp: mockSignUp,
  isLoading: false,
});

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { SignUpForm } from "../SignUpForm";

describe("SignUpForm", () => {
  beforeEach(() => {
    cleanup();
    mockSignUp.mockReset();
    mockUseAuth.mockReturnValue({
      signIn: vi.fn(),
      signUp: mockSignUp,
      isLoading: false,
    });
  });

  test("renders all three fields", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  test("shows password mismatch error and does not call signUp", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.type(screen.getByLabelText("Confirm Password"), "password2");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Passwords do not match")).toBeDefined();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test("submits successfully when passwords match", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<SignUpForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.type(screen.getByLabelText("Confirm Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(mockSignUp).toHaveBeenCalledWith("a@b.com", "password1");
    expect(onSuccess).toHaveBeenCalled();
  });

  test("displays server error", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText("Email"), "a@b.com");
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.type(screen.getByLabelText("Confirm Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Email taken")).toBeDefined();
  });

  test("shows loading state", () => {
    mockUseAuth.mockReturnValue({
      signIn: vi.fn(),
      signUp: mockSignUp,
      isLoading: true,
    });

    render(<SignUpForm />);
    expect(
      screen.getByRole("button", { name: "Creating account..." })
    ).toBeDefined();
    expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  });
});
