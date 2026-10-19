/* A SPOKEN ROW WHOLLY ITALIC DECLARED A LINE inside a `::: verse` block
   whose directions are bracketed: a row italic from end to end and not in
   brackets is verse, and takes the ⟨line⟩ token. The block's first row is
   the cast and is left (pin: spokenItalics.test › spokenItalics: the
   block's first row); so is a row listed as a direction. */

import { ROW_LINE_TOKEN } from "../src/model/grammar.ts";

export interface Mark { line: number; row: string }

const spoken = (t: string): boolean => /^\*[^*].*\*$/.test(t) && !/^\*\*/.test(t) && !/^\*\(.*\)\*$/.test(t);

export function declareLines(md: string, directions: string[]): { text: string; marks: Mark[] } {
  const lines = md.split("\n"), marks: Mark[] = [];
  let verse = false, first = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^::: ?verse\b/.test(t)) { verse = true; first = true; continue; }
    if (verse && t === ":::") { verse = false; continue; }
    if (!verse || !t) continue;
    const cast = first;
    first = false;
    if (cast || !spoken(t) || directions.includes(t)) continue;
    marks.push({ line: i, row: lines[i] });
    lines[i] = ROW_LINE_TOKEN + lines[i];
  }
  return { text: lines.join("\n"), marks };
}
