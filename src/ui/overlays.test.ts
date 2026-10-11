import { describe, it, expect } from "vitest";
import { overlays, type Closer, type Opening } from "./overlays.ts";

const world = () => {
  const log: Closer[] = [];
  const close = (k: Closer) => (): void => { log.push(k); };
  const o = overlays({
    panel: close("panel"), search: close("search"), goto: close("goto"),
    lineBar: close("lineBar"), lineBarCaret: close("lineBarCaret"), lines: close("lines"),
    replace: close("replace"), replaceBack: close("replaceBack"),
  });
  return { o, log };
};
const closes = (row: Opening): Closer[] => { const w = world(); w.o.open(row); return w.log; };

describe("one thing open at a time", () => {
  it("a header row, opened, closes the panel and every other header row", () => {
    expect(closes("search")).toEqual(["panel", "goto", "lineBar", "lines", "replace"]);
    expect(closes("goto")).toEqual(["panel", "search", "lineBar", "lines", "replace"]);
    expect(closes("lineBar")).toEqual(["panel", "search", "goto", "lines", "replace"]);
    expect(closes("lines")).toEqual(["panel", "search", "goto", "lineBar", "replace"]);
    expect(closes("replace")).toEqual(["panel", "search", "goto", "lineBar", "lines"]);
  });
  it("a panel, opened, closes every header row; it replaces any other panel by itself", () => {
    for (const p of ["help", "backups", "bookmarks", "shortcuts", "pages"] as const) expect(closes(p)).toEqual(["search", "goto", "lineBar", "lines", "replace"]);
  });
  it("a navigation closes everything; ⌃⌘M and an arrival where it already is close what stands over the entry, Go to and Line numbering kept; any switch to the source closes the line bar", () => {
    expect(closes("navigated")).toEqual(["panel", "search", "goto", "lineBar", "lines", "replace"]);
    expect(closes("view")).toEqual(["panel", "search", "lineBar"]);
    expect(closes("sourceView")).toEqual(["lineBar"]);
    expect(closes("here")).toEqual(["panel", "search", "lineBar"]);
  });
  it("Escape closes everything, the line bar handing its caret back BEFORE search or Go to moves the focus", () => {
    expect(closes("escape")).toEqual(["panel", "lineBarCaret", "search", "goto", "lines", "replaceBack"]);
  });
});
