import { describe, it, expect, vi } from "vitest";
import type { Node } from "prosemirror-model";
import { surfaces, type Surface } from "./surface.ts";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { flattenDoc, flattenText } from "../model/flatten.ts";
import { fenceRefusals, refusalsText } from "../model/fenceRefusals.ts";

interface Fake extends Surface { caretAt: number; seen: boolean; top: number | null; text: string }

function world(y = 0) {
  const log: string[] = [];
  const built: Fake[] = [];
  const pins: string[] = [], released: number[] = [];
  const win = { at: y, y: () => win.at, scrollTo: (to: number) => { win.at = to; log.push("scroll " + to); }, under: () => 0 };
  const fake = (source: boolean, text: string, doc?: Node): Fake => {
    const f: Fake = {
      source, caretAt: source ? text.length : 0, seen: true, top: null, text,
      md: () => source ? f.text : serializeMarkdown(doc!),
      flat: () => source ? flattenText(f.text) : flattenDoc(doc!),
      caret: () => { log.push("read caret"); return f.caretAt; },
      caretSeen: () => f.seen,
      topAt: () => { log.push("read top"); return f.top; },
      placeAt: () => null, reveal: () => {},
      end: () => source ? f.text.length : doc!.content.size,
      scrollToPos: (pos) => { log.push("align " + pos); },
      placeCaret: (pos, scroll) => { f.caretAt = pos ?? (source ? f.text.length : 0); log.push("caret " + pos + (scroll ? " scroll" : " still")); },
      insertText: () => {}, insertPicture: () => {}, words: () => 0,
      destroy: () => { log.push("destroy " + (source ? "source" : "rendered")); },
    };
    built.push(f);
    return f;
  };
  const s = surfaces({
    build: {
      rendered: (doc) => { log.push("build rendered"); return fake(false, "", doc); },
      source: (md) => { log.push("build source"); return fake(true, md); },
    },
    window: win,
    places: {
      carry: (pos) => { log.push("carry " + pos); },
      release: () => { log.push("release"); },
    },
    pin: (text) => { pins.push(text); return pins.length; },
    releasePin: (gen) => { released.push(gen); },
    onView: (md) => { log.push("view " + md); },
    switched: () => { log.push("switched"); },
  });
  return { s, log, win, pins, released, last: () => built[built.length - 1] };
}
const posOf = (doc: Node, ch: string): number => { const f = flattenDoc(doc); return f.pos[f.text.indexOf(ch)]!; };

describe("the switch", () => {
  it("holds the caret, reads the top, mounts the other view, puts the window back, aligns, tells, then places the caret", () => {
    const w = world(300);
    w.s.show("AB\n\nCD", "page/A");
    const r = w.last();
    r.top = 5;   /* C */
    w.log.length = 0;
    w.s.switchTo(true);
    const src = w.last().text;
    expect(w.log).toEqual(["release", "read caret", "read top", "destroy rendered", "build source", "scroll 300", "align " + src.indexOf("C"), "view true", "switched", "caret 0 scroll"]);
    expect(w.s.md).toBe(true);
  });
  it("reads no top at the window's top, and a top at the first character stays at the top", () => {
    const w0 = world(0);
    w0.s.show("AB\n\nCD", "page/A");
    w0.log.length = 0;
    w0.s.switchTo(true);
    expect(w0.log).not.toContain("read top");
    const w = world(20);
    w.s.show("AB\n\nCD", "page/A");
    w.last().top = 1;
    w.log.length = 0;
    w.s.switchTo(true);
    expect(w.log.slice(w.log.indexOf("build source"))).toEqual(["build source", "scroll 20", "scroll 0", "view true", "switched", "caret 0 scroll"]);
  });
  it("carries the top by the crossing, not an equal count: the source's stream holds the fence lines", () => {
    const md = "::: stanza 1\nA B\n:::\n\n::: stanza 2\nC D\n:::";
    const doc = parseMarkdown(md);
    const w = world(400);
    w.s.show(md, "bookshelf/X/Y");
    w.last().top = posOf(doc, "C");
    w.s.switchTo(true);
    const src = w.last();
    expect(w.log).toContain("align " + src.text.indexOf("C"));
    /* back: the rendered view's alignment carries the place */
    src.top = src.text.indexOf("D");
    w.log.length = 0;
    w.s.switchTo(false);
    const back = posOf(parseMarkdown(src.text), "D");
    expect(w.log.slice(w.log.indexOf("scroll 400") + 1, w.log.indexOf("view false"))).toEqual(["carry " + back]);
  });
});

