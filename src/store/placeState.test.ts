// Where each entry was left, remembered in this browser across reloads
// (2026-09-28, the reader: back on Book I, Canto vi, the reading should
// stand at stanza 7, where it was left).
import { test, expect } from "vitest";
import { parsePlaces, placeOf, withPlace, PLACES_CAP } from "./placeState.ts";

test("an absent or damaged store reads as empty; an entry never left has no place", () => {
  for (const raw of [null, "", "nope", "{}", '[{"k": 3}]']) expect(placeOf(parsePlaces(raw), "bookshelf/S/W/1.6")).toBe(null);
});
test("a place round-trips: the text position in the rendered view, the offset in the source", () => {
  const s = withPlace(parsePlaces(null), "bookshelf/S/W/1.6", { pos: 812, y: 1450 });
  expect(placeOf(parsePlaces(JSON.stringify(s)), "bookshelf/S/W/1.6")).toEqual({ pos: 812, y: 1450 });
});
test("the most recently left come first, and only the cap is kept", () => {
  let s = parsePlaces(null);
  for (let i = 0; i < PLACES_CAP + 5; i++) s = withPlace(s, "e" + i, { pos: i, y: i });
  expect(s.length).toBe(PLACES_CAP);
  expect(s[0].key).toBe("e" + (PLACES_CAP + 4));
  expect(placeOf(s, "e0")).toBe(null);
  s = withPlace(s, "e10", { pos: 99, y: 99 });
  expect(s[0]).toEqual({ key: "e10", pos: 99, y: 99 });
  expect(s.filter((x) => x.key === "e10").length).toBe(1);
});
test("a malformed record is dropped, the rest kept", () => {
  const s = parsePlaces('[{"key":"a","pos":3,"y":4},{"key":"b","pos":"x"},{"pos":1,"y":2},{"key":"c","pos":5,"y":6}]');
  expect(s.map((x) => x.key)).toEqual(["a", "c"]);
});
