import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../SignInForm", () => ({
  SignInForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-in-form">
      <button onClick={onSuccess}>sign-in-success</button>
    </div>
  ),
}));

vi.mock("../SignUpForm", () => ({
  SignUpForm: ({ onSuccess }: { onSuccess?: () => void }) => (
    <div data-testid="sign-up-form">
      <button onClick={onSuccess}>sign-up-success</button>
    </div>
  ),
}));

import { AuthDialog } from "../AuthDialog";

describe("AuthDialog", () => {
  beforeEach(() => {
    cleanup();
  });

  test("renders sign-in form by default", () => {
    render(<AuthDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("sign-in-form")).toBeDefined();
    expect(screen.getByText("Welcome back")).toBeDefined();
  });

  test("renders sign-up form when defaultMode is signup", () => {
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );
    expect(screen.getByTestId("sign-up-form")).toBeDefined();
    expect(screen.getByText("Create an account")).toBeDefined();
  });

  test("switches from sign-in to sign-up", async () => {
    const user = userEvent.setup();
    render(<AuthDialog open={true} onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByTestId("sign-up-form")).toBeDefined();
  });

  test("switches from sign-up to sign-in", async () => {
    const user = userEvent.setup();
    render(
      <AuthDialog open={true} onOpenChange={vi.fn()} defaultMode="signup" />
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByTestId("sign-in-form")).toBeDefined();
  });

  test("calls onOpenChange(false) on success", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<AuthDialog open={true} onOpenChange={onOpenChange} />);
    await user.click(screen.getByText("sign-in-success"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
