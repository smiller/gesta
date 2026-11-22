import { test, expect } from "vitest";
import { stripPlace } from "./flashStrip.ts";

test("the strip is stuck at the header's foot, and what hangs from the header starts at the strip's", () => {
  expect(stripPlace(140, 65)).toEqual({ "--strip-top": "140px", "--strip-h": "65px", "--strip-bottom": "205px" });
});
