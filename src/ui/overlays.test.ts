import { describe, it, expect } from "vitest";
import { overlays, type Closer, type Opening } from "./overlays.ts";

const world = () => {
  const log: Closer[] = [];
  const close = (k: Closer) => (): void => { log.push(k); };
  const o = overlays({
    panel: close("panel"), search: close("search"), goto: close("goto"),
    gotoPopup: close("gotoPopup"), gotoPopupCaret: close("gotoPopupCaret"), lines: close("lines"),
    replace: close("replace"), replaceBack: close("replaceBack"),
  });
  return { o, log };
};
const closes = (row: Opening): Closer[] => { const w = world(); w.o.open(row); return w.log; };

describe("one thing open at a time", () => {
  it("a masthead row, opened, closes the panel and every other masthead row", () => {
    expect(closes("search")).toEqual(["panel", "goto", "gotoPopup", "lines", "replace"]);
    expect(closes("goto")).toEqual(["panel", "search", "gotoPopup", "lines", "replace"]);
    expect(closes("gotoPopup")).toEqual(["panel", "search", "goto", "lines", "replace"]);
    expect(closes("lines")).toEqual(["panel", "search", "goto", "gotoPopup", "replace"]);
    expect(closes("replace")).toEqual(["panel", "search", "goto", "gotoPopup", "lines"]);
  });
  it("a panel, opened, closes every masthead row; it replaces any other panel by itself", () => {
    for (const p of ["help", "backups", "bookmarks", "shortcuts", "lists"] as const) expect(closes(p)).toEqual(["search", "goto", "gotoPopup", "lines", "replace"]);
  });
  it("a navigation closes everything; ⌃⌘M and an arrival where it already is close what stands over the entry, Go to and Line numbering kept; any switch to the source closes the Go to popup", () => {
    expect(closes("navigated")).toEqual(["panel", "search", "goto", "gotoPopup", "lines", "replace"]);
    expect(closes("view")).toEqual(["panel", "search", "gotoPopup"]);
    expect(closes("sourceView")).toEqual(["gotoPopup"]);
    expect(closes("here")).toEqual(["panel", "search", "gotoPopup"]);
  });
  it("Escape closes everything, the Go to popup handing its caret back BEFORE search or Go to moves the focus", () => {
    expect(closes("escape")).toEqual(["panel", "gotoPopupCaret", "search", "goto", "lines", "replaceBack"]);
  });
});
