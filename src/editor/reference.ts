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
import { lineUnits, drawsInk, rowKind, type Unit } from "./numbering.ts";
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
export function coveredUnits(doc: Node, from: number, to: number): Unit[] {
  return lineUnits(doc, 0).filter((u) => {
    const a = Math.max(from, u.pos), b = Math.min(to, u.pos + u.node.nodeSize);
    return inkBetween(doc, a, b);
  });
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
/* the verse or prose block holding BOTH ends of the selection below the
   top level — a paired citation inside a quotation: the units walk numbers
   top-level blocks alone, and the loose-prose arm cut ONE cell out of a
   pair, which the serializer refused (the 2026-09-12 review) */
function quotedRowBlock(doc: Node, from: number, to: number): { node: Node; pos: number } | null {
  const $from = doc.resolve(from), $to = doc.resolve(to);
  for (let d = Math.min($from.depth, $to.depth); d >= 2; d--) {
    const node = $from.node(d);
    if (node !== $to.node(d)) continue;
    if (node.type === N.verse || node.type === N.prose) return { node, pos: $from.before(d) };
  }
  return null;
}
/* does the selection reach a top-level block the row arms cannot carry —
   loose prose, and a pipe-less prose fence with it */
export function coversProse(doc: Node, from: number, to: number): boolean {
  let yes = false;
  doc.forEach((block, pos) => {
    if (yes || block.type === N.verse) return;
    if (block.type === N.prose) {
      let pair = false;
      block.forEach((row) => { if (row.type === N.pair) pair = true; });
      if (pair) return;
    }
    if (inkBetween(doc, Math.max(from, pos), Math.min(to, pos + block.nodeSize))) yes = true;
  });
  return yes;
}
/* THE QUOTED PASSAGE IS A QUOTATION: single-column verse or prose quotes
   with "> " markers; a DUAL-LANGUAGE block copies as its own fence,
   numbered from its first quoted line, keeping the two columns — INSIDE
   the quotation, DECIDED 2026-09-12 (the current app pasted the fence
   bare, and beside a single-column citation it read as the entry's own
   verse). In a row block the ROW is the unit and whole rows are quoted,
   the contiguous run carrying the stanza gaps between them; a nested
   note stays behind and a page-turn row is dropped. A row block inside
   a quotation — a citation referenced again — is walked the same way.
   In loose prose the unit is the selection. */
export function passageMd(doc: Node, from: number, to: number): string {
  let units = coveredUnits(doc, from, to);
  if (units.length && coversProse(doc, from, to)) units = [];
  let block: Node, blockPos: number;
  if (units.length) { blockPos = units[0].blockPos; block = doc.nodeAt(blockPos)!; }
  else {
    const quoted = quotedRowBlock(doc, from, to);
    if (!quoted) return quote(serializeMarkdown(doc.cut(from, to)).trim());
    block = quoted.node; blockPos = quoted.pos;
  }
  const prose = block.type === N.prose;
  const rows: { node: Node; pos: number }[] = [];
  block.forEach((row, offset) => rows.push({ node: row, pos: blockPos + 1 + offset }));
  /* the run is the covered inked rows, first to last, whatever they are
     (a prose block's heading row rides along), stepping over ink-less
     rows between them; the number is the first line among them */
  const covered = (r: { node: Node; pos: number }) => drawsInk(r.node) && inkBetween(doc, Math.max(from, r.pos), Math.min(to, r.pos + r.node.nodeSize));
  const first = rows.findIndex(covered);
  let last = first;
  for (let i = first + 1; i < rows.length; i++) if (covered(rows[i])) last = i;
  const kept: Node[] = [];
  let line = (block.attrs.start as number) - 1, firstLine = 0;
  for (let i = 0; i <= last; i++) {
    const row = rows[i].node;
    const counts = row.type !== N.gap && row.type !== N.note && drawsInk(row) && (prose ? row.type === N.pair : rowKind(row) === "line");
    if (counts) line++;
    if (i < first) continue;
    if (counts && !firstLine) firstLine = line;
    if (row.type === N.note) continue;
    let turn = false;
    if (!drawsInk(row)) row.descendants((n) => { if (n.type === N.folio) turn = true; return !turn; });
    if (turn) continue;
    kept.push(row);
  }
  if (kept.some((row) => row.type === N.pair)) {
    const fence = block.type.create({ ...block.attrs, start: firstLine > 1 ? firstLine : 1 }, kept);
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
