import { test, expect, describe, beforeEach, vi } from "vitest";

const { mockCookieStore, mockSign } = vi.hoisted(() => ({
  mockCookieStore: {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  mockSign: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("server-only", () => ({}));

vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  })),
  jwtVerify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.set.mockClear();
    mockCookieStore.get.mockClear();
    mockCookieStore.delete.mockClear();
  });

  describe("createSession", () => {
    test("sets httpOnly cookie with signed JWT", async () => {
      await createSession("user-1", "a@b.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    test("sets cookie expiration to ~7 days from now", async () => {
      const before = Date.now();
      await createSession("user-1", "a@b.com");
      const after = Date.now();

      const cookieOptions = mockCookieStore.set.mock.calls[0][2];
      const expiresMs = cookieOptions.expires.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
      expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
    });

    test("sets secure flag based on NODE_ENV", async () => {
      const origEnv = process.env.NODE_ENV;

      process.env.NODE_ENV = "production";
      await createSession("user-1", "a@b.com");
      expect(mockCookieStore.set.mock.calls[0][2].secure).toBe(true);

      process.env.NODE_ENV = "development";
      await createSession("user-1", "a@b.com");
      expect(mockCookieStore.set.mock.calls[1][2].secure).toBe(false);

      process.env.NODE_ENV = origEnv;
    });

    test("creates JWT with correct payload", async () => {
      await createSession("user-1", "a@b.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          email: "a@b.com",
        })
      );
    });

    test("sets HS256 algorithm and 7d expiration on JWT", async () => {
      await createSession("user-1", "a@b.com");

      const jwtInstance = vi.mocked(SignJWT).mock.results[0].value;
      expect(jwtInstance.setProtectedHeader).toHaveBeenCalledWith({
        alg: "HS256",
      });
      expect(jwtInstance.setExpirationTime).toHaveBeenCalledWith("7d");
      expect(jwtInstance.setIssuedAt).toHaveBeenCalled();
    });
  });

  describe("getSession", () => {
    test("returns null when no cookie", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      expect(await getSession()).toBeNull();
    });

    test("reads correct cookie name", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      await getSession();
      expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
    });

    test("returns payload when token is valid", async () => {
      const payload = { userId: "u1", email: "a@b.com" };
      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);

      const session = await getSession();
      expect(session).toEqual(payload);
    });

    test("passes token to jwtVerify with secret", async () => {
      mockCookieStore.get.mockReturnValue({ value: "my-token" });
      vi.mocked(jwtVerify).mockResolvedValue({ payload: {} } as any);

      await getSession();
      const [token, secret] = vi.mocked(jwtVerify).mock.calls[0];
      expect(token).toBe("my-token");
      expect(secret).toHaveProperty("byteLength");
      expect(secret.constructor.name).toBe("Uint8Array");
    });

    test("returns null when verification fails", async () => {
      mockCookieStore.get.mockReturnValue({ value: "bad-token" });
      vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid"));

      expect(await getSession()).toBeNull();
    });

    test("returns null for expired token", async () => {
      mockCookieStore.get.mockReturnValue({ value: "expired-token" });
      vi.mocked(jwtVerify).mockRejectedValue(new Error("token expired"));

      expect(await getSession()).toBeNull();
    });
  });

  describe("deleteSession", () => {
    test("deletes the auth cookie", async () => {
      await deleteSession();
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    test("returns null when no cookie on request", async () => {
      const req = {
        cookies: { get: vi.fn().mockReturnValue(undefined) },
      } as unknown as NextRequest;

      expect(await verifySession(req)).toBeNull();
    });

    test("reads correct cookie name from request", async () => {
      const getCookie = vi.fn().mockReturnValue(undefined);
      const req = { cookies: { get: getCookie } } as unknown as NextRequest;

      await verifySession(req);
      expect(getCookie).toHaveBeenCalledWith("auth-token");
    });

    test("returns payload for valid request token", async () => {
      const payload = { userId: "u1", email: "a@b.com" };
      vi.mocked(jwtVerify).mockResolvedValue({ payload } as any);

      const req = {
        cookies: { get: vi.fn().mockReturnValue({ value: "tok" }) },
      } as unknown as NextRequest;

      expect(await verifySession(req)).toEqual(payload);
    });

    test("passes request token to jwtVerify with secret", async () => {
      vi.mocked(jwtVerify).mockResolvedValue({ payload: {} } as any);

      const req = {
        cookies: { get: vi.fn().mockReturnValue({ value: "req-token" }) },
      } as unknown as NextRequest;

      await verifySession(req);
      const [token, secret] = vi.mocked(jwtVerify).mock.calls[0];
      expect(token).toBe("req-token");
      expect(secret).toHaveProperty("byteLength");
      expect(secret.constructor.name).toBe("Uint8Array");
    });

    test("returns null when request token is invalid", async () => {
      vi.mocked(jwtVerify).mockRejectedValue(new Error("bad"));

      const req = {
        cookies: { get: vi.fn().mockReturnValue({ value: "bad" }) },
      } as unknown as NextRequest;

      expect(await verifySession(req)).toBeNull();
    });
  });
});
