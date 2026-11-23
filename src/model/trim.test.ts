import { test, expect } from "vitest";
import { trimLabel } from "./trim.ts";

test("trimLabel keeps a short label, cuts a long one to the cap with an ellipsis, never inside a surrogate pair", () => {
  expect(trimLabel("short", 10)).toBe("short");
  expect(trimLabel("a long label indeed", 8)).toBe("a long …");
  expect(trimLabel("ab😀cd", 4)).toBe("ab…");
});
