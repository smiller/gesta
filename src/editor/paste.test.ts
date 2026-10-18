import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { pasteSlice, pasteBlocks, placeBlocks, copyMd, closeRowSlice, onlyLineBreaks, copiedSlice, pastedRefusal, bareLinks, bareBlocks, keepsSpaces, COPY_MARK } from "./paste.ts";
import { Slice } from "prosemirror-model";
import { schema } from "../model/schema.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.indexOf(needle) >= 0) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
const paste = (s: EditorState, text: string): string => serializeMarkdown(s.apply(s.tr.replaceSelection(pasteSlice(text, s.selection.$from))).doc);

test("several lines render as the markdown they spell; a single line stays as typed", () => {
  expect(paste(at("start here", "here"), "\n\n# Title\n\n- one\n- two")).toBe("start here\n\n# Title\n\n- one\n- two");
  /* the characters as typed: what a literal asterisk becomes on save is not
     the paste's question */
  const one = at("start here", "start");
  expect(one.apply(one.tr.replaceSelection(pasteSlice(" 2*3*4 and [x](y)", one.selection.$from))).doc.textContent).toBe("start 2*3*4 and [x](y) here");
});
test("a pasted reference lands as its markdown: the link line and the quote", () => {
  const ref = "[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord";
  expect(paste(at("note\n\n", "note"), "\n\n" + ref)).toBe("note\n\n[*Gesta*, 7 September 2026](#2026-09-07?h=blind%20cord):\n\n> blind cord");
});
test("a single quote or heading line renders; a single entry link becomes a link in place", () => {
  expect(paste(at("a\n\nb", "a"), "\n> quoted")).toBe("a\n\n> quoted\n\nb");
  expect(paste(at("see  now", "see "), "[Ideas](#2026-09-07/Ideas)")).toBe("see [Ideas](#2026-09-07/Ideas) now");
});
test("inside a list item, a cell or a verse row the lines arrive as breaks; in a code block every character is literal", () => {
  /* plain lines: a continuation line that READS as a block is left for the
     save to make a block of */
  expect(paste(at("- item", "item"), " one\nplain two")).toBe("- item one\n    plain two");   /* the continuation indent as written */
  const row = at("::: verse\nline\n:::", "line");
  expect(row.apply(row.tr.replaceSelection(pasteSlice(" a\nb", row.selection.$from))).doc.firstChild!.firstChild!.childCount).toBe(3);
  expect(paste(at("```\ncode\n```", "code"), "\n# not a heading\n- nor a list")).toBe("```\ncode\n# not a heading\n- nor a list\n```");
});
test("copyMd: the selection's markdown, inline content as a paragraph, blocks as themselves", () => {
  const s = at("some *words* here\n\n- a\n- b", "words");
  expect(copyMd(s.doc.slice(6, 11))).toBe("*words*");
  expect(copyMd(s.doc.slice(0, s.doc.content.size))).toBe("some *words* here\n\n- a\n- b");
});

test("a slice open inside a verse row is closed, so the block travels whole; open prose stays open", () => {
  const doc = parseMarkdown("::: verse\nMaecenas atavis | O Maecenas\nedite regibus | born of kings\n:::\n\nprose after");
  const open = doc.slice(3, doc.firstChild!.nodeSize - 3);
  expect([open.openStart, open.content.firstChild!.type.name]).toEqual([2, "pair"]);   /* the block itself is left out of a slice within it */
  const closed = closeRowSlice(open);
  expect([closed.openStart, closed.openEnd]).toEqual([0, 0]);
  expect(closed.content.childCount).toBe(2);
  const proseStart = doc.firstChild!.nodeSize + 2;
  const inline = doc.slice(proseStart, proseStart + 5);
  expect(closeRowSlice(inline)).toBe(inline);
});

test("a verse fence pasted as text is set down whole: mid-paragraph the paragraph splits, an empty paragraph is replaced", () => {
  const fence = "::: verse\nHeil! | Hail!\nErlösung | Salvation\n:::";
  const mid = at("start end", "start");
  const blocks = pasteBlocks(fence, mid.selection.$from)!;
  expect(blocks.map((b) => b.type.name)).toEqual(["verse"]);
  const out = mid.apply(placeBlocks(mid, blocks));
  expect(serializeMarkdown(out.doc)).toBe("start\n\n" + fence + "\n\n end");
  const empty = parseMarkdown("before\n\nafter");
  const s2 = EditorState.create({ doc: empty, selection: TextSelection.create(empty, 9) });
  const blocks2 = pasteBlocks("# Title\n\nbody", s2.selection.$from)!;
  expect(serializeMarkdown(s2.apply(placeBlocks(s2, blocks2)).doc)).toBe("before\n\n# Title\n\nbody\n\nafter");
  expect(pasteBlocks("one line", mid.selection.$from)).toBeNull();
  expect(pasteBlocks("a\nb", at("- item", "item").selection.$from)).toBeNull();
});


