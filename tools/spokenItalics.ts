/* A SPOKEN ROW WHOLLY ITALIC DECLARED A LINE inside a `::: verse` block
   whose directions are bracketed: a row italic from end to end and not in
   brackets is verse, and takes the ⟨line⟩ token. The block's first row is
   the cast and is left (pin: spokenItalics.test › spokenItalics: the
   block's first row); so is a row listed as a direction. */

import { ROW_LINE_TOKEN } from "../src/model/grammar.ts";

export interface Mark { line: number; row: string }

const spoken = (t: string): boolean => /^\*[^*].*\*$/.test(t) && !/^\*\*/.test(t) && !/^\*\(.*\)\*$/.test(t);

interface Scan { verse: boolean; first: boolean }
/* a fence row, or a row outside a block or blank: none is a candidate */
function passed(s: Scan, t: string): boolean {
  if (/^::: ?verse\b/.test(t)) { s.verse = true; s.first = true; return true; }
  if (s.verse && t === ":::") { s.verse = false; return true; }
  return !s.verse || !t;
}

export function declareLines(md: string, directions: string[]): { text: string; marks: Mark[] } {
  const lines = md.split("\n"), marks: Mark[] = [];
  const s: Scan = { verse: false, first: false };
  const declared = (t: string): boolean => spoken(t) && !directions.includes(t);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (passed(s, t)) continue;
    const cast = s.first;
    s.first = false;
    if (cast || !declared(t)) continue;
    marks.push({ line: i, row: lines[i] });
    lines[i] = ROW_LINE_TOKEN + lines[i];
  }
  return { text: lines.join("\n"), marks };
}
