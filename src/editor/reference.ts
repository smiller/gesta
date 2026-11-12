import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { blockUnits, paragraphAt, hasFacing, type Unit, type Side } from "./numbering.ts";
import { elideRange, referenceLabel, mdLabel, refersByHalfLine, refersAsProsimetrum, refersByBookChapterParagraph, type Journal, type FolioRange } from "../store/reference.ts";
import { entryHash, type Highlight } from "../store/keys.ts";
import { passageAt, quotation, inkBetween, type Passage, type Refusal as PassageRefusal } from "./passage.ts";

const N = schema.nodes;
/* a lettered line says its label at the end of a run it stands at (pin:
   reference.test › a lettered line) */
const bracketed = (u: Unit): boolean => !!u.label?.startsWith("[");
const pairedLabels = (lo: Unit, hi: Unit): boolean => lo.line === hi.line || bracketed(lo) || bracketed(hi);
function labelledRange(lo: Unit, hi: Unit, range: string): string {
  if (lo.label === hi.label) return lo.label!;
  if (pairedLabels(lo, hi)) return (lo.label ?? lo.line) + "-" + (hi.label ?? hi.line);
  const [x, y] = range.split("-");
  return (lo.label ?? x) + "-" + y + (hi.label ? hi.label.slice(-1) : "");
}
interface Ends { lo: Unit; hi: Unit }
const laterLine = (u: Unit, hi: Unit): boolean => u.line > hi.line || (u.line === hi.line && !!u.label);
function lineEnds(units: Unit[]): Ends | null {
  const lines = units.filter((u) => u.line);
  if (!lines.length) return null;
  return { lo: lines.reduce((lo, u) => (u.line < lo.line ? u : lo)), hi: lines.reduce((hi, u) => (laterLine(u, hi) ? u : hi)) };
}
const oneHalf = (h: { a: boolean; b: boolean } | null): string => (h && h.a !== h.b ? (h.a ? "a" : "b") : "");
function halfRange(range: string, e: Ends, p: Passage): string {
  const first = p.halves(e.lo), last = p.halves(e.hi);
  if (e.lo === e.hi) return range + oneHalf(first);
  const [x, y] = range.split("-");
  return x + (first && !first.a ? "b" : "") + "-" + y + (last && !last.b ? "a" : "");
}
/* with `halves`, Old English verse's: a run starting on a line's second half
   or ending on its first says so, 50b-52, 49-50a, a half alone 50a (pin:
   reference.test › Old English verse refers to a half-line) */
function referenceRange(p: Passage, { halves = false, side = "left" as Side } = {}): string {
  /* THE TOP LEVEL ALONE: a pasted reference's own fence numbers are not the
     host's — a quoted Horace pair in Paradise Lost labelled the reference
     "1.13-14" (pin: reference.test › a block inside a note, the label's top
     level) */
  const e = lineEnds(p.lines({ top: true, side }));
  if (!e) return "";
  const range = elideRange(e.lo.line, e.hi.line);
  if (e.lo.label || e.hi.label) return labelledRange(e.lo, e.hi, range);
  return halves ? halfRange(range, e, p) : range;
}
const stanzaOf = (doc: Node, u: Unit): number | null => doc.nodeAt(u.blockPos)!.attrs.stanza ?? null;
const lastLineOf = (doc: Node, u: Unit): number => Math.max(0, ...blockUnits(doc.nodeAt(u.blockPos)!, u.blockPos, 0).map((v) => v.line));
interface StanzaEnd { stanza: number; line: number }
function stanzaLabel(a: StanzaEnd, b: StanzaEnd, whole: boolean): string {
  if (a.stanza === b.stanza) return whole ? String(a.stanza) : a.stanza + "." + elideRange(a.line, b.line);
  return whole ? a.stanza + "–" + b.stanza : a.stanza + "." + a.line + "–" + b.stanza + "." + b.line;
}
function stanzaRange({ doc, lines: walk }: Passage): string {
  const lines = walk({ top: true }).filter((u) => u.line);
  if (!lines.length || lines.some((u) => stanzaOf(doc, u) === null)) return "";
  const a = lines[0], b = lines[lines.length - 1];
  const whole = a.line === 1 && b.line === lastLineOf(doc, b);
  return stanzaLabel({ stanza: stanzaOf(doc, a)!, line: a.line }, { stanza: stanzaOf(doc, b)!, line: b.line }, whole);
}
/* a prosimetrum's chapter: its prose by paragraph, a poem by its lines, and
   by its place among the chapter's poems where there is more than one (pin:
   reference.test › a prosimetrum chapter with two poems) */
