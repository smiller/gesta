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
  directives(ekey: string): string;
}

/* a line of its own: "no author" inside another directive's words is not
   one (pin: conventions.test › a directive is a line of its own in a
   top-level reference block) */
const line = (words: string) => (d: string): boolean => d.split("\n").some((l) => l.trim().toLowerCase() === words);
const lastTitle = (d: string): boolean => /last title/i.test(d);
const root = (segs: string[]): string[] => segs.slice(0, 1);
const work = (segs: string[]): string[] => (segs.length >= 3 ? [segs[0] + "/" + segs[1]] : []);
/* the entry's own page or any above it: a root of works with no author says
   it once for all of them, an author's work for its parts (pin:
   conventions.test › Old English verse holds from the page that says it
   down) */
const ownOrAbove = (segs: string[]): string[] => segs.map((_, i) => segs.slice(0, i + 1).join("/"));

export function conventionsOf(date: string, tag: string | null, journal: Directives): Conventions {
  const segs = titlesRoots(date) && tag ? tag.split("/") : [];
  const on = (level: (segs: string[]) => string[], said: (d: string) => boolean): boolean => level(segs).some((t) => said(journal.directives(entryKey(date, t))));
  return {
    lastTitle: on(root, lastTitle),
    noAuthor: on(root, line("no author")),
    scripture: on(root, line("scripture")),
    partsInRoman: on(work, line("parts in roman")),
    prosimetrum: on(work, line("prosimetrum")),
    byBookChapterAndParagraph: on(work, line("by book, chapter, and paragraph")),
    oldEnglishVerse: on(ownOrAbove, line("old english verse")),
  };
}