describe("the hold across the switch", () => {
  it("a switch to the view already open lets nothing go; a real switch lets go first", () => {
    const w = world();
    w.s.show("AB", "page/A");
    w.log.length = 0;
    w.s.switchTo(false);
    expect(w.log).toEqual([]);
    w.s.switchTo(true);
    expect(w.log[0]).toBe("release");
  });
});

describe("the caret across the switch", () => {
  it("a caret unmoved since it arrived keeps the other view's hold; a moved one retires it", () => {
    const unmoved = world();
    unmoved.s.show("AB\n\nCD", "page/A");
    unmoved.last().caretAt = 6;   /* before D */
    unmoved.s.switchTo(true);
    unmoved.s.switchTo(false);
    expect(unmoved.log[unmoved.log.length - 1]).toBe("caret 6 scroll");
    const moved = world();
    moved.s.show("AB\n\nCD", "page/A");
    moved.last().caretAt = 6;
    moved.s.switchTo(true);
    moved.last().caretAt = 0;
    moved.s.switchTo(false);
    expect(moved.log[moved.log.length - 1]).toBe("caret 1 scroll");
  });
  it("a caret seen on leaving is scrolled to, and in the rendered view releases the hold; an unseen one leaves the window", () => {
    const seen = world();
    seen.s.show("AB\n\nCD", "page/A");
    seen.s.switchTo(true);
    seen.log.length = 0;
    seen.s.switchTo(false);
    expect(seen.log.slice(-2)).toEqual(["release", "caret 1 scroll"]);
    expect(seen.log[0]).toBe("release");
    const unseen = world();
    unseen.s.show("AB\n\nCD", "page/A");
    unseen.last().seen = false;
    unseen.s.switchTo(true);
    expect(unseen.log[unseen.log.length - 1]).toBe("caret 0 still");
    unseen.last().seen = false;
    unseen.log.length = 0;
    unseen.s.switchTo(false);
    expect(unseen.log.filter((l) => l === "release")).toEqual(["release"]);   /* the switch's own, none for the caret */
    expect(unseen.log[unseen.log.length - 1]).toBe("caret 1 still");
  });
});

describe("a text the model refuses", () => {
  const BAD = "::: grid\ntext first\n::: card-red\na\n:::\n:::";
  const WHY = 'a grid holds only cards; "text first" is not a card';
  it("shown, forces the source view, pinned and told; the next show puts the reader's view back", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = world();
    w.s.show(BAD, "page/Gridded");
    expect(w.log).toEqual(["build source", "view true"]);
    expect(w.pins).toEqual(["cannot render page/Gridded — " + WHY + "; shown as source"]);
    expect(err).toHaveBeenCalledWith("cannot render", "page/Gridded", WHY);
    expect(w.s.md).toBe(true);
    w.log.length = 0;
    w.s.show("fine", "page/Fine");
    expect(w.log).toEqual(["view false", "destroy source", "build rendered"]);
    expect(w.released).toEqual([1]);
    expect(w.s.md).toBe(false);
    err.mockRestore();
  });
  it("switched back to, keeps the source view, re-pinned, and a forced view stays forced", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = world();
    w.s.show(BAD, "page/Gridded");
    w.log.length = 0;
    w.s.switchTo(false);
    expect(w.log).toEqual(["release", "read caret"]);
    expect(w.pins[1]).toBe("cannot render page/Gridded — " + WHY + "; shown as source");
    expect(w.released).toEqual([1]);
    expect(w.s.md).toBe(true);
    w.log.length = 0;
    w.s.show("fine", "page/Fine");
    expect(w.log).toEqual(["view false", "destroy source", "build rendered"]);
    err.mockRestore();
  });
  it("a clean parse back releases the pin; the lines it refused are pinned anew", () => {
    const w = world();
    w.s.show("fine", "page/A");
    w.s.switchTo(true);
    w.last().text = "::: versey\nline\n:::";
    w.s.switchTo(false);
    expect(w.pins).toEqual([refusalsText(fenceRefusals(parseMarkdown("::: versey\nline\n:::")))]);
    w.s.switchTo(true);
    w.last().text = "fine";
    w.s.switchTo(false);
    expect(w.released).toEqual([1]);
    expect(w.pins).toHaveLength(1);
  });
  it("a show releases the entry left's fence pin", () => {
    const w = world();
    w.s.show("fine", "page/A");
    w.s.switchTo(true);
    w.last().text = "::: versey\nline\n:::";
    w.s.switchTo(false);
    w.s.show("fine", "page/B");
    expect(w.released).toEqual([1]);
  });
});
