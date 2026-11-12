/* THE OLD LINKS LEFT IN THE TEXT, `[[target][label]]`, each made the link
   its target now is, its label kept: a journal day, or a passage of the
   bookshelf. A link on a line ending in a colon introduces the quotation
   under it, which a reference replaces with the passage it quotes (pin:
   orgReferences.test › referOrgLinks: the quotation a link's line
   introduces). Code is left, and so is any link nothing resolves, with its
   reason (pin: orgReferences.test › referOrgLinks: an old link resolved) */
import { entryLinkUrl } from "../src/editor/reference.ts";

const ORG = /\[\[([^\]\s]+)\](?:\[([^\]]+)\])?\]/g;
const FENCE = /^\s*(?:>\s*)*(```|~~~)/;
const CODE = /`+[^`\n]*`+/g;

export interface OrgLink { line: number; target: string; label: string; quote: string[] }
export type Resolved = { href: string; passage?: string } | { why: string };
export interface Referred extends OrgLink { res: Resolved; before: string[]; after: string[] }

/* the old links on a line, those inside its code spans aside */
function linksIn(line: string): RegExpMatchArray[] {
  const spans = [...line.matchAll(CODE)].map((m) => [m.index!, m.index! + m[0].length]);
  return [...line.matchAll(ORG)].filter((m) => !spans.some(([a, b]) => m.index! >= a && m.index! < b));
}
/* the quotation under a line, blank lines before it allowed: where it starts and ends */
/* the first line from `from` that is not `taken`, or the end */
function past(lines: string[], from: number, taken: (l: string) => boolean): number {
  let k = from;
  while (k < lines.length && taken(lines[k])) k++;
  return k;
}
function quotationUnder(src: string[], i: number): [number, number] {
  const q = past(src, i + 1, (l) => !l.trim());
  return [q, past(src, q, (l) => /^>/.test(l))];
}
interface Line { src: string[]; i: number; found: RegExpMatchArray[]; q: number; end: number; introduces: boolean }
/* nothing but marks between the link and the line's closing colon: a
   quotation named after the link is that name's, not the link's
   (pin: orgReferences.test › referOrgLinks: a link introduces the
   quotation only when) */
const leads = (l: Line, m: RegExpMatchArray, k: number): boolean =>
  l.introduces && k === l.found.length - 1 && /^[^\p{L}\p{Nd}]*$/u.test(l.src[l.i].slice(m.index! + m[0].length));
function referredOn(l: Line, resolve: (link: OrgLink) => Resolved): Referred[] {
  const line = l.src[l.i];
  return l.found.map((m, k) => {
    const link: OrgLink = { line: l.i + 1, target: m[1], label: m[2] ?? m[1], quote: leads(l, m, k) ? l.src.slice(l.q, l.end) : [] };
    return { ...link, res: resolve(link), before: [line, ...(link.quote.length ? ["", ...link.quote] : [])], after: [] };
  });
}
/* the line with each resolved link made markdown, edited from the line's
   end so each earlier link's place still holds; the passage a reference
   gives its quotation */
function rewritten(line: string, found: RegExpMatchArray[], here: Referred[]): { text: string; passage?: string[] } {
  let text = line, passage: string[] | undefined;
  for (const [k, m] of [...found.entries()].reverse()) {
    const res = here[k].res;
    if ("why" in res) continue;
    text = text.slice(0, m.index) + "[" + here[k].label + "](" + res.href + ")" + text.slice(m.index! + m[0].length);
    if (res.passage && here[k].quote.length) passage = res.passage.split("\n");
  }
  return { text, passage };
}
const afterOf = (l: Referred, text: string, passage: string[] | undefined): string[] =>
  "why" in l.res ? l.before : [text, ...(l.quote.length ? ["", ...(passage ?? l.quote)] : [])];

export function referOrgLinks(md: string, resolve: (link: OrgLink) => Resolved): { md: string; links: Referred[] } {
  const src = md.split("\n"), out: string[] = [], links: Referred[] = [];
  let fence = false;
  for (let i = 0; i < src.length; i++) {
    const line = src[i];
    if (FENCE.test(line)) { fence = !fence; out.push(line); continue; }
    const found = fence ? [] : linksIn(line);
    if (!found.length) { out.push(line); continue; }
    const [q, end] = quotationUnder(src, i);
    const here = referredOn({ src, i, found, q, end, introduces: /:\s*$/.test(line) && end > q }, resolve);
    const { text, passage } = rewritten(line, found, here);
    for (const l of here) l.after = afterOf(l, text, passage);
    links.push(...here);
    out.push(text);
    if (passage) { out.push(...src.slice(i + 1, q), ...passage); i = end - 1; }
  }
  return { md: out.join("\n"), links };
}

/* THE PASSAGE AN OLD ANCHOR NAMED: the property drawer carrying its
   `:CUSTOM_ID:` stands in the text still. Under a heading it named the
   section, whose first quotation is its substance, else its first
   paragraph; with no section heading above, the entry's title aside, it
   named the whole entry, and the
   lines are none. Null where no drawer names it (pin: orgReferences.test
   › anchoredParagraph) */
export function anchoredParagraph(md: string, anchor: string): string[] | null {
  const raw = md.split("\n"), bare = raw.map((l) => l.replace(/^\s*(?:>\s?)*/, ""));
  const at = bare.findIndex((l) => l.trim() === `:CUSTOM_ID: ${anchor}`);
  if (at < 0) return null;
  if (!raw.slice(0, at).some((l) => /^#{2,6}\s/.test(l))) return [];
  const paras = paragraphsFrom(raw, bare, past(bare, at + 1, (l) => l.trim() !== ":END:") + 1);
  return (paras.find((p) => p.quoted) ?? paras[0])?.lines ?? [];
}
type Para = { quoted: boolean; lines: string[] };
/* the section's paragraphs from line i to the next heading */
function paragraphsFrom(raw: string[], bare: string[], i: number): Para[] {
  const paras: Para[] = [];
  let cur: Para | null = null;
  for (; i < raw.length && !/^#{1,6}\s/.test(raw[i]); i++) {
    if (!bare[i].trim()) { cur = null; continue; }
    if (!cur) paras.push(cur = { quoted: /^\s*>/.test(raw[i]), lines: [] });
    cur.lines.push(bare[i]);
  }
  return paras;
}

/* THE PROPERTY DRAWERS cleared once nothing reads them: each with the
   blank line after it, so no gap is left doubled, or the quotation's own
   blank line where the drawer opens a quotation that goes on. Code is
   left (pin:
   orgReferences.test › clearDrawers) */
const bareLine = (l: string): string => l.replace(/^\s*(?:>\s*)*/, "").trim();
/* the drawer opening at line i: its anchors, and the last line it takes,
   the blank or the quotation's blank after it going with it; null when it never closes */
function drawerAt(src: string[], i: number, anchors: string[]): number | null {
  let j = i;
  for (; j < src.length && bareLine(src[j]) !== ":END:"; j++) {
    const id = /^:CUSTOM_ID:\s*(\S+)/.exec(bareLine(src[j]));
    if (id) anchors.push(id[1]);
  }
  if (j >= src.length) return null;
  return j + 1 < src.length && !bareLine(src[j + 1]) ? j + 1 : j;
}
export function clearDrawers(md: string): { md: string; anchors: string[] } {
  const src = md.split("\n"), out: string[] = [], anchors: string[] = [];
  let fence = false;
  for (let i = 0; i < src.length; i++) {
    if (FENCE.test(src[i])) fence = !fence;
    const last = fence || bareLine(src[i]) !== ":PROPERTIES:" ? null : drawerAt(src, i, anchors);
    if (last === null) out.push(src[i]);
    else i = last;
  }
  return { md: out.join("\n"), anchors };
}

/* LINKS TO AN ENTRY FILED ANEW pointed at its new place: the address
   alone rewritten in the text, the words, their marks and the highlight
   untouched (pin: orgReferences.test › repointed) */
export function repointed(md: string, moved: Map<string, string>): string | null {
  let changed = false;
  const out = md.replace(/\]\(#([^)?\s]+)/g, (all: string, path: string) => {
    const now = moved.get(decodeURIComponent(path));
    if (!now) return all;
    changed = true;
    const [date, ...tag] = now.split("/");
    return "](" + entryLinkUrl(date, tag.join("/") || null);
  });
  return changed ? out : null;
}
