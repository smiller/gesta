import { describe, it, expect } from "vitest";
import { overlays, CLOSES, type Closer, type Opening } from "./overlays.ts";

const world = () => {
  const log: Closer[] = [];
  const close = (k: Closer) => (): void => { log.push(k); };
  const o = overlays({
    panel: close("panel"), search: close("search"), searchDropped: close("searchDropped"), goto: close("goto"),
    lineBar: close("lineBar"), lineBarCaret: close("lineBarCaret"), lines: close("lines"),
  });
  return { o, log };
};
const closes = (row: Opening): Closer[] => { const w = world(); w.o.open(row); return w.log; };

describe("which overlay closes which", () => {
  it("search and Go to close only the panel", () => {
    expect(closes("search")).toEqual(["panel"]);
    expect(closes("goto")).toEqual(["panel"]);
  });
  it("the line bar closes the panel, search and Go to; ⌃⌘L's lines close the panel and the line bar", () => {
    expect(closes("lineBar")).toEqual(["panel", "search", "goto"]);
    expect(closes("lines")).toEqual(["panel", "lineBar"]);
  });
  it("help and backups close search and the line bar; bookmarks and shortcuts Go to as well; pages and bookshelf nothing", () => {
    expect(closes("help")).toEqual(["search", "lineBar"]);
    expect(closes("backups")).toEqual(["search", "lineBar"]);
    expect(closes("bookmarks")).toEqual(["search", "goto", "lineBar"]);
    expect(closes("shortcuts")).toEqual(["search", "goto", "lineBar"]);
    expect(closes("pages")).toEqual([]);
  });
  it("a navigation closes all but ⌃⌘L's lines, the search's query dropped; the source view closes the line bar", () => {
    expect(closes("navigated")).toEqual(["panel", "searchDropped", "goto", "lineBar"]);
    expect(closes("sourceView")).toEqual(["lineBar"]);
  });
  it("Escape closes everything, the line bar handing its caret back", () => {
    expect(closes("escape")).toEqual(["panel", "search", "goto", "lineBarCaret", "lines"]);
  });
  it("names every opening", () => {
    expect(Object.keys(CLOSES).sort()).toEqual(["backups", "bookmarks", "escape", "goto", "help", "lineBar", "lines", "navigated", "pages", "search", "shortcuts", "sourceView"]);
  });
});
