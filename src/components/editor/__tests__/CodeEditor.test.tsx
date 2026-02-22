import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const mockUpdateFile = vi.fn();
const mockGetFileContent = vi.fn().mockReturnValue("");
const mockUseFileSystem = vi.fn().mockReturnValue({
  selectedFile: null,
  getFileContent: mockGetFileContent,
  updateFile: mockUpdateFile,
});

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: () => mockUseFileSystem(),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    language,
    onChange,
  }: {
    value: string;
    language: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      data-testid="mock-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("lucide-react", () => ({
  Code2: (props: any) => <div data-testid="code2-icon" {...props} />,
}));

import { CodeEditor } from "../CodeEditor";

describe("CodeEditor", () => {
  beforeEach(() => {
    cleanup();
    mockUpdateFile.mockReset();
    mockGetFileContent.mockReset().mockReturnValue("");
  });

  test("shows empty state when no file selected", () => {
    mockUseFileSystem.mockReturnValue({
      selectedFile: null,
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });
    render(<CodeEditor />);
    expect(screen.getByText("Select a file to edit")).toBeDefined();
  });

  describe("language detection", () => {
    const cases: [string, string][] = [
      ["/App.jsx", "javascript"],
      ["/index.js", "javascript"],
      ["/App.tsx", "typescript"],
      ["/util.ts", "typescript"],
      ["/data.json", "json"],
      ["/style.css", "css"],
      ["/page.html", "html"],
      ["/readme.md", "markdown"],
      ["/unknown.xyz", "plaintext"],
    ];

    test.each(cases)("file %s → language %s", (path, lang) => {
      mockUseFileSystem.mockReturnValue({
        selectedFile: path,
        getFileContent: mockGetFileContent,
        updateFile: mockUpdateFile,
      });

      render(<CodeEditor />);
      const editor = screen.getByTestId("mock-editor");
      expect(editor.getAttribute("data-language")).toBe(lang);
      cleanup();
    });
  });

  test("calls updateFile on editor change", () => {
    mockUseFileSystem.mockReturnValue({
      selectedFile: "/test.jsx",
      getFileContent: mockGetFileContent,
      updateFile: mockUpdateFile,
    });

    render(<CodeEditor />);
    const editor = screen.getByTestId("mock-editor");
    fireEvent.change(editor, { target: { value: "new code" } });
    expect(mockUpdateFile).toHaveBeenCalledWith("/test.jsx", "new code");
  });
});
