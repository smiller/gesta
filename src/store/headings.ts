/* AN ENTRY'S TITLE IS ITS FIRST LEVEL-ONE HEADING, everywhere (pin:
   reference.test › headings: the first level-one heading is the title).
   Memoised on the text, so a book-sized list re-parses nothing that has not
   changed. */
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import type { Journal } from "./reference.ts";

const N = schema.nodes;
/* the first level-one heading's text, "" when none; a cheap probe keeps
   the headingless majority off the parser */
export function firstHeading(md: string): string {
  if (!/^# /m.test(md)) return "";
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return ""; }
  let found = "";
  doc.forEach((block) => {
    if (!found && block.type === N.heading && block.attrs.level === 1) found = block.textContent.trim();
  });
  return found;
}
/* top-level only: a descendant scan found a directive an entry merely
   QUOTED as an example (pin: reference.test › headings: the first level-one
   heading is the title; a ## is a section; the directive is top-level only) */
export function referenceDirectives(md: string): string {
  if (!/^::: reference/m.test(md)) return "";
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return ""; }
  const out: string[] = [];
  doc.forEach((block) => { if (block.type === N.reference) out.push(block.textContent); });
  return out.join("\n");
}
const lastTitle = (d: string): boolean => /last title/i.test(d);
const romanBookCanto = (d: string): boolean => /roman book and canto/i.test(d);
/* a line of its own: "no author" inside another directive's words is not one
   (pin: reference.test › referenceLabel: a root whose page says no author) */
const noAuthor = (d: string): boolean => /^\s*no author\s*$/im.test(d);
const oldEnglishVerse = (d: string): boolean => /^\s*old english verse\s*$/im.test(d);
const prosimetrum = (d: string): boolean => /^\s*prosimetrum\s*$/im.test(d);
const byBookChapterParagraph = (d: string): boolean => /^\s*by book, chapter, and paragraph\s*$/im.test(d);
const scripture = (d: string): boolean => /^\s*scripture\s*$/im.test(d);
const partsInRoman = (d: string): boolean => /^\s*parts in roman\s*$/im.test(d);
export function journalOf(cache: Record<string, string>): Journal {
  const memo: Record<string, { md: string; heading: string }> = Object.create(null);
  const said: Record<string, { md: string; directives: string }> = Object.create(null);
  const directives = (ekey: string): string => {
    const md = cache[ekey] || "";
    const m = said[ekey];
    if (m && m.md === md) return m.directives;
    const d = referenceDirectives(md);
    said[ekey] = { md, directives: d };
    return d;
  };
  return {
    heading: (ekey) => {
      const md = cache[ekey] || "";
      const m = memo[ekey];
      if (m && m.md === md) return m.heading;
      const heading = firstHeading(md);
      memo[ekey] = { md, heading };
      return heading;
    },
    fromLastTitle: (rootKey) => lastTitle(directives(rootKey)),
    romanBookCanto: (workKey) => romanBookCanto(directives(workKey)),
    noAuthor: (rootKey) => noAuthor(directives(rootKey)),
    oldEnglishVerse: (ekey) => oldEnglishVerse(directives(ekey)),
    prosimetrum: (workKey) => prosimetrum(directives(workKey)),
    byBookChapterParagraph: (workKey) => byBookChapterParagraph(directives(workKey)),
    scripture: (rootKey) => scripture(directives(rootKey)),
    partsInRoman: (workKey) => partsInRoman(directives(workKey)),
  };
}
