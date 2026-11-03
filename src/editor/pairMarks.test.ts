// The other column of the paired rows a selection in one column covers.
import { test, expect } from "vitest";
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { coveredMarks } from "./pairMarks.ts";

/* the first occurrence of a needle at or after a position */
function at(doc: Node, needle: string, after = 0): number {
  let found = -1;
  doc.descendants((n, pos) => { if (found < 0 && n.isText) { const i = n.text!.indexOf(needle, Math.max(0, after - pos)); if (i >= 0) found = pos + i; } return found < 0; });
  if (found < 0) throw new Error("not found: " + needle);
  return found;
}
const marked = (doc: Node, a: string, b: string) => { const x0 = at(doc, a); return coveredMarks(doc, x0, at(doc, b, x0) + b.length).map(([x, y]) => doc.textBetween(x, y)); };

const PROSE = parseMarkdown("::: prose\nPrima frase. | First sentence.\nSeconda frase. | Second sentence.\n\nTerza frase. | Third sentence.\n:::");
test("a selection in one sentence's original marks its translation; in its translation, its original", () => {
  expect(marked(PROSE, "Seconda", "frase.")).toEqual(["Second sentence."]);
  expect(marked(PROSE, "Second sentence", "sentence.")).toEqual(["Seconda frase."]);
});
test("a selection down one column marks what the rows it covers hold beyond it, across a paragraph break", () => {
  expect(marked(PROSE, "Prima", "Terza")).toEqual([" frase.", "Third sentence."]);
});
test("a selection across both columns marks the rest of the rows a reference quotes", () => {
  expect(marked(PROSE, "Prima", "First")).toEqual([" sentence."]);
  expect(marked(PROSE, "First sentence.", "Terza")).toEqual(["Prima frase.", " frase.", "Third sentence."]);
});
const VERSE = parseMarkdown("::: verse\nNel mezzo del cammin di nostra vita | Midway this way of life we’re bound upon,\nmi ritrovai per una selva oscura | I woke to find myself in a dark wood,\n:::");
test("a verse pair's words mark the rest of their line and its translation", () => {
  expect(marked(VERSE, "ritrovai", "oscura")).toEqual(["mi ", "I woke to find myself in a dark wood,"]);
});
test("a dual-language block's Latin marks the English its row carries; its English, the Latin the sentence stands beside", () => {
  const dual = parseMarkdown("::: dual-language\nArma virumque cano | I sing of arms and the man\nTroiae qui primus ab oris\n:::");
  expect(marked(dual, "Arma", "cano")).toEqual(["I sing of arms and the man"]);
  expect(marked(dual, "I sing", "the man")).toEqual(["Arma virumque cano", "Troiae qui primus ab oris"]);
});
test("a block numbered on both sides, whose reference quotes one column, and a selection outside paired rows, mark nothing", () => {
  const facing = parseMarkdown("::: verse 179 244\nauraeque et venti | Ye Ayres and Windes\n:::");
  expect(marked(facing, "Ye Ayres", "Windes")).toEqual([]);
  const plain = parseMarkdown("Just a paragraph.");
  expect(marked(plain, "Just", "paragraph")).toEqual([]);
});
