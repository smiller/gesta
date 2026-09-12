/* Copying a reference: the selection half. Which rows the selection
   covers, the line range they span, the leaf range they sit on, the
   highlight payload the link carries, and the quoted passage. Ported
   2026-09-07 from ../writer/src/js/24-copying-a-reference.js and the
   leaf-range half of 13-folios.js, re-asked of positions in a ProseMirror
   document in place of DOM ranges: "covers" is an overlap that holds ink,
   and a passage is rows or a cut of the document serialized back to
   markdown. The label itself is store/reference.ts's. */
import type { Node } from "prosemirror-model";
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
/* every verse or prose block a reference may quote from, AT ANY DEPTH
   short of a note: a citation inside a quotation is a block like any
   other. The 2026-09-12 confirmation pass: walked at the top level alone,
   a quoted pair fell to the cut arm, which cut through its cells and the
   serializer threw; a selection across two quoted fences was not refused. */
function rowBlocks(doc: Node): { node: Node; pos: number }[] {
  const out: { node: Node; pos: number }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === N.note) return false;
    if (n.type === N.verse || n.type === N.prose) { out.push({ node: n, pos }); return false; }
    return true;
  });
  return out;
}
const hasPair = (block: Node): boolean => { let yes = false; block.forEach((row) => { if (row.type === N.pair) yes = true; }); return yes; };
export function coveredUnits(doc: Node, from: number, to: number): Unit[] {
  const out: Unit[] = [];
  for (const b of rowBlocks(doc)) {
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
  for (const u of coveredUnits(doc, from, to)) {
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
/* the serializer's own quote level, so a pasted citation is spelled as
   its first save will spell it (the 2026-09-12 review: a blank line here
   was ">" and there "> ") */
const quote = (md: string): string => md.split("\n").map(quotePrefix).join("\n");
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
/* the selection widened to WHOLE pair rows: the serializer refuses a
   pair cut through a cell (the 2026-09-12 confirmation pass, a drag from
   a pair's last cell into the paragraph after it) */
function wholeRows(doc: Node, from: number, to: number): [number, number] {
  const $from = doc.resolve(from), $to = doc.resolve(to);
  let a = from, b = to;
  for (let d = $from.depth; d >= 1; d--) if ($from.node(d).type === N.pair) { a = $from.before(d); break; }
  for (let d = $to.depth; d >= 1; d--) if ($to.node(d).type === N.pair) { b = $to.after(d); break; }
  return [a, b];
}
/* the cut with its top-level quotations unwrapped: a citation cited
   again is quoted ONE level deep, as the current app's copy of the
   selected content was, carrying no ancestor of the selection's ends
   (DECIDED 2026-09-12, the confirmation pass: a quoted pair re-cited
   came out at one level, a quoted paragraph at two) */
function unquoted(cut: Node): Node {
  const blocks: Node[] = [];
  cut.forEach((b) => { if (b.type === N.blockquote) b.forEach((inner) => blocks.push(inner)); else blocks.push(b); });
  return schema.nodes.doc.create(null, blocks);
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
    return quote(serializeMarkdown(unquoted(doc.cut(a, b))).trim());
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
    /* the number is the first counted line at or after the first kept
       row — a speaker row alone still carries the block's own count */
    const firstLine = blockUnits(block, blockPos, 0).find((u) => u.line && u.pos >= rows[first].pos)?.line || 0;
    const fence = block.type.create({ ...block.attrs, start: firstLine || 1 }, kept);
    return quote(serializeMarkdown(schema.nodes.doc.create(null, [fence])).trim());
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
