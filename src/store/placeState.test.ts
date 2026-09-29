import { test, expect } from "vitest";
import { parsePlaces, placeOf, withPlace, movedPlace, PLACES_CAP } from "./placeState.ts";

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
test("a rename carries the place to the new key; a delete drops it; a stale record under the new key goes", () => {
  let s = withPlace(withPlace(parsePlaces(null), "p/old", { pos: 40, y: 900 }), "p/other", { pos: 3, y: 4 });
  s = withPlace(s, "p/new", { pos: 7, y: 8 });
  const renamed = movedPlace(s, "p/old", "p/new");
  expect(placeOf(renamed, "p/new")).toEqual({ pos: 40, y: 900 });
  expect(placeOf(renamed, "p/old")).toBe(null);
  expect(renamed.length).toBe(2);
  const deleted = movedPlace(s, "p/old", null);
  expect(placeOf(deleted, "p/old")).toBe(null);
  expect(placeOf(deleted, "p/other")).toEqual({ pos: 3, y: 4 });
  expect(placeOf(movedPlace(s, "p/none", "p/new"), "p/new")).toBe(null);
});
test("a malformed record is dropped, the rest kept", () => {
  const s = parsePlaces('[{"key":"a","pos":3,"y":4},{"key":"b","pos":"x"},{"pos":1,"y":2},{"key":"c","pos":5,"y":6}]');
  expect(s.map((x) => x.key)).toEqual(["a", "c"]);
});
