import { test, expect } from "vitest";
import { marginWidth, pushes } from "./margins.ts";

test("the margin form's width from the room left of its block: 15em, narrowing to 10em, then the text", () => {
  /* the plan's table, MEASURED over the mockup at 18px */
  expect(marginWidth(394, 18)).toBe(15);
  expect(marginWidth(294, 18)).toBe(14.6);
  expect(marginWidth(227, 18)).toBe(10);
  expect(marginWidth(226, 18)).toBeNull();
  expect(marginWidth(219, 18)).toBeNull();
  expect(marginWidth(94, 18)).toBeNull();
  expect(marginWidth(-40, 18)).toBeNull();
});

test("a margin-note that would overlap the one above is pushed below it; one clear of it stays", () => {
  expect(pushes([{ top: 0, height: 20 }, { top: 10, height: 20 }, { top: 100, height: 10 }])).toEqual([0, 14, 0]);
  /* a push carries: the third clears the second where the second was pushed to */
  expect(pushes([{ top: 0, height: 20 }, { top: 0, height: 20 }, { top: 30, height: 20 }])).toEqual([0, 24, 18]);
  expect(pushes([])).toEqual([]);
});
