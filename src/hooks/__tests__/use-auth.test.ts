import { test, expect, describe, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignInAction(...args),
  signUp: (...args: any[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (input: any) => mockCreateProject(input),
}));

import { useAuth } from "../use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignInAction.mockReset();
    mockSignUpAction.mockReset();
    mockGetAnonWorkData.mockReset().mockReturnValue(null);
    mockClearAnonWork.mockReset();
    mockGetProjects.mockReset().mockResolvedValue([]);
    mockCreateProject.mockReset().mockResolvedValue({ id: "new-proj" });
  });

  test("signIn calls signInAction with credentials", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "fail" });
    const { result } = renderHook(() => useAuth());

    let outcome: any;
    await act(async () => {
      outcome = await result.current.signIn("a@b.com", "pass");
    });

    expect(mockSignInAction).toHaveBeenCalledWith("a@b.com", "pass");
    expect(outcome).toEqual({ success: false, error: "fail" });
  });

  test("post-auth with anon work creates project and navigates", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user" }],
      fileSystemData: { "/": {} },
    });
    mockCreateProject.mockResolvedValue({ id: "anon-proj" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj");
  });

  test("post-auth without anon work navigates to recent project", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-1");
  });

  test("post-auth creates new project when none exist", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("failed sign in does not navigate", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "bad" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("signUp calls signUpAction", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    mockCreateProject.mockResolvedValue({ id: "new-id" });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("a@b.com", "pass1234");
    });

    expect(mockSignUpAction).toHaveBeenCalledWith("a@b.com", "pass1234");
  });

  test("isLoading is true during signIn", async () => {
    let resolve: any;
    mockSignInAction.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    let promise: Promise<any>;
    act(() => {
      promise = result.current.signIn("a@b.com", "pass");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ success: false });
      await promise!;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
