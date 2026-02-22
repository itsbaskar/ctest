import { test, expect, describe, beforeEach, vi } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildFileManagerTool } from "../file-manager";

vi.mock("ai", () => ({
  tool: (config: any) => config,
}));

describe("buildFileManagerTool", () => {
  let fs: VirtualFileSystem;
  let fileTool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fs = new VirtualFileSystem();
    fileTool = buildFileManagerTool(fs);
  });

  describe("rename", () => {
    test("renames a file successfully", async () => {
      fs.createFile("/old.txt", "content");
      const result = await fileTool.execute({
        command: "rename",
        path: "/old.txt",
        new_path: "/new.txt",
      });
      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /old.txt to /new.txt",
      });
      expect(fs.readFile("/new.txt")).toBe("content");
      expect(fs.readFile("/old.txt")).toBeNull();
    });

    test("returns error when source does not exist", async () => {
      const result = await fileTool.execute({
        command: "rename",
        path: "/missing.txt",
        new_path: "/dest.txt",
      });
      expect(result).toEqual({
        success: false,
        error: "Failed to rename /missing.txt to /dest.txt",
      });
    });

    test("returns error when new_path is missing", async () => {
      fs.createFile("/file.txt", "data");
      const result = await fileTool.execute({
        command: "rename",
        path: "/file.txt",
      });
      expect(result).toEqual({
        success: false,
        error: "new_path is required for rename command",
      });
    });
  });

  describe("delete", () => {
    test("deletes a file successfully", async () => {
      fs.createFile("/file.txt", "data");
      const result = await fileTool.execute({
        command: "delete",
        path: "/file.txt",
      });
      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /file.txt",
      });
      expect(fs.exists("/file.txt")).toBe(false);
    });

    test("returns error for missing file", async () => {
      const result = await fileTool.execute({
        command: "delete",
        path: "/nope.txt",
      });
      expect(result).toEqual({
        success: false,
        error: "Failed to delete /nope.txt",
      });
    });
  });

  describe("invalid command", () => {
    test("returns error for unknown command", async () => {
      const result = await fileTool.execute({
        command: "unknown" as any,
        path: "/file.txt",
      });
      expect(result).toEqual({ success: false, error: "Invalid command" });
    });
  });
});
