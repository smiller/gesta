import { test, expect } from "vitest";
import { lastDay, neighbours } from "./day.ts";

const names = ["2026-11-14.jsonl", "2026-11-15 (Sean's conflicted copy 2026-11-15).jsonl", "2026-11-15.jsonl.bak", "2026-11-16.jsonl", "notes.txt"];

test("the last day is the latest dated log before this one; a conflicted copy, a backup or any other name is no day", () => {
  expect(lastDay(names, "2026-11-16")).toBe("2026-11-14");
  expect(lastDay(names, "2026-11-14")).toBeUndefined();
});

test("a day's neighbours are the logged days either side of it, a day without a log skipped; the first has none before, the last none after", () => {
  const more = [...names, "2026-11-19.jsonl"];
  expect(neighbours(more, "2026-11-16")).toEqual({ before: "2026-11-14", after: "2026-11-19" });
  expect(neighbours(more, "2026-11-14")).toEqual({ before: undefined, after: "2026-11-16" });
  expect(neighbours(more, "2026-11-19")).toEqual({ before: "2026-11-16", after: undefined });
});
