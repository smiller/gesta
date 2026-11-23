import { test, expect } from "vitest";
import { areaPlace, placeArea, pageTop, pageTopCached } from "./alertArea.ts";

test("the alert area is stuck at the masthead's foot, and what hangs from the masthead starts at the alert area's", () => {
  expect(areaPlace(140, 65)).toEqual({ "--alert-area-top": "140px", "--alert-area-h": "65px", "--alert-area-bottom": "205px" });
});

test("the page's top is where the masthead or the alert area ends, whichever is lower: measured now, or as the last resize left it", () => {
  const box = (height: number, bottom: number) => ({ offsetHeight: height, getBoundingClientRect: () => ({ bottom }) as DOMRect }) as HTMLElement;
  const head = box(84, 84), area = box(64, 148);
  placeArea({ style: { setProperty: () => {} } } as unknown as HTMLElement, head, area);
  expect([pageTop(), pageTopCached()]).toEqual([148, 148]);
  (area as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({ bottom: 199 }) as DOMRect;
  expect([pageTop(), pageTopCached()]).toEqual([199, 148]);
});
