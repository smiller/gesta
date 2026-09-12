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
import { lineUnits, drawsInk, type Unit } from "./numbering.ts";
import { elideRange, referenceLabel, mdLabel, type Journal, type FolioRange } from "../store/reference.ts";
import { entryHash, type Highlight } from "../store/keys.ts";

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
const quote = (md: string): string => md.split("\n").map((l) => l.trim() ? "> " + l : ">").join("\n");
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
   the quotation since 2026-09-12. The current app pasted the fence bare,
   and on a journal page that read as the entry's own verse and raised the
   Line numbering row (the gutter counts top-level verse alone); asked
   that day, a citation is a quotation whether or not it is paired, and a
   quoted fence draws no gutter numbers. In a row block the ROW is the
   unit and whole rows are quoted, the contiguous run carrying the stanza
   gaps between them; a nested note stays behind and a page-turn row is
   dropped. In loose prose the unit is the selection. */
export function passageMd(doc: Node, from: number, to: number): string {
  let units = coveredUnits(doc, from, to);
  if (units.length && coversProse(doc, from, to)) units = [];
  if (!units.length) return quote(serializeMarkdown(doc.cut(from, to)).trim());
  const block = doc.nodeAt(units[0].blockPos)!, blockPos = units[0].blockPos;
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
    const firstLine = units.find((u) => u.line)?.line || 0;
    const fence = block.type.create({ ...block.attrs, start: firstLine > 1 ? firstLine : 1 }, kept);
    return quote(serializeMarkdown(schema.nodes.doc.create(null, [fence])).trim());
  }
  return kept.map((row) => {
    if (row.type === N.gap || !drawsInk(row)) return ">";
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
