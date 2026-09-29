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
export function directsFromLastTitle(md: string): boolean {
  if (!/^::: reference/m.test(md)) return false;
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return false; }
  let yes = false;
  doc.forEach((block) => { if (block.type === N.reference && /last title/i.test(block.textContent)) yes = true; });
  return yes;
}
export function directsRomanBookCanto(md: string): boolean {
  if (!/^::: reference/m.test(md)) return false;
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return false; }
  let yes = false;
  doc.forEach((block) => { if (block.type === N.reference && /roman book and canto/i.test(block.textContent)) yes = true; });
  return yes;
}
export function journalOf(cache: Record<string, string>): Journal {
  const memo: Record<string, { md: string; heading: string }> = Object.create(null);
  return {
    heading: (ekey) => {
      const md = cache[ekey] || "";
      const m = memo[ekey];
      if (m && m.md === md) return m.heading;
      const heading = firstHeading(md);
      memo[ekey] = { md, heading };
      return heading;
    },
    fromLastTitle: (rootKey) => directsFromLastTitle(cache[rootKey] || ""),
    romanBookCanto: (workKey) => directsRomanBookCanto(cache[workKey] || ""),
  };
}
