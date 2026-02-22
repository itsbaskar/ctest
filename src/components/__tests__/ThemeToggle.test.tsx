import { test, expect, describe, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock window.matchMedia
const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, "matchMedia", { value: matchMediaMock });

vi.mock("lucide-react", () => ({
  Sun: () => <span data-testid="sun-icon" />,
  Moon: () => <span data-testid="moon-icon" />,
}));

import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    cleanup();
    localStorageMock.clear();
    localStorageMock.getItem.mockReset();
    localStorageMock.getItem.mockImplementation((key: string) => null);
    localStorageMock.setItem.mockClear();
    matchMediaMock.mockReset();
    matchMediaMock.mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
  });

  describe("initial render", () => {
    test("renders a toggle button", async () => {
      render(<ThemeToggle />);
      // After mount, button should be present
      const button = await screen.findByRole("button");
      expect(button).toBeDefined();
    });

    test("shows Moon icon in light mode (default, no stored preference, no system dark)", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      render(<ThemeToggle />);
      const moonIcon = await screen.findByTestId("moon-icon");
      expect(moonIcon).toBeDefined();
    });

    test("shows Sun icon when localStorage has 'dark' theme", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      render(<ThemeToggle />);
      const sunIcon = await screen.findByTestId("sun-icon");
      expect(sunIcon).toBeDefined();
    });

    test("shows Sun icon when system prefers dark and no stored preference", async () => {
      matchMediaMock.mockReturnValue({ matches: true } as MediaQueryList);
      render(<ThemeToggle />);
      const sunIcon = await screen.findByTestId("sun-icon");
      expect(sunIcon).toBeDefined();
    });

    test("shows Moon icon when localStorage has 'light' theme even if system prefers dark", async () => {
      localStorageMock.getItem.mockReturnValue("light");
      matchMediaMock.mockReturnValue({ matches: true } as MediaQueryList);
      render(<ThemeToggle />);
      const moonIcon = await screen.findByTestId("moon-icon");
      expect(moonIcon).toBeDefined();
    });
  });

  describe("toggling", () => {
    test("clicking toggle in light mode adds dark class to html element", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to dark mode" });
      await user.click(button);

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    test("clicking toggle in dark mode removes dark class from html element", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      document.documentElement.classList.add("dark");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to light mode" });
      await user.click(button);

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    test("clicking toggle in light mode saves 'dark' to localStorage", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to dark mode" });
      await user.click(button);

      expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    test("clicking toggle in dark mode saves 'light' to localStorage", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to light mode" });
      await user.click(button);

      expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
    });

    test("shows Sun icon after toggling to dark mode", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to dark mode" });
      await user.click(button);
      expect(screen.getByTestId("sun-icon")).toBeDefined();
    });

    test("shows Moon icon after toggling back to light mode", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to light mode" });
      await user.click(button);
      expect(screen.getByTestId("moon-icon")).toBeDefined();
    });
  });

  describe("accessibility", () => {
    test("has accessible aria-label in light mode", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      render(<ThemeToggle />);
      const button = await screen.findByRole("button", { name: "Switch to dark mode" });
      expect(button).toBeDefined();
    });

    test("has accessible aria-label in dark mode", async () => {
      localStorageMock.getItem.mockReturnValue("dark");
      render(<ThemeToggle />);
      const button = await screen.findByRole("button", { name: "Switch to light mode" });
      expect(button).toBeDefined();
    });

    test("updates aria-label after toggle", async () => {
      matchMediaMock.mockReturnValue({ matches: false } as MediaQueryList);
      const user = userEvent.setup();
      render(<ThemeToggle />);

      const button = await screen.findByRole("button", { name: "Switch to dark mode" });
      await user.click(button);
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeDefined();
    });
  });
});
