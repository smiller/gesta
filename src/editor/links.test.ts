import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { linkAction, linkTitle, linkAtCaret, keyAction } from "./links.ts";

const DOC = "file:///Users/x/gesta/dist/index.html#2026-09-07";
describe("linkAction", () => {
  it("a plain click on a bare fragment routes in this tab", () => {
    expect(linkAction("#commonplace/Horace", false, DOC)).toEqual({ kind: "route", frag: "#commonplace/Horace" });
  });
  it("a full URL pointing at this document is internal in external clothing", () => {
    expect(linkAction("file:///Users/x/gesta/dist/index.html#bookshelf/Lewis%2C%20C.%20S./The%20Screwtape%20Letters", false, DOC))
      .toEqual({ kind: "route", frag: "#bookshelf/Lewis%2C%20C.%20S./The%20Screwtape%20Letters" });
  });
  it("a plain click on an external link does nothing: the caret lands", () => {
    expect(linkAction("https://example.org/a#b", false, DOC)).toBeNull();
    expect(linkAction(null, false, DOC)).toBeNull();
  });
  it("the modifier opens EVERY link in a new tab, internal ones included", () => {
    expect(linkAction("#commonplace/Horace", true, DOC)).toEqual({ kind: "open", href: "#commonplace/Horace" });
    expect(linkAction("https://example.org/", true, DOC)).toEqual({ kind: "open", href: "https://example.org/" });
  });
});

describe("linkTitle", () => {
  it("a link into the journal names the last part of the entry it opens, whatever it carries after", () => {
    expect(linkTitle("#bookshelf/Miller%2C%20Sean/Essays/2026-10-18-refiguring", DOC)).toBe("⌘-click to open 2026-10-18-refiguring");
    expect(linkTitle("#bookshelf/Miller%2C%20Sean/Essays/2026-10-18-refiguring?line=3", DOC)).toBe("⌘-click to open 2026-10-18-refiguring");
    expect(linkTitle("#commonplace/Books", DOC)).toBe("⌘-click to open Books");
    expect(linkTitle("#2021-06-22", DOC)).toBe("⌘-click to open 2021-06-22");
    expect(linkTitle("#2021-06-22/Plans", DOC)).toBe("⌘-click to open Plans");
    expect(linkTitle("file:///Users/x/gesta/dist/index.html#commonplace/Books%2FLent", DOC)).toBe("⌘-click to open Lent");
  });
  it("a link out of the journal, or to nothing it can name, says only how to open it", () => {
    for (const href of ["https://x.org/a", "#nonsense", "file:///elsewhere.html#commonplace/Books", ""]) expect(linkTitle(href, DOC)).toBe("⌘-click to open");
  });
});

function caret(md: string): EditorState {
  const doc = parseMarkdown(md);
  let at = -1;
  doc.descendants((n, pos) => {
    if (at >= 0) return false;
    if (n.text?.includes("|")) at = pos + n.text.indexOf("|");
  });
  const s = EditorState.create({ doc });
  const tr = s.tr.delete(at, at + 1);
  return s.apply(tr.setSelection(TextSelection.create(tr.doc, at)));
}
describe("the link at the caret", () => {
  it("is the link the caret is inside or at either edge of; between two, the one after it; none away from a link", () => {
    expect(linkAtCaret(caret("- [Bo|ok 1](#b1)"))).toBe("#b1");
    expect(linkAtCaret(caret("- |[Book 1](#b1)"))).toBe("#b1");
    expect(linkAtCaret(caret("- [Book 1](#b1)|"))).toBe("#b1");
    expect(linkAtCaret(caret("[a](#a)|[b](#b)"))).toBe("#b");
    expect(linkAtCaret(caret("Some | words [x](#x)"))).toBeNull();
  });
  it("is followed by the key in this tab when it names an entry, in a new tab when it goes elsewhere", () => {
    expect(keyAction("#commonplace/Horace", DOC)).toEqual({ kind: "route", frag: "#commonplace/Horace" });
    expect(keyAction("https://example.org/", DOC)).toEqual({ kind: "open", href: "https://example.org/" });
  });
});
