/* What the label reads off the journal: an entry's title and a root's
   directive, from the cache's markdown. AN ENTRY'S TITLE IS ITS FIRST
   LEVEL-ONE HEADING, everywhere (decision 5 of the plan, 2026-09-07); the
   current app read a sub-page's first heading of either level, and the one
   shelf that leaned on it was corrected in the data. Memoised on the text,
   so a book-sized list re-parses nothing that has not changed. */
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
/* does the entry carry a top-level `::: reference` directive saying "from
   the last title" — top-level only, since a descendant scan found a
   directive an entry merely QUOTED as an example */
export function directsFromLastTitle(md: string): boolean {
  if (!/^::: reference/m.test(md)) return false;
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return false; }
  let yes = false;
  doc.forEach((block) => { if (block.type === N.reference && /last title/i.test(block.textContent)) yes = true; });
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
  };
}
