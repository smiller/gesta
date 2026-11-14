/* The numbers drawn are computed from position every time and never
   stored: the one number the document holds is a block's own start, on its
   fence (pin: numbering.test › a block starting at a number counts its rows
   from it, by position) */
import { Fragment, type Node, type MarkType, type ResolvedPos } from "prosemirror-model";
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
  /* a line the edition letters, or prints moved in brackets: what it is called */
  label?: string;
}

/* text that is not whitespace, or a picture; a page label draws nothing here, a
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
const declaredLine = (row: Node): boolean => row.attrs.kind === "line" || row.attrs.kind === "cont" || !!row.attrs.label;
function rowKind(row: Node): UnitKind {
  if (declaredLine(row)) return "line";
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
    if (!u.label) n = u.line + 1;
  }
  return n;
}
interface LeftWalk { block: Node; blockPos: number; interval: number; prose: boolean; facing: number | null | undefined; line: number; lettered: { line: number; label: string } | null }
/* counted, so a passage from the line after it is numbered as the
   edition numbers it (pin: numbering.test › a skipped line number is
   counted) (pin: reference.test › a passage starting on the line after a
   skipped line number) */
function skipUnit(w: LeftWalk, row: Node, pos: number): Unit {
  w.line++;
  return { pos, node: row, kind: "line", line: w.line, blockPos: w.blockPos, shown: false, rest: false, skip: true };
}
/* the right column's row alone (pin: numbering.test › a block numbered
   on both sides) — in a plain block it is a line, as a card's two poems
   side by side were counted (pin: numbering.test › a plain verse block
   counts a row with nothing on the left) */
const rightOnly = (w: LeftWalk, row: Node): boolean => w.facing != null && row.type === N.pair && !drawsInk(row.child(0));
const unnumberedRow = (row: Node): boolean => row.type === N.gap || row.type === N.note || row.type === N.margin_note;
const passedOver = (w: LeftWalk, row: Node): boolean =>
  unnumberedRow(row) || (w.prose && row.type !== N.pair) || !drawsInk(row) || rightOnly(w, row);
/* a stanza has no apparatus: in the Faerie Queene a row wholly in
   italics is an inscription or a song, and it is numbered (pin:
   numbering.test › every inked row of a stanza is a line) */
const kindOf = (w: LeftWalk, row: Node): UnitKind => (w.prose ? "sentence" : w.block.attrs.stanza != null ? "line" : rowKind(row));
/* drawn at every interval: its number is what says why the next line is
   not one higher (pin: numbering.test › a lettered line) */
function letteredUnit(w: LeftWalk, row: Node, pos: number, kind: UnitKind): Unit | null {
  if (row.attrs.label) {
    w.lettered = { line: parseInt((row.attrs.label as string).replace("[", ""), 10), label: row.attrs.label as string };
    return { pos, node: row, kind, ...w.lettered, blockPos: w.blockPos, shown: true, rest: false, skip: false };
  }
  if (w.lettered && row.attrs.kind === "cont") return { pos, node: row, kind, ...w.lettered, blockPos: w.blockPos, shown: false, rest: true, skip: false };
  w.lettered = null;
  return null;
}
const counted = (kind: UnitKind): boolean => kind === "line" || kind === "sentence";
const shownAt = (w: LeftWalk, kind: UnitKind, num: number): boolean =>
  (w.block.attrs.numbered ? counted(kind) : w.interval > 0 && kind === "line" && num % w.interval === 0);
/* the rest of a split line takes the number of the line it finishes,
   once the block has one */
function countedUnit(w: LeftWalk, row: Node, pos: number, kind: UnitKind): Unit {
  const rest = kind === "line" && row.attrs.kind === "cont" && w.line >= (w.block.attrs.start as number);
  const num = counted(kind) ? (rest ? w.line : ++w.line) : 0;
  return { pos, node: row, kind, line: num, blockPos: w.blockPos, shown: !rest && shownAt(w, kind, num), rest, skip: false };
}
function rowUnit(w: LeftWalk, row: Node, offset: number): Unit | null {
  const pos = w.blockPos + 1 + offset;
  if (row.type === N.skip) return skipUnit(w, row, pos);
  if (passedOver(w, row)) return null;
  const kind = kindOf(w, row);
  return letteredUnit(w, row, pos, kind) ?? countedUnit(w, row, pos, kind);
}
export function blockUnits(block: Node, blockPos: number, interval: number, side: Side = "left"): Unit[] {
  const prose = block.type === N.prose;
  if (!prose && block.type !== N.verse) return [];
  const facing = block.attrs.facing as number | null | undefined;
  if (side === "right") return facing == null ? [] : rightUnits(block, blockPos, interval, facing);
  const w: LeftWalk = { block, blockPos, interval, prose, facing, line: (block.attrs.start as number) - 1, lettered: null };
  const out: Unit[] = [];
  block.forEach((row, offset) => {
    const u = rowUnit(w, row, offset);
    if (u) out.push(u);
  });
  return out;
}

