import { describe, it, expect } from "vitest";
import { searchFold, parseSearchQuery, isWordChar, searchHits, inScope, inBook, searchEntries, snippetRuns, SEARCH_CAP, type Scope, type IndexRow } from "./search.ts";

describe("searchFold", () => {
  it("lower-cases, straightens curly apostrophes, stays 1:1 in code units", () => {
    expect(searchFold("Don’t ‘Tis")).toBe("don't 'tis");
    expect(searchFold("İi").length).toBe(2);
    expect(searchFold("İ")).toBe("i");
    expect(searchFold('"quoted"')).toBe('"quoted"');
  });
});
describe("parseSearchQuery", () => {
  it("substring by default, an edge underscore bounds that end, a doubled one is literal", () => {
    expect(parseSearchQuery("_sister_")).toEqual({ needle: "sister", left: true, right: true });
    expect(parseSearchQuery("sister")).toEqual({ needle: "sister", left: false, right: false });
    expect(parseSearchQuery("__private_")).toEqual({ needle: "_private", left: true, right: true });
    expect(parseSearchQuery("Sister").needle).toBe("sister");
  });
  it("only-underscore and whitespace-exposing queries", () => {
    expect(parseSearchQuery("_")).toEqual({ needle: "_", left: false, right: false });
    expect(parseSearchQuery("__")).toEqual({ needle: "__", left: false, right: false });
    expect(parseSearchQuery("").needle).toBe("");
    expect(parseSearchQuery("   ").needle).toBe("");
    expect(parseSearchQuery("_ hi _")).toEqual({ needle: "hi", left: true, right: true });
  });
});
describe("isWordChar", () => {
  it("letters and digits only", () => {
    expect(isWordChar("a1", 0) && isWordChar("a1", 1)).toBe(true);
    expect(isWordChar("é", 0)).toBe(true);
    expect(isWordChar("'", 0) || isWordChar("’", 0) || isWordChar("_", 0) || isWordChar(" ", 0)).toBe(false);
    expect(isWordChar("a", 5)).toBe(false);
  });
});
describe("searchHits", () => {
  it("boundaries, the stride, and the limit", () => {
    expect(searchHits("aa aa", "aa", true, true)).toEqual([0, 3]);
    expect(searchHits("aaa", "aa", true, true)).toEqual([]);
    expect(searchHits("banana", "ana", false, true)).toEqual([3]);
    expect(searchHits("aaaa", "aa", false, false)).toEqual([0, 2]);
    expect(searchHits("_port_ important", "port", true, true)).toEqual([1]);
    expect(searchHits("x x x", "x", false, false, 2)).toEqual([0, 2]);
    expect(searchHits("anything", "", false, false)).toEqual([]);
  });
});
describe("inScope", () => {
  const ROWS = [
    { date: "2020-06-06", tag: null }, { date: "2020-06-06", tag: "notes" },
    { date: "page", tag: "Journalish" }, { date: "page", tag: "Journalish/Ch" }, { date: "page", tag: "Other/Ch" },
  ];
  it("the ONE filter, every kind against every row shape; an unknown kind fails closed", () => {
    const cases: [Scope, boolean[]][] = [
      [{ kind: "everything" }, [true, true, true, true, true]],
      [{ kind: "journal" }, [true, true, false, false, false]],
      [{ kind: "pages" }, [false, false, true, true, true]],
      [{ kind: "book", ns: "page", book: "Journalish" }, [false, false, true, true, false]],
      [{ kind: "nosuchkind" } as unknown as Scope, [false, false, false, false, false]],
    ];
    for (const [scope, want] of cases) expect(ROWS.map((r) => inScope(r, scope))).toEqual(want);
  });
  it("a book scope carries its namespace, so a same-named page is another book", () => {
    const bookRow = { date: "bookshelf", tag: "Corpus" }, pageRow = { date: "page", tag: "Corpus" };
    expect(inScope(bookRow, { kind: "pages" })).toBe(false);
    expect(inScope(bookRow, { kind: "everything" })).toBe(true);
    expect(inScope(bookRow, { kind: "journal" })).toBe(false);
    expect(inScope(bookRow, { kind: "book", ns: "bookshelf", book: "Corpus" })).toBe(true);
    expect(inScope(pageRow, { kind: "book", ns: "bookshelf", book: "Corpus" })).toBe(false);
    expect(inScope(bookRow, { kind: "book", ns: "page", book: "Corpus" })).toBe(false);
    expect(inBook({ date: "page", tag: "Sean's Books/x" }, "page", "Sean")).toBe(false);
  });
});
describe("searchEntries", () => {
  const row = (date: string, tag: string | null, text: string): IndexRow => ({ date, tag, text, lower: searchFold(text) });
  const index = [
    row("page", "Books", "The sisters read. Her sister’s book."),
    row("2026-09-07", null, "A Sister of mercy, and resisters."),
    row("2026-09-06", "x", "nothing here"),
  ];
  it("one result per occurrence with its index, a windowed snippet, the scope applied", () => {
    const r = searchEntries(index, "sister", { kind: "everything" });
    expect(r.map((x) => [x.date, x.nth])).toEqual([["page", 0], ["page", 1], ["2026-09-07", 0], ["2026-09-07", 1]]);
    expect(r[0].snippet).toBe("The sisters read. Her sister’s book.");
    /* "sister’s" folds to "sister's", and an apostrophe is not word glue */
    expect(searchEntries(index, "_sister_", { kind: "everything" }).map((x) => [x.date, x.nth])).toEqual([["page", 0], ["2026-09-07", 0]]);
    expect(searchEntries(index, "sister", { kind: "journal" }).map((x) => x.date)).toEqual(["2026-09-07", "2026-09-07"]);
    expect(searchEntries(index, "", { kind: "everything" })).toEqual([]);
  });
  it("the snippet elides on both sides, and the scan collects one past the cap", () => {
    const long = row("page", "L", "x".repeat(40) + " needle " + "y".repeat(40));
    expect(searchEntries([long], "needle", { kind: "pages" })[0].snippet).toBe("…" + "x".repeat(29) + " needle " + "y".repeat(29) + "…");
    const many = Array.from({ length: SEARCH_CAP + 50 }, (_, i) => row("2020-01-0" + (i % 9 + 1), String(i), "hit"));
    expect(searchEntries(many, "hit", { kind: "everything" }).length).toBe(SEARCH_CAP + 1);
  });
  it("snippetRuns marks the hits under the row's own parse", () => {
    expect(snippetRuns("Her sister's sisters", "_sister_")).toEqual([{ text: "Her ", mark: false }, { text: "sister", mark: true }, { text: "'s sisters", mark: false }]);
    expect(snippetRuns("plain", "")).toEqual([{ text: "plain", mark: false }]);
  });
});
