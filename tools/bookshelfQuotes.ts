/* A QUOTATION OF THE BOOKSHELF'S VERSE, found and made the reference a copy
   of that passage would make: the same label, the same highlight, the
   bookshelf's own lines. Lines match as letters and numbers alone, so the
   marks and spacing a copy picked up on its way in do not part them, nor
   a few lines changed (pin:
   bookshelfQuotes.test › quotedFrom: lines quoting a passage) (pin:
   bookshelfQuotes.test › quotedFrom: a line differing). The original
   places it; a translation beside it in other words is the bookshelf's
   passage all the same (pin: bookshelfQuotes.test › quotedFrom: lines the
   bookshelf does not hold) */
import type { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { parseMarkdown } from "../src/model/parse.ts";
import { schema } from "../src/model/schema.ts";
import { lineUnits, type Unit } from "../src/editor/numbering.ts";
import { referencePayload } from "../src/editor/reference.ts";
import { journalOf } from "../src/store/headings.ts";
import type { Journal } from "../src/store/reference.ts";

/* a note's superscript mark is not a numeral of the line; an accent is not a
   letter of its own, and ð and þ are one letter, as editions of Old English
   and Old Norse set them otherwise (pin: shelfLines.test › quotedRuns: the
   letters matched without their accents) */
export const norm = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/ð/g, "þ").replace(/[^\p{L}\p{Nd}]+/gu, "");
/* a line shorter than this is too common to place a passage by */
const DISTINCT = 12;
/* the lines of a quotation that may differ from the bookshelf's: one in
   five, and one in any passage of three or more (pin: bookshelfQuotes.test
   › quotedFrom: a passage of three lines or more) */
const misses = (n: number): number => n < 3 ? 0 : Math.max(1, Math.floor(n / 5));

interface Shelved { key: string; doc: Node; units: Unit[]; left: string[] }
export interface ShelfIndex { journal: Journal; entries: Shelved[]; at: Map<string, { e: number; i: number }[]>; texts: Record<string, string>; docs: Map<string, Node> }

const cell = (row: Node, k: number): string => row.type === schema.nodes.pair ? (row.child(k)?.textContent ?? "") : k ? "" : row.textContent;

