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
  /* the rest of a split line, numbered with the line it finishes */
  rest: boolean;
  /* a line the edition leaves out: its number taken, nothing drawn */
  skip: boolean;
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

/* a block whose fence carries two numbers counts each column of its pairs
   apart: the right from its second number */
export type Side = "left" | "right";
export function lineUnits(doc: Node, interval: number, side: Side = "left"): Unit[] {
  const out: Unit[] = [];
  doc.forEach((block, blockPos) => { for (const u of blockUnits(block, blockPos, interval, side)) out.push(u); });
  return out;
}
/* the ONE walk over one block, wherever it stands: a second copy of it
   drifted from the count */
/* the block's count at a row: one past the last counted line before it
   (the block's start when none), or the line a rest finishes when the
   first line at or after the row is one — what a passage cut or quoted from
   that row is numbered from, whatever the row is */
export function countAt(block: Node, blockPos: number, rowPos: number, side: Side = "left"): number {
  let n = (side === "right" ? block.attrs.facing : block.attrs.start) as number;
  for (const u of blockUnits(block, blockPos, 0, side)) {
    if (!u.line) continue;
    if (u.pos >= rowPos) return u.rest ? u.line : n;
    n = u.line + 1;
  }
  return n;
}
export function blockUnits(block: Node, blockPos: number, interval: number, side: Side = "left"): Unit[] {
  const out: Unit[] = [];
  const prose = block.type === N.prose;
  if (!prose && block.type !== N.verse) return out;
  const facing = block.attrs.facing as number | null | undefined;
  if (side === "right") return facing == null ? out : rightUnits(block, blockPos, interval, facing);
  let line = (block.attrs.start as number) - 1;
  block.forEach((row, offset) => {
    /* counted, so a passage from the line after it is numbered as the
       edition numbers it (pin: numbering.test › a skipped line number is
       counted) (pin: reference.test › a passage starting on the line after a
       skipped line number) */
    if (row.type === N.skip) {
      out.push({ pos: blockPos + 1 + offset, node: row, kind: "line", line: ++line, blockPos, shown: false, rest: false, skip: true });
      return;
    }
    if (row.type === N.gap || row.type === N.note || row.type === N.margin_note) return;
    if (prose && row.type !== N.pair) return;
    if (!drawsInk(row)) return;
    /* the right column's row alone (pin: numbering.test › a block numbered
       on both sides) — in a plain block it is a line, as a card's two poems
       side by side were counted (pin: numbering.test › a plain verse block
       counts a row with nothing on the left) */
    if (facing != null && row.type === N.pair && !drawsInk(row.child(0))) return;
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
      shown: !rest && (block.attrs.numbered ? kind === "line" || kind === "sentence" : interval > 0 && kind === "line" && num % interval === 0), rest, skip: false,
    });
  });
  return out;
}

/* apparatus and a split line's rest as the left walk has them, or the
   translation's numbers drift ahead of the edition's (pin: numbering.test ›
   the right column counts as the left does) */
function rightUnits(block: Node, blockPos: number, interval: number, facing: number): Unit[] {
  const out: Unit[] = [];
  let line = facing - 1;
  block.forEach((row, offset) => {
    if (row.type !== N.pair || row.childCount < 2 || !drawsInk(row.child(1))) return;
    if (rowKind(row) !== "line") return;
    const rest = row.attrs.kind === "cont" && line >= facing;
    if (!rest) line++;
    out.push({ pos: blockPos + 1 + offset, node: row, kind: "line", line, blockPos, shown: !rest && (block.attrs.numbered ? true : interval > 0 && line % interval === 0), rest, skip: false });
  });
  return out;
}
/* a block's fence numbers for a passage taken from a row: both columns' when it has two */
export function fenceAt(block: Node, blockPos: number, rowPos: number): { start: number; facing?: number } {
  const start = countAt(block, blockPos, rowPos);
  return block.attrs.facing != null ? { start, facing: countAt(block, blockPos, rowPos, "right") } : { start };
}
export const hasFacing = (doc: Node): boolean => {
  let yes = false;
  doc.forEach((block) => { if (block.attrs.facing != null) yes = true; });
  return yes;
};

export function paintsLines(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => { if (block.type === N.verse || block.type === N.prose && block.attrs.numbered) yes = true; });
  return yes;
}
/* every top-level block that numbers draws all its own numbers: the page
   has no interval to offer (pin: numbering.test › a page whose every
   numbered block draws its own numbers) */
export function ownNumbers(doc: Node): boolean {
  let own = false, plain = false;
  doc.forEach((block) => {
    if (block.type !== N.verse && block.type !== N.prose) return;
    if (block.attrs.numbered) own = true;
    else if (block.type === N.verse) plain = true;
  });
  return own && !plain;
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
      out = child.type.create({ ...child.attrs, ...fenceAt(anc, $at.before(d), rowPos) }, child.content);
    } else if (anc.type === N.ordered_list && child.type === anc.type && $at.depth > d) {
      out = child.type.create({ ...child.attrs, start: itemNumbers(anc)[$at.index(d)] }, child.content);
    }
    return node.copy(Fragment.from([out, ...node.content.content.slice(1)]));
  };
  return stamp(cut, 1);
}