test("inside a reference block every character is literal, as in a code block: the directive is never split", () => {
  const s = at("::: reference\nfrom the last title\n:::\n\npara", "from ");
  expect(pasteBlocks("one\n\ntwo\n", s.selection.$from)).toBeNull();
  expect(paste(s, "one\n\ntwo\n")).toBe("::: reference\nfrom one\n\ntwo\nthe last title\n:::\n\npara");
});

/* THE SLICE THE CLIPBOARD SEES: a selection's content() keeps its parents, so a drag across two cards of
   a grid slices to the GRID, open three deep — never to open cards */
function across(md: string, from: string, to: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string): number => { let pos = -1; doc.descendants((node, p) => { if (pos < 0 && node.isText && node.text!.indexOf(n) >= 0) pos = p + node.text!.indexOf(n); return pos < 0; }); if (pos < 0) throw new Error(n); return pos; };
  return EditorState.create({ doc, selection: TextSelection.create(doc, find(from), find(to) + to.length) });
}
const pasteAt = (s: EditorState, slice: ReturnType<typeof closeRowSlice>): string => serializeMarkdown(s.apply(s.tr.replaceSelection(slice)).doc);
const GRID = "::: grid 2\n::: card-red\nalpha beta\n:::\n\n::: card-pink\ngamma delta\n:::\n:::";
test("a drag across two cards of a grid is closed at the grid, so the grid travels whole — mid-paragraph too", () => {
  const open = across(GRID, "beta", "gamma").selection.content();
  expect([open.openStart, open.openEnd, open.content.firstChild!.type.name]).toEqual([3, 3, "grid"]);
  const closed = closeRowSlice(open);
  expect([closed.openStart, closed.openEnd, closed.content.childCount]).toEqual([0, 0, 1]);
  const md = pasteAt(at("one two three", "two"), closed);   /* the caret sits after "two" */
  expect(md).toContain("::: grid 2\n::: card-red\nbeta\n:::\n\n::: card-pink\ngamma\n:::\n:::");
  expect(md.startsWith("one two\n\n::: grid 2") && md.endsWith(":::\n\n three")).toBe(true);
});
test("a plain card is not a row: a drag from a card into the prose after it, or across two loose cards, pastes as it did before the grid", () => {
  const intoProse = closeRowSlice(across("::: card-red\nalpha beta\n:::\n\nplain gamma delta", "beta", "gamma").selection.content());
  expect(pasteAt(at("one two three", "two"), intoProse)).toBe("one twobeta\n\nplain gamma three");
  const twoCards = closeRowSlice(across("::: card-red\nalpha beta\n:::\n\n::: card-pink\ngamma delta\n:::", "beta", "gamma").selection.content());
  expect(pasteAt(at("one two three", "two"), twoCards)).toBe("one twobeta\n\n::: card-pink\ngamma three\n:::");
});
test("a drag that stays inside ONE card of a grid is prose, not the grid", () => {
  const inOne = closeRowSlice(across("::: grid 2\n::: card-red\nalpha beta\n\ngamma delta\n:::\n\n::: card-pink\nother\n:::\n:::", "beta", "gamma").selection.content());
  expect(inOne.openStart).toBe(3);
  expect(pasteAt(at("one two three", "two"), inOne)).toBe("one twobeta\n\ngamma three");
});

test("a paste of line breaks alone is nothing: it never replaces a selection; in code, or as the editor's own copy, it pastes", () => {
  const prose = parseMarkdown("some words").resolve(2), code = parseMarkdown("```\nx\n```").resolve(2);
  expect(onlyLineBreaks("\n\n", prose)).toBe(true);
  expect(onlyLineBreaks("\r\n", prose)).toBe(true);
  expect(onlyLineBreaks("  \n ", prose)).toBe(true);
  expect(onlyLineBreaks("a\n", prose)).toBe(false);
  expect(onlyLineBreaks("", prose)).toBe(false);
  expect(onlyLineBreaks(" ", prose)).toBe(false);
  expect(onlyLineBreaks("\n\n", code)).toBe(false);
  expect(onlyLineBreaks("\n\n", prose, "<br><br>")).toBe(true);
  expect(onlyLineBreaks("\n\n", prose, '<p data-pm-slice="1 1 []"></p><p></p>')).toBe(false);
});

