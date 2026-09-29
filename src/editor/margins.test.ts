import { test, expect } from "vitest";
import { marginWidth, marginShift, pushes } from "./margins.ts";

test("the margin form's width from the room left of its block: 15em, narrowing to 10em, then the text", () => {
  /* the room 1500, 1300, 1150 and 900px windows leave at 18px text, MEASURED in Helium */
  expect(marginWidth(394, 18, 14.4)).toBe(15);
  expect(marginWidth(294, 18, 14.4)).toBe(14.6);
  expect(marginWidth(227, 18, 14.4)).toBe(10);
  expect(marginWidth(226, 18, 14.4)).toBeNull();
  expect(marginWidth(219, 18, 14.4)).toBeNull();
  expect(marginWidth(94, 18, 14.4)).toBeNull();
  expect(marginWidth(-40, 18, 14.4)).toBeNull();
});

test("the margin form's shift from where it would stand in the text: past its block's inset, the reach and its own width", () => {
  /* a book's verse block: 54px of gutter inside its left edge */
  expect(marginShift(15, 18, 14.4, 54)).toBeCloseTo(-(54 + 82.8 + 216));
  expect(marginShift(10, 18, 14.4, 0)).toBeCloseTo(-(82.8 + 144));
});

test("a margin-note that would overlap the one above is pushed below it; one clear of it stays", () => {
  expect(pushes([{ top: 0, height: 20 }, { top: 10, height: 20 }, { top: 100, height: 10 }])).toEqual([0, 14, 0]);
  /* a push carries: the third clears the second where the second was pushed to */
  expect(pushes([{ top: 0, height: 20 }, { top: 0, height: 20 }, { top: 30, height: 20 }])).toEqual([0, 24, 18]);
  expect(pushes([])).toEqual([]);
});

test("a note not drawn, inside a folded section, neither moves nor moves the next", () => {
  expect(pushes([{ top: 0, height: 0 }, { top: -300, height: 20 }, { top: -290, height: 20 }])).toEqual([0, 0, 14]);
});
