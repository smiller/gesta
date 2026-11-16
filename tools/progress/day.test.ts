import { test, expect } from "vitest";
import { lastDay } from "./day.ts";

test("the last day is the latest dated log before this one; a conflicted copy, a backup or any other name is no day", () => {
  const names = ["2026-11-14.jsonl", "2026-11-15 (Sean's conflicted copy 2026-11-15).jsonl", "2026-11-15.jsonl.bak", "2026-11-16.jsonl", "notes.txt"];
  expect(lastDay(names, "2026-11-16")).toBe("2026-11-14");
  expect(lastDay(names, "2026-11-14")).toBeUndefined();
});
