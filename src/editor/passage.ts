import { Fragment, type Node, type ResolvedPos } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { blockUnits, fenceAt, paragraphAt, drawsInk, whollyIn, renumbered, type Unit, type Side } from "./numbering.ts";
import { quotePrefix } from "../model/grammar.ts";
import { dropFolios } from "./paste.ts";

const N = schema.nodes;

export function inkBetween(doc: Node, a: number, b: number): boolean {
  if (b <= a) return false;
  let ink = false;
  doc.nodesBetween(a, b, (n, pos) => {
    if (ink) return false;
    if (n.isText) {
      const s = Math.max(a, pos) - pos, e = Math.min(b, pos + n.nodeSize) - pos;
      if (n.text!.slice(s, e).trim()) ink = true;
    } else if (n.type === N.image) ink = true;
    return !ink;
  });
  return ink;
}
/* an overlap holding ink, so a drag ending just past a row's edge does not
   pull that row in (pin: reference.test › a block inside a note, the
   label's top level, an end resting on a row) */
/* AT ANY DEPTH: a reference inside a quotation is a block like any other,
   and so is a verse block inside a note — Satires 1.10 opens one inside a
   note inside its verse, and stopped at the note its rows came out cut and
   fenced three deep (pin: reference.test › a block inside a note) */
function rowBlocks(doc: Node, topOnly = false): { node: Node; pos: number }[] {
  const out: { node: Node; pos: number }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === N.verse || n.type === N.prose) out.push({ node: n, pos });
    return !topOnly;
  });
  return out;
}
const overlaps = (b: { node: Node; pos: number }, from: number, to: number): boolean => b.pos + b.node.nodeSize > from && b.pos < to;
function coveredUnits(doc: Node, from: number, to: number, { topOnly = false, side = "left" as Side } = {}): Unit[] {
  const inked = (u: Unit): boolean => inkBetween(doc, Math.max(from, u.pos), Math.min(to, u.pos + u.node.nodeSize));
  return rowBlocks(doc, topOnly).filter((b) => overlaps(b, from, to)).flatMap((b) => blockUnits(b.node, b.pos, 0, side).filter(inked));
}
/* a line's original text: a pair's first cell, and where it starts */
const original = (u: Unit): { cell: Node; start: number } => u.node.type === N.pair ? { cell: u.node.child(0), start: u.pos + 2 } : { cell: u.node, start: u.pos + 1 };
/* the original's halves meet at its first run of two spaces between words:
   where the first ends and the second starts, as offsets into it */
function caesura(cell: Node): { cut: number; rest: number; t: string } | null {
  if (!cell.isTextblock) return null;
  const t = cell.textBetween(0, cell.content.size, undefined, "\ufffc");
  const m = /\S( {2,})\S/.exec(t);
  return m ? { cut: m.index + 1, rest: m.index + 1 + m[1].length, t } : null;
}
/* which halves of a line the selection inks; null for a line with no
   halves, or none of the original selected */
function halvesInked(u: Unit, from: number, to: number): { a: boolean; b: boolean } | null {
  const { cell, start } = original(u);
  const c = caesura(cell);
  if (!c) return null;
  const { cut, rest, t } = c;
  const s = from - start, e = to - start;
  const inked = (x: number, y: number): boolean => x < y && !!t.slice(x, y).trim();
  const halves = { a: inked(Math.max(s, 0), Math.min(e, cut)), b: inked(Math.max(s, rest), Math.min(e, t.length)) };
  return halves.a || halves.b ? halves : null;
}
/* the sentence whose English holds `pos`: its block's first position, its
   row's index, and the last row it stands beside, before the next sentence
   or a note */
