import { test, expect } from "vitest";
import { parseFoldStore, foldPage, withFoldPage, movedFolds } from "./foldState.ts";

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

test("movedFolds: each moved page's open sections go with it; the rest stay", () => {
  const store = parseFoldStore('{"bookshelf/C. P. Cavafy":{"open":["Poems"]},"page/A":{"open":["X"]}}');
  expect(movedFolds(store, { "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P" })).toEqual({ "bookshelf/Cavafy, C. P": { open: ["Poems"] }, "page/A": { open: ["X"] } });
});
