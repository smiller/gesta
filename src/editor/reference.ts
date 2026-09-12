/* Copying a reference: the selection half. Which rows the selection
   covers, the line range they span, the leaf range they sit on, the
   highlight payload the link carries, and the quoted passage. Ported
   2026-09-07 from ../writer/src/js/24-copying-a-reference.js and the
   leaf-range half of 13-folios.js, re-asked of positions in a ProseMirror
   document in place of DOM ranges: "covers" is an overlap that holds ink,
   and a passage is rows or a cut of the document serialized back to
   markdown. The label itself is store/reference.ts's. */
import { Fragment, type Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { blockUnits, drawsInk, type Unit } from "./numbering.ts";
import { elideRange, referenceLabel, mdLabel, type Journal, type FolioRange } from "../store/reference.ts";
import { entryHash, type Highlight } from "../store/keys.ts";
import { quotePrefix } from "../model/grammar.ts";

const N = schema.nodes;
/* does [a, b] of the document hold ink: text that is not whitespace, or a
   picture */
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
/* the units the selection covers — an overlap holding ink, so a drag
   ending just past a row's edge does not pull that row in */
/* every verse or prose block a reference may quote from, AT ANY DEPTH:
   a citation inside a quotation is a block like any other, and so is a
   verse block inside a note (Satires 1.10 opens one inside a note inside
   its verse; stopped at the note, the 2026-09-12 second confirmation
   pass measured its rows cut and fenced three deep). The first pass:
   walked at the top level alone, a quoted pair fell to the cut arm and a
   selection across two quoted fences was not refused. */
function rowBlocks(doc: Node, topOnly = false): { node: Node; pos: number }[] {
  const out: { node: Node; pos: number }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === N.verse || n.type === N.prose) out.push({ node: n, pos });
    return !topOnly;
  });
  return out;
}
const hasPair = (block: Node): boolean => { let yes = false; block.forEach((row) => { if (row.type === N.pair) yes = true; }); return yes; };
export function coveredUnits(doc: Node, from: number, to: number, topOnly = false): Unit[] {
  const out: Unit[] = [];
  for (const b of rowBlocks(doc, topOnly)) {
    if (b.pos + b.node.nodeSize <= from || b.pos >= to) continue;
    for (const u of blockUnits(b.node, b.pos, 0)) {
      if (inkBetween(doc, Math.max(from, u.pos), Math.min(to, u.pos + u.node.nodeSize))) out.push(u);
    }
  }
  return out;
}
/* the line range, "" when no numbered unit is covered — a selection
   opening on a speaker label takes the line under it */
export function referenceRange(doc: Node, from: number, to: number): string {
  let lo = 0, hi = 0;
  /* THE TOP LEVEL ALONE: the label locates the passage in the entry the
     gutter numbers; a pasted citation's own fence numbers are not the
     host's (the 2026-09-12 second confirmation pass: a quoted Horace pair
     in Paradise Lost labelled the reference "1.13-14") */
  for (const u of coveredUnits(doc, from, to, true)) {
    if (!u.line) continue;
    if (!lo || u.line < lo) lo = u.line;
    if (u.line > hi) hi = u.line;
  }
  return lo ? elideRange(lo, hi) : "";
}
/* TWO BLOCKS IS A REFUSAL: every block numbers from 1 */
export function spansTwoBlocks(doc: Node, from: number, to: number): boolean {
  const blocks = new Set(coveredUnits(doc, from, to).map((u) => u.blockPos));
  return blocks.size > 1;
}
/* the leaves that are THE TEXT'S — a folio inside a note turns no page */
export function folioLeaves(doc: Node): { pos: number; label: string }[] {
  const out: { pos: number; label: string }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === N.note) return false;
    if (n.type === N.folio) out.push({ pos, label: String(n.attrs.label) });
    return true;
  });
  return out;
}
/* the leaf the selection STARTS on, read from the page it is on rather
   than any marker inside it: the last leaf at or before the start, or the
   next one when nothing but whitespace stands between; and the last leaf
   the selection reaches ink past */
