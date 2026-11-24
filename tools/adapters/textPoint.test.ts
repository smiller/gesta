import { test, expect } from "vitest";
import { pieceAt, closesNeedle } from "./textPoint.ts";

test("a point between two pieces of text is the later one's start, or the earlier one's end where it closes its needle", () => {
  expect(pieceAt([5, 5], 3, false)).toEqual([0, 3]);
  expect(pieceAt([5, 5], 5, false)).toEqual([1, 0]);
  expect(pieceAt([5, 5], 5, true)).toEqual([0, 5]);
  expect(pieceAt([5, 5], 10, true)).toEqual([1, 5]);
  expect(closesNeedle("Latin", 5)).toBe(true);
  expect(closesNeedle("Latin", 0)).toBe(false);
  expect(closesNeedle("", 0)).toBe(false);
});
