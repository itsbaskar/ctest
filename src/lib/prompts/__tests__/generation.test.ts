import { test, expect, describe } from "vitest";
import { generationPrompt } from "../generation";

describe("generationPrompt", () => {
  test("requires root /App.jsx file", () => {
    expect(generationPrompt).toContain("/App.jsx");
  });

  test("specifies React and Tailwind for styling", () => {
    expect(generationPrompt).toContain("React");
    expect(generationPrompt).toContain("Tailwind CSS");
  });

  test("requires root App.jsx as entrypoint", () => {
    expect(generationPrompt).toContain("App.jsx");
    expect(generationPrompt).toContain("entrypoint");
  });

  test("specifies @/ import alias", () => {
    expect(generationPrompt).toContain("@/");
  });

  test("mentions virtual file system", () => {
    expect(generationPrompt).toContain("virtual");
  });

  test("prohibits HTML files", () => {
    expect(generationPrompt).toContain("Do not create HTML files");
  });

  test("instructs to use tailwind exclusively", () => {
    expect(generationPrompt).toContain("Tailwind CSS exclusively");
  });

  test("is a non-empty string", () => {
    expect(typeof generationPrompt).toBe("string");
    expect(generationPrompt.trim().length).toBeGreaterThan(0);
  });
});