const inEnglishCell = ($p: ResolvedPos, d: number): boolean => $p.parent.type === N.cell && $p.node(d - 1).type === N.pair && $p.index(d - 1) === 1;
const isDualBlock = (b: Node): boolean => b.type === N.verse && !!b.attrs.dual;
const besideEnglish = (row: Node): boolean => row.type === N.line || (row.type === N.pair && !row.child(1).content.size);
function lastBeside(block: Node, first: number): number {
  let last = first;
  for (let k = first + 1; k < block.childCount; k++) {
    const row = block.child(k);
    /* a skipped line number and a stanza gap stand in the Latin column under
       the English as no row (pin: reference.test › a sentence's Latin runs on
       past a skipped line number) */
    if (row.type === N.skip || row.type === N.gap) continue;
    if (!besideEnglish(row)) break;
    last = k;
  }
  return last;
}
function sentenceAt(doc: Node, pos: number): { start: number; block: Node; first: number; last: number } | null {
  const $p = doc.resolve(pos), d = $p.depth;
  if (d < 3 || !inEnglishCell($p, d)) return null;
  const block = $p.node(d - 2);
  if (!isDualBlock(block)) return null;
  const first = $p.index(d - 2);
  return { start: $p.start(d - 2), block, first, last: lastBeside(block, first) };
}
const rowAt = (s: { start: number; block: Node }, i: number): number => {
  let at = s.start;
  for (let k = 0; k < i; k++) at += s.block.child(k).nodeSize;
  return at;
};

/* an end widens only where the selection holds some of its cell's words:
   one resting at a cell's edge pulled in a sentence no one selected (pin:
   reference.test › an end resting at an English cell's edge) */
function inked(doc: Node, end: number, from: number, to: number): boolean {
  const $p = doc.resolve(end);
  if ($p.parent.type !== N.cell) return false;
  return !!doc.textBetween(Math.max(from, $p.start()), Math.min(to, $p.end())).trim();
}

/* a selection with an end in a sentence's English, widened to the Latin
   the sentence stands beside: from its own row's start to the end of the
   last row before the next sentence (pin: reference.test › a selection in
   a sentence's English takes the Latin) */
function sentenceRange(doc: Node, from: number, to: number): [number, number] {
  const a = inked(doc, from, from, to) ? sentenceAt(doc, from) : null, b = inked(doc, to, from, to) ? sentenceAt(doc, to) : null;
  const start = a ? rowAt(a, a.first) + 2 : from;
  const end = b ? Math.max(to, rowAt(b, b.last) + b.block.child(b.last).nodeSize - (b.block.child(b.last).type === N.pair ? 2 : 1)) : to;
  return [start, end];
}

/* TWO BLOCKS IS A REFUSAL: every block numbers from 1 (pin: reference.test ›
   two verse blocks are a refusal) — except a run of top-level stanzas, each
   numbering its own lines (pin: reference.test › a work in stanza fences
   refers by stanza) */
function spansTwoBlocks(p: Passage): boolean {
  /* a row with nothing on the left is in its block by the right column (pin:
     reference.test › a passage running from one block numbered on both sides) */
  const units = [...p.lines(), ...p.lines({ side: "right" })];
  const blocks = new Set(units.map((u) => u.blockPos));
  if (blocks.size <= 1) return false;
  const top = new Set(p.lines({ top: true }).map((u) => u.blockPos));
  return [...blocks].some((b) => !top.has(b) || p.doc.nodeAt(b)!.attrs.stanza == null);
}
/* THE PASSAGE IS A QUOTATION NODE, serialized once: a textual filter over
   serialized lines misread a note's fence lines inside a verse block, a
   refused `:::` paragraph and a gap at a fence's edge (pin: reference.test
   › the passage is a quotation node) */
function quoted(blocks: Node[]): string {
  return serializeMarkdown(schema.nodes.doc.create(null, [N.blockquote.create(null, blocks)])).trim();
}
/* does the selection reach ink the row arms cannot carry — loose prose,
   a pipe-less prose fence, a note's own paragraph outside a nested block:
   ink outside the blocks whose units the selection covers: skipping every
   row block's whole span hid a note's paragraph inside an outer block, and
   a drag from a nested pair into it dropped the paragraph (pin:
   reference.test › the number on the right block at every depth) */
