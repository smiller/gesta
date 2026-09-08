/* ⌃⌘G's decisions over a document, pure. Ported 2026-09-07 from
   20-g-go-to-a-line.js: a line number names a LIST of places, every
   verse block counting from 1, so Enter cycles — first match, next
   match, wrap — and says which block it landed in when there is more
   than one; a leaf is unique in the entry, so a page number names one
   place. THE WORDS FOLLOW THE FORM: "line" and "verse block" for verse,
   "sentence" and "prose block" for prose, and in a prosimetrum the
   ordinal counts every numbered block, form-neutral. The refusals name
   what is there: one block its range (a block may start above 1),
   several the longest, a number below the first named back; a leaf is
   named, never counted (leaves are neither contiguous nor 1-based). THE
   BOX KEEPS WHAT WAS TYPED, and Enter says what is wrong with it. */
import type { Node } from "prosemirror-model";
import { lineUnits, blocksOf, paintsLines, type Unit } from "./numbering.ts";
import { hasFolios } from "./folios.ts";
import { folioLeaves } from "./reference.ts";
import { FOLIO_ONE, FOLIO_ARABIC, FOLIO_CHARS_RE } from "../store/folio.ts";
import { trimLabel, ECHO_CAP } from "../chrome/mastheadModel.ts";

export type AskKind = "none" | "line" | "page" | "both";
const prose = (block: Unit[]): boolean => block[0].kind === "sentence";
const unitNoun = (block: Unit[]): string => prose(block) ? "sentence" : "line";
const formNoun = (block: Unit[]): string => prose(block) ? "prose block" : "verse block";
/* what this entry can be asked for: the line box answers for sentences
   too, though a prose book paints nothing */
export function askKind(doc: Node): AskKind {
  const lines = paintsLines(doc) || blocksOf(lineUnits(doc, 0)).length > 0;
  return lines ? (hasFolios(doc) ? "both" : "line") : hasFolios(doc) ? "page" : "none";
}
export interface Hit { pos: number; nth: number; block: Unit[] }
export function lineHits(doc: Node, n: number): { hits: Hit[]; blocks: Unit[][] } {
  const blocks = blocksOf(lineUnits(doc, 0));
  const hits: Hit[] = [];
  blocks.forEach((rows, i) => { for (const u of rows) if (u.line === n) hits.push({ pos: u.pos, nth: i + 1, block: rows }); });
  return { hits, blocks };
}
export function lineRefusal(blocks: Unit[][], n: number): string {
  let longest = 0, longBlock: Unit[] | null = null, lowest = 0;
  for (const rows of blocks) {
    const last = rows[rows.length - 1].line;
    if (last > longest) { longest = last; longBlock = rows; lowest = rows[0].line; }
  }
  if (n < 1) return "no " + (longBlock ? unitNoun(longBlock) : "line") + " " + n + " here";
  if (!longest || !longBlock) return "no numbered lines here";
  if (blocks.length > 1) return "no " + unitNoun(longBlock) + " " + n + " — the longest " + formNoun(longBlock) + (lowest > 1 ? " ends at " : " has ") + longest;
  return lowest === longest ? "the only " + unitNoun(longBlock) + " here is " + longest : "the " + unitNoun(longBlock) + "s here are " + lowest + "–" + longest;
}
/* the hit to land on: the one after the marked row when the same number
   is asked again, else the first; the marked row is re-found among the
   live hits, so an edit between presses cannot drift the cycle */
export function nextHit(hits: Hit[], standing: number | null, sameAsk: boolean): Hit {
  const was = standing === null ? -1 : hits.findIndex((h) => h.pos === standing);
  return hits[sameAsk && was !== -1 ? (was + 1) % hits.length : 0];
}
/* silent where unambiguous; with several blocks the ordinal is load-bearing */
export function landingWord(hit: Hit, blocks: Unit[][], n: number): string | null {
  if (blocks.length < 2) return null;
  const oneForm = blocks.every((rows) => prose(rows) === prose(hit.block));
  return unitNoun(hit.block) + " " + n + " — " + (oneForm ? formNoun(hit.block) : "block") + " " + hit.nth + " of " + blocks.length;
}
/* a leaf by its token, case-blind both ways, digits exact */
export function folioHit(doc: Node, tok: string): { pos: number } | null {
  const want = tok.toLowerCase();
  const leaf = folioLeaves(doc).find((l) => l.label.toLowerCase() === want);
  return leaf ? { pos: leaf.pos } : null;
}
export function folioRefusal(doc: Node, tok: string): string {
  return !folioLeaves(doc).length ? "no page numbers here" : "no page " + trimLabel(tok, ECHO_CAP) + " here";
}
/* what is wrong with the ask, or null: a leaf is arabic or roman, a line
   arabic; everything else is named back AS TYPED */
export function askCheck(ask: string, kind: "line" | "page"): string | null {
  const a = ask.trim();
  if (!a) return "type a " + kind + " number";
  const ok = kind === "page" ? FOLIO_ONE.test(a) : FOLIO_ARABIC.test(a);
  if (ok) return null;
  return kind === "page" && FOLIO_CHARS_RE.test(a) ? "use roman or arabic characters, not both" : trimLabel(a, ECHO_CAP) + " is not a " + kind + " number";
}
