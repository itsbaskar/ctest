import { test, expect, describe } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  test("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  test("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  test("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  test("resolves Tailwind conflicts", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  test("handles array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  test("handles object inputs", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  test("handles empty input", () => {
    expect(cn()).toBe("");
  });

  test("handles mixed inputs", () => {
    expect(cn("base", ["arr"], { obj: true })).toBe("base arr obj");
  });
});