function prosimetrumRange(p: Passage): string {
  const { doc } = p, range = referenceRange(p);
  const lines = p.lines({ top: true }).filter((u) => u.line);
  const first = lines[0];
  if (!range || !first) return "";
  if (doc.nodeAt(first.blockPos)!.type === N.prose) return "prose, " + paragraphRange(doc, lines);
  const poems: number[] = [];
  doc.forEach((n, pos) => { if (n.type === N.verse) poems.push(pos); });
  return "verse " + (poems.length > 1 ? poems.indexOf(first.blockPos) + 1 + "." : "") + range;
}
function paragraphIn(doc: Node, from: number, lines: Unit[]): string {
  if (lines[0]) return paragraphRange(doc, lines);
  const $from = doc.resolve(from);
  if ($from.depth < 2 || $from.node(1).type !== N.prose) return "";
  return "para " + paragraphAt($from.node(1), $from.before(1), $from.before(2));
}
function chapterSpan(doc: Node, from: number, to: number): string | null {
  const a = chapterAt(doc, from), b = chapterAt(doc, to);
  if (!a) return null;
  return a === b || !b ? "chapter " + a : "chapters " + a + "-" + b;
}
/* (pin: reference.test › a work by book, chapter, and paragraph refers) (pin:
   reference.test › by book, chapter, and paragraph: text under a chapter) */
function byBookChapterParagraphRange(p: Passage): string {
  const { doc, from, to } = p, lines = p.lines({ top: true }).filter((u) => u.line);
  if (lines[0] && doc.nodeAt(lines[0].blockPos)!.type !== N.prose) return referenceRange(p);
  const para = paragraphIn(doc, from, lines), chapter = chapterSpan(doc, from, to);
  if (!chapter) return para;
  return para ? chapter + " (" + para + ")" : chapter;
}
/* the last `##` at or above the position that names a chapter: one naming none leaves it standing */
const isChapterHeading = (n: Node): boolean => n.type === N.heading && n.attrs.level === 2;
function chapterAt(doc: Node, at: number): string | null {
  let found: string | null = null;
  doc.forEach((n, pos) => {
    if (pos < at && isChapterHeading(n)) found = /^Chapter\s+(\d+|[IVXLCDM]+)\b/i.exec(n.textContent)?.[1] ?? found;
  });
  return found;
}
function paragraphRange(doc: Node, lines: Unit[]): string {
  const a = paragraphOf(doc, lines[0]), b = paragraphOf(doc, lines[lines.length - 1]);
  return a === b ? "para " + a : "paras " + elideRange(a, b);
}
const paragraphOf = (doc: Node, u: Unit): number => paragraphAt(doc.nodeAt(u.blockPos)!, u.blockPos, u.pos);
export function folioLeaves(doc: Node): { pos: number; label: string }[] {
  const out: { pos: number; label: string }[] = [];
  doc.descendants((n, pos) => {
    if (n.type === N.note || n.type === N.margin_note) return false;
    if (n.type === N.folio) out.push({ pos, label: String(n.attrs.label) });
    return true;
  });
  return out;
}
type Leaf = { pos: number; label: string };
function startLeaf(doc: Node, leaves: Leaf[], from: number, to: number): Leaf | null {
  let at: Leaf | null = null;
  for (const leaf of leaves) {
    if (from >= leaf.pos) { at = leaf; continue; }
    if (to <= leaf.pos || inkBetween(doc, from, leaf.pos)) break;
    at = leaf;
  }
  return at;
}
function throughLeaf(doc: Node, leaves: Leaf[], from: number, to: number): Leaf | null {
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    if (to > leaf.pos && inkBetween(doc, Math.max(from, leaf.pos), to)) return leaf;
  }
  return null;
}
/* the leaf the selection STARTS on, read from the page it is on rather
   than any marker inside it: the last leaf at or before the start, or the
   next one when nothing but whitespace stands between; and the last leaf
   the selection reaches ink past */
