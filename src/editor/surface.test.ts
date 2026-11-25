import { describe, it, expect, vi } from "vitest";
import type { Node } from "prosemirror-model";
import { htmlView, sameShown, shownOf, surfaces, type ReplacePort, type Surface } from "./surface.ts";
import type { HtmlMode } from "./htmlMode.ts";
import type { EditorView } from "prosemirror-view";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { flattenDoc, flattenText } from "../model/flatten.ts";
import { fenceRefusals } from "../model/fenceRefusals.ts";
import { alertWords, asSaid, said, type ErrorOwner, type OwnerOpts, type FenceRefusal } from "../model/alertText.ts";
import { directiveTrouble } from "../store/conventions.ts";

const told = (): string => directiveTrouble("bookshelf", "Chaucer, Geoffrey", ["roman book and canto"]).join("\n");
const opened = (refused: FenceRefusal[], trouble: string): string => alertWords(said("toldOnOpen", { refused, trouble: trouble ? trouble.split("\n") : [] }));

interface Fake extends Surface { caretAt: number; seen: boolean; top: number | null; text: string }

function world(y = 0) {
  const log: string[] = [];
  const built: Fake[] = [];
  const errors: string[] = [], released: number[] = [], beneath: string[] = [];
  let standing: string | null = null;
  const fenceError: ErrorOwner = {
    raise: ((a, b, c) => { const [s, o] = asSaid(a, b, c); standing = alertWords(s); errors.push(standing); if ((o as OwnerOpts).beneath) beneath.push(standing); }) as ErrorOwner["raise"],
    resolve: () => { if (standing !== null) released.push(errors.length); standing = null; },
  };
  const win = { at: y, y: () => win.at, scrollTo: (to: number) => { win.at = to; log.push("scroll " + to); }, under: () => 0 };
  const fake = (markdown: boolean, text: string, doc?: Node): Fake => {
    const f: Fake = {
      markdownMode: markdown, caretAt: markdown ? text.length : 0, seen: true, top: null, text,
      md: () => markdown ? f.text : serializeMarkdown(doc!),
      flat: () => markdown ? flattenText(f.text) : flattenDoc(doc!),
      caret: () => { log.push("read caret"); return f.caretAt; },
      caretSeen: () => f.seen,
      topAt: () => { log.push("read top"); return f.top; },
      lineStart: (p) => p,
      focus: () => {},
      lock: () => {},
      placeAt: () => null, reveal: () => {},
      end: () => markdown ? f.text.length : doc!.content.size,
      scrollToPos: (pos) => { log.push("align " + pos); },
      placeCaret: (pos, scroll) => { f.caretAt = pos ?? (markdown ? f.text.length : 0); log.push("caret " + pos + (scroll ? " scroll" : " still")); },
      insertText: () => {}, selectionEnd: () => f.caretAt, insertPicture: () => {}, words: () => 0,
      destroy: () => { log.push("destroy " + (markdown ? "markdown" : "html")); },
    };
    built.push(f);
    return f;
  };
  const s = surfaces({
    build: {
      html: (doc) => { log.push("build html"); return fake(false, "", doc); },
      markdown: (md) => { log.push("build markdown"); return fake(true, md); },
    },
    window: win,
    places: {
      carry: (pos) => { log.push("carry " + pos); },
      release: () => { log.push("release"); },
    },
    fenceError,
    onView: (md) => { log.push("view " + md); },
    switched: () => { log.push("switched"); },
  });
  return { s, log, win, errors, released, beneath, standing: () => standing, last: () => built[built.length - 1] };
}
const posOf = (doc: Node, ch: string): number => { const f = flattenDoc(doc); return f.pos[f.text.indexOf(ch)]!; };

