import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { entryKey, titlesRoots } from "./keys.ts";
import { PHRASES } from "../model/alertText.ts";

export interface Conventions {
  byInnermostTitleAlone: boolean;
  byTitleAlone: boolean;
  byChapterAndVerse: boolean;
  partTitlesInRoman: boolean;
  proseByParagraphVerseByLine: boolean;
  byBookChapterAndParagraph: boolean;
  byHalfLine: boolean;
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
interface Level { pages(segs: string[]): string[]; at(depth: number): boolean; where: "author" | "work" | "any" }
const READ_ON = { author: "readOnAuthorPage", work: "readOnWorkPage", any: "readOnAnyPage" } as const;
const root: Level = { pages: (segs) => segs.slice(0, 1), at: (d) => d === 1, where: "author" };
const work: Level = { pages: (segs) => (segs.length >= 3 ? [segs[0] + "/" + segs[1]] : []), at: (d) => d === 2, where: "work" };
/* the entry's own page or any above it: a root of works with no author says
   it once for all of them, an author's work for its parts (pin:
   conventions.test › by half-line holds from the page that says it
   down) */
const ownOrAbove: Level = { pages: (segs) => segs.map((_, i) => segs.slice(0, i + 1).join("/")), at: () => true, where: "any" };
/* the whole line: a name matched inside a longer line was read, and the
   rest of the line ignored without a word (pin: conventions.test › a
   directive is the whole of its line) */
const line = (words: string) => (l: string): boolean => l.trim().toLowerCase() === words;
/* EVERY DIRECTIVE, its words and its level written once: what is read and
   what is reported cannot disagree (pin: conventions.test › a line no
   directive reads is named) */
const DIRECTIVES: { key: keyof Conventions; said: (l: string) => boolean; level: Level }[] = [
  { key: "byInnermostTitleAlone", said: line("by innermost title alone"), level: root },
  { key: "byTitleAlone", said: line("by title alone"), level: root },
  { key: "byChapterAndVerse", said: line("by chapter and verse"), level: root },
  { key: "partTitlesInRoman", said: line("part titles in roman"), level: work },
  { key: "proseByParagraphVerseByLine", said: line("prose by paragraph, verse by line"), level: work },
  { key: "byBookChapterAndParagraph", said: line("by book, chapter, and paragraph"), level: work },
  { key: "byHalfLine", said: line("by half-line"), level: ownOrAbove },
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
    if (!d) out.push(PHRASES.notADirective({ line: l }));
    else if (!d.level.at(segs.length)) out.push(PHRASES[READ_ON[d.level.where]]({ line: l }));
  }
  return out;
}
