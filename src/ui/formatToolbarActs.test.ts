import { test, expect } from "vitest";
import { roomAbove } from "./formatToolbarActs.ts";

test("the text moves down by what the toolbar lacks above the selection, and not at all where it has room", () => {
  expect(roomAbove(400, 148)).toBe(0);
  expect(roomAbove(205, 148)).toBe(0);
  expect(roomAbove(204, 148)).toBe(1);
  expect(roomAbove(150, 148)).toBe(55);
  expect(roomAbove(239, 202)).toBe(20);
});