function folioRange({ doc, from, to }: Passage): FolioRange | null {
  const leaves = folioLeaves(doc), at = startLeaf(doc, leaves, from, to);
  if (!at) return null;
  return { from: at.label, to: (throughLeaf(doc, leaves, from, to) || at).label };
}
/* counted as a literal substring (pin: reference.test › selectionLink) */
export function selectionLink(doc: Node, from: number, to: number): Highlight | null {
  const q = doc.textBetween(from, to, " ", " ").replace(/\s+/g, " ").trim();
  if (!q) return null;
  const before = doc.textBetween(0, from, " ", " ").replace(/\s+/g, " ");
  let nth = 0, i = -1;
  while ((i = before.indexOf(q, i + 1)) !== -1) nth++;
  return { q, nth };
}
/* (pin: reference.test › Ref (all) is offered) */
export function offersBoth(state: EditorState): boolean {
  const p = passageAt(state.doc, state.selection.from, state.selection.to);
  return !("refused" in p) && !!p.facing;
}
/* the entry's hash as a markdown link TARGET: a paren in a tag would close
   the (url) early on paste */
export function entryLinkUrl(date: string, tag: string | null, hl?: Highlight | null): string {
  return entryHash(date, tag, hl || undefined).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
export type Refusal = PassageRefusal | "no-translation";
export const REFUSAL_TEXT: Record<Refusal, string> = {
  select: "Select a passage to reference first",
  code: "A code block can't be referenced",
  "margin-note": "A margin-note can't be referenced — select the text beside it",
  "two-blocks": "That spans two verse blocks — reference them one at a time",
  "no-translation": "No translation lines selected — Ref (all) quotes the Latin too",
};
/* the whole clipboard text: the heading line as the link, a colon outside
   it, the passage quoted under it — or the refusal */
/* the label is BUILT here, so its only markdown is the emphasis this puts
   back (pin: reference.test › referenceAnchorHTML) */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function referenceAnchorHTML(url: string, label: string): string {
  return '<a href="' + escapeHtml(url) + '">' + escapeHtml(label).replace(/\*([^*]+)\*/g, "<em>$1</em>") + "</a>";
}
export interface Payload { text: string; label: string; url: string; passage: string }
export interface EntryAt { date: string; tag: string | null }
/* `all`: a block numbered on both sides quoted with both its columns */
export function referencePayload(state: EditorState, at: EntryAt, journal: Journal, all = false): Payload | { refused: Refusal } {
  const p = passageAt(state.doc, state.selection.from, state.selection.to);
  return "refused" in p ? p : payloadOver(p, at, journal, all);
}
/* a passage in stanza fences refers by stanza, in any work (pin: reference.test › a work in stanza fences refers by stanza) */
function rangeOver(p: Passage, at: EntryAt, journal: Journal, halves: boolean): string {
  if (refersByBookChapterParagraph(at.date, at.tag, journal)) return byBookChapterParagraphRange(p);
  if (refersAsProsimetrum(at.date, at.tag, journal)) return prosimetrumRange(p);
  return stanzaRange(p) || referenceRange(p, { halves });
}
const facingRange = (p: Passage): string => (hasFacing(p.doc) ? referenceRange(p, { side: "right" }) : "");
/* a passage in a block numbered on both sides is quoted by its translation
   column alone, unless both columns were asked for */
function quotedFor(p: Passage, all: boolean, how: { halves: boolean; paragraphs: boolean }): { passage: string } | { refused: Refusal } {
  if (all || !p.facing) return { passage: quotation(p, how)! };
  const alone = quotation(p, { column: "translation" });
  return alone ? { passage: alone } : { refused: "no-translation" };
}
function payloadOver(p: Passage, at: EntryAt, journal: Journal, all: boolean): Payload | { refused: Refusal } {
  const hl = selectionLink(p.doc, p.from, p.to);
  if (!hl) return { refused: "select" };
  const halves = refersByHalfLine(at.date, at.tag, journal);
  const paragraphs = refersByBookChapterParagraph(at.date, at.tag, journal) || refersAsProsimetrum(at.date, at.tag, journal);
  const quoted = quotedFor(p, all, { halves, paragraphs });
  if ("refused" in quoted) return quoted;
  const label = referenceLabel(at.date, at.tag, { range: rangeOver(p, at, journal, halves), folio: folioRange(p), facing: facingRange(p) }, journal);
  const url = entryLinkUrl(at.date, at.tag, hl);
  return { text: "[" + mdLabel(label, label) + "](" + url + "):\n\n" + quoted.passage, label, url, passage: quoted.passage };
}
export function entryLinkParts(date: string, tag: string | null, journal: Journal): { label: string; url: string } {
  return { label: mdLabel(referenceLabel(date, tag, { range: "" }, journal), "entry"), url: entryLinkUrl(date, tag) };
}
