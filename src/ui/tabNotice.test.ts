import { test, expect } from "vitest";
import { screenNotice } from "./tabNotice.ts";

test("an entry not on screen takes another tab's write, a delete too", () => {
  expect(screenNotice(false, false, "theirs")).toBe("take");
  expect(screenNotice(false, true, "theirs")).toBe("take");
  expect(screenNotice(false, false, null)).toBe("take");
});

test("the entry on screen: redrawn with nothing unsaved, left with typing not yet saved", () => {
  expect(screenNotice(true, false, "theirs")).toBe("take");
  expect(screenNotice(true, true, "theirs")).toBe("leave");
});

test("the entry on screen deleted in another tab: said when nothing is unsaved, left to the refusal when typing is", () => {
  expect(screenNotice(true, false, null)).toBe("deleted");
  expect(screenNotice(true, true, null)).toBe("leave");
});