describe("the switch", () => {
  it("holds the caret, reads the top, mounts the other view, puts the window back, aligns, tells, then places the caret", () => {
    const w = world(300);
    w.s.show("AB\n\nCD", "commonplace/A");
    const r = w.last();
    r.top = 5;   /* C */
    w.log.length = 0;
    w.s.switchTo(true);
    const src = w.last().text;
    expect(w.log).toEqual(["release", "read caret", "read top", "destroy html", "build markdown", "scroll 300", "align " + src.indexOf("C"), "view true", "switched", "caret 0 scroll"]);
    expect(w.s.md).toBe(true);
  });
  it("reads no top at the window's top, and a top at the first character stays at the top", () => {
    const w0 = world(0);
    w0.s.show("AB\n\nCD", "commonplace/A");
    w0.log.length = 0;
    w0.s.switchTo(true);
    expect(w0.log).not.toContain("read top");
    const w = world(20);
    w.s.show("AB\n\nCD", "commonplace/A");
    w.last().top = 1;
    w.log.length = 0;
    w.s.switchTo(true);
    expect(w.log.slice(w.log.indexOf("build markdown"))).toEqual(["build markdown", "scroll 20", "scroll 0", "view true", "switched", "caret 0 scroll"]);
  });
  it("carries the top by the crossing, not an equal count: markdown mode's stream holds the fence lines", () => {
    const md = "::: stanza 1\nA B\n:::\n\n::: stanza 2\nC D\n:::";
    const doc = parseMarkdown(md);
    const w = world(400);
    w.s.show(md, "bookshelf/X/Y");
    w.last().top = posOf(doc, "C");
    w.s.switchTo(true);
    const src = w.last();
    expect(w.log).toContain("align " + src.text.indexOf("C"));
    /* back: the alignment in HTML mode carries the place */
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
    w.s.show("AB", "commonplace/A");
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
    unmoved.s.show("AB\n\nCD", "commonplace/A");
    unmoved.last().caretAt = 6;   /* before D */
    unmoved.s.switchTo(true);
    unmoved.s.switchTo(false);
    expect(unmoved.log[unmoved.log.length - 1]).toBe("caret 6 scroll");
    const moved = world();
    moved.s.show("AB\n\nCD", "commonplace/A");
    moved.last().caretAt = 6;
    moved.s.switchTo(true);
    moved.last().caretAt = 0;
    moved.s.switchTo(false);
    expect(moved.log[moved.log.length - 1]).toBe("caret 1 scroll");
  });
  it("a caret seen on leaving is scrolled to, and in HTML mode releases the hold; an unseen one leaves the window", () => {
    const seen = world();
    seen.s.show("AB\n\nCD", "commonplace/A");
    seen.s.switchTo(true);
    seen.log.length = 0;
    seen.s.switchTo(false);
    expect(seen.log.slice(-2)).toEqual(["release", "caret 1 scroll"]);
    expect(seen.log[0]).toBe("release");
    const unseen = world();
    unseen.s.show("AB\n\nCD", "commonplace/A");
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
  it("shown, forces markdown mode, raised as an error and told; the next show puts the reader's view back", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = world();
    w.s.show(BAD, "commonplace/Gridded");
    expect(w.log).toEqual(["build markdown", "view true"]);
    expect(w.errors).toEqual(["cannot render commonplace/Gridded — " + WHY + "; shown in markdown mode"]);
    expect(err).toHaveBeenCalledWith("cannot render", "commonplace/Gridded", WHY);
    expect(w.s.md).toBe(true);
    w.log.length = 0;
    w.s.show("fine", "commonplace/Fine");
    expect(w.log).toEqual(["view false", "destroy markdown", "build html"]);
    expect(w.released).toEqual([1]);
    expect(w.s.md).toBe(false);
    err.mockRestore();
  });
  it("switched back to, keeps markdown mode, its error raised again, and a forced view stays forced", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = world();
    w.s.show(BAD, "commonplace/Gridded");
    w.log.length = 0;
    w.s.switchTo(false);
    expect(w.log).toEqual(["release", "read caret"]);
    expect(w.errors[1]).toBe("cannot render commonplace/Gridded — " + WHY + "; shown in markdown mode");
    expect([w.released, w.standing()]).toEqual([[], w.errors[1]]);
    expect(w.s.md).toBe(true);
    w.log.length = 0;
    w.s.show("fine", "commonplace/Fine");
    expect(w.log).toEqual(["view false", "destroy markdown", "build html"]);
    err.mockRestore();
  });
  it("a clean parse back resolves the error; the lines it refused are raised anew", () => {
    const w = world();
    w.s.show("fine", "commonplace/A");
    w.s.switchTo(true);
    w.last().text = "::: versey\nline\n:::";
    w.s.switchTo(false);
    expect(w.errors).toEqual([opened(fenceRefusals(parseMarkdown("::: versey\nline\n:::")), "")]);
    w.s.switchTo(true);
    w.last().text = "fine";
    w.s.switchTo(false);
    expect(w.released).toEqual([1]);
    expect(w.errors).toHaveLength(1);
  });
  it("a directive the page does not read is raised as an error on the switch back, with the fences it refused", () => {
    const back = (md: string) => {
      const w = world();
      w.s.show("# Chaucer", "bookshelf/Chaucer, Geoffrey");
      w.s.switchTo(true);
      w.last().text = md;
      w.s.switchTo(false);
      return w.errors;
    };
    expect(back("# Chaucer\n\n::: reference\nroman book and canto\n:::\n\n::: versey\nline\n:::")).toEqual([opened(fenceRefusals(parseMarkdown("::: versey\nline\n:::")), told())]);
    expect(back("# Chaucer\n\n::: reference\nroman book and canto\n:::")).toEqual([told()]);
  });
  it("a show of another entry is in HTML mode; the same entry shown again keeps the view chosen", () => {
    const w = world();
    w.s.show("fine", "commonplace/A");
    w.s.switchTo(true);
    w.log.length = 0;
    w.s.show("fine", "commonplace/A");
    expect(w.s.md).toBe(true);
    expect(w.log).toEqual(["destroy markdown", "build markdown"]);
    w.log.length = 0;
    w.s.show("other", "commonplace/B");
    expect(w.s.md).toBe(false);
    expect(w.log).toEqual(["view false", "destroy markdown", "build html"]);
  });
  it("a renamed entry, shown under its new key with the view kept, stays in the view chosen", () => {
    const w = world();
    w.s.show("fine", "commonplace/A");
    w.s.switchTo(true);
    w.s.show("fine", "commonplace/B", true);
    expect(w.s.md).toBe(true);
  });
  it("an entry opened raises its refused fences and its directives' trouble as one error, and the next entry opened resolves it", () => {
    const w = world();
    w.s.show("# Chaucer\n\n::: reference\nroman book and canto\n:::\n\n::: versey\nline\n:::", "bookshelf/Chaucer, Geoffrey");
    expect(w.errors).toEqual([opened(fenceRefusals(parseMarkdown("::: versey\nline\n:::")), told())]);
    w.s.show("fine", "commonplace/B");
    expect(w.released).toEqual([1]);
    expect(w.errors).toHaveLength(1);
  });
  it("the error on open goes beneath an error already standing; on the switch back it goes on top", () => {
    const w = world();
    w.s.show("# Chaucer\n\n::: reference\nroman book and canto\n:::", "bookshelf/Chaucer, Geoffrey");
    w.s.switchTo(true);
    w.s.switchTo(false);
    expect([w.errors, w.beneath]).toEqual([[told(), told()], [told()]]);
  });
  it("an entry that cannot render, opened, goes beneath an error already standing", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const w = world();
    w.s.show(BAD, "commonplace/Gridded");
    expect(w.beneath).toEqual(["cannot render commonplace/Gridded — " + WHY + "; shown in markdown mode"]);
    err.mockRestore();
  });
  it("a redraw of the entry on screen neither raises its error again nor resolves it", () => {
    const w = world();
    const md = "# Chaucer\n\n::: reference\nroman book and canto\n:::";
    w.s.show(md, "bookshelf/Chaucer, Geoffrey");
    w.s.show(md, "bookshelf/Chaucer, Geoffrey", true);
    w.s.show(md, "bookshelf/Chaucer, Geoffrey");
    expect(w.errors).toHaveLength(1);
    expect(w.released).toEqual([]);
  });
  it("a show resolves the entry left's fence error", () => {
    const w = world();
    w.s.show("fine", "commonplace/A");
    w.s.switchTo(true);
    w.last().text = "::: versey\nline\n:::";
    w.s.switchTo(false);
    w.s.show("fine", "commonplace/B");
    expect(w.released).toEqual([1]);
  });
});

