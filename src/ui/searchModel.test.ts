import { describe, it, expect } from "vitest";
import { defaultScope, scopeOptions, resultLabel, sameScope } from "./searchModel.ts";
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
