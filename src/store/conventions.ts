import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { entryKey, titlesRoots } from "./keys.ts";

export interface Conventions {
  lastTitle: boolean;
  noAuthor: boolean;
  scripture: boolean;
  partsInRoman: boolean;
  prosimetrum: boolean;
  byBookChapterAndParagraph: boolean;
  oldEnglishVerse: boolean;
}
export interface Directives {
  directives(ekey: string): string[];
}
/* a page's directive lines: its top-level reference blocks only, since a
   descendant scan found a directive an entry merely QUOTED as an example
   (pin: reference.test › headings: the first level-one heading is the
   title; a ## is a section; the directive is top-level only) */
export function directivesIn(doc: Node): string[] {
  const out: string[] = [];
  doc.forEach((block) => { if (block.type === schema.nodes.reference) out.push(...block.textContent.split("\n")); });
  return out;
}
export function referenceDirectives(md: string): string[] {
  if (!/^::: reference/m.test(md)) return [];
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return []; }
  return directivesIn(doc);
}

/* where a directive is read from, given the entry's path, and the one
   depth of page that says it */
interface Level { pages(segs: string[]): string[]; at(depth: number): boolean; where: string }
const root: Level = { pages: (segs) => segs.slice(0, 1), at: (d) => d === 1, where: "an author’s page" };
const work: Level = { pages: (segs) => (segs.length >= 3 ? [segs[0] + "/" + segs[1]] : []), at: (d) => d === 2, where: "a work’s page" };
/* the entry's own page or any above it: a root of works with no author says
   it once for all of them, an author's work for its parts (pin:
   conventions.test › Old English verse holds from the page that says it
   down) */
const ownOrAbove: Level = { pages: (segs) => segs.map((_, i) => segs.slice(0, i + 1).join("/")), at: () => true, where: "any page" };
/* a line of its own: "no author" inside another directive's words is not
   one (pin: conventions.test › a directive is a line of its own in a
   top-level reference block) */
const line = (words: string) => (l: string): boolean => l.trim().toLowerCase() === words;
/* EVERY DIRECTIVE, its words and its level written once: what is read and
   what is reported cannot disagree (pin: conventions.test › a line no
   directive reads is named) */
const DIRECTIVES: { key: keyof Conventions; said: (l: string) => boolean; level: Level }[] = [
  { key: "lastTitle", said: (l) => /last title/i.test(l), level: root },
  { key: "noAuthor", said: line("no author"), level: root },
  { key: "scripture", said: line("scripture"), level: root },
  { key: "partsInRoman", said: line("parts in roman"), level: work },
  { key: "prosimetrum", said: line("prosimetrum"), level: work },
  { key: "byBookChapterAndParagraph", said: line("by book, chapter, and paragraph"), level: work },
  { key: "oldEnglishVerse", said: line("old english verse"), level: ownOrAbove },
];

export function conventionsOf(date: string, tag: string | null, journal: Directives): Conventions {
  const segs = titlesRoots(date) && tag ? tag.split("/") : [];
  const out = {} as Conventions;
  for (const d of DIRECTIVES)
    out[d.key] = d.level.pages(segs).some((t) => journal.directives(entryKey(date, t)).some(d.said));
  return out;
}
export function directiveTrouble(date: string, tag: string | null, lines: string[]): string[] {
  const segs = tag ? tag.split("/") : [];
  if (!titlesRoots(date) || !segs.length) return [];
  const out: string[] = [];
  for (const l of lines.map((x) => x.trim()).filter(Boolean)) {
    const d = DIRECTIVES.find((x) => x.said(l));
    if (!d) out.push("“" + l + "” is not a reference directive");
    else if (!d.level.at(segs.length)) out.push("“" + l + "” is read on " + d.level.where);
  }
  return out;
}
