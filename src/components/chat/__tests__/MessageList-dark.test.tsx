import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { Message } from "ai";

vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

const assistantMessage: Message = {
  id: "1",
  role: "assistant",
  content: "Hello from assistant",
  parts: [{ type: "text" as const, text: "Hello from assistant" }],
};

const userMessage: Message = {
  id: "2",
  role: "user",
  content: "Hello",
};

describe("MessageList dark mode", () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  test("empty state icon container has dark variant", () => {
    render(<MessageList messages={[]} />);
    const heading = screen.getByText(
      "Start a conversation to generate React components"
    );
    expect(heading.className).toContain("dark:text-neutral-50");
  });

  test("empty state subtitle has dark variant", () => {
    render(<MessageList messages={[]} />);
    const subtitle = screen.getByText(
      "I can help you create buttons, forms, cards, and more"
    );
    expect(subtitle.className).toContain("dark:text-neutral-400");
  });

  test("empty state icon bg has dark variant", () => {
    const { container } = render(<MessageList messages={[]} />);
    const iconContainer = container.querySelector(".bg-blue-50");
    expect(iconContainer?.className).toContain("dark:bg-blue-950");
  });

  test("assistant message bubble has dark variants", () => {
    render(<MessageList messages={[assistantMessage]} />);
    const bubble = screen
      .getByText("Hello from assistant")
      .closest(".rounded-xl");
    expect(bubble?.className).toContain("dark:bg-neutral-800");
    expect(bubble?.className).toContain("dark:text-neutral-50");
    expect(bubble?.className).toContain("dark:border-neutral-700");
  });

  test("assistant avatar has dark variants", () => {
    const { container } = render(
      <MessageList messages={[assistantMessage]} />
    );
    const avatar = container.querySelector(".w-9.h-9.rounded-lg");
    expect(avatar?.className).toContain("dark:bg-neutral-800");
    expect(avatar?.className).toContain("dark:border-neutral-700");
  });

  test("user message retains blue styling in dark mode", () => {
    render(<MessageList messages={[userMessage]} />);
    const bubble = screen.getByText("Hello").closest(".rounded-xl");
    expect(bubble?.className).toContain("bg-blue-600");
    expect(bubble?.className).toContain("text-white");
  });
});
