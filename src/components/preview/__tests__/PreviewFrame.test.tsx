import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mockGetAllFiles = vi.fn().mockReturnValue(new Map());
const mockUseFileSystem = vi.fn().mockReturnValue({
  getAllFiles: mockGetAllFiles,
  refreshTrigger: 0,
});

vi.mock("@/lib/contexts/file-system-context", () => ({
  useFileSystem: () => mockUseFileSystem(),
}));

vi.mock("@/lib/transform/jsx-transformer", () => ({
  createImportMap: vi.fn().mockReturnValue({
    importMap: {},
    styles: "",
    errors: [],
  }),
  createPreviewHTML: vi.fn().mockReturnValue("<html><body>preview</body></html>"),
}));

vi.mock("lucide-react", () => ({
  AlertCircle: (props: any) => <div data-testid="alert-icon" {...props} />,
}));

import { PreviewFrame } from "../PreviewFrame";

describe("PreviewFrame", () => {
  beforeEach(() => {
    cleanup();
    mockGetAllFiles.mockReset().mockReturnValue(new Map());
  });

  test("shows welcome state on first load with no files", () => {
    render(<PreviewFrame />);
    expect(screen.getByText("Welcome to UI Generator")).toBeDefined();
  });

  test("shows no-entry-point error when files exist but no jsx/tsx", () => {
    mockGetAllFiles.mockReturnValue(
      new Map([["/readme.md", "# Hello"]])
    );
    render(<PreviewFrame />);
    expect(screen.getByText(/No React component found/)).toBeDefined();
  });

  test("renders iframe when App.jsx exists", () => {
    mockGetAllFiles.mockReturnValue(
      new Map([["/App.jsx", "export default function App() { return <div/>; }"]])
    );
    render(<PreviewFrame />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeDefined();
    expect(iframe?.title).toBe("Preview");
  });

  test("finds App.tsx as entry point", () => {
    mockGetAllFiles.mockReturnValue(
      new Map([["/App.tsx", "export default function App() { return <div/>; }"]])
    );
    render(<PreviewFrame />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeDefined();
  });

  test("falls back to first jsx file", () => {
    mockGetAllFiles.mockReturnValue(
      new Map([["/components/Counter.jsx", "export default () => <div/>"]])
    );
    render(<PreviewFrame />);
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeDefined();
  });
});
