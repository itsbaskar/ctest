import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="fs-provider">{children}</div>
  ),
  useFileSystem: () => ({
    fileSystem: { getNode: () => null },
    selectedFile: null,
    setSelectedFile: vi.fn(),
    getFileContent: vi.fn(),
    updateFile: vi.fn(),
    getAllFiles: () => new Map(),
    refreshTrigger: 0,
  }),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-provider">{children}</div>
  ),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle</button>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="resizable-group" data-direction={props.direction}>
      {children}
    </div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: ({ className }: any) => (
    <div data-testid="resizable-handle" className={className} />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, className }: any) => (
    <button className={className}>{children}</button>
  ),
}));

import { MainContent } from "@/app/main-content";

describe("Dark mode integration", () => {
  beforeEach(() => {
    cleanup();
    document.documentElement.classList.add("dark");
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
  });

  test("outer container has dark:bg-neutral-950 class", () => {
    const { container } = render(<MainContent />);
    const outerDiv = container.querySelector('[class*="bg-neutral-50"]');
    expect(outerDiv?.className).toContain("dark:bg-neutral-950");
  });

  test("left panel has dark:bg-neutral-900 class", () => {
    const { container } = render(<MainContent />);
    const panels = container.querySelectorAll('[class*="bg-white"]');
    const hasPanel = Array.from(panels).some((el) =>
      el.className.includes("dark:bg-neutral-900")
    );
    expect(hasPanel).toBe(true);
  });

  test("title text has dark:text-neutral-50 class", () => {
    render(<MainContent />);
    const title = screen.getByText("React Component Generator");
    expect(title.className).toContain("dark:text-neutral-50");
  });

  test("header border has dark variant", () => {
    render(<MainContent />);
    const title = screen.getByText("React Component Generator");
    const header = title.closest("div");
    expect(header?.className).toContain("dark:border-neutral-800");
  });

  test("resizable handles have dark variants", () => {
    render(<MainContent />);
    const handles = screen.getAllByTestId("resizable-handle");
    handles.forEach((handle) => {
      expect(handle.className).toContain("dark:bg-neutral-800");
      expect(handle.className).toContain("dark:hover:bg-neutral-700");
    });
  });

  test("tabs list has dark variant classes", () => {
    render(<MainContent />);
    const tabsList = screen.getByTestId("tabs-list");
    expect(tabsList.className).toContain("dark:bg-neutral-800");
    expect(tabsList.className).toContain("dark:border-neutral-600");
  });

  test("tab triggers have dark active state classes", () => {
    render(<MainContent />);
    const previewTabs = screen.getAllByText("Preview");
    const tabButton = previewTabs.find((el) =>
      el.className.includes("data-[state=active]")
    );
    expect(tabButton?.className).toContain(
      "dark:data-[state=active]:bg-blue-500"
    );
    expect(tabButton?.className).toContain("data-[state=active]:text-white");
  });

  test("theme toggle is rendered", () => {
    render(<MainContent />);
    expect(screen.getByTestId("theme-toggle")).toBeDefined();
  });
});
