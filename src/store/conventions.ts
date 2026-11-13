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
const line = (words: string): RegExp => new RegExp("^\\s*" + words + "\\s*$", "im");
const root = (segs: string[]): string[] => segs.slice(0, 1);
const work = (segs: string[]): string[] => (segs.length >= 3 ? [segs[0] + "/" + segs[1]] : []);
/* the entry's own page or any above it: a root of works with no author says
   it once for all of them, an author's work for its parts (pin:
   conventions.test › Old English verse holds from the page that says it
   down) */
const ownOrAbove = (segs: string[]): string[] => segs.map((_, i) => segs.slice(0, i + 1).join("/"));

const READ: Record<keyof Conventions, { said: RegExp; on: (segs: string[]) => string[] }> = {
  lastTitle: { said: /last title/i, on: root },
  noAuthor: { said: line("no author"), on: root },
  scripture: { said: line("scripture"), on: root },
  partsInRoman: { said: line("parts in roman"), on: work },
  prosimetrum: { said: line("prosimetrum"), on: work },
  byBookChapterAndParagraph: { said: line("by book, chapter, and paragraph"), on: work },
  oldEnglishVerse: { said: line("old english verse"), on: ownOrAbove },
};

export function conventionsOf(date: string, tag: string | null, journal: Directives): Conventions {
  const segs = titlesRoots(date) && tag ? tag.split("/") : [];
  const says = ({ said, on }: (typeof READ)[keyof Conventions]): boolean => on(segs).some((t) => said.test(journal.directives(entryKey(date, t))));
  return Object.fromEntries(Object.entries(READ).map(([name, read]) => [name, says(read)])) as unknown as Conventions;
}
