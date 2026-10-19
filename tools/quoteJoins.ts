/* QUOTES A BLANK LINE APART MADE ONE QUOTATION: the blank line between two
   quoted lines becomes an empty quoted line, as deep as the shallower side
   (pin: quoteJoins.test › quoteJoins: the joining line). A gap whose quoted
   line above is listed apart, its words without the quote marks, stays
   apart. Code is left. */

export interface Join { line: number; above: string; below: string; depth: number }

const QUOTE = /^((?:> ?)+)/;
const depth = (l: string): number => QUOTE.exec(l)?.[1].replace(/ /g, "").length ?? 0;
const words = (l: string): string => l.replace(QUOTE, "").trim();

export function joinQuotes(md: string, apart: string[]): { text: string; joins: Join[] } {
  const lines = md.split("\n"), joins: Join[] = [];
  let fence = "";
  for (let i = 0; i < lines.length; i++) {
    const open = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[i])?.[1];
    if (open && (!fence || open[0] === fence[0] && open.length >= fence.length)) { fence = fence ? "" : open; continue; }
    if (fence || !depth(lines[i]) || i + 2 >= lines.length || lines[i + 1].trim() !== "" || !depth(lines[i + 2])) continue;
    if (apart.includes(words(lines[i]))) continue;
    const d = Math.min(depth(lines[i]), depth(lines[i + 2]));
    joins.push({ line: i, above: lines[i], below: lines[i + 2], depth: d });
    lines[i + 1] = ">".repeat(d) + " ";
  }
  return { text: lines.join("\n"), joins };
}
