import { test, expect } from "vitest";
import { ALERTS, alertWords, alertKind, alertMs, said, type AlertId } from "./alertText.ts";

test("an alert's words by its id: fixed words as they are, words with parameters filled in", () => {
  expect(alertWords(said("saved"))).toBe("saved");
  expect(alertWords(said("noBookmark", { n: "3" }))).toBe("no bookmark 3");
  expect(alertWords(said("entriesStored", { n: 12 }))).toBe("12 entries stored");
});

test("an alert's kind and its time on screen come with its id; a message with no time of its own has none", () => {
  expect(alertKind("saved")).toBe("success");
  expect(alertKind("notSaved")).toBe("error");
  expect(alertMs("saved")).toBe(1400);
  expect(alertMs("noBookmark")).toBeUndefined();
});

test("every entry says when it is raised, and no two entries say the same fixed words under one kind", () => {
  const ids = Object.keys(ALERTS) as AlertId[];
  expect(ids.filter((id) => !ALERTS[id].when.trim())).toEqual([]);
  const fixed = ids.filter((id) => typeof ALERTS[id].words === "string").map((id) => ALERTS[id].kind + " " + ALERTS[id].words);
  expect(fixed.filter((w, i) => fixed.indexOf(w) !== i)).toEqual([]);
});