export function shelfIndex(cache: Record<string, string>): ShelfIndex {
  const entries: Shelved[] = [], at = new Map<string, { e: number; i: number }[]>();
  for (const key of Object.keys(cache).filter((k) => /^(bookshelf|page)\//.test(k))) {
    if (!/^:::\s*(?:verse|stanza)/m.test(cache[key])) continue;
    const doc = parseMarkdown(cache[key]);
    /* a speaker's row is a row a quotation copies too */
    const units = lineUnits(doc, 0);
    const left = units.map((u) => norm(cell(u.node, 0)));
    const e = entries.push({ key, doc, units, left }) - 1;
    left.forEach((l, i) => { if (l.length >= DISTINCT) at.set(l, [...(at.get(l) ?? []), { e, i }]); });
  }
  const texts = cache;
  return { journal: journalOf(cache), entries, at, texts, docs: new Map() };
}

export interface Quoted { left: string; right?: string }
export interface Referred { text: string; key: string; url: string; passage: string }
/* how many letters a quotation's first line takes from its line's end,
   and its last from its line's start, where it quotes half a line */
export interface Cut { head?: number; tail?: number }
/* a row's letters, each with its place in the document */
function lettersOf(row: Node, pos: number): number[] {
  const at: number[] = [];
  row.descendants((n, p) => {
    if (n.isText) [...n.text!].reduce((off, ch) => { for (const _ of norm(ch)) at.push(pos + 1 + p + off); return off + ch.length; }, 0);
    return !n.isText;
  });
  return at;
}
/* the reference a copy of an entry's lines makes; a half-line from its
   line's last letters or to its first, the word a cut falls in taken whole
   (pin: bookshelfQuotes.test › referenceAt: a passage whose first line) */
/* a pair's half-line is its original's, the first cell (pin: shelfLines.test › referenceOf: Old English verse beside its translation) */
const original = (u: Unit): { node: Node; pos: number } => u.node.type === schema.nodes.pair ? { node: u.node.child(0), pos: u.pos + 1 } : { node: u.node, pos: u.pos };
function headFrom(u: Unit, head: number | undefined, from: number): number {
  const t = original(u);
  if (!head || !t.node.isTextblock) return from;
  const at = lettersOf(t.node, t.pos);
  return at[Math.max(0, at.length - head)] ?? from;
}
/* past the rest of the word and the line's closing marks: a half-line ending at its letters loses its comma */
function pastWord(doc: Node, to: number): number {
  const close = doc.resolve(to).end(), next = (): string => doc.textBetween(to, to + 1);
  while (to < close && /^[\p{L}\p{Nd}’'-]$/u.test(next())) to++;
  while (to < close && /^[^\s\p{L}\p{Nd}]$/u.test(next())) to++;
  return to;
}
function tailTo(doc: Node, u: Unit, tail: number | undefined, to: number): number {
  const t = original(u);
  if (!tail || !t.node.isTextblock) return to;
  const at = lettersOf(t.node, t.pos);
  return tail < at.length ? pastWord(doc, at[tail - 1] + 1) : to;
}
type Rows = { first: number; last: number } & Cut;
function minted(index: ShelfIndex, s: Shelved, rows: Rows): Referred | { why: string } {
  const a = s.units[rows.first], b = s.units[rows.last];
  const from = headFrom(a, rows.head, a.pos + 1), to = tailTo(s.doc, b, rows.tail, b.pos + b.node.nodeSize - 1);
  const selection = TextSelection.between(s.doc.resolve(from), s.doc.resolve(to));
  const [date, ...tag] = s.key.split("/");
  /* both columns of a block numbered on both sides, the shape a quotation of it takes (pin: bookshelfQuotes.test › referenceAt: a passage of a block numbered on both sides) */
  const out = referencePayload(EditorState.create({ doc: s.doc, selection }), { date: date, tag: tag.join("/") }, index.journal, true);
  return "refused" in out ? { why: `a copy is refused: ${out.refused}` } : { text: out.text, key: s.key, url: out.url, passage: out.passage };
}
/* a passage named by its entry and its first and last line numbers */
export function referenceAt(index: ShelfIndex, key: string, range: { from: number; to: number } & Cut): Referred | { why: string } {
  const { from, to, ...cut } = range;
  const s = index.entries.find((e) => e.key === key);
  const first = s ? s.units.findIndex((u) => u.line === from) : -1, last = s ? s.units.findIndex((u) => u.line === to) : -1;
  return s && first >= 0 && last >= first ? minted(index, s, { first, last, ...cut }) : { why: `${key} has no lines ${from}-${to}` };
}
const holds = (s: Shelved, first: number, last: number): boolean => first >= 0 && last >= first && last < s.units.length;
/* a passage named by its entry and its first and last rows by place, a
   speaker's row among them */
export function referenceOf(index: ShelfIndex, run: { key: string; first: number; last: number; speaker?: number } & Cut): Referred | { why: string } {
  const s = index.entries.find((e) => e.key === run.key);
  if (!s || !holds(s, run.first, run.last)) return { why: `${run.key} has no rows ${run.first}-${run.last}` };
  const m = minted(index, s, run);
  if (!("passage" in m) || run.speaker === undefined) return m;
  /* the speaker's row heading a passage taken from inside the speech, as a row of it */
  const [fence, ...rest] = m.passage.split("\n");
  const passage = [fence, "> **" + s.units[run.speaker].node.textContent + "**", ...rest].join("\n");
  return { ...m, text: m.text.replace(m.passage, passage), passage };
}
/* `except`: the entry the lines stand in, never a quotation of itself */
export function quotedFrom(index: ShelfIndex, lines: Quoted[], except?: string): Referred | { why: string } | null {
  const q = lines.map((l) => ({ left: norm(l.left), right: l.right === undefined ? undefined : norm(l.right) }));
  /* any distinct line may place the passage: the first may be the one changed */
  const anchors = q.flatMap((l, k) => l.left.length >= DISTINCT ? (index.at.get(l.left) ?? []).map((c) => ({ ...c, k })) : []);
  for (const { e, i, k } of anchors) {
    const s = index.entries[e], first = i - k, last = first + q.length - 1;
    if (s.key === except || !holds(s, first, last)) continue;
    if (q.filter((l, j) => l.left === s.left[first + j]).length < q.length - misses(q.length)) continue;
    return minted(index, s, { first, last });
  }
  return null;
}

/* the letters of a long line's opening or close that place it */
const REACH = 60;
/* a speaker's name opening a line of a script */
const SPEAKER = /^\s*(?:>\s?)*[A-Z][A-Z0-9 .'’-]*(?:\s*\[[^\]]*\])?:\s*/;
/* a book's letters once, not once a quotation: a run over every quotation in the backup took minutes a book */
const normedTexts = new Map<string, string>();
const normed = (text: string): string => { let n = normedTexts.get(text); if (n === undefined) { n = norm(text); normedTexts.set(text, n); } return n; };
function docOf(index: ShelfIndex, key: string): Node {
  let doc = index.docs.get(key);
  if (!doc) { doc = parseMarkdown(index.texts[key]); index.docs.set(key, doc); }
  return doc;
}
/* the entry's letters, each with its place in the document */
function letterStream(doc: Node): { stream: string; at: number[] } {
  let stream = "";
  const at: number[] = [];
  doc.descendants((n, pos) => {
    if (!n.isText) return true;
    [...n.text!].reduce((off, ch) => { const c = norm(ch); for (const x of c) { stream += x; at.push(pos + off); } return off + ch.length; }, 0);
    return false;
  });
  return { stream, at };
}
/* the last line's closing marks are its own: a question ending at its letters lost its mark */
function closedAt(doc: Node, to: number): number {
  const close = doc.resolve(to).end();
  while (to < close && /^[^\s\p{L}\p{Nd}]$/u.test(doc.textBetween(to, to + 1))) to++;
  return to;
}
interface Ask { first: string; last: string; lines: string[]; span: number; ends: boolean }
const tooLong = (a: Ask, length: number): boolean => !a.ends && length > a.span;
/* the quotation in one entry: its span, or null where it is not there or runs too long */
function spanIn(doc: Node, a: Ask): { from: number; to: number } | null {
  const { stream, at } = letterStream(doc);
  const i = stream.indexOf(a.first), j = i < 0 ? -1 : stream.indexOf(a.last, i);
  if (j < 0 || tooLong(a, j - i)) return null;
  /* a quotation opening on a speaker's name opens on the speech; else on its own words */
  const from = SPEAKER.test(a.lines[0]) ? doc.resolve(at[i]).start() : at[i];
  return { from, to: closedAt(doc, at[j + a.last.length - 1] + 1) };
}
function askOf(quote: string[], ends: boolean): Ask | null {
  const lines = quote.map((l) => l.replace(/^\s*(?:>\s?)*/, "")).filter((l) => norm(l));
  if (!lines.length) return null;
  /* a first line's opening and a last line's close: a word changed inside a long line does not part them */
  const first = norm(lines[0].replace(SPEAKER, "")).slice(0, REACH), last = norm(lines[lines.length - 1].replace(SPEAKER, "")).slice(-REACH);
  if (first.length < DISTINCT || last.length < DISTINCT) return null;
  return { first, last, lines, span: 4 * quote.join("").length, ends };
}
function proseIn(index: ShelfIndex, key: string, a: Ask): Referred | null {
  if (!normed(index.texts[key]).includes(a.first)) return null;
  const doc = docOf(index, key);
  const span = spanIn(doc, a);
  if (!span) return null;
  /* both columns, as a quotation of the passage gives them */
  const out = referencePayload(EditorState.create({ doc, selection: TextSelection.create(doc, span.from, span.to) }), { date: key.split("/")[0], tag: key.split("/").slice(1).join("/") }, index.journal, true);
  return "refused" in out ? null : { text: out.text, key, url: out.url, passage: out.passage };
}
function placedProse(index: ShelfIndex, prefix: string, a: Ask | null, keys: string[] | undefined): Referred | null {
  if (!a) return null;
  for (const key of keys ?? Object.keys(index.texts).filter((k) => k.startsWith(prefix)).sort()) {
    const r = proseIn(index, key, a);
    if (r) return r;
  }
  return null;
}
/* A PROSE QUOTATION OF AN ENTRY under `prefix`, placed by its first and
   last lines, letters and numerals alone and a speaker's name aside: the
   reference a copy from its first words — a long line placed by its
   opening and close alone (pin: bookshelfQuotes.test › quotedProse: a
   quotation differing) — or the first speech's start when
   it opens on a speaker's name, to the last line's end,
   its closing marks with it, makes (pin: bookshelfQuotes.test ›
   quotedProse: a prose quotation) */
/* `keys`: the entries to try, in order; every entry under `prefix` when not
   given. By its ends: the quote is a passage's first words and last, any
   length between (pin: bookshelfQuotes.test › quotedProseByEnds: a passage
   named by its first and last words) */
export const quotedProse = (index: ShelfIndex, prefix: string, quote: string[], keys?: string[]): Referred | null => placedProse(index, prefix, askOf(quote, false), keys);
export const quotedProseByEnds = (index: ShelfIndex, prefix: string, quote: string[], keys?: string[]): Referred | null => placedProse(index, prefix, askOf(quote, true), keys);
