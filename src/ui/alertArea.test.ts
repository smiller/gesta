import { test, expect } from "vitest";
import { areaPlace } from "./alertArea.ts";

test("the alert area is stuck at the header's foot, and what hangs from the header starts at the alert area's", () => {
  expect(areaPlace(140, 65)).toEqual({ "--alert-area-top": "140px", "--alert-area-h": "65px", "--alert-area-bottom": "205px" });
});
