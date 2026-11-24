import { test, expect } from "vitest";
import { SAVE_DEBOUNCE_MS } from "../../src/store/entrySave.ts";
import { saveLanded, LANDS_AFTER_MS } from "./saves.ts";

test("a save has landed once the debounce and its margin have passed since the last edit and no store write is open", () => {
  const edit = 1000, past = edit + LANDS_AFTER_MS + 1;
  expect(LANDS_AFTER_MS).toBeGreaterThan(SAVE_DEBOUNCE_MS);
  expect(saveLanded(past, edit, 0, LANDS_AFTER_MS)).toBe(true);
  expect(saveLanded(past, edit, 1, LANDS_AFTER_MS)).toBe(false);
  expect(saveLanded(edit + SAVE_DEBOUNCE_MS, edit, 0, LANDS_AFTER_MS)).toBe(false);
});
