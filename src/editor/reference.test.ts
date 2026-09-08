// The selection half of a reference over parsed fixtures: which rows a
// range covers, the line and leaf ranges, the payload, the passage shapes.
import { test, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { referenceRange, folioRange, selectionLink, passageMd, spansTwoBlocks, referencePayload, entryLink, citationAnchorHTML } from "./reference.ts";
import { journalOf } from "../store/headings.ts";

/* the positions of a needle's first occurrence in the document's text */
function span(doc: Node, needle: string, end?: string): [number, number] {
  let from = -1, to = -1;
  doc.descendants((n, pos) => {
    if (!n.isText) return true;
    if (from < 0) { const i = n.text!.indexOf(needle); if (i >= 0) { from = pos + i; if (!end) to = from + needle.length; } }
    if (end && from >= 0 && to < 0) { const j = n.text!.indexOf(end); if (j >= 0) to = pos + j + end.length; }
    return true;
  });
  if (from < 0 || to < 0) throw new Error("not found: " + needle + " … " + end);
  return [from, to];
}
const state = (doc: Node, from: number, to: number) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });
const journal = journalOf({ "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost", "bookshelf/Williams, Charles/Witchcraft": "# Witchcraft" });

const verse = parseMarkdown("# Book 1\n\n::: verse\n**SPEAKER**\nOf man's first disobedience, and the fruit\nOf that forbidden tree, whose mortal taste\n\nBrought death into the World, and all our woe,\nWith loss of Eden\n:::\n\nA closing paragraph.");

test("referenceRange over covered lines; a speaker label takes the line under it", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  expect(referenceRange(verse, a, b)).toBe("2-3");
  const [c, d] = span(verse, "SPEAKER", "disobedience");
  expect(referenceRange(verse, c, d)).toBe("1");
  const [e, f] = span(verse, "closing");
  expect(referenceRange(verse, e, f)).toBe("");
});

test("a single-column passage quotes whole rows with the stanza gap, apparatus and prose left out of the count", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  expect(passageMd(verse, a, b)).toBe("> Of that forbidden tree, whose mortal taste\n>\n> Brought death into the World, and all our woe,");
});

test("a paired block copies as its own fence, numbered from the first quoted line", () => {
  const doc = parseMarkdown("::: verse\nMaecenas atavis | Maecenas, descended\nedite regibus | of kings\no et praesidium | my bulwark\n:::");
  const [a, b] = span(doc, "regibus", "bulwark");
  expect(passageMd(doc, a, b)).toBe("::: verse 2\nedite regibus | of kings\no et praesidium | my bulwark\n:::");
});

test("loose prose quotes the selection itself, paragraph breaks kept", () => {
  const doc = parseMarkdown("First paragraph here.\n\nSecond one follows.");
  const [a, b] = span(doc, "paragraph", "Second");
  expect(passageMd(doc, a, b)).toBe("> paragraph here.\n>\n> Second");
});

test("two verse blocks are a refusal", () => {
  const doc = parseMarkdown("::: verse\na\nb\n:::\n\n::: verse\nc\n:::");
  const [a, b] = span(doc, "b", "c");
  expect(spansTwoBlocks(doc, a, b)).toBe(true);
  expect(referencePayload(state(doc, a, b), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal)).toEqual({ refused: "two-blocks" });
});

test("the leaf range is read from the page the selection is on; a leaf inside a note turns no page", () => {
  const doc = parseMarkdown("⟨61⟩ Opening words of the leaf.\n\n::: note\n⟨99⟩ a note's own marker\n:::\n\nMore of it ⟨62⟩ and on it goes to the end.");
  const [a, b] = span(doc, "words", "More");
  expect(folioRange(doc, a, b)).toEqual({ from: "61", to: "61" });
  const [c, d] = span(doc, "words", "goes");
  expect(folioRange(doc, c, d)).toEqual({ from: "61", to: "62" });
  const [e, f] = span(doc, "and on");
  expect(folioRange(doc, e, f)).toEqual({ from: "62", to: "62" });
});

test("selectionLink: the text and which occurrence it is", () => {
  const doc = parseMarkdown("the cat sat. the cat sat again.");
  const [a, b] = span(doc, "cat sat again");
  expect(selectionLink(doc, a - 4, b)).toEqual({ q: "the cat sat again", nth: 0 });
  const [c, d] = span(doc, "cat");
  expect(selectionLink(doc, c, d)).toEqual({ q: "cat", nth: 0 });
  expect(selectionLink(doc, c + 13, d + 13)).toEqual({ q: "cat", nth: 1 });
});

test("referencePayload: the link line with the range and the highlight, the passage under it", () => {
  const [a, b] = span(verse, "forbidden", "Brought death");
  const out = referencePayload(state(verse, a, b), "bookshelf", "Milton, John/Paradise Lost/Book 1", journal);
  expect(out).toMatchObject({ text:
    "[Milton, *Paradise Lost*, 1.2-3](#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death):\n\n" +
    "> Of that forbidden tree, whose mortal taste\n>\n> Brought death into the World, and all our woe," });
  /* the parts the rich flavour is built from ride beside the text */
  expect(out).toMatchObject({ label: "Milton, *Paradise Lost*, 1.2-3", url: "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201?h=forbidden%20tree%2C%20whose%20mortal%20taste%20Brought%20death", passage: "> Of that forbidden tree, whose mortal taste\n>\n> Brought death into the World, and all our woe," });
  expect(referencePayload(state(verse, a, a), "bookshelf", "x", journal)).toEqual({ refused: "select" });
});

test("a leaf stands in for a prose book's titled chapter; entryLink names the entry the same way", () => {
  const doc = parseMarkdown("# 3. The Dark Ages\n\n⟨61⟩ The Church had a difficulty.\n\n⟨62⟩ It went on.");
  const [a, b] = span(doc, "difficulty", "went");
  const out = referencePayload(state(doc, a, b), "bookshelf", "Williams, Charles/Witchcraft/3. The Dark Ages", journal);
  expect((out as { text: string }).text.split("\n")[0]).toMatch(/^\[Williams, \*Witchcraft\*, pp\. 61-62\]/);
  expect(entryLink("bookshelf", "Williams, Charles/Witchcraft/3. The Dark Ages", journal)).toBe("[Williams, *Witchcraft*, *3. The Dark Ages*](#bookshelf/Williams%2C%20Charles/Witchcraft/3.%20The%20Dark%20Ages)");
});

test("citationAnchorHTML: the label's italics as em, everything else escaped, the url escaped", () => {
  expect(citationAnchorHTML("#2026-09-07?h=a%20b", "*Gesta*, 7 September 2026")).toBe('<a href="#2026-09-07?h=a%20b"><em>Gesta</em>, 7 September 2026</a>');
  expect(citationAnchorHTML('#x"y', "a <b> & *c*")).toBe('<a href="#x&quot;y">a &lt;b&gt; &amp; <em>c</em></a>');
});

