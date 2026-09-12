// The fit's arithmetic, pinned with the numbers the current app's comments
// measured (2026-08-09, 03-the-fitted-measure.js). The measuring pass and
// the scheduling are DOM and are looked at in Helium.
import { test, expect } from "vitest";
import { fitWidth, sideBox, MIN_COL, FIT_SLACK } from "./fit.ts";

test("the side box is padding and border on both sides, in px, whatever the style spells them as", () => {
  expect(sideBox({ paddingLeft: "19.8px", paddingRight: "19.8px", borderLeftWidth: "3px", borderRightWidth: "0px" })).toBeCloseTo(42.6);
  expect(sideBox({ paddingLeft: "0px", paddingRight: "0px", borderLeftWidth: "0px", borderRightWidth: "0px" })).toBe(0);
});

const m = (c1: number, c2: number, over = {}) => ({ floor: 712, c1, c2, gap: 43.2, frame: 62.2, cap: 1285, ...over });

test("an entry takes the measure its widest paired line needs, the original at its own width", () => {
  const fit = fitWidth(m(405, 380), null, false)!;
  expect(fit.width).toBe(Math.ceil(406 + 381 + 43.2 + 62.2));
  expect(fit.col).toBe(406);
});

test("never narrower than the prose measure, never wider than the cap", () => {
  expect(fitWidth(m(100, 100), null, false)!.width).toBe(712);
  expect(fitWidth(m(2000, 2000), null, false)!.width).toBe(1285);
  expect(fitWidth(m(2000, 2000, { cap: 900 }), null, false)!.width).toBe(900);
});

test("the original is never measured below a column a caret can land in", () => {
  const empty = fitWidth(m(0, 0), null, false)!;
  expect(empty.col).toBe(MIN_COL + FIT_SLACK);
  expect(empty.width).toBe(712);
  expect(fitWidth(m(0, 300), null, false)!.col).toBe(MIN_COL + FIT_SLACK);
});

test("past the cap the two give way in proportion, and the original takes no more than two thirds", () => {
  /* a URL in an original: 966px on one line box */
  const url = fitWidth(m(966, 400), null, false)!;
  const room = 1285 - 43.2 - 62.2;
  expect(url.width).toBe(1285);
  expect(url.col).toBe(Math.round(room * 2 / 3));
  const even = fitWidth(m(700, 700), null, false)!;
  expect(even.col).toBe(Math.round(room * 701 / 1402));
});

test("a grow only widens: a deletion cannot yank the column in mid-keystroke", () => {
  const prev = { width: 900, col: 400 };
  const grown = fitWidth(m(200, 300), prev, true)!;
  expect(grown.width).toBe(900);
  expect(grown.col).toBe(400);
  /* but a remembered column is clamped to what the room affords */
  const squeezed = fitWidth(m(200, 700), { width: 900, col: 800 }, true)!;
  const room = squeezed.width - 43.2 - 62.2;
  expect(squeezed.width).toBe(1008);
  expect(squeezed.col).toBe(Math.max(201, Math.round(room * 2 / 3), Math.round(room - 701)));
  expect(squeezed.col).toBeLessThan(800);
  /* and to the cap of a window that has narrowed since */
  expect(fitWidth(m(200, 300, { cap: 800 }), { width: 1285, col: 400 }, true)!.width).toBe(800);
  /* a grow with nothing remembered is the fresh answer */
  expect(fitWidth(m(405, 380), null, true)).toEqual(fitWidth(m(405, 380), null, false));
});

test("a settle narrows again, and an entry the layout cannot place is no answer", () => {
  expect(fitWidth(m(200, 300), { width: 900, col: 400 }, false)!.col).toBe(201);
  expect(fitWidth(m(200, 300, { floor: 0 }), null, false)).toBe(null);
});
