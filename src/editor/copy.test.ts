import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../model/parse.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { copyMd, closeRowSlice, copiedSlice } from "./copy.ts";

function at(md: string, needle: string): EditorState {
  const doc = parseMarkdown(md);
  let pos = -1;
  doc.descendants((n, p) => { if (pos < 0 && n.text?.includes(needle)) pos = p + n.text!.indexOf(needle) + needle.length; return pos < 0; });
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos) });
}
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

/* THE SLICE THE CLIPBOARD SEES: a selection's content() keeps its parents, so a drag across two cards of
   a grid slices to the GRID, open three deep — never to open cards */
function across(md: string, from: string, to: string): EditorState {
  const doc = parseMarkdown(md);
  const find = (n: string): number => { let pos = -1; doc.descendants((node, p) => { if (pos < 0 && node.text?.includes(n)) pos = p + node.text!.indexOf(n); return pos < 0; }); if (pos < 0) throw new Error(n); return pos; };
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
    doc.descendants((n, p) => { if (pos < 0 && n.text?.includes(needle)) pos = p + n.text!.indexOf(needle) + (end ? needle.length : 0); return pos < 0; });
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
test("lines copied from a block numbered on both sides keep both numbers", () => {
  const facing = "::: verse 179 244\nTres | Before\n | So softly\nvivaque\nsidera | The starres\n:::";
  expect(copied(sel(facing, "So softly", "The starres"))).toBe("::: verse 180 245\n | So softly\nvivaque\nsidera | The starres\n:::");
  expect(copied(sel(facing, "vivaque", "sidera"))).toBe("::: verse 180 246\nvivaque\nsidera\n:::");
  expect(copied(sel("::: verse\nMaecenas | Maecenas, born\no et | The shield\n:::", "born", "The shield"))).toBe("::: verse\n | born\no et | The shield\n:::");
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
test("a copy opening at the end of a pair's right cell starts at the next row, numbered on both sides as it", () => {
  const s = sel("::: verse 179 244\nTres | Before\n | So softly\nvivaque\nsidera | The starres\n:::", "Before", "The starres");
  const atEnd = EditorState.create({ doc: s.doc, selection: TextSelection.create(s.doc, s.selection.from + "Before".length, s.selection.to) });
  expect(copied(atEnd)).toBe("::: verse 180 245\n | So softly\nvivaque\nsidera | The starres\n:::");
  const plain = sel("::: verse\na | one\nb | two\n:::", "one", "two");
  expect(copied(EditorState.create({ doc: plain.doc, selection: TextSelection.create(plain.doc, plain.selection.from + 3, plain.selection.to) }))).toBe("::: verse 2\nb | two\n:::");
});
