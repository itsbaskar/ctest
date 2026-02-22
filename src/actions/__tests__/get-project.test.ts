import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

import { getProject } from "../get-project";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const validSession = {
  userId: "u1",
  email: "a@b.com",
  expiresAt: new Date(),
};

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("throws when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(getProject("p1")).rejects.toThrow("Unauthorized");
  });

  test("does not query database when unauthorized", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    try {
      await getProject("p1");
    } catch {}
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  test("throws when project not found", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(getProject("missing")).rejects.toThrow("Project not found");
  });

  test("returns project with parsed messages and data", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    const now = new Date();
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      name: "Test",
      messages: JSON.stringify([{ role: "user" }]),
      data: JSON.stringify({ "/": {} }),
      createdAt: now,
      updatedAt: now,
    } as any);

    const result = await getProject("p1");

    expect(result.messages).toEqual([{ role: "user" }]);
    expect(result.data).toEqual({ "/": {} });
    expect(result.id).toBe("p1");
    expect(result.name).toBe("Test");
    expect(result.createdAt).toBe(now);
    expect(result.updatedAt).toBe(now);
  });

  test("filters by userId for ownership check", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    try {
      await getProject("p1");
    } catch {}

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
    });
  });

  test("parses empty messages array", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      name: "Empty",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getProject("p1");
    expect(result.messages).toEqual([]);
    expect(result.data).toEqual({});
  });

  test("throws on malformed JSON in messages", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      name: "Bad",
      messages: "not-json",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(getProject("p1")).rejects.toThrow();
  });

  test("throws on malformed JSON in data", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      name: "Bad",
      messages: "[]",
      data: "{broken",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(getProject("p1")).rejects.toThrow();
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findUnique).mockRejectedValue(
      new Error("DB connection lost")
    );

    await expect(getProject("p1")).rejects.toThrow("DB connection lost");
  });
});
