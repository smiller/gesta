import { test, expect } from "vitest";
import { parseFoldStore, foldPage, withFoldPage, movedFolds, droppedFolds, remembered, remembering } from "./foldState.ts";

test("an absent, empty or damaged store reads as empty: nothing remembered open or closed", () => {
  for (const raw of [null, "", "not json", "[1,2]", '{"x": 3}']) expect(foldPage(parseFoldStore(raw), "bookshelf/S/W")).toEqual({ open: [], closed: [] });
});
test("a page's open sections round-trip; other pages are untouched; a record from before keeps its sections", () => {
  let store = parseFoldStore('{"bookshelf/S/W": {"open": ["Book I"], "left": "#bookshelf/S/W/1.3"}}');
  store = withFoldPage(store, "bookshelf/S/W", { open: ["Book I", "Dedications"] });
  store = withFoldPage(store, "bookshelf/D/C", { open: ["Inferno"] });
  const again = parseFoldStore(JSON.stringify(store));
  expect(foldPage(again, "bookshelf/S/W")).toEqual({ open: ["Book I", "Dedications"], closed: [] });
  expect(foldPage(again, "bookshelf/D/C")).toEqual({ open: ["Inferno"], closed: [] });
});
test("a malformed page record keeps only what is well formed", () => {
  const store = parseFoldStore('{"bookshelf/S/W": {"open": ["A", 3, null, "B"], "left": 7}}');
  expect(foldPage(store, "bookshelf/S/W")).toEqual({ open: ["A", "B"], closed: [] });
});

test("movedFolds: each moved entry's open sections go with it; the rest stay", () => {
  const store = parseFoldStore('{"bookshelf/C. P. Cavafy":{"open":["Poems"]},"commonplace/A":{"open":["X"]}}');
  expect(movedFolds(store, { "bookshelf/C. P. Cavafy": "bookshelf/Cavafy, C. P" })).toEqual({ "bookshelf/Cavafy, C. P": { open: ["Poems"], closed: [] }, "commonplace/A": { open: ["X"], closed: [] } });
});

test("a contents page remembers its open sections, a journal day or a commonplace its closed ones, each read back as it was written", () => {
  let store = parseFoldStore(null);
  store = withFoldPage(store, "bookshelf/S/W", remembering("contents", ["Book I"]));
  store = withFoldPage(store, "2026-01-07", remembering("sections", ["Walk"]));
  const again = parseFoldStore(JSON.stringify(store));
  expect(remembered(foldPage(again, "bookshelf/S/W"), "contents")).toEqual(["Book I"]);
  expect(remembered(foldPage(again, "2026-01-07"), "sections")).toEqual(["Walk"]);
  expect(remembered(foldPage(again, "2026-01-07"), "contents")).toEqual([]);
});

test("a deleted entry's folds are forgotten, so an entry made again at its key opens as new", () => {
  const store = parseFoldStore('{"commonplace/X":{"closed":["Notes"]},"commonplace/X/Sub":{"closed":["A"]},"commonplace/Y":{"closed":["B"]}}');
  const left = droppedFolds(store, ["commonplace/X", "commonplace/X/Sub"]);
  expect(Object.keys(left)).toEqual(["commonplace/Y"]);
  expect(remembered(foldPage(left, "commonplace/X"), "sections")).toEqual([]);
});
