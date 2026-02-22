import { test, expect, describe } from "vitest";
import { generationPrompt } from "../generation";

describe("generationPrompt", () => {
  test("requires root /App.jsx file", () => {
    expect(generationPrompt).toContain("/App.jsx");
  });

  test("specifies React and Tailwind for styling", () => {
    expect(generationPrompt).toContain("React");
    expect(generationPrompt).toContain("Tailwindcss");
  });

  test("requires default export from App.jsx", () => {
    expect(generationPrompt).toContain("default export");
  });

  test("specifies @/ import alias", () => {
    expect(generationPrompt).toContain("@/");
  });

  test("mentions virtual file system", () => {
    expect(generationPrompt).toContain("virtual");
  });

  test("prohibits HTML files", () => {
    expect(generationPrompt).toContain("Do not create any HTML files");
  });

  test("instructs to use tailwind over hardcoded styles", () => {
    expect(generationPrompt).toContain("not hardcoded styles");
  });

  test("is a non-empty string", () => {
    expect(typeof generationPrompt).toBe("string");
    expect(generationPrompt.trim().length).toBeGreaterThan(0);
  });
});
