/* a Milton page's capitals matched to the bookshelf's Paradise Lost: each
   word's capital taken from how Paradise Lost writes that word mid-sentence,
   where it writes it one way nine times in ten or more; a line's or a
   sentence's first word, and a word Paradise Lost never uses, left as they
   are; a word read as a personification, a name or another sense kept by
   hand */

export interface Usage { cap: number; low: number }

/* each word of a line with whether a capital there is the line's or a
   sentence's own: the first word, and a word after . ! ? : or a dash, or
   after an opening quotation mark or bracket */
export function positions(line: string): { word: string; at: number; opening: boolean }[] {
  const out: { word: string; at: number; opening: boolean }[] = [];
  let opening = true;
  for (const m of line.matchAll(/[^\s—]+|—+/g)) {
    const t = m[0];
    const lead = /^[^\p{L}]*/u.exec(t)![0];
    const w = /^\p{L}[\p{L}’'-]*\p{L}|^\p{L}/u.exec(t.slice(lead.length))?.[0];
    if (w) {
      out.push({ word: w, at: m.index! + lead.length, opening: opening || /[“‘(]/.test(lead) });
      opening = false;
    }
    if (/[.!?:—]["”’)]*$/.test(t) || /^—+$/.test(t)) opening = true;
  }
  return out;
}

/* mid-sentence usage of each word over a text's lines, by its lower case */
type Position = ReturnType<typeof positions>[number];
const unweighed = (p: Position): boolean => p.opening || /^(I|O)$/.test(p.word) || /^I’/.test(p.word);
export function usage(lines: string[]): Map<string, Usage> {
  const table = new Map<string, Usage>();
  for (const l of lines) for (const p of positions(l)) {
    if (unweighed(p)) continue;
    const k = p.word.toLowerCase(), e = table.get(k) ?? { cap: 0, low: 0 };
    if (/^\p{Lu}/u.test(p.word)) e.cap++; else e.low++;
    table.set(k, e);
  }
  return table;
}

export interface Change { at: number; from: string; to: string; usage: Usage }
/* the words of a line Paradise Lost's usage would recase: a capital it
   writes lower nine times in ten or more, or a lower case it capitalises
   nine times in ten or more and at least three times */
function recased(word: string, e: Usage): string | null {
  const share = e.cap / (e.cap + e.low);
  if (/^\p{Lu}/u.test(word)) return share <= 0.1 ? word[0].toLowerCase() + word.slice(1) : null;
  return share >= 0.9 && e.cap >= 3 ? word[0].toUpperCase() + word.slice(1) : null;
}
export function recasings(line: string, table: Map<string, Usage>): Change[] {
  const out: Change[] = [];
  for (const p of positions(line)) {
    const e = unweighed(p) ? undefined : table.get(p.word.toLowerCase());
    const to = e ? recased(p.word, e) : null;
    if (to !== null) out.push({ at: p.at, from: p.word, to, usage: e! });
  }
  return out;
}

export const applied = (line: string, changes: Change[]): string =>
  changes.reduceRight((l, c) => l.slice(0, c.at) + c.to + l.slice(c.at + c.from.length), line);
