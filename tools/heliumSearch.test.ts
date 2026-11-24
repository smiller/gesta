import { test, expect } from "vitest";
import { searchShown } from "../src/ui/searchModel.ts";
import { screenState } from "../src/ui/screen.svelte.ts";
import { answers, type SearchShown } from "./adapters/searchShown.ts";

test("the steps' search wait reads what the search row publishes: the query answered, and the rows by count", () => {
  const sr = screenState(5).search;
  Object.assign(sr, { open: true, query: "outside sky", answered: null });
  expect(answers(searchShown(sr), "outside sky")).toBe(false);
  sr.answered = "outside sky";
  const shown: SearchShown = searchShown(sr);
  expect(answers(shown, "outside sky")).toBe(true);
  expect(Object.keys(shown).sort()).toEqual(["answered", "empty", "open", "rows"]);
});
