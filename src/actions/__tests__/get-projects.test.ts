import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

import { getProjects } from "../get-projects";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const validSession = {
  userId: "u1",
  email: "a@b.com",
  expiresAt: new Date(),
};

describe("getProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("throws when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("does not query database when unauthorized", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    try {
      await getProjects();
    } catch {}
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  test("returns projects ordered by updatedAt desc", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    const projects = [
      { id: "p1", name: "Latest", createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(prisma.project.findMany).mockResolvedValue(projects as any);

    const result = await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    expect(result).toEqual(projects);
  });

  test("returns empty array when no projects", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    const result = await getProjects();
    expect(result).toEqual([]);
  });

  test("only selects id, name, createdAt, updatedAt", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await getProjects();

    const selectArg = vi.mocked(prisma.project.findMany).mock.calls[0][0]?.select;
    expect(selectArg).toEqual({
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    });
  });

  test("filters by the session user's ID", async () => {
    const otherSession = { userId: "other-user", email: "b@c.com", expiresAt: new Date() };
    vi.mocked(getSession).mockResolvedValue(otherSession);
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "other-user" },
      })
    );
  });

  test("propagates database errors", async () => {
    vi.mocked(getSession).mockResolvedValue(validSession);
    vi.mocked(prisma.project.findMany).mockRejectedValue(
      new Error("DB connection lost")
    );

    await expect(getProjects()).rejects.toThrow("DB connection lost");
  });
});
