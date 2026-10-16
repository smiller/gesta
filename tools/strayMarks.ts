/* QUOTATION MARKS TYPED THE WRONG WAY ROUND OR SET APART, the ones a
   single quotation's own rules do not reach: a double mark turned (*Unique!*“,
   ”You will not), a word quoted back to front (”comedy“member), a double
   mark set after its punctuation (me.  ”), a single mark run onto the
   punctuation before it (said.’*Ancient*, said,’ — even), and a plural's
   possessive set apart (Augustus ’ stepson). A spaced mark that could be
   either is left for a hand. Code is left. */
import { codeMask, NOT_PLURAL, type Fix } from "./quoteMarks.ts";

export type StrayKind = "dClosing" | "dOpening" | "elision" | "swapped" | "dSpacedClose" | "sOpening" | "possessive" | "left";

const LETTER = /\p{L}/u;
/* what a closing mark may follow and come before */
const WORD_END = /[\p{L}\p{N}.,!?;:*_)\]]/u;
const AFTER_CLOSE = /^$|[\s.,;:!?)\]—–…]/;
const DASH = /[—–]/;

export function strayMarks(md: string): Fix<StrayKind>[] {
  const fixes: Fix<StrayKind>[] = [];
  const code = codeMask(md);
  const back = (i: number): { from: number; ch: string } => { let j = i; while (md[j - 1] === " " || md[j - 1] === "\t") j--; return { from: j, ch: md[j - 1] ?? "\n" }; };
  const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a) }, (_, k) => a + k);
  /* sentences parted by two spaces or by one, as the entry mostly does */
  const two = (md.match(/[.!?] {2}\S/g) ?? []).length > (md.match(/[.!?] \S/g) ?? []).length;
  /* a double mark turned to an opening one, with no mark since on its line:
     a mark run into the next word closes it (pin: strayMarks.test › a word between) */
  let opened = false;
  const singleOpen = (at: number): boolean => {
    let open = false;
    for (let j = md.lastIndexOf("\n", at - 1) + 1; j < at; j++) {
      if (md[j] === "‘") open = true;
      else if (md[j] === "’" && !LETTER.test(md[j + 1] ?? "")) open = false;
    }
    return open;
  };
  for (const m of md.matchAll(/“|”|’|\n/g)) {
    const at = m.index!, before = md[at - 1] ?? "\n", after = md[at + 1] ?? "";
    if (m[0] === "\n") { opened = false; continue; }
    if (code[at]) continue;
    if (m[0] === "“") {
      if (WORD_END.test(before) && AFTER_CLOSE.test(after)) fixes.push({ at, kind: "dClosing", ch: "”", del: [] });
      else if (opened && WORD_END.test(before) && LETTER.test(after)) fixes.push({ at, kind: "swapped", ch: "” ", del: [] });
      opened = false;
      continue;
    }
    if (m[0] === "”") {
      const b = back(at);
      /* before a word, or before italics opening on one; a mark before
         italics closing is their closing one (pin: strayMarks.test › a closing double mark after a space) */
      if ((/\s/.test(before) || before === "\n" || DASH.test(before)) && /^[*_]*\p{L}/u.test(md.slice(at + 1, at + 4))) {
        /* Allingham's dropped h, “— ’e was” (pin: strayMarks.test › a closing double mark after a dash and a space) */
        if (b.from < at && DASH.test(b.ch) && /\p{Ll}/u.test(after)) { fixes.push({ at, kind: "elision", ch: "’", del: [] }); opened = false; continue; }
        fixes.push({ at, kind: "dOpening", ch: "“", del: [] });
        opened = true;
        continue;
      }
      opened = false;
      if (b.from < at && b.ch !== "\n") {
        const rest = md.slice(at + 1, md.indexOf("\n", at) < 0 ? md.length : md.indexOf("\n", at));
        /* after a single closing mark, the next sentence may follow (pin: strayMarks.test › a closing double mark set after punctuation) */
        if (/[.,!?;:’]/.test(b.ch) && (/^\s*\]?\s*$/.test(rest) || /^ \p{Ll}/u.test(rest) || b.ch === "’" && /^(\s|\]|$)/.test(rest))) fixes.push({ at, kind: "dSpacedClose", ch: "”", del: range(b.from, at) });
        else fixes.push({ at, kind: "left", ch: "”", del: [] });
      }
      continue;
    }
    opened = false;
    /* a single quotation open on its line: the mark is its closing one
       (pin: strayMarks.test › a single mark run onto a comma) */
    if (singleOpen(at)) continue;
    /* run onto the punctuation before italics: the opening of a speech (pin: strayMarks.test › a single mark run onto punctuation) */
    if (/[.!?,;:]/.test(before) && /\S/.test(md[at - 2] ?? "") && /[*_]/.test(after) && LETTER.test(md[at + 2] ?? "")) {
      fixes.push({ at, kind: "sOpening", ch: (/[.!?]/.test(before) && two ? "  " : " ") + "‘", del: [] });
      continue;
    }
    if (before === "," && md.startsWith(" — ", at + 1)) { fixes.push({ at, kind: "sOpening", ch: " ‘", del: [at + 1] }); continue; }
    const b = back(at);
    if (b.from < at && md[at + 1] === " " && /\p{Ll}/u.test(md[at + 2] ?? "")) {
      const word = /\p{L}*$/u.exec(md.slice(Math.max(0, b.from - 20), b.from))![0].toLowerCase();
      if (/s$/.test(word) && !NOT_PLURAL.has(word)) fixes.push({ at, kind: "possessive", ch: "’", del: range(b.from, at) });
    }
  }
  return fixes;
}
