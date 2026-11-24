import { test, expect } from "vitest";
import { landings } from "./textPoint.ts";

const horace = [["Maecenas, born ", "of monarch ancestors,"], ["o et prae", "sidium et dulce decus meum,"], ["The shield at once and glory of my life!"]];

test("a needle split by marks is found across its block's pieces, a point between two pieces taken as the later one's start", () => {
  expect(landings(horace, ["born of monarch", 5], ["o et praes", 9])).toEqual([[0, 1, 0], [1, 1, 0]]);
});

test("a point that closes its needle lands at the end of the piece holding its last character", () => {
  expect(landings([["# "], ["Sean Miller"], ["A book."]], ["Sean Miller", 11], ["Sean Miller", 11])).toEqual([[1, 0, 11], [1, 0, 11]]);
  expect(landings([["Maecenas, born "], ["of monarch"]], ["born", 0], ["born", 4])).toEqual([[0, 0, 10], [0, 0, 14]]);
});

test("a needle is found only within one block, the first block holding it", () => {
  expect(landings(horace, ["ancestors,o et", 0], ["o et", 0])).toBe(null);
  expect(landings([["English"], ["Latin"], ["Latin poets"]], ["Latin", 0], ["Latin", 5])).toEqual([[1, 0, 0], [1, 0, 5]]);
});

test("a point past its block's end, or a needle not there, lands nowhere", () => {
  expect(landings([["one"], ["two"]], ["one", 4], ["one", 4])).toBe(null);
  expect(landings([["one"]], ["three", 0], ["one", 0])).toBe(null);
});
