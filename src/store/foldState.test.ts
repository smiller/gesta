// What a folding contents page remembers between visits, in this browser
// (2026-09-28, the contents-folds plan): its open sections, and the link it
// was left from.
import { test, expect } from "vitest";
import { parseFoldStore, foldPage, withFoldPage } from "./foldState.ts";

test("an absent, empty or damaged store reads as empty; a page never seen starts all closed", () => {
  for (const raw of [null, "", "not json", "[1,2]", '{"x": 3}']) expect(foldPage(parseFoldStore(raw), "bookshelf/S/W")).toEqual({ open: [], left: null });
});
test("a page's open sections and the link it was left from round-trip; other pages are untouched", () => {
  let store = parseFoldStore(null);
  store = withFoldPage(store, "bookshelf/S/W", { open: ["Book I", "Dedications"] });
  store = withFoldPage(store, "bookshelf/S/W", { left: "#bookshelf/S/W/1.3" });
  store = withFoldPage(store, "bookshelf/D/C", { open: ["Inferno"] });
  const again = parseFoldStore(JSON.stringify(store));
  expect(foldPage(again, "bookshelf/S/W")).toEqual({ open: ["Book I", "Dedications"], left: "#bookshelf/S/W/1.3" });
  expect(foldPage(again, "bookshelf/D/C")).toEqual({ open: ["Inferno"], left: null });
});
test("a malformed page record keeps only what is well formed", () => {
  const store = parseFoldStore('{"bookshelf/S/W": {"open": ["A", 3, null, "B"], "left": 7}}');
  expect(foldPage(store, "bookshelf/S/W")).toEqual({ open: ["A", "B"], left: null });
});
