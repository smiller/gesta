import { test, expect } from "vitest";
import { dayKeys, entryNeighbors, childrenOf, registered, unmintedKey, subPageNeighbors, navNeighbors } from "./lists.ts";

const keys = [
  "2026-01-05", "2026-01-05/morning", "2026-01-02", "2025-12-31",
  "commonplace/Recipes", "commonplace/Recipes/Bread", "commonplace/Recipes/Soup",
  "bookshelf/Dante/Inferno/10", "bookshelf/Dante/Inferno/2", "bookshelf/Dante/Inferno/1", "bookshelf/Dante/Purgatorio/1",
];

test("dayKeys: the days with a main entry, ascending; a tag is not a day", () => {
  expect(dayKeys(keys)).toEqual(["2025-12-31", "2026-01-02", "2026-01-05"]);
});

test("entryNeighbors from an indexed day and from a day between", () => {
  expect(entryNeighbors(keys, "2026-01-02")).toEqual({ prev: "2025-12-31", next: "2026-01-05" });
  expect(entryNeighbors(keys, "2026-01-03")).toEqual({ prev: "2026-01-02", next: "2026-01-05" });
  expect(entryNeighbors(keys, "2025-01-01")).toEqual({ prev: null, next: "2025-12-31" });
  expect(entryNeighbors(keys, "2027-01-01")).toEqual({ prev: "2026-01-05", next: null });
});

test("childrenOf: the names directly under a key, in reading order, ancestors included", () => {
  expect(childrenOf(keys, "2026-01-05")).toEqual(["morning"]);
  expect(childrenOf(keys, "commonplace")).toEqual(["Recipes"]);
  expect(childrenOf(keys, "commonplace/Recipes")).toEqual(["Bread", "Soup"]);
  expect(childrenOf(keys, "bookshelf")).toEqual(["Dante"]);            // no body of its own
  expect(childrenOf(keys, "bookshelf/Dante")).toEqual(["Inferno", "Purgatorio"]);
  expect(childrenOf(keys, "bookshelf/Dante/Inferno")).toEqual(["1", "2", "10"]);
  expect(childrenOf(keys, "nothing")).toEqual([]);
});

test("registered: itself present, or an ancestor of one that is; unmintedKey reads the namespace row", () => {
  expect(registered(keys, "bookshelf", "Dante")).toBe(true);
  expect(registered(keys, "bookshelf", "Dante/Inferno/1")).toBe(true);
  expect(registered(keys, "bookshelf", "Milton")).toBe(false);
  expect(registered(keys, "2026-01-05", null)).toBe(true);
  expect(unmintedKey(keys, "bookshelf", "Milton")).toBe(true);
  expect(unmintedKey(keys, "bookshelf", "Dante/Inferno/1")).toBe(false);
  expect(unmintedKey(keys, "commonplace", "Brand New")).toBe(false);     // commonplaces mint on visit
  expect(unmintedKey(keys, "2026-01-05", "new tag")).toBe(false); // a day has no row
});

test("subPageNeighbors walks the order it is given — a book's index order, prose and verse alternating", () => {
  const keys = ["bookshelf/Boethius/Consolatio", "bookshelf/Boethius/Consolatio/3pr1", "bookshelf/Boethius/Consolatio/3m1", "bookshelf/Boethius/Consolatio/3pr2", "bookshelf/Boethius/Consolatio/3m2"];
  const order = ["3pr1", "3m1", "3pr2", "3m2"];
  const parent = "bookshelf/Boethius/Consolatio";
  expect(subPageNeighbors({ keys, bearing: () => true }, parent, "3pr1", order)).toEqual({ prev: null, next: "3m1" });
  expect(subPageNeighbors({ keys, bearing: () => true }, parent, "3m1", order)).toEqual({ prev: "3pr1", next: "3pr2" });
  expect(subPageNeighbors({ keys, bearing: () => true }, parent, "3m2", order)).toEqual({ prev: "3pr2", next: null });
  /* a blank in the order is skipped as before */
  expect(subPageNeighbors({ keys, bearing: (k) => k !== parent + "/3m1" }, parent, "3pr1", order)).toEqual({ prev: null, next: "3pr2" });
  /* a sub the stated order lacks — open, not yet saved — stands at its end */
  expect(subPageNeighbors({ keys, bearing: () => true }, parent, "3m1a", order)).toEqual({ prev: "3m2", next: null });
  /* by name, the same keys walk 3m1, 3m2, 3pr1, 3pr2 */
  expect(subPageNeighbors({ keys, bearing: () => true }, parent, "3pr1")).toEqual({ prev: "3m2", next: "3pr2" });
  expect(navNeighbors({ keys, bearing: () => true }, "bookshelf", "Boethius/Consolatio/3pr1", () => order)).toEqual({ prev: null, next: ["bookshelf", "Boethius/Consolatio/3m1"] });
});
test("subPageNeighbors: siblings in reading order, blanks skipped, an unlisted sub placed by comparison", () => {
  const bearing = (k: string) => k !== "bookshelf/Dante/Inferno/2";
  expect(subPageNeighbors({ keys, bearing }, "bookshelf/Dante/Inferno", "1")).toEqual({ prev: null, next: "10" });
  expect(subPageNeighbors({ keys, bearing: () => true }, "bookshelf/Dante/Inferno", "10")).toEqual({ prev: "2", next: null });
  expect(subPageNeighbors({ keys, bearing: () => true }, "bookshelf/Dante/Inferno", "3")).toEqual({ prev: "2", next: "10" });
});

test("navNeighbors: a day walks days, a sub-entry its siblings, a tagged day and a root nowhere", () => {
  expect(navNeighbors({ keys, bearing: () => true }, "2026-01-02", null)).toEqual({ prev: ["2025-12-31", null], next: ["2026-01-05", null] });
  expect(navNeighbors({ keys, bearing: () => true }, "2026-01-05", "morning")).toEqual({ prev: null, next: null });
  expect(navNeighbors({ keys, bearing: () => true }, "commonplace", "Recipes")).toEqual({ prev: null, next: null });
  expect(navNeighbors({ keys, bearing: () => true }, "commonplace", "Recipes/Bread")).toEqual({ prev: null, next: ["commonplace", "Recipes/Soup"] });
});
