/* A line number names a LIST of places, every verse block counting from 1,
   so Enter cycles — first match, next match, wrap — and says which block it
   landed in when there is more than one (pin: goto.test › a line in two
   blocks is two hits); a leaf is unique in the entry, so a page number
   names one place. THE WORDS FOLLOW THE FORM: "line" and "verse block" for verse,
   "sentence" and "prose block" for prose, and in a prosimetrum the
   ordinal counts every numbered block, form-neutral. The refusals name
   what is there: one block its range (a block may start above 1),
   several the longest, a number below the first named back; a leaf is
   named, never counted (leaves are neither contiguous nor 1-based) (pin:
   goto.test › name the range of one block, the longest of several). THE BOX
   KEEPS WHAT WAS TYPED, and Enter says what is wrong with it. */
import type { Node } from "prosemirror-model";
import { lineUnits, blocksOf, paintsLines, blockUnits, paragraphAt, type Unit } from "./numbering.ts";
import { schema } from "../model/schema.ts";
import { hasFolios } from "./folios.ts";
import { folioLeaves } from "./reference.ts";
import { FOLIO_ONE, FOLIO_ARABIC, FOLIO_CHARS_RE } from "../store/folio.ts";
import { trimLabel, ECHO_CAP } from "../ui/mastheadModel.ts";

const N = schema.nodes;
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
export interface Hit { pos: number; nth: number; block: Unit[]; skipped?: boolean }
/* a skipped line number lands where the line would stand, on the line after
   the gap, or before it where the gap ends its block (pin: goto.test › a
   skipped line number) */
/* a block numbered on both sides is asked by the right column's numbers,
   the translation being what it is read for; a plain block on the same page
   by its own (pin: goto.test › a page of blocks numbered on both sides) */
function askedUnits(doc: Node): Unit[] {
  const out: Unit[] = [];
  doc.forEach((block, pos) => { out.push(...blockUnits(block, pos, 0, block.attrs.facing != null ? "right" : "left")); });
  return out;
}
export function lineHits(doc: Node, n: number): { hits: Hit[]; blocks: Unit[][] } {
  const blocks = blocksOf(askedUnits(doc));
  const hits: Hit[] = [];
  blocks.forEach((rows, i) => {
    const lines = rows.filter((u) => !u.rest && !u.skip);
    for (const u of rows) {
      if (u.line !== n || u.rest) continue;
      const at = u.skip ? lines.find((v) => v.pos > u.pos) ?? lines[lines.length - 1] : u;
      if (at) hits.push({ pos: at.pos, nth: i + 1, block: rows, skipped: u.skip });
    }
  });
  return { hits, blocks };
}
export function lineRefusal(blocks: Unit[][], n: number, noun?: string): string {
  let longest = 0, longBlock: Unit[] | null = null, lowest = 0;
  for (const rows of blocks) {
    const last = rows[rows.length - 1].line;
    if (last > longest) { longest = last; longBlock = rows; lowest = rows[0].line; }
  }
  const unit = (rows: Unit[]): string => noun ?? unitNoun(rows);
  if (n < 1) return "no " + (noun ?? (longBlock ? unitNoun(longBlock) : "line")) + " " + n + " here";
  if (!longest || !longBlock) return "no numbered lines here";
  if (blocks.length > 1) return "no " + unit(longBlock) + " " + n + " — the longest " + (noun ? "block" : formNoun(longBlock)) + (lowest > 1 ? " ends at " : " has ") + longest;
  return lowest === longest ? "the only " + unit(longBlock) + " here is " + longest : "the " + unit(longBlock) + "s here are " + lowest + "–" + longest;
}
/* a paragraph names one place, its first sentence, though a chapter may turn
   inside it (pin: goto.test › a work by book, chapter, and paragraph) */
