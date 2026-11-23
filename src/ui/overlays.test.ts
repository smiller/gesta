import { describe, it, expect } from "vitest";
import { overlays, type Closer, type Opening } from "./overlays.ts";

const world = () => {
  const log: Closer[] = [];
  const close = (k: Closer) => (): void => { log.push(k); };
  const o = overlays({
    opened: close("opened"), search: close("search"), goto: close("goto"),
    gotoToolbar: close("gotoToolbar"), gotoToolbarCaret: close("gotoToolbarCaret"), lines: close("lines"),
    replace: close("replace"), replaceBack: close("replaceBack"),
  });
  return { o, log };
};
const closes = (row: Opening): Closer[] => { const w = world(); w.o.open(row); return w.log; };

describe("one thing open at a time", () => {
  it("a masthead row, opened, closes the open menu or panel and every other masthead row", () => {
    expect(closes("search")).toEqual(["opened", "goto", "gotoToolbar", "lines", "replace"]);
    expect(closes("goto")).toEqual(["opened", "search", "gotoToolbar", "lines", "replace"]);
    expect(closes("gotoToolbar")).toEqual(["opened", "search", "goto", "lines", "replace"]);
    expect(closes("lines")).toEqual(["opened", "search", "goto", "gotoToolbar", "replace"]);
    expect(closes("replace")).toEqual(["opened", "search", "goto", "gotoToolbar", "lines"]);
  });
  it("a menu or panel, opened, closes every masthead row; it replaces any other by itself", () => {
    for (const p of ["help", "backups", "bookmarks", "shortcuts", "menu"] as const) expect(closes(p)).toEqual(["search", "goto", "gotoToolbar", "lines", "replace"]);
  });
  it("a navigation closes everything; ⌃⌘M and an arrival where it already is close what stands over the entry, Go to and Line numbering kept; any switch to the source closes the Go to toolbar", () => {
    expect(closes("navigated")).toEqual(["opened", "search", "goto", "gotoToolbar", "lines", "replace"]);
    expect(closes("view")).toEqual(["opened", "search", "gotoToolbar"]);
    expect(closes("sourceView")).toEqual(["gotoToolbar"]);
    expect(closes("here")).toEqual(["opened", "search", "gotoToolbar"]);
  });
  it("Escape closes everything, the Go to toolbar handing its caret back BEFORE search or Go to moves the focus", () => {
    expect(closes("escape")).toEqual(["opened", "gotoToolbarCaret", "search", "goto", "lines", "replaceBack"]);
  });
});

describe("a closer", () => {
  it("is told the opening that closed it", () => {
    const by: string[] = [];
    const none = (): void => {};
    overlays({ opened: (o) => by.push(o), search: none, goto: none, gotoToolbar: none, gotoToolbarCaret: none, lines: none, replace: none, replaceBack: none }).open("navigated");
    expect(by).toEqual(["navigated"]);
  });
});