function coversProse({ doc, from, to, lines }: Passage): boolean {
  const blocks = new Set(lines().map((u) => u.blockPos));
  let at = from;
  for (const b of rowBlocks(doc)) {
    if (!blocks.has(b.pos)) continue;
    const end = b.pos + b.node.nodeSize;
    if (inkBetween(doc, at, Math.min(b.pos, to))) return true;
    at = Math.max(at, end);
  }
  return inkBetween(doc, at, to);
}
/* the selection's ends moved off a pair's cells: out to the whole row
   where the selection covers ink in it, off the row where it does not
   (a passage is whole rows, never a cell: a drag from a pair's last cell
   into the paragraph after it cut a cell out, and an end merely resting at
   a row's edge widened to a whole row no one selected) (pin: reference.test
   › no cut through a pair) */
function wholeRows(doc: Node, from: number, to: number): [number, number] {
  const $from = doc.resolve(from), $to = doc.resolve(to);
  let a = from, b = to;
  for (let d = $from.depth; d >= 1; d--) if ($from.node(d).type === N.pair) {
    a = inkBetween(doc, from, Math.min(to, $from.after(d))) ? $from.before(d) : $from.after(d);
    break;
  }
  for (let d = $to.depth; d >= 1; d--) if ($to.node(d).type === N.pair) {
    b = inkBetween(doc, Math.max(from, $to.before(d)), to) ? $to.after(d) : $to.before(d);
    break;
  }
  return [a, b];
}
/* the cut with the containers around THE WHOLE of it unwrapped: a reference
   referenced again is quoted ONE level deep, however many quotations, notes or
   cards deep it stood — a quoted pair referenced again came out at one level, a
   quoted paragraph at two (pin: reference.test › no cut through a pair, one
   quote level). A container holding only ONE END stays: a drag from a
   reference into the line after it keeps the pair quoted beside the line
   that was not, as the source had them. Every edge break comes off a
   paragraph, a gap row off a cut block's edge, and a block with no ink goes
   — inside a retained container as well: one break of two stayed, an empty
   paragraph stood in the nested box, and an edge gap painted an empty row
   under the opener (pin: reference.test › the number on the right block at
   every depth, the nested box trimmed, an edge gap off) */
const CONTAINERS = new Set(["blockquote", "note", "card", "grid"]);
/* a margin-note is a note on the text, not the text (pin: reference.test ›
   a margin-note is left out of a passage in loose prose too) */
const keep = (b: Node): boolean => b.type !== N.margin_note && (b.type === N.gap || drawsInk(b));
/* one gap stands where a margin-note stood between two (pin: reference.test ›
   a margin-note left out between two stanza gaps leaves one gap) */
