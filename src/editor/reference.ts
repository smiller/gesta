import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { schema } from "../model/schema.ts";
import { isStephanus } from "../model/stephanus.ts";
import { blockUnits, paragraphAt, paragraphOf, hasFacing, type Unit, type Side } from "./numbering.ts";
import { elideRange, referenceLabel, mdLabel, type Journal, type PageRange, type Place } from "../store/reference.ts";
import { conventionsOf, type Conventions } from "../store/conventions.ts";
import { entryHash, type Highlight } from "../store/keys.ts";
import { passageAt, quotation, inkBetween, type Passage, type Refusal } from "./passage.ts";
import { pages, type Page } from "./pages.ts";

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
/* a poem's name is its first numbered line, a direction or a gap before it
   passed over; the original where it is paired; a closing comma, semicolon
   or colon dropped, and an opening « or “ the line never closes. A ‘ is
   kept: its closing ’ is also the apostrophe, so whether it closes cannot
   be read */
function firstLine(poem: Node, pos: number): string {
  const row = blockUnits(poem, pos, 0, "left").find((u) => u.line > 0)?.node;
  const text = (row ? (row.type === N.pair ? row.child(0) : row).textContent : "").trim().replace(/[,;:]$/, "");
  return /^«[^»]*$|^“[^”]*$/.test(text) ? text.slice(1) : text;
}
const placed = (kind: Place["kind"], text: string): Place | null => (text ? { kind, text } : null);
/* a prosimetrum's chapter: its prose by paragraph alone, a poem by its first
   line and its lines (pin: reference.test › a prosimetrum chapter with two
   poems) */
function prosimetrumRange(p: Passage): Place | null {
  const { doc } = p, range = referenceRange(p);
  const lines = p.lines({ top: true }).filter((u) => u.line);
  const first = lines[0];
  if (!range || !first) return null;
  const block = doc.nodeAt(first.blockPos)!;
  return block.type === N.prose ? placed("paragraphs", paragraphRange(doc, lines)) : placed("words", firstLine(block, first.blockPos) + ", " + range);
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
function byBookChapterParagraphRange(p: Passage): Place | null {
  const { doc, from, to } = p, lines = p.lines({ top: true }).filter((u) => u.line);
  if (lines[0] && doc.nodeAt(lines[0].blockPos)!.type !== N.prose) return placed("numbers", referenceRange(p));
  const para = paragraphIn(doc, from, lines), chapter = chapterSpan(doc, from, to);
  if (!chapter) return placed("paragraphs", para);
  return placed("words", para ? chapter + " (" + para + ")" : chapter);
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
function startPage(doc: Node, pageList: Page[], from: number, to: number): Page | null {
  let at: Page | null = null;
  for (const page of pageList) {
    if (from >= page.pos) { at = page; continue; }
    if (to <= page.pos || inkBetween(doc, from, page.pos)) break;
    at = page;
  }
  return at;
}
function throughPage(doc: Node, pageList: Page[], from: number, to: number): Page | null {
  for (let i = pageList.length - 1; i >= 0; i--) {
    const page = pageList[i];
    if (to > page.pos && inkBetween(doc, Math.max(from, page.pos), to)) return page;
  }
  return null;
}
/* the page the selection STARTS on, read from where it stands rather
   than any label inside it: the last page at or before the start, or the
   next one when nothing but whitespace stands between; and the last page
   the selection reaches ink past */
function pageRange({ doc, from, to }: Pick<Passage, "doc" | "from" | "to">): PageRange | null {
  const pageList = pages(doc), at = startPage(doc, pageList, from, to);
  if (!at) return null;
  return { from: at.label, to: (throughPage(doc, pageList, from, to) || at).label };
}
/* THE STEPHANUS NUMBERS ARE READ OVER THE ROWS the reference quotes, whole
   and in both columns: read over the words selected, the translation of a
   row opening in one passage was named by the next (pin: reference.test › a
   reference is named by the passages its rows run through) */
function stephanusOver(p: Passage): PageRange | null {
  const rows = p.lines();
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const range = pageRange({ doc: p.doc, from: Math.min(p.from, rows[0].pos), to: Math.max(p.to, last.pos + last.node.nodeSize) });
  return range && isStephanus(range.from) ? range : null;
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
/* the entry's hash as a markdown link TARGET: a paren in a tag would close
   the (url) early on paste */
export function entryLinkUrl(date: string, tag: string | null, hl?: Highlight | null): string {
  return entryHash(date, tag, hl || undefined).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
export type { Refusal };
export const REFUSAL_ALERT: Record<Refusal, "refSelect" | "refCode" | "refMarginNote" | "refTwoBlocks" | "refNumberedApart" | "refNoTranslation"> = {
  select: "refSelect",
  code: "refCode",
  "margin-note": "refMarginNote",
  "two-blocks": "refTwoBlocks",
  "numbered-apart": "refNumberedApart",
  "no-translation": "refNoTranslation",
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
function rangeOver(p: Passage, said: Conventions): Place | null {
  if (said.byBookChapterAndParagraph) return byBookChapterParagraphRange(p);
  if (said.proseByParagraphVerseByLine) return prosimetrumRange(p);
  return placed("numbers", stanzaRange(p) || referenceRange(p, { halves: said.byHalfLine }));
}
const facingRange = (p: Passage): string => (hasFacing(p.doc) ? referenceRange(p, { side: "right" }) : "");
function payloadOver(p: Passage, at: EntryAt, journal: Journal, all: boolean): Payload | { refused: Refusal } {
  const hl = selectionLink(p.doc, p.from, p.to);
  if (!hl) return { refused: "select" };
  const said = conventionsOf(at.date, at.tag, journal);
  const quoted = quotation(p, { halves: said.byHalfLine, paragraphs: said.byBookChapterAndParagraph || said.proseByParagraphVerseByLine, all });
  if ("refused" in quoted) return quoted;
  const page = stephanusOver(p) ?? pageRange(p);
  const label = referenceLabel(at.date, at.tag, { place: rangeOver(p, said), page, facing: facingRange(p) }, journal);
  const url = entryLinkUrl(at.date, at.tag, hl);
  return { text: "[" + mdLabel(label, label) + "](" + url + "):\n\n" + quoted.text, label, url, passage: quoted.text };
}
export function entryLinkParts(date: string, tag: string | null, journal: Journal): { label: string; url: string } {
  return { label: mdLabel(referenceLabel(date, tag, { place: null }, journal), "entry"), url: entryLinkUrl(date, tag) };
}