export function paragraphHit(doc: Node, n: number): { pos: number } | string {
  let hit: number | null = null, low = Infinity, high = -Infinity;
  doc.forEach((block, blockPos) => {
    if (block.type !== N.prose) return;
    block.forEach((row, offset) => {
      if (row.type !== N.pair) return;
      const pos = blockPos + 1 + offset, para = paragraphAt(block, blockPos, pos);
      low = Math.min(low, para); high = Math.max(high, para);
      if (para === n && hit === null) hit = pos;
    });
  });
  if (hit !== null) return { pos: hit };
  return high === -Infinity ? "no numbered paragraphs here" : "no paragraph " + n + " — the paragraphs here are " + low + "–" + high;
}
export function nextHit(hits: Hit[], standing: number | null, sameAsk: boolean): Hit {
  const was = standing === null ? -1 : hits.findIndex((h) => h.pos === standing);
  return hits[sameAsk && was !== -1 ? (was + 1) % hits.length : 0];
}
/* silent where unambiguous; with several blocks the ordinal is load-bearing */
export function landingWord(hit: Hit, blocks: Unit[][], n: number, noun?: string): string | null {
  if (hit.skipped) return "line " + n + " is omitted in this edition" + (blocks.length < 2 ? "" : " — " + formNoun(hit.block) + " " + hit.nth + " of " + blocks.length);
  if (blocks.length < 2) return null;
  const oneForm = !noun && blocks.every((rows) => prose(rows) === prose(hit.block));
  return (noun ?? unitNoun(hit.block)) + " " + n + " — " + (oneForm ? formNoun(hit.block) : "block") + " " + hit.nth + " of " + blocks.length;
}
export function folioHit(doc: Node, tok: string): { pos: number } | null {
  const want = tok.toLowerCase();
  const leaf = folioLeaves(doc).find((l) => l.label.toLowerCase() === want);
  return leaf ? { pos: leaf.pos } : null;
}
export function folioRefusal(doc: Node, tok: string): string {
  return !folioLeaves(doc).length ? "no page numbers here" : "no page " + trimLabel(tok, ECHO_CAP) + " here";
}
export function askCheck(ask: string, kind: "line" | "page", lineNoun = "line"): string | null {
  const a = ask.trim();
  const noun = kind === "page" ? "page" : lineNoun;
  if (!a) return "type a " + noun + " number";
  const ok = kind === "page" ? FOLIO_ONE.test(a) : FOLIO_ARABIC.test(a);
  if (ok) return null;
  return kind === "page" && FOLIO_CHARS_RE.test(a) ? "use roman or arabic characters, not both" : trimLabel(a, ECHO_CAP) + " is not a " + noun + " number";
}

/* a stanza ask is `N` (stanza N, at its first line) or `N.M` (its line M).
   A stanza number names one place — the stanzas are numbered in the text,
   each once — so there is nothing to cycle (pin: goto.test › a stanza
   lands on its first line) */
export function stanzaAskCheck(ask: string): string | null {
  const a = ask.trim();
  if (!a) return "type a stanza, or stanza.line";
  return /^\d+(?:\.\d+)?$/.test(a) ? null : trimLabel(a, ECHO_CAP) + " is not a stanza or stanza.line, like 2.1";
}
/* the page, not its work: a plain verse entry beside stanza entries (the
   commendatory verses) has none (pin: goto.test › a page holding a
   top-level stanza asks by stanza) */
export function hasStanzas(doc: Node): boolean {
  let yes = false;
  doc.forEach((block) => { if (block.attrs.stanza != null) yes = true; });
  return yes;
}
export function stanzaHit(doc: Node, ask: string): { pos: number } | string {
  const [s, l] = ask.trim().split(".").map((x) => parseInt(x, 10));
  let last = 0, found: { node: Node; pos: number } | null = null;
  doc.forEach((block, pos) => {
    const n = block.attrs.stanza as number | null | undefined;
    if (n == null) return;
    if (n > last) last = n;
    if (n === s && !found) found = { node: block, pos };
  });
  if (!last) return "no stanzas here";
  if (!found) return "no stanza " + s + " here — the last is " + last;
  const { node, pos } = found as { node: Node; pos: number };
  const lines = blockUnits(node, pos, 0).filter((u) => u.line && !u.rest && !u.skip);
  const want = l === undefined ? lines[0] : lines.find((u) => u.line === l);
  return want ? { pos: want.pos } : "stanza " + s + " has " + lines.length + " line" + (lines.length === 1 ? "" : "s");
}
