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
