import { describe, it, expect } from "vitest";
import { mastheadModel, rootLabel, panelRows, trimLabel } from "./mastheadModel.ts";
import { journalOf } from "../store/headings.ts";
import { prettyDate } from "../store/keys.ts";

const cache: Record<string, string> = {
  "2026-09-07": "# A titled day\n\ntext",
  "2026-09-07/Ideas": "ideas",
  "2026-09-07/Zed": "z",
  "2026-09-06": "untitled",
  "2026-09-06/Only": "o",
  "page/Books": "# Books\n\nthe list",
  "page/Books/Essay": "# The essay's title\n\nbody",
  "page/Books/Deep/Down": "no heading",
  "bookshelf/Milton, John": "# John Milton\n\n- Paradise Lost",
  "bookshelf/Milton, John/Paradise Lost/1": "# Book 1\n\n::: verse\nOf Man's first disobedience\n:::",
};
const keys = Object.keys(cache);
const journal = journalOf(cache);
const TODAY = "2026-09-07";
const m = (date: string, tag: string | null = null) => mastheadModel(date, tag, keys, journal, TODAY);

describe("a day", () => {
  it("today's main entry: the era and the date, no link, its # heading as the title, every tag", () => {
    const x = m("2026-09-07");
    expect(x.crumbs).toEqual([{ text: "Today — " + prettyDate("2026-09-07"), href: null, title: "" }]);
    expect(x.leaf).toBeNull();
    expect(x.title).toBe("A titled day");
    expect(x.tags).toEqual([{ text: "Ideas", href: "#2026-09-07/Ideas" }, { text: "Zed", href: "#2026-09-07/Zed" }]);
    expect(x.showToday).toBe(false);
  });
  it("a past day without a heading: no title row; a future day reads Future", () => {
    const x = m("2026-09-06");
    expect(x.crumbs[0].text).toMatch(/^Past — /);
    expect(x.title).toBe("");
    expect(x.showToday).toBe(true);
    expect(m("2027-01-01").crumbs[0].text).toMatch(/^Future — /);
    expect(m("2027-01-01").tags).toEqual([]);
  });
  it("a tagged entry: the date links back, the tag is the leaf, the siblings list without it", () => {
    const x = m("2026-09-07", "Ideas");
    expect(x.crumbs).toEqual([{ text: "Today — " + prettyDate("2026-09-07"), href: "#2026-09-07", title: "Back to the main entry" }]);
    expect(x.leaf).toBe("Ideas");
    expect(x.title).toBe("");
    expect(x.tags).toEqual([{ text: "Zed", href: "#2026-09-07/Zed" }]);
  });
  it("an unregistered open tag shows in the crumb for free", () => {
    const x = m("2026-09-06", "New");
    expect(x.leaf).toBe("New");
    expect(x.tags).toEqual([{ text: "Only", href: "#2026-09-06/Only" }]);
  });
});

describe("a page", () => {
  it("a top-level page: its own name, bold, alone — no crumb, no title, no tags", () => {
    const x = m("page", "Books");
    expect(x.crumbs).toEqual([]);
    expect(x.leaf).toBe("Books");
    expect(x.title).toBe("");
    expect(x.tags).toEqual([]);
    expect(x.showToday).toBe(true);
  });
  it("a sub-page: the parent crumb links back, the leaf is its name, the title its first heading", () => {
    const x = m("page", "Books/Essay");
    expect(x.crumbs).toEqual([{ text: "Books", href: "#page/Books", title: "Back to Books" }]);
    expect(x.leaf).toBe("Essay");
    expect(x.title).toBe("The essay's title");
  });
  it("deeper down every ancestor is its own link; a headingless sub-page takes no title row", () => {
    const x = m("page", "Books/Deep/Down");
    expect(x.crumbs).toEqual([
      { text: "Books", href: "#page/Books", title: "Back to Books" },
      { text: "Deep", href: "#page/Books/Deep", title: "Back to Deep" },
    ]);
    expect(x.leaf).toBe("Down");
    expect(x.title).toBe("");
  });
});

describe("the bookshelf", () => {
  it("a root reads as its own heading, in the crumb as in the leaf", () => {
    expect(rootLabel("bookshelf", "Milton, John", journal)).toBe("John Milton");
    expect(rootLabel("page", "Books", journal)).toBe("Books");
    expect(rootLabel("bookshelf", "Nobody", journal)).toBe("Nobody");
    expect(m("bookshelf", "Milton, John").leaf).toBe("John Milton");
    const x = m("bookshelf", "Milton, John/Paradise Lost/1");
    expect(x.crumbs.map((c) => c.text)).toEqual(["John Milton", "Paradise Lost"]);
    expect(x.crumbs[0].href).toBe("#bookshelf/Milton%2C%20John");
    expect(x.leaf).toBe("1");
    expect(x.title).toBe("Book 1");
  });
});

describe("the panels", () => {
  it("a namespace's roots as rows, labelled as roots are, in key order", () => {
    expect(panelRows("page", keys, journal)).toEqual([{ text: "Books", href: "#page/Books" }]);
    expect(panelRows("bookshelf", keys, journal)).toEqual([{ text: "John Milton", href: "#bookshelf/Milton%2C%20John" }]);
    expect(panelRows("nowhere", keys, journal)).toEqual([]);
  });
  it("trimLabel keeps a short label, cuts a long one to the cap with an ellipsis, never inside a surrogate pair", () => {
    expect(trimLabel("short", 10)).toBe("short");
    expect(trimLabel("a long label indeed", 8)).toBe("a long …");
    expect(trimLabel("ab😀cd", 4)).toBe("ab…");
  });
});