function withoutMarginNotes(rows: Node[]): Node[] {
  const out: Node[] = [];
  let dropped = false;
  for (const row of rows) {
    if (row.type === N.margin_note) { dropped = true; continue; }
    const doubled = dropped && row.type === N.gap && out[out.length - 1]?.type === N.gap;
    dropped = false;
    if (!doubled) out.push(row);
  }
  return out;
}
function trimmedContainer(b: Node): Node {
  const inner: Node[] = [];
  b.forEach((c) => { const t = trimmed(c); if (keep(t)) inner.push(t); });
  return b.copy(Fragment.from(inner));
}
function trimmedRows(b: Node): Node {
  const all: Node[] = [];
  b.forEach((row) => { all.push(row); });
  const rows = withoutMarginNotes(all);
  while (rows.length && rows[0].type === N.gap) rows.shift();
  while (rows.length && rows[rows.length - 1].type === N.gap) rows.pop();
  return b.copy(Fragment.from(rows));
}
function trimmedParagraph(b: Node): Node {
  let c = b.content;
  while (c.firstChild?.type === N.hard_break) c = c.cut(c.firstChild.nodeSize);
  while (c.lastChild?.type === N.hard_break) c = c.cut(0, c.size - c.lastChild.nodeSize);
  return b.copy(c);
}
function trimmed(b: Node): Node {
  if (CONTAINERS.has(b.type.name)) return trimmedContainer(b);
  if (b.type === N.verse || b.type === N.prose) return trimmedRows(b);
  return b.type === N.paragraph ? trimmedParagraph(b) : b;
}
function unquoted(cut: Node): Node[] {
  let n = cut;
  while (n.childCount === 1 && CONTAINERS.has(n.firstChild!.type.name)) n = schema.nodes.doc.create(null, n.firstChild!.content);
  const blocks: Node[] = [];
  n.forEach((b) => { const t = trimmed(b); if (keep(t)) blocks.push(t); });
  return blocks;
}
/* THE QUOTED PASSAGE IS A QUOTATION: prose and a stanza's lines quote
   with "> " markers; a verse block copies as its own fence, numbered from
   its first quoted line, a dual-language one keeping the two columns —
   INSIDE the quotation: bare beside a reference, it read as the entry's own
   verse (pin: reference.test › a paired block copies as its own fence
   inside the quotation) (pin: reference.test › a single-column passage
   quotes whole rows as its own fence). In a row block the ROW is the unit and whole rows are quoted,
   the contiguous run carrying the stanza gaps between them; a nested
   note stays behind and a page-turn row is dropped. In loose prose the
   unit is the selection, widened to whole pair rows. */
/* the passage carries no page marker, dropped as its rows are written:
   dropped before, a page-turn row was quoted as a blank line
   (pin: reference.test › the quoted passage sheds its page markers)
   (pin: reference.test › a page-turn row in a quoted run is left out)
   (pin: reference.test › a page-turn row is left out of a quoted run that starts in prose) */
const isTurn = (row: Node): boolean => {
  if (drawsInk(row)) return false;
  let turn = false;
  row.descendants((n) => { if (n.type === N.folio) turn = true; return !turn; });
  return turn;
};
function dropTurns(frag: Fragment): Fragment {
  const out: Node[] = [];
  frag.forEach((n) => {
    if (n.isTextblock || n.isLeaf) out.push(n);
    else if (n.type === N.verse || n.type === N.prose) { const rows: Node[] = []; n.forEach((r) => { if (!isTurn(r)) rows.push(r); }); out.push(n.copy(Fragment.from(rows))); }
    else out.push(n.copy(dropTurns(n.content)));
  });
  return Fragment.from(out);
}
interface Quoting extends Passage { byHalves: boolean; paragraphs: boolean }
const paragraphOf = (doc: Node, u: Unit): number => paragraphAt(doc.nodeAt(u.blockPos)!, u.blockPos, u.pos);
function loosePassage(p: Quoting): string {
  const [a, b] = wholeRows(p.doc, p.from, p.to);
  const cut = p.doc.cut(a, b);
  /* renumbered BEFORE anything is unwrapped or dropped: after, the number
     landed on the wrong block once a truncated remainder had been
     dropped, and on the outer block of a verse inside a note inside a
     verse (pin: reference.test › the number on the right block at every depth) */
  return quoted(unquoted(renumbered(p.doc, a, cut.copy(dropFolios(dropTurns(cut.content))), p.paragraphs)));
}
function byBlock(units: Unit[]): Unit[][] {
  const groups: Unit[][] = [];
  for (const u of units) {
    const last = groups[groups.length - 1];
    if (last && last[0].blockPos === u.blockPos) last.push(u);
    else groups.push([u]);
  }
  return groups;
}
/* `paragraphs`: a prose fence that counts paragraphs */
function passageMd(passage: Passage, byHalves: boolean, paragraphs: boolean): string {
  const p: Quoting = { ...passage, byHalves, paragraphs };
  const units = p.lines();
  if (!units.length || coversProse(p)) return loosePassage(p);
  /* a run across stanzas:
     each stanza's rows quoted as one block's are, a blank quoted line
     between them, as the stanza gap stands in print (pin: reference.test ›
   referencePayload under the directive: I.i.2.1, a run across a stanza gap
   allowed and quoted whole) */
  return byBlock(units).map((group) => blockPassage(p, group)).join("\n" + quotePrefix("") + "\n");
}
/* A SELECTION WIDENED TO WHOLE WORDS: back to the start of the word it starts in and on to the end of the word
   it ends in, past the spaces and punctuation it starts on into the next
   line if need be, an opening mark before the first word kept, one with no
   word after it passed over; nothing but spaces and punctuation selected
   stays as it was
   (pin: reference.test › wordEdges) (pin: reference.test › a passage begun at the end of a line)
   (pin: reference.test › a passage begun on an opening mark) */
