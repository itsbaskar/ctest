import { test, expect, describe, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-pw"),
    compare: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { signUp, signIn, signOut, getUser } from "../index";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    test("returns error for empty email", async () => {
      const result = await signUp("", "password123");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error for empty password", async () => {
      const result = await signUp("a@b.com", "");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error when both fields empty", async () => {
      const result = await signUp("", "");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error for short password", async () => {
      const result = await signUp("a@b.com", "short");
      expect(result).toEqual({
        success: false,
        error: "Password must be at least 8 characters",
      });
    });

    test("returns error for 7-character password", async () => {
      const result = await signUp("a@b.com", "1234567");
      expect(result).toEqual({
        success: false,
        error: "Password must be at least 8 characters",
      });
    });

    test("accepts password with exactly 8 characters", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-id",
        email: "a@b.com",
        password: "hashed",
        createdAt: new Date(),
      } as any);

      const result = await signUp("a@b.com", "12345678");
      expect(result).toEqual({ success: true });
    });

    test("returns error for existing email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "x",
        createdAt: new Date(),
      } as any);

      const result = await signUp("a@b.com", "password123");
      expect(result).toEqual({
        success: false,
        error: "Email already registered",
      });
    });

    test("does not call create when user exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "x",
        createdAt: new Date(),
      } as any);

      await signUp("a@b.com", "password123");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    test("creates user and session on success", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-id",
        email: "a@b.com",
        password: "hashed",
        createdAt: new Date(),
      } as any);

      const result = await signUp("a@b.com", "password123");

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: "a@b.com", password: "hashed-pw" },
      });
      expect(createSession).toHaveBeenCalledWith("new-id", "a@b.com");
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(result).toEqual({ success: true });
    });

    test("returns generic error when database throws", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB connection failed"));

      const result = await signUp("a@b.com", "password123");
      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign up",
      });
    });

    test("returns generic error when bcrypt throws", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockRejectedValue(new Error("hash failure") as never);

      const result = await signUp("a@b.com", "password123");
      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign up",
      });
    });

    test("does not create session when create throws", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB error"));

      await signUp("a@b.com", "password123");
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    test("returns error for empty fields", async () => {
      const result = await signIn("", "");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error for empty email only", async () => {
      const result = await signIn("", "password123");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("returns error for empty password only", async () => {
      const result = await signIn("a@b.com", "");
      expect(result).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    test("does not query database when fields are empty", async () => {
      await signIn("", "");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns error when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const result = await signIn("a@b.com", "pass1234");
      expect(result).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("does not compare password when user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await signIn("a@b.com", "pass1234");
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    test("returns error for wrong password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      const result = await signIn("a@b.com", "wrong");
      expect(result).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("does not create session for wrong password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      await signIn("a@b.com", "wrong");
      expect(createSession).not.toHaveBeenCalled();
    });

    test("creates session on successful sign in", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const result = await signIn("a@b.com", "correct");

      expect(createSession).toHaveBeenCalledWith("u1", "a@b.com");
      expect(result).toEqual({ success: true });
    });

    test("revalidates path on successful sign in", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      await signIn("a@b.com", "correct");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    test("uses same error for not found and wrong password", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const notFound = await signIn("no@user.com", "pass1234");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
      const wrongPw = await signIn("a@b.com", "wrong");

      expect(notFound.error).toBe(wrongPw.error);
    });

    test("returns generic error when database throws", async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB down"));

      const result = await signIn("a@b.com", "password123");
      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign in",
      });
    });

    test("returns generic error when bcrypt compare throws", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "1",
        email: "a@b.com",
        password: "hashed",
      } as any);
      vi.mocked(bcrypt.compare).mockRejectedValue(new Error("compare failure") as never);

      const result = await signIn("a@b.com", "password123");
      expect(result).toEqual({
        success: false,
        error: "An error occurred during sign in",
      });
    });
  });

  describe("signOut", () => {
    test("deletes session, revalidates, and redirects", async () => {
      await signOut();
      expect(deleteSession).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(redirect).toHaveBeenCalledWith("/");
    });
  });

  describe("getUser", () => {
    test("returns null when no session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      expect(await getUser()).toBeNull();
    });

    test("does not query database when no session", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      await getUser();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    test("returns user when session exists", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "u1",
        email: "a@b.com",
        expiresAt: new Date(),
      });
      const userObj = {
        id: "u1",
        email: "a@b.com",
        createdAt: new Date(),
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(userObj as any);

      const result = await getUser();
      expect(result).toEqual(userObj);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { id: true, email: true, createdAt: true },
      });
    });

    test("excludes password from returned user", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "u1",
        email: "a@b.com",
        expiresAt: new Date(),
      });

      await getUser();

      const selectArg = vi.mocked(prisma.user.findUnique).mock.calls[0][0].select;
      expect(selectArg).not.toHaveProperty("password");
    });

    test("returns null when database throws", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "u1",
        email: "a@b.com",
        expiresAt: new Date(),
      });
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB error"));

      const result = await getUser();
      expect(result).toBeNull();
    });

    test("returns null when user not found in database", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "deleted-user",
        email: "a@b.com",
        expiresAt: new Date(),
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await getUser();
      expect(result).toBeNull();
    });
  });
});
