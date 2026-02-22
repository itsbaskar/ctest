import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageInput } from "../MessageInput";

describe("MessageInput dark mode", () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  test("form container has dark variants", () => {
    const { container } = render(
      <MessageInput
        input=""
        handleInputChange={vi.fn()}
        handleSubmit={vi.fn()}
        isLoading={false}
      />
    );
    const form = container.querySelector("form");
    expect(form?.className).toContain("dark:bg-neutral-900");
    expect(form?.className).toContain("dark:border-neutral-800");
  });

  test("textarea has dark variants", () => {
    render(
      <MessageInput
        input=""
        handleInputChange={vi.fn()}
        handleSubmit={vi.fn()}
        isLoading={false}
      />
    );
    const textarea = screen.getByPlaceholderText(
      "Describe the React component you want to create..."
    );
    expect(textarea.className).toContain("dark:bg-neutral-800/50");
    expect(textarea.className).toContain("dark:text-neutral-50");
    expect(textarea.className).toContain("dark:border-neutral-700");
    expect(textarea.className).toContain("dark:placeholder:text-neutral-500");
  });

  test("send button has dark hover variant", () => {
    const { container } = render(
      <MessageInput
        input="test"
        handleInputChange={vi.fn()}
        handleSubmit={vi.fn()}
        isLoading={false}
      />
    );
    const button = container.querySelector("button[type='submit']");
    expect(button?.className).toContain("dark:hover:bg-blue-950");
  });
});
