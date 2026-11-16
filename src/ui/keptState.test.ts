import { test, expect } from "vitest";
import { keptState, type KeptStores } from "./keptState.ts";

const shown = (m: Record<string, string>): string => Object.entries(m).map(([a, b]) => a + " → " + b).join(", ");
function stores(log: string[]): KeptStores {
  return {
    places: { move: (from, to) => { log.push("place " + from + " → " + to); }, moveAll: (m) => { log.push("places " + shown(m)); } },
    folds: { move: (m) => { log.push("folds " + shown(m)); }, drop: (keys) => { log.push("folds dropped " + keys.join(", ")); } },
    bookmarks: { move: (m) => { log.push("bookmarks " + shown(m)); } },
  };
}

test("a moved key takes its folds and bookmarks before the open and its place after it", () => {
  const log: string[] = [];
  keptState(stores(log)).relocate({ moved: { "commonplace/A": "commonplace/B" } }, () => log.push("open"));
  expect(log).toEqual(["folds commonplace/A → commonplace/B", "bookmarks commonplace/A → commonplace/B", "open", "places commonplace/A → commonplace/B"]);
});

test("a merged key's bookmark follows to the entry it joined; its folds and place are dropped", () => {
  const log: string[] = [];
  keptState(stores(log)).relocate({ moved: { "commonplace/E/b": "bookshelf/M/E/b" }, merged: { "commonplace/E/a": "bookshelf/M/E/a", "commonplace/E": "bookshelf/M/E" } }, () => log.push("open"));
  expect(log).toEqual([
    "folds commonplace/E/b → bookshelf/M/E/b", "folds dropped commonplace/E/a, commonplace/E",
    "bookmarks commonplace/E/b → bookshelf/M/E/b, commonplace/E/a → bookshelf/M/E/a, commonplace/E → bookshelf/M/E",
    "open",
    "places commonplace/E/b → bookshelf/M/E/b", "place commonplace/E/a → null", "place commonplace/E → null",
  ]);
});

test("a gone key's folds and place are dropped and its bookmark is left for the list to clear", () => {
  const log: string[] = [];
  keptState(stores(log)).relocate({ gone: ["commonplace/A/B", "commonplace/A/B/x"] }, () => log.push("open"));
  expect(log).toEqual(["folds dropped commonplace/A/B, commonplace/A/B/x", "open", "place commonplace/A/B → null", "place commonplace/A/B/x → null"]);
});

test("with no open the stores are told in the same order, and a store with nothing to do is not told", () => {
  const log: string[] = [];
  keptState(stores(log)).relocate({ moved: { "page/A": "commonplace/A" } });
  expect(log).toEqual(["folds page/A → commonplace/A", "bookmarks page/A → commonplace/A", "places page/A → commonplace/A"]);
});
