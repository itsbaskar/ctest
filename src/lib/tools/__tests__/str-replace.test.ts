import { test, expect, describe, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildStrReplaceTool } from "../str-replace";

describe("buildStrReplaceTool", () => {
  let fs: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fs = new VirtualFileSystem();
    tool = buildStrReplaceTool(fs);
  });

  test("has correct id", () => {
    expect(tool.id).toBe("str_replace_editor");
  });

  describe("view command", () => {
    test("views file content with line numbers", async () => {
      fs.createFile("/test.txt", "line1\nline2\nline3");
      const result = await tool.execute({ command: "view", path: "/test.txt" });
      expect(result).toContain("1\tline1");
      expect(result).toContain("2\tline2");
      expect(result).toContain("3\tline3");
    });

    test("views file with view_range", async () => {
      fs.createFile("/test.txt", "a\nb\nc\nd\ne");
      const result = await tool.execute({
        command: "view",
        path: "/test.txt",
        view_range: [2, 4],
      });
      expect(result).toContain("2\tb");
      expect(result).toContain("4\td");
      expect(result).not.toContain("1\ta");
    });

    test("returns error for missing file", async () => {
      const result = await tool.execute({
        command: "view",
        path: "/missing.txt",
      });
      expect(result).toContain("not found");
    });

    test("lists directory contents", async () => {
      fs.createFile("/src/a.ts", "");
      fs.createFile("/src/b.ts", "");
      const result = await tool.execute({ command: "view", path: "/src" });
      expect(result).toContain("a.ts");
      expect(result).toContain("b.ts");
    });
  });

  describe("create command", () => {
    test("creates a file", async () => {
      const result = await tool.execute({
        command: "create",
        path: "/new.txt",
        file_text: "content",
      });
      expect(result).toContain("created");
      expect(fs.readFile("/new.txt")).toBe("content");
    });

    test("creates parent directories", async () => {
      await tool.execute({
        command: "create",
        path: "/a/b/c.txt",
        file_text: "deep",
      });
      expect(fs.readFile("/a/b/c.txt")).toBe("deep");
    });

    test("returns error for existing file", async () => {
      fs.createFile("/exists.txt", "old");
      const result = await tool.execute({
        command: "create",
        path: "/exists.txt",
        file_text: "new",
      });
      expect(result).toContain("Error");
    });

    test("creates empty file when no file_text", async () => {
      await tool.execute({ command: "create", path: "/empty.txt" });
      expect(fs.readFile("/empty.txt")).toBe("");
    });
  });

  describe("str_replace command", () => {
    test("replaces string in file", async () => {
      fs.createFile("/file.txt", "hello world");
      const result = await tool.execute({
        command: "str_replace",
        path: "/file.txt",
        old_str: "hello",
        new_str: "goodbye",
      });
      expect(result).toContain("Replaced");
      expect(fs.readFile("/file.txt")).toBe("goodbye world");
    });

    test("returns error when string not found", async () => {
      fs.createFile("/file.txt", "hello");
      const result = await tool.execute({
        command: "str_replace",
        path: "/file.txt",
        old_str: "missing",
        new_str: "x",
      });
      expect(result).toContain("Error");
    });

    test("returns error for missing file", async () => {
      const result = await tool.execute({
        command: "str_replace",
        path: "/nope.txt",
        old_str: "a",
        new_str: "b",
      });
      expect(result).toContain("Error");
    });
  });

  describe("insert command", () => {
    test("inserts text at line number", async () => {
      fs.createFile("/file.txt", "line1\nline2");
      const result = await tool.execute({
        command: "insert",
        path: "/file.txt",
        insert_line: 1,
        new_str: "inserted",
      });
      expect(result).toContain("inserted at line 1");
      expect(fs.readFile("/file.txt")).toBe("line1\ninserted\nline2");
    });

    test("inserts at line 0 (beginning)", async () => {
      fs.createFile("/file.txt", "existing");
      await tool.execute({
        command: "insert",
        path: "/file.txt",
        insert_line: 0,
        new_str: "first",
      });
      expect(fs.readFile("/file.txt")).toBe("first\nexisting");
    });

    test("defaults insert_line to 0 when not provided", async () => {
      fs.createFile("/file.txt", "content");
      await tool.execute({
        command: "insert",
        path: "/file.txt",
        new_str: "top",
      });
      expect(fs.readFile("/file.txt")).toBe("top\ncontent");
    });
  });

  describe("undo_edit command", () => {
    test("returns unsupported error", async () => {
      const result = await tool.execute({
        command: "undo_edit",
        path: "/file.txt",
      });
      expect(result).toContain("not supported");
    });
  });
});
