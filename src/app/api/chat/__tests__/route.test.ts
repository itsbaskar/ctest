import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@/lib/file-system", () => {
  const mockDeserializeFromNodes = vi.fn();
  const mockSerialize = vi.fn().mockReturnValue({});
  return {
    VirtualFileSystem: vi.fn().mockImplementation(() => ({
      deserializeFromNodes: mockDeserializeFromNodes,
      serialize: mockSerialize,
    })),
  };
});

const mockStreamText = vi.fn();
vi.mock("ai", () => ({
  streamText: (opts: any) => mockStreamText(opts),
  appendResponseMessages: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/tools/str-replace", () => ({
  buildStrReplaceTool: vi.fn().mockReturnValue({ id: "str_replace_editor" }),
}));

vi.mock("@/lib/tools/file-manager", () => ({
  buildFileManagerTool: vi.fn().mockReturnValue({ id: "file_manager" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/provider", () => ({
  getLanguageModel: vi.fn().mockReturnValue({ id: "mock-model" }),
}));

vi.mock("@/lib/prompts/generation", () => ({
  generationPrompt: "test system prompt",
}));

import { POST, maxDuration } from "../route";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendResponseMessages } from "ai";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamText.mockReturnValue({
      toDataStreamResponse: vi.fn().mockReturnValue(new Response("stream")),
    });
  });

  function createRequest(body: any) {
    return new Request("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  test("parses request body and reconstructs VFS", async () => {
    const req = createRequest({
      messages: [{ role: "user", content: "hello" }],
      files: { "/": { type: "directory", name: "/", path: "/" } },
    });

    await POST(req);

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { id: "mock-model" },
        maxTokens: 10_000,
      })
    );
  });

  test("prepends system prompt to messages", async () => {
    const req = createRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
    });

    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toBe("test system prompt");
  });

  test("passes tools to streamText", async () => {
    const req = createRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
    });

    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.tools.str_replace_editor).toBeDefined();
    expect(callArgs.tools.file_manager).toBeDefined();
  });

  test("returns stream response", async () => {
    const req = createRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
    });

    const response = await POST(req);
    expect(response).toBeDefined();
  });

  test("uses fewer maxSteps for mock provider", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const req = createRequest({
      messages: [{ role: "user", content: "hi" }],
      files: {},
    });

    await POST(req);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.maxSteps).toBe(4);

    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  test("maxDuration is 120", () => {
    expect(maxDuration).toBe(120);
  });

  describe("onFinish callback", () => {
    test("saves project when authenticated with projectId", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "u1",
        email: "a@b.com",
        expiresAt: new Date(),
      });
      vi.mocked(appendResponseMessages).mockReturnValue([
        { role: "assistant", content: "done" },
      ] as any);

      const req = createRequest({
        messages: [{ role: "user", content: "hi" }],
        files: {},
        projectId: "p1",
      });

      await POST(req);

      const callArgs = mockStreamText.mock.calls[0][0];
      const onFinish = callArgs.onFinish;

      await onFinish({ response: { messages: [{ role: "assistant" }] } });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "p1", userId: "u1" },
        data: expect.objectContaining({
          messages: expect.any(String),
          data: expect.any(String),
        }),
      });
    });

    test("skips save when no projectId", async () => {
      const req = createRequest({
        messages: [{ role: "user", content: "hi" }],
        files: {},
      });

      await POST(req);

      const callArgs = mockStreamText.mock.calls[0][0];
      await callArgs.onFinish({ response: { messages: [] } });

      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    test("skips save when not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const req = createRequest({
        messages: [{ role: "user", content: "hi" }],
        files: {},
        projectId: "p1",
      });

      await POST(req);

      const callArgs = mockStreamText.mock.calls[0][0];
      await callArgs.onFinish({ response: { messages: [] } });

      expect(prisma.project.update).not.toHaveBeenCalled();
    });
  });
});
