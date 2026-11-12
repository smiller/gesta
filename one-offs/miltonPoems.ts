/* Milton's shorter poems made pages: the furniture between a scan's lines
   told from verse, a witness's stanza gaps, the edition's verse paragraphs
   read from where it indents a line, the marks the scans' reading gets
   wrong at a word's head and in the first words, and the page itself */
import { findStart, letters, similar } from "./harvardMilton.ts";
import type { HocrLine } from "./harvardStrips.ts";

/* a stanza's numeral, the Hymn's heading */
export const NUMERAL = /^[IVXLl1i!|]{1,5}\.?$|^the hymn\.?$/i;

/* a running head the OCR gave a lower-case speck (POEMS WRITTEN AT SCHOOL AND AT COLLEGE Ig) */
export function runningHead(l: string): boolean {
  const ls = l.replace(/[^\p{L}]/gu, "");
  return ls.length > 10 && ls.replace(/\P{Lu}/gu, "").length / ls.length > 0.8;
}

/* a digit the OCR glued to a word is a speck (hand1,) */
export const unspecked = (l: string): string => l.replace(/(\p{L})\d+(?=\P{L}|$)/gu, "$1");

/* a witness's `count` lines from its first on, with whether a gap (a blank
   line or a line `verse` refuses, a numeral) stood before each; Beeching's
   notes on the text, a paragraph each, passed over */
export function witnessGaps(lines: string[], first: string, count: number, verse: (l: string) => boolean): { lines: string[]; gaps: boolean[] } | null {
  const at = findStart(lines.map((l) => l || "\u0000"), first);
  if (at == null) return null;
  const w: Witness = { lines: [], gaps: [], gap: false, note: false };
  for (let k = at; k < lines.length && w.lines.length < count; k++) if (!inNote(w, lines[k])) taken(w, lines[k], verse);
  return { lines: w.lines, gaps: w.gaps };
}
interface Witness { lines: string[]; gaps: boolean[]; gap: boolean; note: boolean }
/* a line of verse taken with whether a gap stood before it; anything else a gap */
function taken(w: Witness, l: string, verse: (l: string) => boolean): void {
  if (!l || !verse(l)) { w.gap = true; return; }
  w.lines.push(l);
  w.gaps.push(w.gap && w.lines.length > 1);
  w.gap = false;
}
/* a note runs from its "Note:" to its paragraph's blank line */
function inNote(s: { note: boolean }, l: string): boolean {
  if (/^Note:/.test(l)) s.note = true;
  if (!s.note) return false;
  s.note = !!l;
  return true;
}

/* each line's place among a page's OCR lines: the one among the next few
   that reads most like the line's opening, a run-over passed by; two printed
   lines the OCR read as one, the second stands on the first's */
export function placeLines(h: HocrLine[], lines: string[]): HocrLine[] {
  const opening = (line: string, n: number): string => letters(line).slice(0, n);
  let at = 0, best = 0;
  h.forEach((l, i) => { const t = letters(l.text), s = similar(t, opening(lines[0], t.length)); if (s > best) { best = s; at = i; } });
  const out: HocrLine[] = [];
  for (const line of lines) {
    let k = at, top = -1;
    for (let j = at; j < Math.min(at + 4, h.length); j++) { const t = letters(h[j].text), s = similar(t, opening(line, t.length)); if (s > top + 0.15) { top = s; k = j; } }
    if (top < 0.5 && out.length) { out.push(out[out.length - 1]); continue; }
    out.push(h[k]);
    at = k + 1;
  }
  return out;
}

const median = (xs: number[]): number => [...xs].sort((x, y) => x - y)[xs.length >> 1];
/* how far each placed line stands in from its page's usual left edge */
export function indents(placed: HocrLine[]): number[] {
  const base = new Map<number, number>();
  for (const page of new Set(placed.map((l) => l.page))) base.set(page, median(placed.filter((l) => l.page === page).map((l) => l.box[0])));
  return placed.map((l) => l.box[0] - base.get(l.page)!);
}

/* a verse paragraph's first line, as the edition sets it: stood in 30–70px,
   the two lines either side of it not, so a measure's alternate indent (the
   first ten lines of L'Allegro) is passed by */
export function paragraphs(ind: number[]): boolean[] {
  const flush = (i: number): boolean => i < 0 || i >= ind.length || Math.abs(ind[i]) < 20;
  const alone = (i: number): boolean => [-2, -1, 1, 2].every((d) => flush(i + d));
  return ind.map((x, i) => i > 0 && x >= 30 && x <= 70 && alone(i));
}

/* an apostrophe at a word's head is an elision, never a quotation's
   opening, unless the line closes it (’mongst, ’twixt, ’s) */
export const elided = (line: string): string => (/’(?!\p{L})/u.test(line.replace(/\p{L}’\p{L}/gu, "")) ? line : line.replace(/(^|[\s(“])‘(?=\p{L})/gu, "$1’"));

/* the first words, set in small capitals, read as capitals: given the
   case of an ordinary word */
export const smallCaps = (line: string): string => line.replace(/^(\P{L}*)(\p{L})(\p{L}*)/u, (_, lead, f, rest) => lead + f + rest.toLowerCase())
  .replace(/^(\P{L}*\p{L}+\P{L}+)(\p{Lu}{2,})\b/u, (_, head, w) => head + w.toLowerCase());

export const roman = (n: number): string => ([[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const).reduce((out, [v, r]) => { while (n >= v) { out += r; n -= v; } return out; }, "");

export interface PoemPage {
  heading: string; lines: string[];
  /* a gap before the line: a stanza's or a verse paragraph's start */
  opens: boolean[];
  notes: string[];
  /* italic rows, not numbered: before a line, after the last */
  rows?: { before: number; text: string }[]; after?: string;
  /* the stanza numerals as italic rows, the count starting again after a row */
  numerals?: boolean;
}
const parted = (p: PoemPage, i: number, before: unknown): boolean => i > 0 && !!(p.opens[i] || before);
const numbered = (p: PoemPage, i: number): boolean => !!p.numerals && (!i || p.opens[i]);
export function poemPage(p: PoemPage): string {
  const rows: string[] = [];
  let stanza = 0;
  p.lines.forEach((l, i) => {
    const before = p.rows?.find((r) => r.before === i + 1);
    if (parted(p, i, before)) rows.push("");
    if (before) { rows.push(`*${before.text}*`, ""); stanza = 0; }
    if (numbered(p, i)) rows.push(`*${roman(++stanza)}*`);
    rows.push(l);
  });
  if (p.after) rows.push("", `*${p.after}*`);
  return `# ${p.heading}\n\n` + p.notes.map((n) => `::: note\n${n}\n:::\n\n`).join("") + `::: verse\n${rows.join("\n")}\n:::`;
}
