import { test, expect } from "vitest";
import { screenTake } from "./tabWrite.ts";

test("an entry not on screen takes another tab's write, a delete too", () => {
  expect(screenTake(false, false, "theirs")).toBe("take");
  expect(screenTake(false, true, "theirs")).toBe("take");
  expect(screenTake(false, false, null)).toBe("take");
});

test("the entry on screen: redrawn with nothing unsaved, left with typing not yet saved", () => {
  expect(screenTake(true, false, "theirs")).toBe("take");
  expect(screenTake(true, true, "theirs")).toBe("leave");
});

test("the entry on screen deleted in another tab: said when nothing is unsaved, left to the refusal when typing is", () => {
  expect(screenTake(true, false, null)).toBe("deleted");
  expect(screenTake(true, true, null)).toBe("leave");
});
