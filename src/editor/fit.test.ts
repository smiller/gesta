// The fit's arithmetic, pinned with measured numbers. The measuring pass and
// the scheduling are DOM and are looked at in Helium.
import { test, expect } from "vitest";
import { fitWidth, insetCol, insetDualCol, sideBox, proseWidth, MIN_COL, FIT_SLACK, DUAL_MIN_ENGLISH } from "./fit.ts";

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

/* the measured card on commonplace/3x3 at a 1520px window: room 408, the widest
   original 266 and translation 131, as read under max-content */
test("an inset block's split: where both columns' widest lines fit, the spare room is shared between them", () => {
  expect(insetCol(408, 266, 131)).toBe(Math.round(267 + (408 - 267 - 132) / 2));
});
test("an inset block's split: where they do not fit, the column whose widest line is shorter keeps it", () => {
  expect(insetCol(381, 266, 131)).toBe(381 - 132);
  expect(insetCol(381, 131, 266)).toBe(132);
});
test("an inset block's split: where neither fits in half, equal halves", () => {
  expect(insetCol(300, 400, 250)).toBe(150);
});
test("an inset block's split: the original is never measured below a column a caret can land in", () => {
  expect(insetCol(408, 0, 131)).toBe(Math.round(MIN_COL + FIT_SLACK + (408 - MIN_COL - FIT_SLACK - 132) / 2));
});
test("an inset block's split: the translation is never measured below a column a caret can land in, nor the original pushed below one", () => {
  expect(insetCol(400, 500, 0)).toBe(400 - MIN_COL - FIT_SLACK);
  expect(insetCol(400, 0, 500)).toBe(MIN_COL + FIT_SLACK);
});

/* Satire 1.10's bracketed lines in their note at a 1400px window: room
   1047, the page's English 545 in from the box's Latin, the widest Latin 254 */
test("a dual-language block in a note: its English stands at the page's English edge", () => {
  expect(insetDualCol(1047, 545, 254, 230)).toBe(545);
});
test("a dual-language block in a note: where the edge leaves the Latin or the English short, equal halves", () => {
  expect(insetDualCol(1047, 200, 254, 230)).toBe(524);
  expect(insetDualCol(600, 545, 254, 230)).toBe(300);
});
test("a dual-language block in a note: with no edge on the page, equal halves", () => {
  expect(insetDualCol(1047, null, 254, 230)).toBe(524);
});
test("a dual-language block in a note: halves that would wrap the Latin give it its width, up to two thirds", () => {
  expect(insetDualCol(600, null, 350, 230)).toBe(351);
  expect(insetDualCol(600, null, 500, 230)).toBe(400);
});

test("past the cap a dual-language block's Latin keeps its width and the English gives way, down to a floor of its own", () => {
  // room 936 - 105.4 = 830.6: the Latin's 461 kept, the English the rest
  expect(fitWidth(m(460, 540, { cap: 936, whole: true }), null, false)).toEqual({ width: 936, col: 461 });
  // a room too narrow for both: the English keeps its floor and the Latin takes what is left
  expect(fitWidth(m(460, 540, { cap: 600, whole: true }), null, false)).toEqual({ width: 600, col: Math.round(600 - 105.4 - DUAL_MIN_ENGLISH) });
});

test("a dual-language block whose sentences are all short keeps its Latin whole: the English is held back only to the room it needs", () => {
  // room 712 - 105.4 = 606.6 holds 381 + 101: nothing gives way
  expect(fitWidth(m(380, 100, { whole: true }), null, false)).toEqual({ width: 712, col: 381 });
});

test("a dual-language block's grow only widens, its column kept against a Latin line just shortened", () => {
  expect(fitWidth(m(300, 540, { cap: 936, whole: true }), { width: 936, col: 461 }, true)).toEqual({ width: 936, col: 461 });
  // the settle narrows it again
  expect(fitWidth(m(300, 540, { cap: 936, whole: true }), { width: 936, col: 461 }, false)!.col).toBe(301);
});

test("beside a dual-language block one over-wide line still takes no more than two thirds", () => {
  // room 1285 - 105.4 = 1179.6: the English's floor would leave the URL 892
  expect(fitWidth(m(1200, 540, { whole: true }), null, false)!.col).toBe(Math.round(1179.6 * 2 / 3));
});

test("paired prose takes two 24em columns and its gap, with its frame: 908px at 18px, a quotation's padding and rule on top", () => {
  expect(proseWidth(18, 0)).toBe(908);
  expect(proseWidth(18, 42.6)).toBe(Math.ceil(864 + 43.2 + 42.6));
});
test("paired prose beside verse: the entry is as wide as the wider of the two, never past the cap", () => {
  expect(fitWidth(m(300, 300, { prose: 950 }), null, false)!.width).toBe(950);
  expect(fitWidth(m(300, 300, { prose: 950 }), null, false)!.col).toBe(301);
  expect(fitWidth(m(500, 500, { prose: 950 }), null, false)!.width).toBe(Math.ceil(501 + 501 + 43.2 + 62.2));
  expect(fitWidth(m(300, 300, { prose: 950, cap: 800 }), null, false)!.width).toBe(800);
});