const rightInked = (row: Node): boolean => row.type === N.pair && row.childCount >= 2 && drawsInk(row.child(1));
const rightShown = (block: Node, interval: number, line: number): boolean => !!block.attrs.numbered || (interval > 0 && line % interval === 0);
/* apparatus and a split line's rest as the left walk has them, or the
   translation's numbers drift ahead of the edition's (pin: numbering.test ›
   the right column counts as the left does) */
function rightUnits(block: Node, blockPos: number, interval: number, facing: number): Unit[] {
  const out: Unit[] = [];
  let line = facing - 1;
  block.forEach((row, offset) => {
    if (!rightInked(row) || rowKind(row) !== "line") return;
    const rest = row.attrs.kind === "cont" && line >= facing;
    if (!rest) line++;
    out.push({ pos: blockPos + 1 + offset, node: row, kind: "line", line, blockPos, shown: !rest && rightShown(block, interval, line), rest, skip: false });
  });
  return out;
}
/* a prose block's paragraphs are its runs of sentences between breaks, the
   first numbered as the fence is (pin: reference.test › a prosimetrum refers to
   the prose by Barbi's paragraph) */
export function paragraphAt(block: Node, blockPos: number, rowPos: number): number {
  let para = block.attrs.start as number, inked = false, found = para;
  block.forEach((row, offset) => {
    if (row.type === N.gap) { if (inked) para++; inked = false; return; }
    if (blockPos + 1 + offset === rowPos) found = para;
    if (row.type === N.pair) inked = true;
  });
  return found;
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

const numbersLines = (b: Node): boolean => b.type === N.verse || (b.type === N.prose && !!b.attrs.numbered);
export function paintsLines(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => { if (numbersLines(block)) yes = true; });
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
   cut opens on (pin: copy.test › verse lines copied from inside a block
   keep their numbers), and a numbered list from the item it opens on
   (pin: copy.test › list items copied from the middle keep their own numbers) */
interface StampCtx { $at: ResolvedPos; at: number; paragraphs: boolean }
const rowsOf = (anc: Node, child: Node): boolean => (anc.type === N.verse || anc.type === N.prose) && child.type === anc.type;
const listOf = (anc: Node, child: Node): boolean => anc.type === N.ordered_list && child.type === anc.type;
function fenceFor(c: StampCtx, anc: Node, d: number): { start: number; facing?: number } {
  const rowPos = c.$at.depth > d ? c.$at.before(d + 1) : c.at;
  return c.paragraphs && anc.type === N.prose ? { start: paragraphAt(anc, c.$at.before(d), rowPos) } : fenceAt(anc, c.$at.before(d), rowPos);
}
function restamped(c: StampCtx, anc: Node, child: Node, d: number): Node {
  if (rowsOf(anc, child)) return child.type.create({ ...child.attrs, ...fenceFor(c, anc, d) }, child.content);
  if (listOf(anc, child) && c.$at.depth > d) return child.type.create({ ...child.attrs, start: itemNumbers(anc)[c.$at.index(d)] }, child.content);
  return child;
}
export function renumbered(doc: Node, at: number, cut: Node, paragraphs = false): Node {
  const c: StampCtx = { $at: doc.resolve(at), at, paragraphs };
  const stamp = (node: Node, d: number): Node => {
    if (d > c.$at.depth || !node.firstChild) return node;
    const out = restamped(c, c.$at.node(d), stamp(node.firstChild, d + 1), d);
    return node.copy(Fragment.from([out, ...node.content.content.slice(1)]));
  };
  return stamp(cut, 1);
}
export const paragraphOf = (doc: Node, u: Unit): number => paragraphAt(doc.nodeAt(u.blockPos)!, u.blockPos, u.pos);
