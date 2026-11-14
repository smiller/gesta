import { describe, it, expect } from "vitest";
import { defaultScope, scopeOptions, resultLabel, sameScope, optionGroups } from "./searchModel.ts";
import { journalOf } from "../store/headings.ts";

const cache = {
  "2026-09-07": "day", "commonplace/Books": "# Books", "commonplace/Books/Essay": "# The essay\n\nb", "commonplace/Books/Deep/Down": "d",
  "bookshelf/Milton, John": "# John Milton", "bookshelf/Milton, John/PL/1": "# Book 1",
};
const keys = Object.keys(cache), journal = journalOf(cache);
const r = (date: string, tag: string | null) => ({ date, tag, nth: 0, snippet: "" });

describe("defaultScope", () => {
  it("the open book on any keyed entry, else the journal", () => {
    expect(defaultScope("2026-09-07", "tag")).toEqual({ kind: "journal" });
    expect(defaultScope("commonplace", "Books/Essay")).toEqual({ kind: "book", ns: "commonplace", book: "Books" });
    expect(defaultScope("bookshelf", "Milton, John")).toEqual({ kind: "book", ns: "bookshelf", book: "Milton, John" });
  });
});
describe("scopeOptions", () => {
  it("the three fixed rows, then a labelled group per namespace of its roots by label", () => {
    const o = scopeOptions("2026-09-07", null, { keys: keys, journal: journal });
    expect(o.map((x) => [x.label, x.group])).toEqual([
      ["Everything", null], ["Journal", null], ["All Commonplaces", null], ["Books", "Commonplaces"], ["John Milton", "Authors"],
    ]);
    expect(o[4].scope).toEqual({ kind: "book", ns: "bookshelf", book: "Milton, John" });
  });
  it("the open unregistered book joins its own group, so the preselect has a row", () => {
    const o = scopeOptions("commonplace", "Brand New", { keys: keys, journal: journal });
    expect(o.filter((x) => x.group === "Commonplaces").map((x) => x.label)).toEqual(["Books", "Brand New"]);
    expect(o.some((x) => sameScope(x.scope, defaultScope("commonplace", "Brand New")))).toBe(true);
  });
});
describe("resultLabel", () => {
  it("a day by its date and tag; a page by its label; a sub-entry as book › parent › leaf, the book dropped under its own scope", () => {
    const any = { kind: "everything" } as const;
    expect(resultLabel(r("2026-09-07", null), any, journal)).toBe("2026-09-07");
    expect(resultLabel(r("2026-09-07", "Ideas"), any, journal)).toBe("2026-09-07 · Ideas");
    expect(resultLabel(r("commonplace", "Books"), any, journal)).toBe("Books");
    expect(resultLabel(r("commonplace", "Books/Essay"), any, journal)).toBe("Books › The essay");
    expect(resultLabel(r("commonplace", "Books/Deep/Down"), any, journal)).toBe("Books › Deep › Down");
    expect(resultLabel(r("commonplace", "Books/Deep/Down"), { kind: "book", ns: "commonplace", book: "Books" }, journal)).toBe("Deep › Down");
    expect(resultLabel(r("bookshelf", "Milton, John/PL/1"), any, journal)).toBe("John Milton › PL › Book 1");
    expect(resultLabel(r("commonplace", null), any, journal)).toBe("");
  });
});

describe("scopeOptions on the shelves", () => {
  it("the shelves entry is no book to search within", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Horace](#bookshelf/Horace)" };
    expect(scopeOptions("2026-09-07", null, { keys: Object.keys(c), journal: journalOf(c) }).map((o) => o.label)).toEqual(["Everything", "Journal", "All Commonplaces", "Horace"]);
  });
  it("an author's group is its shelf, in the shelves' order, as in the go-to box", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Milton, John": "# John Milton", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Horace](#bookshelf/Horace)\n\n## English\n", "commonplace/Notes": "n" };
    expect(scopeOptions("2026-09-07", null, { keys: Object.keys(c), journal: journalOf(c), shelvesMd: c["bookshelf/Shelves"] }).map((o) => [o.group, o.label])).toEqual([
      [null, "Everything"], [null, "Journal"], [null, "All Commonplaces"], ["Commonplaces", "Notes"], ["Latin", "Horace"], ["English", "John Milton"],
    ]);
    expect(scopeOptions("bookshelf", "Shelves", { keys: Object.keys(c), journal: journalOf(c), shelvesMd: c["bookshelf/Shelves"] }).map((o) => [o.group, o.label])).toContainEqual(["Authors", "Shelves"]);
  });
  it("a shelf of more than one author opens with All <shelf>, searching those authors together", () => {
    const c = { "bookshelf/Horace": "# Horace", "bookshelf/Virgil": "# Virgil", "bookshelf/Milton, John": "# John Milton", "bookshelf/Shelves": "# Shelves\n\n## Latin\n- [Virgil](#bookshelf/Virgil)\n- [Horace](#bookshelf/Horace)\n\n## English\n" };
    const o = scopeOptions("2026-09-07", null, { keys: Object.keys(c), journal: journalOf(c), shelvesMd: c["bookshelf/Shelves"] });
    expect(o.map((x) => [x.group, x.label])).toEqual([
      [null, "Everything"], [null, "Journal"], [null, "All Commonplaces"], ["Latin", "All Latin"], ["Latin", "Horace"], ["Latin", "Virgil"], ["English", "John Milton"],
    ]);
    expect(o[3].scope).toEqual({ kind: "shelf", ns: "bookshelf", shelf: "Latin", books: new Set(["Horace", "Virgil"]) });
    expect(sameScope(o[3].scope, { kind: "shelf", ns: "bookshelf", shelf: "Latin", books: new Set() })).toBe(true);
    expect(sameScope(o[3].scope, { kind: "shelf", ns: "bookshelf", shelf: "English", books: new Set(["Horace", "Virgil"]) })).toBe(false);
    expect(sameScope(o[3].scope, o[4].scope)).toBe(false);
  });
});
describe("optionGroups", () => {
  it("the dropdown's runs break where the namespace does as well as the label, keyed by where each starts", () => {
    const c = { "commonplace/Notes": "n", "bookshelf/Horace": "# Horace", "bookshelf/Virgil": "# Virgil", "bookshelf/Shelves": "# Shelves\n\n## Commonplaces\n- [Horace](#bookshelf/Horace)\n- [Virgil](#bookshelf/Virgil)" };
    const o = scopeOptions("2026-09-07", null, { keys: Object.keys(c), journal: journalOf(c), shelvesMd: c["bookshelf/Shelves"] });
    expect(optionGroups(o).map((g) => [g.group, g.at.map((i) => o[i].label)])).toEqual([
      [null, ["Everything", "Journal", "All Commonplaces"]], ["Commonplaces", ["Notes"]], ["Commonplaces", ["All Commonplaces", "Horace", "Virgil"]],
    ]);
  });
});
