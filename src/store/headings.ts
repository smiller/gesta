/* AN ENTRY'S TITLE IS ITS FIRST LEVEL-ONE HEADING, everywhere (pin:
   reference.test › headings: the first level-one heading is the title).
   Memoised on the text, so a book-sized list re-parses nothing that has not
   changed. */
import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import type { Journal } from "./reference.ts";
import { referenceDirectives } from "./conventions.ts";

const N = schema.nodes;
/* the first level-one heading's text, "" when none; a cheap probe keeps
   the headingless majority off the parser */
const isTitle = (block: Node): boolean => block.type === N.heading && block.attrs.level === 1;
export function firstHeading(md: string): string {
  if (!/^# /m.test(md)) return "";
  let doc: Node;
  try { doc = parseMarkdown(md); } catch { return ""; }
  let found = "";
  doc.forEach((block) => {
    if (!found && isTitle(block)) found = block.textContent.trim();
  });
  return found;
}
export function journalOf(cache: Record<string, string>): Journal {
  const memo: Record<string, { md: string; heading: string }> = Object.create(null);
  const said: Record<string, { md: string; directives: string[] }> = Object.create(null);
  const directives = (ekey: string): string[] => {
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
    directives,
  };
}
