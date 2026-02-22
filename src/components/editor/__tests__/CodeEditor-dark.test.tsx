import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: () => ({
    selectedFile: null,
    getFileContent: vi.fn(),
    updateFile: vi.fn(),
  }),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({ theme }: any) => (
    <div data-testid="monaco-editor" data-theme={theme} />
  ),
}));

import { CodeEditor } from "../CodeEditor";

describe("CodeEditor dark mode", () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  test("empty state uses adaptive background classes", () => {
    render(<CodeEditor />);
    const container = screen
      .getByText("Select a file to edit")
      .closest(".h-full");
    expect(container?.className).toContain("bg-neutral-50");
    expect(container?.className).toContain("dark:bg-neutral-900");
  });

  test("empty state icon has dark variant", () => {
    const { container } = render(<CodeEditor />);
    const icon = container.querySelector("svg");
    expect(icon?.classList.toString()).toContain("dark:text-neutral-600");
  });

  test("empty state text has dark variant", () => {
    render(<CodeEditor />);
    const text = screen.getByText("Select a file to edit");
    expect(text.className).toContain("dark:text-neutral-400");
  });
});
