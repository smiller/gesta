/* A SINGLE QUOTATION'S MARKS TURNED AND CLOSED UP: a closing mark typed as
   an opening one after italics (‘*Secure her!*‘), an opening mark typed as
   a closing one before them (’*Your uncle!*), and the spaced marks of an
   edition that sets them apart from their words (“ ‘ Let there be light!
   ‘ said God). A spaced mark that could be either is left for a hand. Code
   is left. */
import { CLIPPED_END, CLIPS } from "./elisions.ts";

export type Kind = "closing" | "opening" | "spacedOpen" | "spacedClose" | "possessive" | "left";
export interface Fix<K extends string = Kind> { at: number; kind: K; ch: string; del: number[] }

const LETTER = /\p{L}/u;
/* what may stand before an opening mark */
const BEFORE_OPEN = /^$|[\s“"(\[—–\-‘’]/;
/* what may follow a closing mark */
const AFTER_CLOSE = /^$|[\s.,;:!?)\]—–\-”…]/;
const PUNCT = /[,:;.!?—–\-]/;
/* words ending in s that are no plural */
export const NOT_PLURAL = new Set("thus his is was as us yes this its hers ours yours theirs".split(" "));

/* each character, whether it stands in a fenced code block */
export function codeMask(md: string): boolean[] {
  const code = new Array(md.length).fill(false);
  let fence = false, pos = 0;
  for (const line of md.split("\n")) {
    const edge = /^\s*(?:>\s*)*(```|~~~)/.test(line);
    if (fence || edge) code.fill(true, pos, pos + line.length);
    if (edge) fence = !fence;
    pos += line.length + 1;
  }
  return code;
}

interface Scan { md: string; fixes: Fix[]; open: boolean }
type Back = { from: number; ch: string };
type Ahead = { to: number; ch: string };
/* the spaces either side of i on its own line, and the character past them */
const back = (md: string, i: number): Back => { let j = i; while (md[j - 1] === " " || md[j - 1] === "\t") j--; return { from: j, ch: md[j - 1] ?? "\n" }; };
const ahead = (md: string, i: number): Ahead => { let j = i + 1; while (md[j] === " " || md[j] === "\t") j++; return { to: j, ch: md[j] ?? "\n" }; };
/* the edition's own closing, spaced and typed the same way */
const spacedClosing = (md: string, j: number): boolean => /\s/.test(md[j - 1]) && /^$|[\s.,;:!?)\]—–”]/.test(md[j + 1] ?? "");
const closingAt = (md: string, j: number): boolean => md[j] === "’" && !/\s/.test(md[j - 1]) && /^$|[\n.,;:!?)\]—–”]/.test(md[j + 1] ?? "");
/* a closing mark later on the line, before punctuation or the line's end,
   no opening one between (pin: quoteMarks.test › quoteMarks: a spaced mark whose quotation) */
function closesOnLine(md: string, from: number): boolean {
  for (let j = from; j < md.length && md[j] !== "\n"; j++) {
    if (md[j] === "‘") return spacedClosing(md, j);
    if (closingAt(md, j)) return true;
  }
  return false;
}
const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);
function fix(q: Scan, f: Fix, open?: boolean): true {
  q.fixes.push(f);
  if (open !== undefined) q.open = open;
  return true;
}

/* an elision in italics, ’*Tis* or ’*ave*, is left (pin: quoteMarks.test › quoteMarks: a closing mark after a space) */
function opensItalics(md: string, at: number): boolean {
  const before = md[at - 1] ?? "", after = md[at + 1] ?? "";
  const italic = /^[*_]+(\p{L}*)/u.exec(md.slice(at + 1))?.[1].toLowerCase() ?? "";
  return BEFORE_OPEN.test(before) && before !== "‘" && before !== "’" && (after === "*" || after === "_") && !CLIPS.has(italic) && italic !== "ave";
}
/* spaced after punctuation, closing (pin: quoteMarks.test › quoteMarks: a spaced closing mark) */
const spacedAfterPunct = (md: string, at: number, b: Back, a: Ahead): boolean =>
  b.from < at && (a.to > at + 1 || a.ch === "\n" || md[at + 1] === "”") && PUNCT.test(b.ch);
/* a clipped word's mark, and a plural's possessive (six days’ work), close nothing */
function closesQuotation(md: string, at: number): boolean {
  const word = /\p{L}*$/u.exec(md.slice(Math.max(0, at - 12), at))![0].toLowerCase();
  return !word || (!CLIPPED_END.test(word) && !/s$/.test(word));
}
function closingMark(q: Scan, at: number): void {
  const { md } = q;
  if (opensItalics(md, at)) { fix(q, { at, kind: "opening", ch: "‘", del: [] }, true); return; }
  const b = back(md, at), a = ahead(md, at);
  if (spacedAfterPunct(md, at, b, a)) { fix(q, { at, kind: "spacedClose", ch: "’", del: range(b.from, at) }, false); return; }
  if (/\s/.test(md[at - 1] ?? "") || LETTER.test(md[at + 1] ?? "")) return;
  if (closesQuotation(md, at)) q.open = false;
}

interface Spaced { q: Scan; at: number; b: Back; a: Ahead }
const plural = (md: string, b: Back): boolean => !NOT_PLURAL.has(/\p{L}*$/u.exec(md.slice(Math.max(0, b.from - 20), b.from))![0].toLowerCase());
const opensHere = ({ q, b, a }: Spaced): boolean =>
  b.ch === "“" || (!q.open && (b.ch === "\n" || PUNCT.test(b.ch) || /\p{Lu}/u.test(a.ch) || closesOnLine(q.md, a.to)));
/* a spaced opening mark's readings, in order, the first that answers deciding */
const SPACED: ((s: Spaced) => boolean)[] = [
  /* a spaced mark beside another, or with nothing after it on its line, is
     left (pin: quoteMarks.test › quoteMarks: a spaced mark beside another) */
  ({ q, at, b, a }) => {
    if (a.ch !== "“" || !q.open || b.ch === "\n" || ahead(q.md, a.to).ch !== "\n") return false;
    /* the speech's close and the narration's, the double typed opening
       (pin: quoteMarks.test › quoteMarks: a spaced mark inside a quotation, a spaced opening double) */
    fix(q, { at, kind: "spacedClose", ch: "’”", del: [...range(b.from, at), ...range(at + 1, ahead(q.md, a.to).to)] }, false);
    return true;
  },
  ({ q, at, a }) => /[‘’“”"]/.test(a.ch) && fix(q, { at, kind: "left", ch: "‘", del: [] }),
  /* nothing after it on its line, after punctuation: a speech's close,
     opened before a blank line (pin: quoteMarks.test › quoteMarks: a spaced mark ending its line) */
  ({ q, at, b, a }) => a.ch === "\n" && b.ch !== "\n" && /[.,;:!?]/.test(b.ch) && fix(q, { at, kind: "spacedClose", ch: "’", del: range(b.from, at) }, false),
  (s) => s.a.ch !== "\n" && opensHere(s) && fix(s.q, { at: s.at, kind: "spacedOpen", ch: "‘", del: [...(s.b.ch === "“" ? range(s.b.from, s.at) : []), ...range(s.at + 1, s.a.to)] }, true),
  ({ q, at, b }) => q.open && b.ch !== "\n" && fix(q, { at, kind: "spacedClose", ch: "’", del: range(b.from, at) }, false),
  /* a plural's possessive, ladies ‘ lips (pin: quoteMarks.test › quoteMarks: a spaced mark after a plural) */
  ({ q, at, b, a }) => /s/.test(b.ch) && /\p{Ll}/u.test(a.ch) && plural(q.md, b) && fix(q, { at, kind: "possessive", ch: "’", del: range(b.from, at) }),
  ({ q, at }) => fix(q, { at, kind: "left", ch: "‘", del: [] }),
];
const typedClosing = (before: string, after: string): boolean => !BEFORE_OPEN.test(before) && AFTER_CLOSE.test(after) && !/\s/.test(before);
const spacedMark = (at: number, b: Back, a: Ahead): boolean => (b.from < at || b.ch === "\n") && (a.to > at + 1 || a.ch === "\n");
function openingMark(q: Scan, at: number): void {
  const before = q.md[at - 1] ?? "", after = q.md[at + 1] ?? "";
  if (typedClosing(before, after)) { fix(q, { at, kind: "closing", ch: "’", del: [] }, false); return; }
  const b = back(q.md, at), a = ahead(q.md, at);
  if (!spacedMark(at, b, a)) { if (BEFORE_OPEN.test(before)) q.open = true; return; }
  SPACED.some((rule) => rule({ q, at, b, a }));
}

export function quoteMarks(md: string): Fix[] {
  const code = codeMask(md);
  const q: Scan = { md, fixes: [], open: false };
  /* a quotation open in the paragraph, so a spaced mark met inside it is
     the closing one (pin: quoteMarks.test › quoteMarks: a quotation stays open) */
  for (const m of md.matchAll(/‘|’|\n[ \t]*\n/g)) {
    const at = m.index!;
    if (m[0].length > 1) q.open = false;
    else if (code[at]) continue;
    else if (m[0] === "’") closingMark(q, at);
    else openingMark(q, at);
  }
  return q.fixes;
}

/* the text with the fixes made, and where each fix's mark now stands: a
   space a fix puts before its mark is not the mark */
export function respellMarks<K extends string>(md: string, fixes: Fix<K>[]): { out: string; marks: { at: number; kind: K }[] } {
  const del = new Set(fixes.flatMap((f) => f.del));
  const by = new Map(fixes.map((f) => [f.at, f]));
  let out = "";
  const marks: { at: number; kind: K }[] = [];
  for (let i = 0; i < md.length; i++) {
    if (del.has(i)) continue;
    const f = by.get(i);
    if (f) { marks.push({ at: out.length + Math.max(0, f.ch.search(/\S/)), kind: f.kind }); out += f.ch; } else out += md[i];
  }
  return { out, marks };
}
