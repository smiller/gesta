import { test, expect } from "vitest";
import { saveLanded } from "./saves.ts";

test("a save has landed once the page has none pending and no store write is open", () => {
  expect(saveLanded(0, 0)).toBe(true);
  expect(saveLanded(1, 0)).toBe(false);
  expect(saveLanded(0, 1)).toBe(false);
});
