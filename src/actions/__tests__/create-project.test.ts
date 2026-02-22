import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
    },
  },
}));

import { createProject } from "../create-project";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("throws when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unauthorized");
  });

  test("does not call prisma when unauthorized", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    try {
      await createProject({ name: "Test", messages: [], data: {} });
    } catch {}
    expect(prisma.project.create).not.toHaveBeenCalled();
  });

  test("creates project with serialized JSON", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      expiresAt: new Date(),
    });
    const created = { id: "p1", name: "Test" };
    vi.mocked(prisma.project.create).mockResolvedValue(created as any);

    const messages = [{ role: "user", content: "hi" }];
    const data = { "/": {} };
    const result = await createProject({ name: "Test", messages, data });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Test",
        userId: "u1",
        messages: JSON.stringify(messages),
        data: JSON.stringify(data),
      },
    });
    expect(result).toEqual(created);
  });

  test("serializes empty messages and data correctly", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      expiresAt: new Date(),
    });
    vi.mocked(prisma.project.create).mockResolvedValue({ id: "p1" } as any);

    await createProject({ name: "Empty", messages: [], data: {} });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "Empty",
        userId: "u1",
        messages: "[]",
        data: "{}",
      },
    });
  });

  test("serializes complex nested data", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      expiresAt: new Date(),
    });
    vi.mocked(prisma.project.create).mockResolvedValue({ id: "p1" } as any);

    const data = {
      "/App.tsx": { content: "export default () => <div/>" },
      "/styles.css": { content: "body {}" },
    };
    await createProject({ name: "Complex", messages: [], data });

    const callData = vi.mocked(prisma.project.create).mock.calls[0][0].data;
    expect(JSON.parse(callData.data as string)).toEqual(data);
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      email: "a@b.com",
      expiresAt: new Date(),
    });
    vi.mocked(prisma.project.create).mockRejectedValue(
      new Error("Unique constraint violation")
    );

    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unique constraint violation");
  });
});
