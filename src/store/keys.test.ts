// The key vocabulary's contract, ported 2026-09-07 from
// ../writer/src/js/keys.test.mjs; the storage namespace is the one change.
import { test, expect } from "vitest";
import {
  isDayKey, PAGE_KEY, NS, NS_PAGE, NS_BOOK, NS_KEYS, nsOf,
  pageParts, entryKey, encPart, entryHash, hashTarget,
  capitalized, entryNoun, monthLabel, dateLabel,
  todayKey, prettyDate, byName, titlesRoots,
} from "./keys.ts";

test("the storage namespace sits outside page750.*", () => {
  expect(NS.startsWith("page750")).toBe(false);
  expect(NS.endsWith(".")).toBe(true);
});

test("isDayKey accepts the date shape and nothing else", () => {
  expect(isDayKey("2026-01-05")).toBe(true);
  // Shape only, deliberately: no month/day range check.
  expect(isDayKey("2026-13-40")).toBe(true);
  expect(isDayKey("2026-1-5")).toBe(false);
  expect(isDayKey(PAGE_KEY)).toBe(false);
  expect(isDayKey("bookshelf")).toBe(false);
  // Anchored at both ends — DATE_KEY_SRC is the unanchored spelling.
  expect(isDayKey("x2026-01-05")).toBe(false);
  expect(isDayKey("2026-01-05/tag")).toBe(false);
});

test("nsOf answers the namespace rows and nothing hand-typed", () => {
  expect(nsOf(PAGE_KEY)).toBe(NS_PAGE);
  expect(nsOf("bookshelf")).toBe(NS_BOOK);
  expect(nsOf("2026-01-05")).toBe(null);
  // A hand-typed #__proto__ or #constructor must answer "not a namespace".
  expect(nsOf("__proto__")).toBe(null);
  expect(nsOf("constructor")).toBe(null);
  expect(NS_KEYS).toEqual([PAGE_KEY, "bookshelf"]);
  // Every row declares both nouns — the guard whose job is the day a third
  // row arrives short one.
  for (const k of NS_KEYS) {
    const ns = nsOf(k)!;
    expect(ns.noun && ns.subNoun).toBeTruthy();
  }
});

test("entryKey joins date and tag; tag optional", () => {
  expect(entryKey("2026-01-05", null)).toBe("2026-01-05");
  expect(entryKey("2026-01-05", "Ideas")).toBe("2026-01-05/Ideas");
  expect(entryKey("page", "A/B")).toBe("page/A/B");
});

test("pageParts: the four fields, and their divergence past depth 2", () => {
  expect(pageParts("A")).toEqual({ name: "A", sub: false, parent: null, leaf: "A" });
  expect(pageParts("A/B")).toEqual({ name: "A", sub: true, parent: "A", leaf: "B" });
  // At depth 3 name and parent part company: which BOOK, which LIST.
  expect(pageParts("A/B/C")).toEqual({ name: "A", sub: true, parent: "A/B", leaf: "C" });
});

test("encPart encodes parens beyond encodeURIComponent", () => {
  expect(encPart("a (b)")).toBe("a%20%28b%29");
});

test("entryHash: a keyed tag's slash is structure, a day tag's is content", () => {
  expect(entryHash("2026-01-05", null)).toBe("#2026-01-05");
  expect(entryHash("2026-01-05", "a/b")).toBe("#2026-01-05/a%2Fb");
  expect(entryHash("page", "A/B (x)")).toBe("#page/A/B%20%28x%29");
  expect(entryHash("bookshelf", "Milton, John/Paradise Lost"))
    .toBe("#bookshelf/Milton%2C%20John/Paradise%20Lost");
  // The two arms use DIFFERENT encoders, and parens are where they differ;
  // collapsing them would re-spell every stored day href.
  expect(entryHash("2026-01-05", "a (b)")).toBe("#2026-01-05/a%20(b)");
});

test("entryHash appends the highlight payload", () => {
  expect(entryHash("2026-01-05", null, { q: "so (it) goes", nth: 2 }))
    .toBe("#2026-01-05?h=so%20%28it%29%20goes&n=2");
  expect(entryHash("2020-01-01", "work", { q: "a b", nth: 2 }))
    .toBe("#2020-01-01/work?h=a%20b&n=2");
  expect(entryHash("2026-01-05", null, { q: "x" })).toBe("#2026-01-05?h=x");
  // nth 0 omits the n param, like no nth at all.
  expect(entryHash("2026-01-05", null, { q: "x", nth: 0 })).toBe("#2026-01-05?h=x");
  expect(entryHash("2026-01-05", null, {})).toBe("#2026-01-05");
});

test("hashTarget: the first ? ends the address", () => {
  expect(hashTarget("#2026-01-05?h=q&n=1")).toBe("#2026-01-05");
  expect(hashTarget("#page/A")).toBe("#page/A");
});

test("entryNoun reads the row and the level; a day has no noun", () => {
  expect(entryNoun("page", "Notes")).toBe("page");
  expect(entryNoun("page", "Notes/Sub")).toBe("sub-page");
  expect(entryNoun("bookshelf", "Milton, John")).toBe("author");
  expect(entryNoun("bookshelf", "Milton, John/Paradise Lost")).toBe("book");
  expect(entryNoun("2026-01-05", "tag")).toBe(null);
  expect(entryNoun("page", null)).toBe("page");
});

test("date labels: English-fixed months, no zero-padding on the day", () => {
  expect(monthLabel(1)).toBe("January");
  expect(monthLabel(12)).toBe("December");
  expect(monthLabel(13)).toBe("");
  expect(dateLabel("1998-05-05")).toBe("5 May 1998");
  expect(dateLabel("2026-12-25")).toBe("25 December 2026");
  expect(capitalized("author")).toBe("Author");
});

test("todayKey is date-shaped; prettyDate ends with dateLabel's rendering", () => {
  expect(isDayKey(todayKey())).toBe(true);
  // The weekday half is locale-aware by design, so only the fixed half is pinned.
  expect(prettyDate("1998-05-05").endsWith(", 5 May 1998")).toBe(true);
});

test("byName: numeric-aware, and a TOTAL order — names the collator ties still sort", () => {
  expect(["10", "8b", "2", "8"].sort(byName)).toEqual(["2", "8", "8b", "10"]);
  expect(["10 — b", "8b — d", "2 — a", "9 — e", "8 — c"].sort(byName))
    .toEqual(["2 — a", "8 — c", "8b — d", "9 — e", "10 — b"]);
  expect(["Beta", "Alpha"].sort(byName)).toEqual(["Alpha", "Beta"]);
  expect(["2 x", "02 x"].sort(byName)).toEqual(["02 x", "2 x"]);
  expect(byName("2 x", "02 x") > 0 && byName("02 x", "2 x") < 0).toBe(true);
  expect(byName("2", "02")).not.toBe(0);
  expect(byName("02", "2")).toBe(-byName("2", "02"));
  expect(byName("a", "a")).toBe(0);
});

test("titlesRoots: read off the namespace column, false for a day and an unknown key", () => {
  expect(titlesRoots(NS_BOOK.key)).toBe(true);
  expect(titlesRoots(NS_PAGE.key)).toBe(false);
  expect(titlesRoots("2021-06-22")).toBe(false);
});
