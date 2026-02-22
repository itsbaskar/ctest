import { test, expect, describe, beforeEach } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

describe("anon-work-tracker", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("getHasAnonWork", () => {
    test("returns false when no work stored", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns true after setting work", () => {
      setHasAnonWork([{ role: "user", content: "hello" }], { "/": {} });
      expect(getHasAnonWork()).toBe(true);
    });
  });

  describe("setHasAnonWork", () => {
    test("stores when messages.length > 0", () => {
      setHasAnonWork([{ role: "user" }], {});
      expect(getHasAnonWork()).toBe(true);
    });

    test("stores when fileSystemData has > 1 key", () => {
      setHasAnonWork([], { "/": {}, "/App.jsx": {} });
      expect(getHasAnonWork()).toBe(true);
    });

    test("does not store when messages empty and data has <= 1 key", () => {
      setHasAnonWork([], { "/": {} });
      expect(getHasAnonWork()).toBe(false);
    });

    test("does not store when both empty", () => {
      setHasAnonWork([], {});
      expect(getHasAnonWork()).toBe(false);
    });
  });

  describe("getAnonWorkData", () => {
    test("returns null when no data", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns stored messages and fileSystemData", () => {
      const messages = [{ role: "user", content: "test" }];
      const fsData = { "/": {}, "/App.jsx": { content: "code" } };
      setHasAnonWork(messages, fsData);

      const result = getAnonWorkData();
      expect(result).toEqual({ messages, fileSystemData: fsData });
    });

    test("returns null for invalid JSON", () => {
      sessionStorage.setItem("uigen_anon_data", "not-json");
      expect(getAnonWorkData()).toBeNull();
    });
  });

  describe("clearAnonWork", () => {
    test("removes stored work", () => {
      setHasAnonWork([{ role: "user" }], { "/": {}, "/a": {} });
      expect(getHasAnonWork()).toBe(true);

      clearAnonWork();
      expect(getHasAnonWork()).toBe(false);
      expect(getAnonWorkData()).toBeNull();
    });
  });
});
