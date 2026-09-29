import { describe, it, expect } from "vitest";
import { contentsLinks, subPageOrder, subPageDisplayList, foldsContents } from "./contents.ts";

describe("contentsLinks", () => {
  it("links in document order with the section heading in force; a heading that is a link is a child where it stands", () => {
    const md = "# Comedies\n\n- [Tempest](#bookshelf/S/Tempest)\n- [Twelfth Night](#bookshelf/S/TN)\n\n## Histories\n\n[John](#bookshelf/S/John) and [John](#bookshelf/S/John) again\n\n### [Songs](#bookshelf/B/Songs)\n\n[Cradle](#bookshelf/B/Songs/Cradle)";
    expect(contentsLinks(md)).toEqual([
      { href: "#bookshelf/S/Tempest", group: "Comedies" }, { href: "#bookshelf/S/TN", group: "Comedies" },
      { href: "#bookshelf/S/John", group: "Histories" },
      { href: "#bookshelf/B/Songs", group: null }, { href: "#bookshelf/B/Songs/Cradle", group: "Songs" },
    ]);
  });
});
describe("subPageOrder", () => {
  const cache: Record<string, string> = {
    "bookshelf/Dante": "[Inferno](#bookshelf/Dante/Inferno), [Purgatorio](#bookshelf/Dante/Purgatorio), [Paradiso](#bookshelf/Dante/Paradiso)",
    "bookshelf/Dante/Inferno": "i", "bookshelf/Dante/Purgatorio": "p", "bookshelf/Dante/Paradiso": "pa", "bookshelf/Dante/Notes": "",
    "page/Plain": "see [Two](#page/Plain/Two) mid-sentence", "page/Plain/One": "1", "page/Plain/Two": "2",
  };
  const keys = Object.keys(cache);
  const bearing = (k: string) => !!(cache[k] || "").trim();
  it("a book that links every content-bearing sub states its order; a blank gets no vote and rides the end", () => {
    const o = subPageOrder(keys, "bookshelf/Dante", cache["bookshelf/Dante"], bearing);
    expect(o.stated).toBe(true);
    expect(o.names).toEqual(["Inferno", "Purgatorio", "Paradiso", "Notes"]);
  });
  it("a page mentioning one sub mid-sentence keeps the alphabet", () => {
    const o = subPageOrder(keys, "page/Plain", cache["page/Plain"], bearing);
    expect(o).toEqual({ names: ["One", "Two"], rows: null, stated: false });
    expect(subPageOrder(keys, "page/None", "", bearing)).toEqual({ names: [], rows: null, stated: false });
  });
  it("the memo answers by the parent's text, not its name", () => {
    const memo = new Map();
    subPageOrder(keys, "bookshelf/Dante", cache["bookshelf/Dante"], bearing, memo);
    expect(memo.get("bookshelf/Dante").links.length).toBe(3);
  });
});
describe("subPageDisplayList", () => {
  const bearing = () => true;
  it("a feed of dated names lists newest first; an undated name keeps reading order; a stated order is never flipped", () => {
    const feed = { names: ["2023-01-01-a", "2023-02-01-b"], rows: null, stated: false };
    expect(subPageDisplayList(feed, "page/F", bearing, null)).toEqual(["2023-02-01-b", "2023-01-01-a"]);
    const mixed = { names: ["2023-01-01-a", "intro"], rows: null, stated: false };
    expect(subPageDisplayList(mixed, "page/M", bearing, null)).toEqual(["2023-01-01-a", "intro"]);
    const stated = { names: ["2023-02-01-b", "2023-01-01-a"], rows: [], stated: true };
    expect(subPageDisplayList(stated, "page/S", bearing, null)).toEqual(["2023-02-01-b", "2023-01-01-a"]);
  });
  it("the extra joins the end of a stated order and is sorted into an alphabetical one", () => {
    expect(subPageDisplayList({ names: ["b", "a"], rows: [], stated: true }, "p", bearing, "c")).toEqual(["b", "a", "c"]);
    expect(subPageDisplayList({ names: ["a", "c"], rows: null, stated: false }, "p", bearing, "b")).toEqual(["a", "b", "c"]);
  });
});

describe("foldsContents", () => {
  const keys = ["bookshelf/Spenser, Edmund", "bookshelf/Spenser, Edmund/The Faerie Queene", "bookshelf/Spenser, Edmund/The Faerie Queene/1.1",
    "bookshelf/Milton, John/Lycidas", "bookshelf/Dante/Commedia/Inferno", "bookshelf/Dante/Commedia/Inferno/1", "page/Notes", "page/Notes/Sub", "2026-09-28", "2026-09-28/Tag"];
  it("a work with sub-entries folds, at any depth below the author", () => {
    expect(foldsContents(keys, "bookshelf", "Spenser, Edmund/The Faerie Queene")).toBe(true);
    expect(foldsContents(keys, "bookshelf", "Dante/Commedia/Inferno")).toBe(true);
  });
  it("an author page, a leaf, a page or a day does not", () => {
    expect(foldsContents(keys, "bookshelf", "Spenser, Edmund")).toBe(false);
    expect(foldsContents(keys, "bookshelf", "Milton, John/Lycidas")).toBe(false);
    expect(foldsContents(keys, "bookshelf", "Spenser, Edmund/The Faerie Queene/1.1")).toBe(false);
    expect(foldsContents(keys, "page", "Notes")).toBe(false);
    expect(foldsContents(keys, "2026-09-28", null)).toBe(false);
  });
});
