/* A SINGLE QUOTATION'S MARKS TURNED AND CLOSED UP: a closing mark typed as
   an opening one after italics (‘*Secure her!*‘), an opening mark typed as
   a closing one before them (’*Your uncle!*), and the spaced marks of an
   edition that sets them apart from their words (“ ‘ Let there be light!
   ‘ said God). A spaced mark that could be either is left for a hand. Code
   is left. */
import { CLIPPED_END, CLIPS } from "./elisions.ts";

export type Kind = "closing" | "opening" | "spacedOpen" | "spacedClose" | "left";
export interface Fix { at: number; kind: Kind; ch: string; del: number[] }

const LETTER = /\p{L}/u;
/* what may stand before an opening mark */
const BEFORE_OPEN = /^$|[\s“"(\[—–\-‘’]/;
/* what may follow a closing mark */
const AFTER_CLOSE = /^$|[\s.,;:!?)\]—–\-”…]/;
const PUNCT = /[,:;.!?—–\-]/;

export function quoteMarks(md: string): Fix[] {
  const fixes: Fix[] = [];
  const code = new Array(md.length).fill(false);
  let fence = false, pos = 0;
  for (const line of md.split("\n")) {
    const edge = /^\s*(?:>\s*)*(```|~~~)/.test(line);
    if (fence || edge) code.fill(true, pos, pos + line.length);
    if (edge) fence = !fence;
    pos += line.length + 1;
  }
  /* the spaces either side of i on its own line, and the character past them */
  const back = (i: number): { from: number; ch: string } => { let j = i; while (md[j - 1] === " " || md[j - 1] === "\t") j--; return { from: j, ch: md[j - 1] ?? "\n" }; };
  const ahead = (i: number): { to: number; ch: string } => { let j = i + 1; while (md[j] === " " || md[j] === "\t") j++; return { to: j, ch: md[j] ?? "\n" }; };
  const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);
  /* a quotation open in the paragraph, so a spaced mark met inside it is
     the closing one (pin: quoteMarks.test › quoteMarks: a quotation stays open) */
  let open = false;
  for (const m of md.matchAll(/‘|’|\n[ \t]*\n/g)) {
    const at = m.index!;
    if (m[0].length > 1) { open = false; continue; }
    if (code[at]) continue;
    const before = md[at - 1] ?? "", after = md[at + 1] ?? "";
    if (m[0] === "’") {
      /* an elision in italics, ’*Tis* or ’*ave*, is left (pin: quoteMarks.test › quoteMarks: a closing mark after a space) */
      const italic = /^[*_]+(\p{L}*)/u.exec(md.slice(at + 1))?.[1].toLowerCase() ?? "";
      if (BEFORE_OPEN.test(before) && before !== "‘" && before !== "’" && (after === "*" || after === "_") && !CLIPS.has(italic) && italic !== "ave") {
        fixes.push({ at, kind: "opening", ch: "‘", del: [] });
        open = true;
        continue;
      }
      /* spaced after punctuation, closing (pin: quoteMarks.test › quoteMarks: a spaced closing mark) */
      const b = back(at), a = ahead(at);
      if (b.from < at && (a.to > at + 1 || a.ch === "\n" || after === "”") && PUNCT.test(b.ch)) {
        fixes.push({ at, kind: "spacedClose", ch: "’", del: range(b.from, at) });
        open = false;
        continue;
      }
      if (/\s/.test(before) || LETTER.test(after)) continue;
      /* a clipped word's mark, and a plural's possessive (six days’ work),
         close nothing */
      const word = /\p{L}*$/u.exec(md.slice(Math.max(0, at - 12), at))![0].toLowerCase();
      if (!word || !CLIPPED_END.test(word) && !/s$/.test(word)) open = false;
      continue;
    }
    if (!BEFORE_OPEN.test(before) && AFTER_CLOSE.test(after) && !/\s/.test(before)) {
      fixes.push({ at, kind: "closing", ch: "’", del: [] });
      open = false;
      continue;
    }
    const b = back(at), a = ahead(at);
    const spaced = (b.from < at || b.ch === "\n") && (a.to > at + 1 || a.ch === "\n");
    if (!spaced) { if (BEFORE_OPEN.test(before)) open = true; continue; }
    /* a spaced mark beside another, or with nothing after it on its line, is
       left (pin: quoteMarks.test › quoteMarks: a spaced mark beside another) */
    if (/[‘’“”"]/.test(a.ch)) { fixes.push({ at, kind: "left", ch: "‘", del: [] }); continue; }
    const opening = b.ch === "“" || (!open && (b.ch === "\n" || PUNCT.test(b.ch) || /\p{Lu}/u.test(a.ch)));
    /* nothing after it on its line, after punctuation: a speech's close,
       opened before a blank line (pin: quoteMarks.test › quoteMarks: a spaced mark ending its line) */
    if (a.ch === "\n" && b.ch !== "\n" && /[.,;:!?]/.test(b.ch)) {
      fixes.push({ at, kind: "spacedClose", ch: "’", del: range(b.from, at) });
      open = false;
    } else if (opening && a.ch !== "\n") {
      fixes.push({ at, kind: "spacedOpen", ch: "‘", del: [...(b.ch === "“" ? range(b.from, at) : []), ...range(at + 1, a.to)] });
      open = true;
    } else if (open && b.ch !== "\n") {
      fixes.push({ at, kind: "spacedClose", ch: "’", del: range(b.from, at) });
      open = false;
    } else fixes.push({ at, kind: "left", ch: "‘", del: [] });
  }
  return fixes;
}

/* the text with the fixes made, and where each fix's mark now stands */
export function respellMarks(md: string, fixes: Fix[]): { out: string; marks: { at: number; kind: Kind }[] } {
  const del = new Set(fixes.flatMap((f) => f.del));
  const by = new Map(fixes.map((f) => [f.at, f]));
  let out = "";
  const marks: { at: number; kind: Kind }[] = [];
  for (let i = 0; i < md.length; i++) {
    if (del.has(i)) continue;
    const f = by.get(i);
    if (f) { marks.push({ at: out.length, kind: f.kind }); out += f.ch; } else out += md[i];
  }
  return { out, marks };
}