export function folioRange(doc: Node, from: number, to: number): FolioRange | null {
  const leaves = folioLeaves(doc);
  let at: { pos: number; label: string } | null = null;
  for (const leaf of leaves) {
    if (from >= leaf.pos) { at = leaf; continue; }
    if (to <= leaf.pos) break;
    if (inkBetween(doc, from, leaf.pos)) break;
    at = leaf;
  }
  if (!at) return null;
  let through: { pos: number; label: string } | null = null;
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    if (to <= leaf.pos) continue;
    if (inkBetween(doc, Math.max(from, leaf.pos), to)) { through = leaf; break; }
  }
  return { from: at.label, to: (through || at).label };
}
/* the "?h=…&n=…" payload: the selected text, and which occurrence of it
   the selection is, counted as a literal substring */
export function selectionLink(doc: Node, from: number, to: number): Highlight | null {
  const q = doc.textBetween(from, to, " ", " ").replace(/\s+/g, " ").trim();
  if (!q) return null;
  const before = doc.textBetween(0, from, " ", " ").replace(/\s+/g, " ");
  let nth = 0, i = -1;
  while ((i = before.indexOf(q, i + 1)) !== -1) nth++;
  return { q, nth };
}
/* THE PASSAGE IS A QUOTATION NODE and the serializer spells it: the
   quote body's own grammar — a fence's lines under the prefix, a blank
   line only where a paragraph break stands between two text lines, no
   blank beside a fence or another block — is the serializer's, asked
   once. A textual filter over serialized lines stood here for a day
   (2026-09-12) and misread a note's fence lines inside a verse block, a
   refused `:::` paragraph and a gap at a fence's edge (the block's
   closing review). Consecutive paragraphs become one quote-body
   paragraph with the double break a blank line is there. */
function quoted(blocks: Node[]): string {
  const body: Node[] = [];
  for (const b of blocks) {
    const last = body[body.length - 1];
    if (b.type === N.paragraph && last && last.type === N.paragraph) {
      body[body.length - 1] = last.copy(last.content.append(Fragment.from([N.hard_break.create(), N.hard_break.create()])).append(b.content));
    } else body.push(b);
  }
  return serializeMarkdown(schema.nodes.doc.create(null, [N.blockquote.create(null, body)])).trim();
}
/* does the selection reach ink the row arms cannot carry — loose prose,
   a pipe-less prose fence, anything outside a verse block or a paired
   prose block, at whatever depth the block stands */
export function coversProse(doc: Node, from: number, to: number): boolean {
  let at = from;
  for (const b of rowBlocks(doc)) {
    if (b.node.type === N.prose && !hasPair(b.node)) continue;
    const end = b.pos + b.node.nodeSize;
    if (end <= from) continue;
    if (b.pos >= to) break;
    if (inkBetween(doc, at, Math.min(b.pos, to))) return true;
    at = Math.max(at, end);
  }
  return inkBetween(doc, at, to);
}
/* the selection's ends moved off a pair's cells: out to the whole row
   where the selection covers ink in it, off the row where it does not
   (a citation quotes rows, never a cell; a drag from a pair's last cell
   into the paragraph after it cut a cell out until 2026-09-12, and an
   end merely resting at a row's edge widened to the whole row the
   reader never selected — the two confirmation passes) */
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
/* the cut with the containers around THE WHOLE of it unwrapped: a
   citation cited again is quoted ONE level deep, as the current app's
   copy of the selected content was, carrying no container that holds
   the whole selection — however many quotations, notes or cards deep it
   stood (DECIDED 2026-09-12, the confirmation passes: a quoted pair
   re-cited came out at one level, a quoted paragraph at two, one under
   `> >` at two). A container holding only ONE END stays: a drag from a
   citation into the line after it keeps the pair quoted beside the line
   that was not, as the source had them (asked 2026-09-12 by hand, after
   a version flattened it; INFERRED from the current app's copy, which
   clones a partly selected ancestor). A quote body's blank line is a
   break at a paragraph's edge, which the block join spells again once
   lifted, so an edge break comes off — inside a retained container as
   well (the block's closing review: a retained quotation carried its
   edge blank into the nested box); a lifted block with no ink is
   nothing to quote. */
