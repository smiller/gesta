// What a folding contents page remembers between visits, in this browser
// (2026-09-28, the contents-folds plan): its open sections.
import { test, expect } from "vitest";
import { parseFoldStore, foldPage, withFoldPage } from "./foldState.ts";

test("an absent, empty or damaged store reads as empty; a page never seen starts all closed", () => {
  for (const raw of [null, "", "not json", "[1,2]", '{"x": 3}']) expect(foldPage(parseFoldStore(raw), "bookshelf/S/W")).toEqual({ open: [] });
});
test("a page's open sections round-trip; other pages are untouched; a record from before keeps its sections", () => {
  let store = parseFoldStore('{"bookshelf/S/W": {"open": ["Book I"], "left": "#bookshelf/S/W/1.3"}}');
  store = withFoldPage(store, "bookshelf/S/W", { open: ["Book I", "Dedications"] });
  store = withFoldPage(store, "bookshelf/D/C", { open: ["Inferno"] });
  const again = parseFoldStore(JSON.stringify(store));
  expect(foldPage(again, "bookshelf/S/W")).toEqual({ open: ["Book I", "Dedications"] });
  expect(foldPage(again, "bookshelf/D/C")).toEqual({ open: ["Inferno"] });
});
test("a malformed page record keeps only what is well formed", () => {
  const store = parseFoldStore('{"bookshelf/S/W": {"open": ["A", 3, null, "B"], "left": 7}}');
  expect(foldPage(store, "bookshelf/S/W")).toEqual({ open: ["A", "B"] });
});
