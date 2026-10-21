/* The numbers drawn are computed from position every time and never
   stored: the one number the document holds is a block's own start, on its
   fence (pin: numbering.test › a block starting at a number counts its rows
   from it, by position) */
import { Fragment, type Node, type MarkType } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { itemNumbers } from "../model/serialize.ts";

const N = schema.nodes;

export type UnitKind = "line" | "stage" | "speaker" | "sentence";
export interface Unit {
  pos: number;
  node: Node;
  kind: UnitKind;
  /* the number, 0 for apparatus */
  line: number;
  blockPos: number;
  /* would a view draw the number — the interval's only effect */
  shown: boolean;
}

/* text that is not whitespace, or a picture; a folio draws nothing here, a
   break is not ink, and a cell is a container (pin: numbering.test ›
   whollyIn and drawsInk) */
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
   so an italic original against a plain translation stays a numbered line
   (pin: numbering.test › apparatus inside the fence is a unit but not a
   line) */
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

/* bold first: a row bold and italic both is a speaker (pin: numbering.test
   › a wholly bold-italic row is a speaker) */
function rowKind(row: Node): UnitKind {
  if (row.attrs.kind === "line" || row.attrs.kind === "cont") return "line";
  if (whollyIn(row, schema.marks.strong)) return "speaker";
  if (whollyIn(row, schema.marks.em)) return "stage";
  return "line";
}

export function lineUnits(doc: Node, interval: number): Unit[] {
  const out: Unit[] = [];
  doc.forEach((block, blockPos) => { for (const u of blockUnits(block, blockPos, interval)) out.push(u); });
  return out;
}
/* the ONE walk over one block, wherever it stands: a second copy of it
   drifted from the count */
/* the block's count at a row: one past the last counted line before it
   (the block's start when none), or the line a rest finishes — what a
   passage cut or quoted from that row is numbered from, whatever the row is */
export function countAt(block: Node, blockPos: number, rowPos: number): number {
  let n = block.attrs.start as number;
  for (const u of blockUnits(block, blockPos, 0)) {
    if (u.pos >= rowPos) return u.pos === rowPos && u.line && u.line < n ? u.line : n;
    if (u.line) n = u.line + 1;
  }
  return n;
}
export function blockUnits(block: Node, blockPos: number, interval: number): Unit[] {
  const out: Unit[] = [];
  const prose = block.type === N.prose;
  if (!prose && block.type !== N.verse) return out;
  let line = (block.attrs.start as number) - 1;
  block.forEach((row, offset) => {
    if (row.type === N.gap || row.type === N.note || row.type === N.margin_note) return;
    if (prose && row.type !== N.pair) return;
    if (!drawsInk(row)) return;
    /* a stanza has no apparatus: in the Faerie Queene a row wholly in
       italics is an inscription or a song, and it is numbered (pin:
       numbering.test › every inked row of a stanza is a line) */
    const kind: UnitKind = prose ? "sentence" : block.attrs.stanza != null ? "line" : rowKind(row);
    /* the rest of a split line takes the number of the line it finishes,
       once the block has one */
    const rest = kind === "line" && row.attrs.kind === "cont" && line >= (block.attrs.start as number);
    const num = kind === "line" || kind === "sentence" ? (rest ? line : ++line) : 0;
    out.push({
      pos: blockPos + 1 + offset, node: row, kind, line: num, blockPos,
      shown: interval > 0 && kind === "line" && !rest && num % interval === 0,
    });
  });
  return out;
}

export function paintsLines(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => { if (block.type === N.verse) yes = true; });
  return yes;
}
/* a top-level prose block holding a pair; a pipe-less prose block counts
   nothing. Without it a book's own paired prose was drawn as quoted matter,
   Boethius 3pr1 as a blockquote (pin: lineNumbers.test › a top-level prose
   block holding a pair marks the root prosepage) */
export function countsSentences(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => {
    if (block.type !== N.prose) return;
    block.forEach((row) => { if (row.type === N.pair) yes = true; });
  });
  return yes;
}

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
/* a cut from `at` numbered from where it opens: on a raw cut the
   first-child chain IS the start's ancestor chain, so each verse or prose
   ancestor is stamped at its own depth with its own count at the row the
   cut opens on (pin: paste.test › verse lines copied from inside a block
   keep their numbers), and a numbered list from the item it opens on
   (pin: paste.test › list items copied from the middle keep their own numbers) */
export function renumbered(doc: Node, at: number, cut: Node): Node {
  const $at = doc.resolve(at);
  const stamp = (node: Node, d: number): Node => {
    if (d > $at.depth || !node.firstChild) return node;
    const child = stamp(node.firstChild, d + 1);
    const anc = $at.node(d);
    let out = child;
    if ((anc.type === N.verse || anc.type === N.prose) && child.type === anc.type) {
      const rowPos = $at.depth > d ? $at.before(d + 1) : at;
      out = child.type.create({ ...child.attrs, start: countAt(anc, $at.before(d), rowPos) }, child.content);
    } else if (anc.type === N.ordered_list && child.type === anc.type && $at.depth > d) {
      out = child.type.create({ ...child.attrs, start: itemNumbers(anc)[$at.index(d)] }, child.content);
    }
    return node.copy(Fragment.from([out, ...node.content.content.slice(1)]));
  };
  return stamp(cut, 1);
}