const CONTAINERS = new Set(["blockquote", "note", "card"]);
function trimEdges(b: Node): Node {
  if (CONTAINERS.has(b.type.name)) { const inner: Node[] = []; b.forEach((c) => inner.push(trimEdges(c))); return b.copy(Fragment.from(inner)); }
  if (b.type !== N.paragraph) return b;
  let c = b.content;
  if (c.firstChild?.type === N.hard_break) c = c.cut(c.firstChild.nodeSize);
  if (c.lastChild?.type === N.hard_break) c = c.cut(0, c.size - c.lastChild.nodeSize);
  return b.copy(c);
}
function unquoted(cut: Node): Node[] {
  let n = cut;
  while (n.childCount === 1 && CONTAINERS.has(n.firstChild!.type.name)) n = schema.nodes.doc.create(null, n.firstChild!.content);
  const blocks: Node[] = [];
  n.forEach((b) => blocks.push(b));
  return blocks.map(trimEdges).filter((b) => b.type === N.gap || drawsInk(b));
}
/* the cut's first block renumbered where the cut opened INSIDE a row
   block: a fence keeps its block's start through a cut, and a passage
   dragged from row 15 into the paragraph after the fence numbered it
   13 (the block's closing review, a defect measured and left by the
   pass before it). The number is the block's count at the row the cut
   opens on, as the row arm's is; a retained container is entered to
   reach the fence. */
function renumbered(doc: Node, at: number, blocks: Node[]): Node[] {
  const $at = doc.resolve(at);
  for (let d = $at.depth; d >= 1; d--) {
    const block = $at.node(d);
    if (block.type !== N.verse && block.type !== N.prose) continue;
    const blockPos = $at.before(d), rowPos = $at.depth > d ? $at.before(d + 1) : at;
    let start = block.attrs.start as number;
    for (const u of blockUnits(block, blockPos, 0)) { if (u.pos >= rowPos) break; if (u.line) start = u.line + 1; }
    const fix = (b: Node): Node => {
      if (b.type === N.verse || b.type === N.prose) return b.type.create({ ...b.attrs, start }, b.content);
      if (CONTAINERS.has(b.type.name) && b.firstChild) return b.copy(Fragment.from([fix(b.firstChild), ...b.content.content.slice(1)]));
      return b;
    };
    return blocks.length ? [fix(blocks[0]), ...blocks.slice(1)] : blocks;
  }
  return blocks;
}
/* THE QUOTED PASSAGE IS A QUOTATION: single-column verse or prose quotes
   with "> " markers; a DUAL-LANGUAGE block copies as its own fence,
   numbered from its first quoted line, keeping the two columns — INSIDE
   the quotation, DECIDED 2026-09-12 (the current app pasted the fence
   bare, and beside a single-column citation it read as the entry's own
   verse). In a row block the ROW is the unit and whole rows are quoted,
   the contiguous run carrying the stanza gaps between them; a nested
   note stays behind and a page-turn row is dropped. In loose prose the
   unit is the selection, widened to whole pair rows. */
