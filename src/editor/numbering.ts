/* The unit walk over the DOCUMENT: which rows of which top-level blocks are
   lines, and the number each carries. Ported 2026-09-07 from
   ../writer/src/js/numbering.mjs, whose comments hold the decisions behind
   each rule; what changed is the tree — a ProseMirror node in place of a DOM
   element, so the cell-opening and the ink test read marks and text rather
   than tags. Computed from position every time and never stored: the plugin
   in lineNumbers.ts draws the answer as decorations, and nothing writes a
   number into the document. */
import type { Node, MarkType } from "prosemirror-model";
import { schema } from "../model/schema.ts";

const N = schema.nodes;

export type UnitKind = "line" | "stage" | "speaker" | "sentence";
export interface Unit {
  /* the row's position in the document, and the row */
  pos: number;
  node: Node;
  kind: UnitKind;
  /* the number, 0 for apparatus */
  line: number;
  /* the position of the fence the row was walked out of */
  blockPos: number;
  /* would a view draw the number — the interval's only effect */
  shown: boolean;
}

/* does the row draw anything: text that is not whitespace, or a picture. A
   folio draws nothing here (it is a label the gutter paints), a break is not
   ink, and a cell is a container. */
export function drawsInk(row: Node): boolean {
  let ink = false;
  row.descendants((n) => {
    if (n.isText ? !!n.text!.trim() : n.type === N.image) ink = true;
    return !ink;
  });
  return ink;
}

/* is everything this row DRAWS inside `mark` — the shape both kinds of
   apparatus take: a stage direction wholly italic, a speaker label wholly
   bold. Whitespace-only text does not count against it; anything else drawn
   outside the mark does, so a row merely CONTAINING emphasis stays a line.
   A paired row's cells are opened, not matched: apparatus needs BOTH columns,
   so an italic original against a plain translation stays a numbered line. */
export function whollyIn(row: Node, mark: MarkType): boolean {
  let drew = false, ok = true;
  row.descendants((n) => {
    if (n.isText ? !n.text!.trim() : n.type !== N.image) return true;
    if (mark.isInSet(n.marks)) drew = true;
    else ok = false;
    return true;
  });
  return ok && drew;
}

/* THE ROW'S DECLARED KIND DECIDES BEFORE ITS MARKS DO: a ⟨line⟩ row is a
   line whatever it is set in (grammar.ts, ROW_LINE_TOKEN) */
function rowKind(row: Node): UnitKind {
  if (row.attrs.kind === "line") return "line";
  if (whollyIn(row, schema.marks.em)) return "stage";
  if (whollyIn(row, schema.marks.strong)) return "speaker";
  return "line";
}

/* the units of `doc`, in order. Only a TOP-LEVEL verse or prose block is
   walked: a block nested in a quote, a card or a note is numbered nowhere.
   A verse block's rows are its lines, each block counting from its own
   start; a note row and a stanza gap emit nothing, and neither does a row
   drawing nothing. A prose block's PAIRED rows are its sentences, whatever
   their marks — prose has no apparatus convention — and a sentence number
   counts but never paints. */
export function lineUnits(doc: Node, interval: number): Unit[] {
  const out: Unit[] = [];
  doc.forEach((block, blockPos) => { for (const u of blockUnits(block, blockPos, interval)) out.push(u); });
  return out;
}
/* the units of ONE block, wherever it stands (the 2026-09-12
   confirmation pass: the reference had a copy of this walk beside it,
   and a quoted block's fence would have drifted from the gutter's count) */
export function blockUnits(block: Node, blockPos: number, interval: number): Unit[] {
  const out: Unit[] = [];
  const prose = block.type === N.prose;
  if (!prose && block.type !== N.verse) return out;
  let line = (block.attrs.start as number) - 1;
  block.forEach((row, offset) => {
    if (row.type === N.gap || row.type === N.note) return;
    if (prose && row.type !== N.pair) return;
    if (!drawsInk(row)) return;
    const kind: UnitKind = prose ? "sentence" : rowKind(row);
    const num = kind === "line" || kind === "sentence" ? ++line : 0;
    out.push({
      pos: blockPos + 1 + offset, node: row, kind, line: num, blockPos,
      shown: interval > 0 && kind === "line" && num % interval === 0,
    });
  });
  return out;
}

/* DOES THIS DOCUMENT PAINT LINES AND RESERVE THE GUTTER: a top-level verse
   block is what makes it, and nothing else does */
export function paintsLines(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => { if (block.type === N.verse) yes = true; });
  return yes;
}
/* paintsLines' sibling: DOES THIS DOCUMENT COUNT SENTENCES — a top-level
   prose block holding a pair. The current app's numbersSentences: a
   pipe-less prose block has no effect, so it counts nothing. Nothing is
   painted for it; the class it sets (`prosepage`) is what keeps the
   quoted-matter dress off a book's own paired prose (by hand 2026-09-12:
   Boethius 3pr1 drawn as a blockquote). */
export function countsSentences(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => {
    if (block.type !== N.prose) return;
    block.forEach((row) => { if (row.type === N.pair) yes = true; });
  });
  return yes;
}

/* the numbered units grouped by block, in document order — a block
   registering on its first NUMBERED line, so a fence holding nothing but
   apparatus is no block at all */
export function blocksOf(units: Unit[]): Unit[][] {
  const blocks: Unit[][] = [], seen: number[] = [];
  for (const u of units) {
    if (!u.line) continue;
    let i = seen.indexOf(u.blockPos);
    if (i === -1) { i = seen.push(u.blockPos) - 1; blocks.push([]); }
    blocks[i].push(u);
  }
  return blocks;
}