describe("the view shown", () => {
  const replace = {} as ReplacePort, view = {} as EditorView;
  const html = { markdownMode: false, view } as unknown as HtmlMode;
  const markdown = (text: string, caret: number) => ({ markdownMode: true, replace, md: () => text, selectionEnd: () => caret }) as unknown as Surface;
  it("is nothing while no entry is on screen", () => {
    expect(shownOf(null, html)).toBeNull();
    expect(htmlView(shownOf(null, html))).toBeNull();
  });
  it("is HTML mode with its editor while HTML mode is on screen", () => {
    expect(shownOf(html, html)).toEqual({ mode: "html", view });
    expect(htmlView(shownOf(html, html))).toBe(view);
  });
  it("is markdown mode with its replace and whether the caret's line is a heading, and no editor", () => {
    const shown = shownOf(markdown("# Title\n\nprose", 3), html);
    expect(shown?.mode === "markdown" && shown.replace).toBe(replace);
    expect(shown?.mode === "markdown" && shown.lineIsHeading()).toBe(true);
    expect((shownOf(markdown("# Title\n\nprose", 12), html) as { lineIsHeading(): boolean }).lineIsHeading()).toBe(false);
    expect(htmlView(shown ?? null)).toBeNull();
  });
  it("is the same view across two readings while neither the mode nor its editor or replace changed", () => {
    const md = markdown("x", 0), other = { ...html, view: {} as EditorView } as unknown as HtmlMode;
    expect(sameShown(shownOf(html, html), shownOf(html, html))).toBe(true);
    expect(sameShown(shownOf(md, html), shownOf(md, html))).toBe(true);
    expect(sameShown(shownOf(html, html), shownOf(md, html))).toBe(false);
    expect(sameShown(shownOf(html, html), shownOf(other, other))).toBe(false);
    expect(sameShown(shownOf(md, html), shownOf(markdown("x", 0), html))).toBe(true);
    expect(sameShown(shownOf(md, html), shownOf({ ...md, replace: {} } as unknown as Surface, html))).toBe(false);
    expect(sameShown(null, null)).toBe(true);
  });
});

describe("a show again", () => {
  it("with the focus in the entry carries the caret across a changed text by its count: a word added before the caret moves it on", () => {
    const w = world();
    w.s.show("AB CD", "commonplace/A");
    w.last().caretAt = posOf(parseMarkdown("AB CD"), "D");
    w.s.showAgain(true, () => w.s.show("XY AB CD", "commonplace/A", true));
    expect(w.log.filter((l) => l.startsWith("caret "))).toEqual(["caret " + posOf(parseMarkdown("XY AB CD"), "D") + " still"]);
  });
  it("without the focus in the entry places no caret", () => {
    const w = world();
    w.s.show("AB CD", "commonplace/A");
    w.s.showAgain(false, () => w.s.show("XY AB CD", "commonplace/A", true));
    expect(w.log.filter((l) => l.startsWith("caret "))).toEqual([]);
  });
});
