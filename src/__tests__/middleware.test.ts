import { test, expect, describe, beforeEach, vi } from "vitest";

const mockVerifySession = vi.fn();

vi.mock("@/lib/auth", () => ({
  verifySession: (req: any) => mockVerifySession(req),
}));

import { middleware, config } from "../middleware";
import { NextRequest } from "next/server";

function createMockRequest(pathname: string) {
  const url = new URL(pathname, "http://localhost:3000");
  return {
    nextUrl: url,
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
    },
  } as unknown as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    mockVerifySession.mockReset();
  });

  describe("unprotected routes", () => {
    test("allows root path without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/"));
      expect(res.status).toBe(200);
    });

    test("allows /api/chat without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/api/chat"));
      expect(res.status).toBe(200);
    });

    test("allows arbitrary non-protected paths", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/some/other/route"));
      expect(res.status).toBe(200);
    });

    test("allows unprotected path even with valid session", async () => {
      mockVerifySession.mockResolvedValue({ userId: "u1", email: "a@b.com" });
      const res = await middleware(createMockRequest("/"));
      expect(res.status).toBe(200);
    });
  });

  describe("protected routes - /api/projects", () => {
    test("blocks /api/projects without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/api/projects"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Authentication required");
    });

    test("blocks /api/projects sub-paths without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/api/projects/p1/details"));
      expect(res.status).toBe(401);
    });

    test("allows /api/projects with valid session", async () => {
      mockVerifySession.mockResolvedValue({ userId: "u1", email: "a@b.com" });
      const res = await middleware(createMockRequest("/api/projects"));
      expect(res.status).toBe(200);
    });

    test("allows /api/projects sub-paths with valid session", async () => {
      mockVerifySession.mockResolvedValue({ userId: "u1", email: "a@b.com" });
      const res = await middleware(createMockRequest("/api/projects/p1"));
      expect(res.status).toBe(200);
    });
  });

  describe("protected routes - /api/filesystem", () => {
    test("blocks /api/filesystem without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/api/filesystem"));
      expect(res.status).toBe(401);
    });

    test("blocks /api/filesystem sub-paths without session", async () => {
      mockVerifySession.mockResolvedValue(null);
      const res = await middleware(createMockRequest("/api/filesystem/something"));
      expect(res.status).toBe(401);
    });

    test("allows /api/filesystem with valid session", async () => {
      mockVerifySession.mockResolvedValue({ userId: "u1", email: "a@b.com" });
      const res = await middleware(createMockRequest("/api/filesystem"));
      expect(res.status).toBe(200);
    });
  });

  describe("session verification", () => {
    test("passes the request object to verifySession", async () => {
      mockVerifySession.mockResolvedValue(null);
      const req = createMockRequest("/");
      await middleware(req);
      expect(mockVerifySession).toHaveBeenCalledWith(req);
    });

    test("calls verifySession for every request", async () => {
      mockVerifySession.mockResolvedValue(null);
      await middleware(createMockRequest("/"));
      await middleware(createMockRequest("/api/chat"));
      expect(mockVerifySession).toHaveBeenCalledTimes(2);
    });
  });

  describe("config", () => {
    test("exports matcher config", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher.length).toBeGreaterThan(0);
    });

    test("matcher excludes static files", () => {
      const pattern = config.matcher[0];
      expect(pattern).toContain("_next/static");
      expect(pattern).toContain("_next/image");
      expect(pattern).toContain("favicon.ico");
    });
  });
});
