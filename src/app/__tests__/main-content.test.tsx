import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="fs-provider">{children}</div>
  ),
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
  HeaderActions: ({ user, projectId }: any) => (
    <div data-testid="header-actions" data-user={user?.email} data-project={projectId} />
  ),
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, ...props }: any) => (
    <div data-testid="resizable-group" data-direction={props.direction}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock("@/components/ui/tabs", () => {
  let _onValueChange: ((value: string) => void) | undefined;

  return {
    Tabs: ({ children, value, onValueChange }: any) => {
      _onValueChange = onValueChange;
      return (
        <div data-testid="tabs" data-value={value}>
          {children}
        </div>
      );
    },
    TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, value }: any) => (
      <button
        data-testid={`tab-${value}`}
        onClick={() => _onValueChange?.(value)}
        role="tab"
      >
        {children}
      </button>
    ),
  };
});

import { MainContent } from "../main-content";

describe("MainContent", () => {
  beforeEach(() => {
    cleanup();
  });

  test("renders chat interface", () => {
    render(<MainContent />);
    expect(screen.getByTestId("chat-interface")).toBeDefined();
  });

  test("renders preview frame by default", () => {
    render(<MainContent />);
    expect(screen.getByTestId("preview-frame")).toBeDefined();
  });

  test("renders header with title", () => {
    render(<MainContent />);
    expect(screen.getByText("React Component Generator")).toBeDefined();
  });

  test("renders Preview and Code tabs", () => {
    render(<MainContent />);
    expect(screen.getByTestId("tab-preview")).toBeDefined();
    expect(screen.getByTestId("tab-code")).toBeDefined();
  });

  test("wraps content in FileSystemProvider and ChatProvider", () => {
    render(<MainContent />);
    expect(screen.getByTestId("fs-provider")).toBeDefined();
    expect(screen.getByTestId("chat-provider")).toBeDefined();
  });

  test("passes user and projectId to HeaderActions", () => {
    const user = { id: "u1", email: "test@example.com" };
    const project = {
      id: "p1",
      name: "Test Project",
      messages: [],
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<MainContent user={user} project={project} />);

    const header = screen.getByTestId("header-actions");
    expect(header.getAttribute("data-user")).toBe("test@example.com");
    expect(header.getAttribute("data-project")).toBe("p1");
  });

  test("renders without user or project", () => {
    render(<MainContent />);
    const header = screen.getByTestId("header-actions");
    expect(header.getAttribute("data-user")).toBeNull();
    expect(header.getAttribute("data-project")).toBeNull();
  });

  test("does not render file tree or code editor in preview mode", () => {
    render(<MainContent />);
    expect(screen.queryByTestId("file-tree")).toBeNull();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("clicking Code tab shows file tree and code editor", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByTestId("tab-code"));

    expect(screen.queryByTestId("preview-frame")).toBeNull();
    expect(screen.getByTestId("file-tree")).toBeDefined();
    expect(screen.getByTestId("code-editor")).toBeDefined();
  });

  test("clicking Preview tab after switching to Code restores preview", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByTestId("tab-code"));
    expect(screen.queryByTestId("preview-frame")).toBeNull();

    await user.click(screen.getByTestId("tab-preview"));
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("file-tree")).toBeNull();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("tabs default active value is preview", () => {
    render(<MainContent />);
    expect(screen.getByTestId("tabs").getAttribute("data-value")).toBe("preview");
  });

  test("tabs active value updates to code when Code tab is clicked", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByTestId("tab-code"));

    expect(screen.getByTestId("tabs").getAttribute("data-value")).toBe("code");
  });

  test("tabs active value returns to preview when Preview tab is clicked after switching", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByTestId("tab-code"));
    await user.click(screen.getByTestId("tab-preview"));

    expect(screen.getByTestId("tabs").getAttribute("data-value")).toBe("preview");
  });
});
