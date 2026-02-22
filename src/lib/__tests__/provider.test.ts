import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn().mockReturnValue({ id: "real-model" }),
}));

import { MockLanguageModel, getLanguageModel } from "../provider";
import { anthropic } from "@ai-sdk/anthropic";

describe("MockLanguageModel", () => {
  let model: MockLanguageModel;

  beforeEach(() => {
    model = new MockLanguageModel("mock-test");
  });

  test("implements LanguageModelV1 interface", () => {
    expect(model.specificationVersion).toBe("v1");
    expect(model.provider).toBe("mock");
    expect(model.modelId).toBe("mock-test");
    expect(model.defaultObjectGenerationMode).toBe("tool");
  });

  describe("doGenerate", () => {
    test("returns tool calls on first call (toolMessageCount=0 → creates App.jsx)", async () => {
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "make a counter" }] },
        ],
        mode: { type: "regular" },
      } as any);

      expect(result.toolCalls.length).toBeGreaterThan(0);
      expect(result.toolCalls[0].toolName).toBe("str_replace_editor");
      expect(result.finishReason).toBe("tool-calls");
      expect(result.usage).toBeDefined();
    });

    test("detects 'form' in prompt and uses ContactForm", async () => {
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "build a form" }] },
        ],
        mode: { type: "regular" },
      } as any);

      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.path).toBe("/App.jsx");
      expect(args.file_text).toContain("ContactForm");
    });

    test("detects 'card' in prompt and uses Card", async () => {
      const result = await model.doGenerate({
        prompt: [
          { role: "user", content: [{ type: "text", text: "show a card" }] },
        ],
        mode: { type: "regular" },
      } as any);

      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.file_text).toContain("Card");
    });

    test("defaults to Counter component", async () => {
      const result = await model.doGenerate({
        prompt: [
          {
            role: "user",
            content: [{ type: "text", text: "make something cool" }],
          },
        ],
        mode: { type: "regular" },
      } as any);

      const args = JSON.parse(result.toolCalls[0].args);
      expect(args.file_text).toContain("Counter");
    });
  });

  describe("doStream", () => {
    test("returns a readable stream with text-delta and finish parts", async () => {
      const result = await model.doStream({
        prompt: [
          { role: "user", content: [{ type: "text", text: "make a counter" }] },
        ],
        mode: { type: "regular" },
      } as any);

      expect(result.stream).toBeDefined();
      expect(result.warnings).toEqual([]);

      const reader = result.stream.getReader();
      const parts: any[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        parts.push(value);
        done = d;
      }

      const types = parts.map((p) => p.type);
      expect(types).toContain("text-delta");
      expect(types).toContain("tool-call");
      expect(types).toContain("finish");
    });
  });
});

describe("getLanguageModel", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(anthropic).mockClear();
  });

  test("returns mock model when no API key", () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
    if (origKey) process.env.ANTHROPIC_API_KEY = origKey;
  });

  test("returns mock model when API key is empty", () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "  ";
    const model = getLanguageModel();
    expect(model).toBeInstanceOf(MockLanguageModel);
    if (origKey) process.env.ANTHROPIC_API_KEY = origKey;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  test("returns real model when API key is present", () => {
    const origKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const model = getLanguageModel();
    expect(vi.mocked(anthropic)).toHaveBeenCalledWith("claude-haiku-4-5");
    if (origKey) process.env.ANTHROPIC_API_KEY = origKey;
    else delete process.env.ANTHROPIC_API_KEY;
  });
});
