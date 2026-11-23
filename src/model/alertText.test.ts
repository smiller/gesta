import { test, expect } from "vitest";
import { ALERTS, PHRASES, alertWords, alertKind, alertMs, said, type AlertId } from "./alertText.ts";

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

test("a count of entries says entry for one and entries for any other", () => {
  expect(alertWords(said("imported", { n: 1 }))).toBe("imported 1 entry");
  expect(alertWords(said("imported", { n: 2 }))).toBe("imported 2 entries");
  expect(alertWords(said("entriesStored", { n: 1 }))).toBe("1 entry stored");
  expect(alertWords(said("bundleOpened", { n: 1 }))).toBe("1 entry");
  expect(alertWords(said("exported", { n: 1 }))).toBe("exported 1 entry");
  expect(alertWords(said("indexed", { n: 1 }))).toBe("indexed 1 entry");
  expect(alertWords(said("exportedPicturesMissing", { n: 1, missing: 2 }))).toBe("exported 1 entry — 2 pictures missing");
  expect(alertWords(said("exportedSomeFailed", { n: 1, failed: 1, missing: 0 }))).toBe("exported 1 entry; 1 file(s) failed");
});

test("an alert quoting what was typed, a page or a name cuts it at 24 characters; a refused fence quotes its word in full", () => {
  const long = "abcdefghijklmnopqrstuvwxyz0123";
  const cut = "abcdefghijklmnopqrstuvw…";
  expect(alertWords(said("notANumber", { typed: long, noun: "line" }))).toBe(cut + " is not a line number");
  expect(alertWords(said("notStanzaOrLine", { typed: long }))).toBe(cut + " is not a stanza or stanza.line, like 2.1");
  expect(alertWords(said("noPage", { page: long }))).toBe("no page " + cut + " here");
  expect(alertWords(said("alreadyOn", { label: long }))).toBe("already on " + cut);
  expect(alertWords(said("keyTaken", { key: long, label: long }))).toBe("“" + cut + "” already goes to " + cut);
  expect(alertWords(said("typeStanzaFor", { line: long }))).toBe("type a stanza for line " + cut);
  expect(alertWords(said("thereAlreadyWithSubs", { name: long }))).toBe("“" + cut + "” is there already and has sub-entries of its own");
  expect(alertWords(said("shelvesTaken", { name: long }))).toBe("“" + cut + "” is the shelves’ own name");
  expect(PHRASES.notANumber({ typed: long, noun: "stanza" })).toBe(long + " is not a stanza number");
});