export function passageMd(doc: Node, from: number, to: number): string {
  let units = coveredUnits(doc, from, to);
  if (units.length && coversProse(doc, from, to)) units = [];
  if (!units.length) {
    const [a, b] = wholeRows(doc, from, to);
    return quoted(renumbered(doc, a, unquoted(doc.cut(a, b))));
  }
  const blockPos = units[0].blockPos, block = doc.nodeAt(blockPos)!;
  const paired = units.some((u) => u.node.type === N.pair);
  const rows: { node: Node; pos: number }[] = [];
  block.forEach((row, offset) => rows.push({ node: row, pos: blockPos + 1 + offset }));
  let first = rows.findIndex((r) => r.pos === units[0].pos);
  let last = rows.findIndex((r) => r.pos === units[units.length - 1].pos);
  /* the run's ends widen to covered non-unit rows (a prose block's heading
     row), stepping over ink-less rows */
  const covered = (r: { node: Node; pos: number }) => drawsInk(r.node) && inkBetween(doc, Math.max(from, r.pos), Math.min(to, r.pos + r.node.nodeSize));
  const widened = (i: number, step: number): number => {
    let end = i;
    for (let j = i + step; j >= 0 && j < rows.length; j += step) {
      if (!drawsInk(rows[j].node)) continue;
      if (!covered(rows[j])) break;
      end = j;
    }
    return end;
  };
  first = widened(first, -1);
  last = widened(last, 1);
  const kept: Node[] = [];
  for (let i = first; i <= last; i++) {
    const row = rows[i].node;
    if (row.type === N.note) continue;
    let turn = false;
    if (!drawsInk(row)) row.descendants((n) => { if (n.type === N.folio) turn = true; return !turn; });
    if (turn) continue;
    kept.push(row);
  }
  if (paired) {
    /* the number is the block's own count at the first kept row: one
       past the last counted line before it, whatever the row is (a
       direction alone as the block's last row numbered 1 — the
       2026-09-12 second confirmation pass) */
    let firstLine = block.attrs.start as number;
    for (const u of blockUnits(block, blockPos, 0)) { if (u.pos >= rows[first].pos) break; if (u.line) firstLine = u.line + 1; }
    const fence = block.type.create({ ...block.attrs, start: firstLine }, kept);
    return quoted([fence]);
  }
  return kept.map((row) => {
    if (row.type === N.gap || !drawsInk(row)) return quotePrefix("");
    const line = serializeMarkdown(schema.nodes.doc.create(null, [N.paragraph.create(null, row.content)]));
    return "> " + line.replace(/\s*\n\s*/g, " ").trim();
  }).join("\n");
}
/* the entry's hash as a markdown link TARGET: a paren in a tag would close
   the (url) early on paste */
export function entryLinkUrl(date: string, tag: string | null, hl?: Highlight | null): string {
  return entryHash(date, tag, hl || undefined).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
export type Refusal = "select" | "code" | "two-blocks";
export const REFUSAL_TEXT: Record<Refusal, string> = {
  select: "Select a passage to reference first",
  code: "A code block can't be referenced",
  "two-blocks": "That spans two verse blocks — reference them one at a time",
};
/* the whole clipboard text: the heading line as the link, a colon outside
   it, the passage quoted under it — or the refusal */
/* the *italics* of a citation label as HTML, for the rich flavour: the
   label is BUILT here, so its only markdown is the emphasis this puts
   back; the anchor is spelled once for the reference and the entry link */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function citationAnchorHTML(url: string, label: string): string {
  return '<a href="' + escapeHtml(url) + '">' + escapeHtml(label).replace(/\*([^*]+)\*/g, "<em>$1</em>") + "</a>";
}
export interface Payload { text: string; label: string; url: string; passage: string }
export function referencePayload(state: EditorState, date: string, tag: string | null, journal: Journal): Payload | { refused: Refusal } {
  const { from, to, empty } = state.selection;
  if (empty) return { refused: "select" };
  const doc = state.doc;
  let inCode = false;
  doc.nodesBetween(from, to, (n) => { if (n.type === N.code_block) inCode = true; return !inCode; });
  if (inCode) return { refused: "code" };
  if (spansTwoBlocks(doc, from, to)) return { refused: "two-blocks" };
  const hl = selectionLink(doc, from, to);
  if (!hl) return { refused: "select" };
  const label = referenceLabel(date, tag, referenceRange(doc, from, to), folioRange(doc, from, to), journal);
  const url = entryLinkUrl(date, tag, hl);
  const passage = passageMd(doc, from, to);
  return { text: "[" + mdLabel(label, label) + "](" + url + "):\n\n" + passage, label, url, passage };
}
/* ⌃⌘C: a link to the entry — the citation's heading line with nothing
   quoted under it, named the same way */
export function entryLinkParts(date: string, tag: string | null, journal: Journal): { label: string; url: string } {
  return { label: mdLabel(referenceLabel(date, tag, "", null, journal), "entry"), url: entryLinkUrl(date, tag) };
}
export function entryLink(date: string, tag: string | null, journal: Journal): string {
  const p = entryLinkParts(date, tag, journal);
  return "[" + p.label + "](" + p.url + ")";
}