test("a copy carries no page marker out, and loses none of its words", () => {
  const doc = parseMarkdown("in her degree ⟨8⟩ and on");
  expect(copyMd(copiedSlice(doc.slice(0, doc.content.size)))).toBe("in her degree and on");
  const tight = parseMarkdown("⟨30⟩Beatrice ⟨31⟩was, in her degree.");
  expect(copyMd(copiedSlice(tight.slice(0, tight.content.size)))).toBe("Beatrice was, in her degree.");
});

const sel = (md: string, a: string, b: string): EditorState => {
  const doc = parseMarkdown(md);
  const find = (needle: string, end: boolean): number => {
    let pos = -1;
    doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.indexOf(needle) >= 0) pos = p + n.text!.indexOf(needle) + (end ? needle.length : 0); return pos < 0; });
    return pos;
  };
  return EditorState.create({ doc, selection: TextSelection.create(doc, find(a, false), find(b, true)) });
};
const copied = (s: EditorState): string => copyMd(copiedSlice(s.selection.content(), s.doc, s.selection.from, s.selection.to));
test("verse lines copied from inside a block keep their numbers", () => {
  const verse = "::: verse\none line\ntwo line\nthree line\nfour line\n:::";
  expect(copied(sel(verse, "two line", "three line"))).toBe("::: verse 2\ntwo line\nthree line\n:::");
  expect(copied(sel(verse, "o line", "three"))).toBe("::: verse 2\no line\nthree\n:::");
  expect(copied(sel("::: verse 5\none line\ntwo line\nthree line\n:::", "two line", "three line"))).toBe("::: verse 6\ntwo line\nthree line\n:::");
  /* a selection from the prose above takes the block whole, from its own first line */
  expect(copied(sel("before\n\n" + verse, "before", "two line"))).toBe("before\n\n::: verse\none line\ntwo line\n:::");
});
test("a copy whose selection opens at the end of a line starts at the next line, numbered as it", () => {
  const s = sel("::: verse\none line\ntwo line\nthree line\n:::", "two line", "three line");
  const atEnd = EditorState.create({ doc: s.doc, selection: TextSelection.create(s.doc, s.selection.from - 2, s.selection.to) });
  expect(atEnd.selection.$from.parentOffset).toBe(8);
  expect(copied(atEnd)).toBe("::: verse 2\ntwo line\nthree line\n:::");
});
test("list items copied from the middle keep their own numbers", () => {
  expect(copied(sel("3. x\n4. y\n5. z", "y", "z"))).toBe("4. y\n5. z");
  expect(copied(sel("5. five\n4. four\n3. three", "four", "three"))).toBe("4. four\n3. three");
  /* opening at an item's end starts at the next item */
  const s = sel("3. x\n4. y\n5. z", "y", "z");
  const atEnd = EditorState.create({ doc: s.doc, selection: TextSelection.create(s.doc, s.selection.from + 1, s.selection.to) });
  expect(copied(atEnd)).toBe("5. z");
});
test("a selection inside one code block copies its characters, no fence", () => {
  expect(copied(sel("```js\na = *ptr;\nmore\n```", "a = *ptr;", "mo"))).toBe("a = *ptr;\nmo");
  expect(copied(sel("before\n\n```js\na = 1;\n```", "before", "a = 1;"))).toBe("before\n\n```js\na = 1;\n```");
  /* the block inside a quote, a note */
  expect(copied(sel("> ```\n> a = 1;\n> b\n> ```", "a = 1;", "b"))).toBe("a = 1;\nb");
  expect(copied(sel("::: note\n```\na = 1;\nb\n```\n:::", "a = 1;", "b"))).toBe("a = 1;\nb");
});
test("a one-line quote pasted inside a quote is its text; a one-line quote of a picture is a quote", () => {
  const q = at("> quoted line", "quoted");
  expect(pasteBlocks("> inner", q.selection.$from)).toBe(null);
  expect(paste(q, "> inner")).toBe("> quoted> inner line");
  const p = at("x", "x");
  expect(pasteBlocks("> ![](a.png)", p.selection.$from)!.map((b) => b.type.name)).toEqual(["blockquote"]);
});
test("a pasted link to an address that names no entry stays as typed", () => {
  const s = at("x", "x");
  const near = s.apply(s.tr.replaceSelection(pasteSlice(" [near](#pagex)", s.selection.$from))).doc;
  expect(near.textContent).toBe("x [near](#pagex)");
  let linked = false;
  near.descendants((n) => { if (n.marks.some((m) => m.type.name === "link")) linked = true; return true; });
  expect(linked).toBe(false);
  for (const miss of ["[a](#page/)", "[a](#shelf/A)"]) expect(pasteSlice(miss, s.selection.$from).content.firstChild!.marks.length).toBe(0);
  expect(paste(at("see  now", "see "), "[Ideas](#2026-09-07/Ideas)")).toBe("see [Ideas](#2026-09-07/Ideas) now");
});
test("a pasted fence the model refuses is named with its reason; a clean paste names nothing", () => {
  const $ = at("x", "x").selection.$from;
  expect(pastedRefusal(pasteBlocks("::: verse -1\nline one\n:::", $)!)).toBe("::: verse -1 — -1 is not a starting line, so it stayed a paragraph");
  expect(pastedRefusal(pasteBlocks("::: verse 2\nline one\n:::", $)!)).toBe(null);
});
test("a bare URL pasted alone is a link at once", () => {
  const s = at("see  now", "see ");
  const doc = s.apply(s.tr.replaceSelection(pasteSlice("https://example.org/x", s.selection.$from))).doc;
  let href = "";
  doc.descendants((n) => { const l = n.marks.find((m) => m.type.name === "link"); if (l) href = l.attrs.href; return true; });
  expect(href).toBe("https://example.org/x");
  expect(doc.textContent).toBe("see https://example.org/x now");
  expect(pasteSlice("see https://example.org/x", s.selection.$from).content.firstChild!.marks.length).toBe(0);
});
test("a pasted link to this page by its full address keeps only its bare address; a link anywhere else keeps its own", () => {
  const page = "file:///Users/someone/gesta/dist/index.html";
  const link = (href: string) => schema.text("Horace", [schema.marks.link.create({ href })]);
  const pasted = new Slice(schema.node("doc", null, [schema.node("paragraph", null, [link(page + "#page/Horace?h=sunt%20quos"), schema.text(" and "), link("https://example.com/#x"), schema.text(" and "), link("file:///Users/someone/writer/index.html#2022-07-05")])]).content, 0, 0);
  const hrefs: string[] = [];
  bareLinks(pasted, page + "#2026-10-16").content.descendants((n) => { n.marks.forEach((m) => hrefs.push(m.attrs.href as string)); });
  expect(hrefs).toEqual(["#page/Horace?h=sunt%20quos", "https://example.com/#x", "file:///Users/someone/writer/index.html#2022-07-05"]);
});
test("a link to this page in pasted markdown keeps only its bare address; one whose words are its address stays whole; a paste with nothing to change comes back as it was", () => {
  const page = "file:///Users/someone/gesta/dist/index.html";
  const s = at("start here", "here");
  const blocks = bareBlocks(pasteBlocks(`[Horace](${page}#page/Horace)\n\nand [${page}#page/Ode](${page}#page/Ode)`, s.selection.$from)!, page + "#2026-10-16");
  expect(serializeMarkdown(placeBlocks(s, blocks).doc)).toBe(`start here\n\n[Horace](#page/Horace)\n\nand ${page}#page/Ode`);
  const plain = new Slice(parseMarkdown("no links [here](https://example.com/)").content, 0, 0);
  expect(bareLinks(plain, page)).toBe(plain);
});

test("pasted HTML keeps its spaces only when every block in it is one this page marked", () => {
  const el = (name: string, marked = false) => ({ nodeType: 1, nodeName: name, textContent: "", hasAttribute: (a: string) => marked && a === COPY_MARK });
  const text = (t: string) => ({ nodeType: 3, nodeName: "#text", textContent: t, hasAttribute: () => false });
  const root = (...kids: object[]) => ({ childNodes: kids }) as unknown as globalThis.Node;
  expect(keepsSpaces(root(el("META"), el("P", true), el("BLOCKQUOTE", true)))).toBe(true);
  expect(keepsSpaces(root(el("P", true), text("\n"), el("BLOCKQUOTE", true)))).toBe(true);
  // a marked copy inside a message of its own: the message's HTML is not ours
  expect(keepsSpaces(root(el("P"), el("BLOCKQUOTE", true)))).toBe(false);
  expect(keepsSpaces(root(el("P", true), text("and more"))) ).toBe(false);
  expect(keepsSpaces(root(el("META")))).toBe(false);
});