const inWord = (ch: string): boolean => /[\p{L}\p{N}’'-]/u.test(ch);
const opening = (ch: string): boolean => /[“‘«(\[]/.test(ch);
const textOf = (n: Node): string => n.textBetween(0, n.content.size, undefined, "￼");
const midWord = (t: string, i: number): boolean => i > 0 && i < t.length && inWord(t[i - 1]) && inWord(t[i]);
const opensWord = (t: string, i: number): boolean => opening(t[i]) && inWord(t[i + 1] ?? "");
const passedAtStart = (t: string, i: number): boolean => i < t.length && !inWord(t[i]) && !opensWord(t, i);
const markBefore = (t: string, i: number): boolean => i > 0 && i < t.length && opening(t[i - 1]) && inWord(t[i]);
function startIndex(t: string, i: number): number {
  while (midWord(t, i)) i--;
  while (passedAtStart(t, i)) i++;
  return markBefore(t, i) ? i - 1 : i;
}
const passedAtEnd = (ch: string): boolean => /\s/.test(ch) || opening(ch);
function endIndex(t: string, j: number): number {
  while (midWord(t, j)) j++;
  while (j > 0 && passedAtEnd(t[j - 1])) j--;
  return j;
}
function startEdge(doc: Node, a: number, b: number): number {
  for (let $a = doc.resolve(a); $a.parent.isTextblock && a < b;) {
    const t = textOf($a.parent), i = startIndex(t, $a.parentOffset);
    a = a - $a.parentOffset + i;
    if (i < t.length) break;
    const next = Selection.findFrom(doc.resolve($a.after()), 1, true);
    if (!next || next.from >= b) break;
    a = next.from;
    $a = doc.resolve(a);
  }
  return a;
}
function endEdge(doc: Node, a: number, b: number): number {
  for (let $b = doc.resolve(b); $b.parent.isTextblock && b > a;) {
    const t = textOf($b.parent), j = endIndex(t, $b.parentOffset);
    b = b - $b.parentOffset + j;
    if (j > 0) break;
    const prev = Selection.findFrom(doc.resolve($b.before()), -1, true);
    if (!prev || prev.from <= a) break;
    b = prev.from;
    $b = doc.resolve(b);
  }
  return b;
}
function wordEdges(doc: Node, from: number, to: number): [number, number] {
  const a = startEdge(doc, from, to), b = endEdge(doc, a, to);
  return a < b ? [a, b] : [from, to];
}
/* a line the selection starts or ends inside is quoted from where it
   starts to where it ends; the line's number stands
   (pin: reference.test › a passage starting or ending inside a line) */
function partOf(row: Node, pos: number, from: number, to: number): Fragment {
  if (!row.isTextblock) return row.content;
  const start = pos + 1, end = start + row.content.size;
  return row.content.cut(Math.max(from, start) - start, Math.min(to, end) - start);
}
type RowEnds = [Unit | null, Unit | null];
/* Old English verse beside its translation: the original quoted from the half
   the passage starts on to the half it ends on, the translation whole, as it
   cannot be divided by half-lines (pin: reference.test › Old English verse with
   its translation quotes the original) */
function fromTheHalf(row: Node, [first, last]: RowEnds, from: number, to: number): Node {
  const c = caesura(row.child(0)), h = halvesInked(first || last!, from, to);
  if (!c || !h) return row;
  const a = first && !h.a ? c.rest : 0, b = last && !h.b ? c.cut : row.child(0).content.size;
  return row.copy(Fragment.from([row.child(0).copy(row.child(0).content.cut(a, b)), row.child(1)]));
}
type RowAt = { node: Node; pos: number };
interface BlockRun { p: Quoting; units: Unit[]; block: Node; blockPos: number; rows: RowAt[]; paired: boolean }
function rowsAt(block: Node, blockPos: number): RowAt[] {
  const rows: RowAt[] = [];
  block.forEach((row, offset) => rows.push({ node: row, pos: blockPos + 1 + offset }));
  return rows;
}
const coveredRow = (p: Quoting, r: RowAt): boolean => drawsInk(r.node) && inkBetween(p.doc, Math.max(p.from, r.pos), Math.min(p.to, r.pos + r.node.nodeSize));
/* the run's ends widen to covered non-unit rows (a prose block's heading
   row), stepping over ink-less rows */
function widened(c: BlockRun, i: number, step: number): number {
  let end = i;
  for (let j = i + step; j >= 0 && j < c.rows.length; j += step) {
    if (!drawsInk(c.rows[j].node)) continue;
    if (!coveredRow(c.p, c.rows[j])) break;
    end = j;
  }
  return end;
}
function rowEnds(c: BlockRun, i: number): RowEnds {
  const row = c.rows[i];
  if (!c.p.byHalves || row.node.type !== N.pair) return [null, null];
  const at = (u: Unit): Unit | null => (u.pos === row.pos ? u : null);
  return [at(c.units[0]), at(c.units[c.units.length - 1])];
}
function runRow(c: BlockRun, i: number): Node | null {
  const row = c.rows[i].node;
  if (row.type === N.note || isTurn(row)) return null;
  const ends = rowEnds(c, i);
  const cut = ends[0] || ends[1] ? fromTheHalf(row, ends, c.p.from, c.p.to) : row;
  return row.copy(dropFolios(c.paired ? cut.content : partOf(row, c.rows[i].pos, c.p.from, c.p.to)));
}
/* a skipped line number goes with the quotation, or the lines after it lose its number (pin: reference.test › a passage across a skipped line number) */
const asFenceRow = (row: Node): Node => (row.type === N.gap || row.type === N.skip || drawsInk(row) ? row : N.gap.create());
/* the block's own count at the first kept row, whatever the row is: a
   direction alone as the block's last row was numbered 1 (pin:
   reference.test › a block inside a note, the label's top level, an end
   resting on a row, blanks, depth, the count before) */
function fencedRun(c: BlockRun, kept: Node[], first: number): string {
  const rows = c.paired ? kept : kept.map(asFenceRow);
  /* (pin: reference.test › a prosimetrum's sentence quotes that sentence) */
  const at = c.p.paragraphs && c.block.type === N.prose ? { start: paragraphOf(c.p.doc, c.units[0]) } : fenceAt(c.block, c.blockPos, c.rows[first].pos);
  return quoted([c.block.type.create({ ...c.block.attrs, ...at }, rows)]);
}
function lineQuote(row: Node): string {
  if (row.type === N.gap || !drawsInk(row)) return quotePrefix("");
  const line = serializeMarkdown(schema.nodes.doc.create(null, [N.paragraph.create(null, row.content)]));
  return "> " + line.replace(/\s*\n\s*/g, " ").trim();
}
/* a stanza's own count is its stanza's, so a run from inside one quotes as lines */
const quotesAsFence = (c: BlockRun): boolean => c.paired || (c.block.type === N.verse && c.block.attrs.stanza == null);
function blockPassage(p: Quoting, units: Unit[]): string {
  const blockPos = units[0].blockPos, block = p.doc.nodeAt(blockPos)!, rows = rowsAt(block, blockPos);
  const c: BlockRun = { p, units, block, blockPos, rows, paired: units.some((u) => u.node.type === N.pair) };
  const first = widened(c, rows.findIndex((r) => r.pos === units[0].pos), -1);
  const last = widened(c, rows.findIndex((r) => r.pos === units[units.length - 1].pos), 1);
  const run: Node[] = [];
  for (let i = first; i <= last; i++) {
    const row = runRow(c, i);
    if (row) run.push(row);
  }
  const kept = withoutMarginNotes(run);
  if (quotesAsFence(c)) return fencedRun(c, kept, first);
  /* quoted as lines a skipped line number has no place, and a blank would
     read as a stanza gap (pin: reference.test › a stanza's quotation leaves
     a skipped line number out) */
  return kept.filter((row) => row.type !== N.skip).map(lineQuote).join("\n");
}
/* the block numbered on both sides holding the whole selection, outside a
   note. THE TOP LEVEL ALONE: a block quoted inside an entry is that
   entry's passage (pin: reference.test › a
   block can be quoted by its translation alone only where) */
const inNote = ($x: ResolvedPos): boolean => {
  for (let d = 2; d <= $x.depth; d++) if ($x.node(d).type === N.note) return true;
  return false;
};
const oneTopBlock = ($a: ResolvedPos, $b: ResolvedPos): boolean => $a.depth >= 1 && $b.depth >= 1 && $a.before(1) === $b.before(1);
const outsideOneBlock = ($a: ResolvedPos, $b: ResolvedPos): boolean => !oneTopBlock($a, $b) || inNote($a) || inNote($b);
function facingBlockOf(doc: Node, from: number, to: number): Block | null {
  const $a = doc.resolve(from), $b = doc.resolve(to);
  if (outsideOneBlock($a, $b)) return null;
  const node = $a.node(1);
  return node.type === N.verse && node.attrs.facing != null ? { node, pos: $a.before(1) } : null;
}
/* the right column alone as one column's verse, numbered from its first
   line: each row the selection inks gives its line, cut only where the selection starts or ends inside it (pin:
   reference.test › the translation alone: every row the selection inks);
   the gaps and apparatus between kept, and a line that would read as
   apparatus alone declared a line, or the lines after it lose a number
   (pin: reference.test › the translation alone keeps its verse
   paragraphs' gaps) */
interface TranslationRun { doc: Node; from: number; to: number; units: Unit[]; rows: Node[] }
function rightWords(c: TranslationRun, row: Node, pos: number): Fragment {
  const start = pos + 1 + row.child(0).nodeSize + 1, end = start + row.child(1).content.size;
  const lo = Math.max(c.from, start), hi = Math.min(c.to, end);
  return inkBetween(c.doc, lo, hi) ? row.child(1).content.cut(lo - start, hi - start) : row.child(1).content;
}
function lineKind(c: TranslationRun, line: Node, pos: number): string | null {
  const u = c.units.find((v) => v.pos === pos);
  if (!u) return null;
  if (u.rest && c.rows.some((r) => r.type === N.line)) return "cont";
  return whollyIn(line, schema.marks.strong) || whollyIn(line, schema.marks.em) ? "line" : null;
}
function translationRow(c: TranslationRun, row: Node, pos: number): void {
  if (row.type === N.gap) {
    if (c.rows.length && c.rows[c.rows.length - 1].type !== N.gap) c.rows.push(row);
    return;
  }
  if (row.type !== N.pair || !drawsInk(row.child(1))) return;
  const line = N.line.create(null, dropFolios(rightWords(c, row, pos)));
  const kind = lineKind(c, line, pos);
  c.rows.push(kind ? N.line.create({ kind }, line.content) : line);
}
function translationPassage({ doc, from, to, lines }: Passage, block: Block): string | null {
  const units = lines({ top: true, side: "right" }).filter((u) => u.blockPos === block.pos);
  if (!units.length) return null;
  const c: TranslationRun = { doc, from, to, units, rows: [] };
  const lo = units[0].pos, hi = units[units.length - 1].pos;
  block.node.forEach((row, offset) => {
    const pos = block.pos + 1 + offset;
    if (pos >= lo && pos <= hi) translationRow(c, row, pos);
  });
  return quoted([N.verse.create({ start: units[0].line }, c.rows)]);
}
function refusalOver(p: Passage): Refusal | null {
  const { doc, from, to } = p;
  let inCode = false;
  doc.nodesBetween(from, to, (n) => { if (n.type === N.code_block) inCode = true; return !inCode; });
  if (inCode) return "code";
  const $from = doc.resolve(from);
  for (let d = $from.sharedDepth(to); d > 0; d--) if ($from.node(d).type === N.margin_note) return "margin-note";
  return spansTwoBlocks(p) ? "two-blocks" : null;
}

type Block = { node: Node; pos: number };
export type Refusal = "select" | "code" | "margin-note" | "two-blocks";
export interface Passage {
  readonly doc: Node;
  /* the words quoted: the selection widened to whole words and to the Latin a sentence stands beside */
  readonly from: number;
  readonly to: number;
  /* the block numbered on both sides holding the whole passage */
  readonly facing: Block | null;
  lines(at?: { top?: boolean; side?: Side }): Unit[];
  /* which halves of a line the passage inks; null for a line with no halves */
  halves(u: Unit): { a: boolean; b: boolean } | null;
}
function passageOver(doc: Node, from: number, to: number): Passage {
  const walks = new Map<string, Unit[]>();
  const lines = ({ top = false, side = "left" as Side } = {}): Unit[] => {
    const key = top + side;
    if (!walks.has(key)) walks.set(key, coveredUnits(doc, from, to, { topOnly: top, side }));
    return walks.get(key)!;
  };
  return { doc, from, to, facing: facingBlockOf(doc, from, to), lines, halves: (u) => halvesInked(u, from, to) };
}
/* the selection widened to the Latin a sentence stands beside, then to whole
   words: punctuation alone puts no row in (pin: pairMarks.test › punctuation
   alone puts no row in); the refusals read those words, not the selection as
   made (pin: reference.test › a passage begun at the end of one verse block's) */
export function passageAt(doc: Node, from: number, to: number): Passage | { refused: Refusal } {
  if (from >= to) return { refused: "select" };
  const p = passageOver(doc, ...wordEdges(doc, ...sentenceRange(doc, from, to)));
  const refused = refusalOver(p);
  return refused ? { refused } : p;
}
/* `paragraphs`: a prose fence that counts paragraphs; the translation
   column alone is null where the passage inks none of it */
export function quotation(p: Passage, how: { halves?: boolean; paragraphs?: boolean; column?: "both" | "translation" }): string | null {
  if (how.column === "translation") return p.facing && translationPassage(p, p.facing);
  return passageMd(p, !!how.halves, !!how.paragraphs);
}
/* what the passage's rows hold beyond the selection: a range per text, a
   note's own text left out */
export function marked(p: Passage, from: number, to: number): [number, number][] {
  const [a, b] = wholeRows(p.doc, p.from, p.to);
  const out: [number, number][] = [];
  const add = (x: number, y: number) => { if (y > x && p.doc.textBetween(x, y).trim()) out.push([x, y]); };
  p.doc.nodesBetween(a, b, (n, pos) => {
    if (n.type === N.note || n.type === N.margin_note) return false;
    if (!n.isTextblock) return true;
    const s = Math.max(pos + 1, a), e = Math.min(pos + 1 + n.content.size, b);
    add(s, Math.min(e, from));
    add(Math.max(s, to), e);
    return false;
  });
  return out;
}
