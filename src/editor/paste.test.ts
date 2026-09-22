import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { pasteSlice, pasteBlocks, placeBlocks, copyMd, closeRowSlice } from "./paste.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.isText && n.text!.indexOf(needle) >= 0) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
const paste = (s: EditorState, text: string): string => serializeMarkdown(s.apply(s.tr.replaceSelection(pasteSlice(text, s.selection.$from))).doc);

test("several lines render as the markdown they spell; a single line stays as typed", () => {
  expect(paste(at("start here", "here"), "\n\n# Title\n\n- one\n- two")).toBe("start here\n\n# Title\n\n- one\n- two");
  /* the characters as typed: what the serializer then makes of a literal
     asterisk is the serializer's question, not the paste's */
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
  /* plain lines: a continuation line that READS as a block is the
     serializer's to make a block of (its own decision, phase 0) */
  expect(paste(at("- item", "item"), " one\nplain two")).toBe("- item one\n    plain two");   /* the serializer's continuation indent */
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

/* THE SLICE THE CLIPBOARD SEES (2026-09-22, the review's finding): a
   selection's content() keeps its parents, so a drag across two cards of
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
test("a drag that stays inside ONE card of a grid is prose, not the grid (the confirmation pass, 2026-09-22)", () => {
  const inOne = closeRowSlice(across("::: grid 2\n::: card-red\nalpha beta\n\ngamma delta\n:::\n\n::: card-pink\nother\n:::\n:::", "beta", "gamma").selection.content());
  expect(inOne.openStart).toBe(3);
  expect(pasteAt(at("one two three", "two"), inOne)).toBe("one twobeta\n\ngamma three");
});
