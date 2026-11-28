import { test, expect } from "vitest";
import { isStephanus, stephanusPage, askedStephanus, stephanusRun } from "./stephanus.ts";

test("a Stephanus number is a page's digits and one letter, a to e, lower case", () => {
  for (const label of ["2a", "6e", "509d", "1094a"]) expect(isStephanus(label)).toBe(true);
  for (const label of ["2", "xiv", "2f", "2A", "2ab", "a2", ""]) expect(isStephanus(label)).toBe(false);
});

test("a Stephanus number's page is its digits", () => {
  expect(stephanusPage("6d")).toBe("6");
  expect(stephanusPage("509d")).toBe("509");
});

test("an ask is a Stephanus number or a page, case-blind and trimmed; anything else is not a number", () => {
  expect(askedStephanus(" 6D ")).toEqual({ kind: "number", asked: "6d", page: "6" });
  expect(askedStephanus("6")).toEqual({ kind: "page", asked: "6", page: "6" });
  expect(askedStephanus("   ")).toEqual({ kind: "nothing" });
  for (const typed of ["6f", "xiv", "p. 6", "6dd"]) expect(askedStephanus(" " + typed)).toEqual({ kind: "notANumber", typed });
});

test("a run is named bare: alone, by its last letter on one page, whole across pages", () => {
  expect(stephanusRun("2a")).toBe("2a");
  expect(stephanusRun("2a", null)).toBe("2a");
  expect(stephanusRun("2a", "2a")).toBe("2a");
  expect(stephanusRun("2a", "2c")).toBe("2a-c");
  expect(stephanusRun("2d", "3a")).toBe("2d-3a");
  expect(stephanusRun("9e", "10a")).toBe("9e-10a");
});

test("a run from a Stephanus number to a label that is not one is named whole", () => {
  expect(stephanusRun("2a", "xiv")).toBe("2a-xiv");
  expect(stephanusRun("2a", "2")).toBe("2a-2");
});
