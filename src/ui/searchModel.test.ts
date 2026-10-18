import { describe, it, expect } from "vitest";
import { defaultScope, scopeOptions, resultLabel, sameScope, optionGroups } from "./searchModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = {
  "2026-09-07": "day", "page/Books": "# Books", "page/Books/Essay": "# The essay\n\nb", "page/Books/Deep/Down": "d",
  "bookshelf/Milton, John": "# John Milton", "bookshelf/Milton, John/PL/1": "# Book 1",
};
const keys = Object.keys(cache), journal = journalOf(cache);
const r = (date: string, tag: string | null) => ({ date, tag, nth: 0, snippet: "" });

describe("defaultScope", () => {
  it("the open book on any keyed entry, else the journal", () => {
    expect(defaultScope("2026-09-07", "tag")).toEqual({ kind: "journal" });
    expect(defaultScope("page", "Books/Essay")).toEqual({ kind: "book", ns: "page", book: "Books" });
    expect(defaultScope("bookshelf", "Milton, John")).toEqual({ kind: "book", ns: "bookshelf", book: "Milton, John" });
  });
});
describe("scopeOptions", () => {
  it("the three fixed rows, then a labelled group per namespace of its roots by label", () => {
    const o = scopeOptions("2026-09-07", null, keys, journal);
    expect(o.map((x) => [x.label, x.group])).toEqual([
      ["Everything", null], ["Journal", null], ["All Pages", null], ["Books", "Pages"], ["John Milton", "Authors"],
    ]);
    expect(o[4].scope).toEqual({ kind: "book", ns: "bookshelf", book: "Milton, John" });
  });
  it("the open unregistered book joins its own group, so the preselect has a row", () => {
    const o = scopeOptions("page", "Brand New", keys, journal);
    expect(o.filter((x) => x.group === "Pages").map((x) => x.label)).toEqual(["Books", "Brand New"]);
    expect(o.some((x) => sameScope(x.scope, defaultScope("page", "Brand New")))).toBe(true);
  });
});
describe("resultLabel", () => {
  it("a day by its date and tag; a page by its label; a sub-page as book › parent › leaf, the book dropped under its own scope", () => {
    const any = { kind: "everything" } as const;
    expect(resultLabel(r("2026-09-07", null), any, journal)).toBe("2026-09-07");
    expect(resultLabel(r("2026-09-07", "Ideas"), any, journal)).toBe("2026-09-07 · Ideas");
    expect(resultLabel(r("page", "Books"), any, journal)).toBe("Books");
    expect(resultLabel(r("page", "Books/Essay"), any, journal)).toBe("Books › The essay");
    expect(resultLabel(r("page", "Books/Deep/Down"), any, journal)).toBe("Books › Deep › Down");
    expect(resultLabel(r("page", "Books/Deep/Down"), { kind: "book", ns: "page", book: "Books" }, journal)).toBe("Deep › Down");
    expect(resultLabel(r("bookshelf", "Milton, John/PL/1"), any, journal)).toBe("John Milton › PL › Book 1");
    expect(resultLabel(r("page", null), any, journal)).toBe("");
  });
});

describe("scopeOptions on the shelves", () => {
  it("the shelves entry is no book to search within", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Horace](#bookshelf/Horace)" };
    expect(scopeOptions("2026-09-07", null, Object.keys(c), journalOf(c)).map((o) => o.label)).toEqual(["Everything", "Journal", "All Pages", "Horace"]);
  });
  it("an author's group is its shelf, in the shelves' order, as in the go-to box", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Milton, John": "# John Milton", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n", "page/Notes": "n" };
    expect(scopeOptions("2026-09-07", null, Object.keys(c), journalOf(c), c["bookshelf/Shelves"]).map((o) => [o.group, o.label])).toEqual([
      [null, "Everything"], [null, "Journal"], [null, "All Pages"], ["Pages", "Notes"], ["Latin", "Horace"], ["English", "John Milton"],
    ]);
    expect(scopeOptions("bookshelf", "Shelves", Object.keys(c), journalOf(c), c["bookshelf/Shelves"]).map((o) => [o.group, o.label])).toContainEqual(["Authors", "Shelves"]);
  });
  it("a shelf of more than one author opens with All <shelf>, searching those authors together", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Virgil": "# Virgil", "bookshelf/Milton, John": "# John Milton", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Virgil](#bookshelf/Virgil)\n- [Horace](#bookshelf/Horace)\n\n## English\n" };
    const o = scopeOptions("2026-09-07", null, Object.keys(c), journalOf(c), c["bookshelf/Shelves"]);
    expect(o.map((x) => [x.group, x.label])).toEqual([
      [null, "Everything"], [null, "Journal"], [null, "All Pages"], ["Latin", "All Latin"], ["Latin", "Horace"], ["Latin", "Virgil"], ["English", "John Milton"],
    ]);
    expect(o[3].scope).toEqual({ kind: "shelf", ns: "bookshelf", shelf: "Latin", books: new Set(["Horace", "Virgil"]) });
    expect(sameScope(o[3].scope, { kind: "shelf", ns: "bookshelf", shelf: "Latin", books: new Set() })).toBe(true);
    expect(sameScope(o[3].scope, { kind: "shelf", ns: "bookshelf", shelf: "English", books: new Set(["Horace", "Virgil"]) })).toBe(false);
    expect(sameScope(o[3].scope, o[4].scope)).toBe(false);
  });
});
describe("optionGroups", () => {
  it("the dropdown's runs break where the namespace does as well as the label, keyed by where each starts", () => {
    const c = { "page/Notes": "n", "bookshelf/Horace": "# Horace", "bookshelf/Virgil": "# Virgil", "bookshelf/Shelves": "# Shelves\n\n## Pages\n- [Horace](#bookshelf/Horace)\n- [Virgil](#bookshelf/Virgil)" };
    const o = scopeOptions("2026-09-07", null, Object.keys(c), journalOf(c), c["bookshelf/Shelves"]);
    expect(optionGroups(o).map((g) => [g.group, g.at.map((i) => o[i].label)])).toEqual([
      [null, ["Everything", "Journal", "All Pages"]], ["Pages", ["Notes"]], ["Pages", ["All Pages", "Horace", "Virgil"]],
    ]);
  });
});
