import { test, expect, describe, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = vi.fn();
vi.mock("@/actions", () => ({
  signOut: () => mockSignOut(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: any) => mockCreateProject(input),
}));

vi.mock("@/components/auth/AuthDialog", () => ({
  AuthDialog: ({
    open,
    onOpenChange,
    defaultMode,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    defaultMode: string;
  }) =>
    open ? (
      <div data-testid="auth-dialog" data-mode={defaultMode}>
        <button onClick={() => onOpenChange(false)}>close</button>
      </div>
    ) : null,
}));

vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  LogOut: () => <span data-testid="logout-icon" />,
  FolderOpen: () => <span data-testid="folder-icon" />,
  ChevronDown: () => <span data-testid="chevron-icon" />,
}));

import { HeaderActions } from "../HeaderActions";

describe("HeaderActions", () => {
  beforeEach(() => {
    cleanup();
    mockPush.mockReset();
    mockSignOut.mockReset();
    mockGetProjects.mockReset().mockResolvedValue([]);
    mockCreateProject.mockReset().mockResolvedValue({ id: "new-id" });
  });

  describe("unauthenticated", () => {
    test("renders Sign In and Sign Up buttons", () => {
      render(<HeaderActions user={null} />);
      expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Sign Up" })).toBeDefined();
    });

    test("opens auth dialog in signin mode", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={null} />);

      await user.click(screen.getByRole("button", { name: "Sign In" }));
      expect(screen.getByTestId("auth-dialog")).toBeDefined();
      expect(screen.getByTestId("auth-dialog").getAttribute("data-mode")).toBe(
        "signin"
      );
    });

    test("opens auth dialog in signup mode", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={null} />);

      await user.click(screen.getByRole("button", { name: "Sign Up" }));
      expect(screen.getByTestId("auth-dialog").getAttribute("data-mode")).toBe(
        "signup"
      );
    });
  });

  describe("authenticated", () => {
    const testUser = { id: "u1", email: "a@b.com" };

    test("renders New Design button", () => {
      render(<HeaderActions user={testUser} projectId="p1" />);
      expect(screen.getByText("New Design")).toBeDefined();
    });

    test("New Design creates project and navigates", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={testUser} projectId="p1" />);

      await user.click(screen.getByText("New Design"));
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-id");
    });

    test("sign out calls signOut action", async () => {
      const user = userEvent.setup();
      render(<HeaderActions user={testUser} projectId="p1" />);

      await user.click(screen.getByTitle("Sign out"));
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
