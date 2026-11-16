import { tableLines } from "../model/table.ts";

/* A TERMINAL'S COPY IS TEXT, NOT STRUCTURE: its HTML is white-space: pre
   blocks of text and coloured inline runs, one after another, and read as
   HTML every run was a paragraph of its own; one copy can come as two
   blocks or more (pin: paste.test › a terminal's copy is styled
   preformatted text alone) */
const PRE_BLOCK = '<div style="[^"]*white-space:\\s*pre(?![\\w-])[^"]*">';
const TERMINAL_OPEN = new RegExp("^\\s*(?:<meta[^>]*>\\s*|<html[^>]*>\\s*|<head>[^]*?<\\/head>\\s*|<body[^>]*>\\s*|<!--StartFragment-->\\s*)*" + PRE_BLOCK, "i");
const TERMINAL_CLOSE = /<\/div>\s*(?:<!--EndFragment-->\s*|<\/body>\s*|<\/html>\s*)*$/i;
const NEXT_BLOCK = new RegExp("<\\/div>\\s*" + PRE_BLOCK, "gi");
const NOT_A_RUN = /<(?!div style="display: inline[;"]|\/div>|a\s|\/a>|span[\s>]|\/span>)/i;
export function isTerminalCopy(html: string): boolean {
  const open = TERMINAL_OPEN.exec(html), close = TERMINAL_CLOSE.exec(html);
  return !!open && !!close && close.index >= open[0].length && !NOT_A_RUN.test(html.slice(open[0].length, close.index).replace(NEXT_BLOCK, ""));
}
/* the terminal breaks its lines at the window's width: a line not ending a
   sentence runs on into the next, unless that one starts a list item or a
   message (pin: terminalCopy.test › a terminal's wrapped lines are joined); markdown
   copied out stays as it was (pin: terminalCopy.test › a terminal's copy of markdown
   keeps its structure). A line opening on -- starts its own as a list item
   does, a line wrapped from it running back on; held both ways, a long one
   broke where the terminal wrapped it. A bare -- stands alone (pin:
   terminalCopy.test › a terminal's line opening on --) */
const STARTS_ITS_OWN = /^\s*(?:(?:[-*+•]|\d+[.)]|⏺|⎿)\s|--(?:\s|$))/;
const ENDS_A_SENTENCE = /[.?!:…]["'”’)\]]*$/;
const HOLDS = /^\s*(?:```|:::|#{1,6}\s|>|\||[┌├└│]|--\s*$)/;
const BREAKS: ((prev: string, line: string) => boolean)[] = [
  (prev, line) => !/\S/.test(prev) || !/\S/.test(line),
  (prev, line) => ENDS_A_SENTENCE.test(prev.trimEnd()) || STARTS_ITS_OWN.test(line),
  (prev, line) => HOLDS.test(prev) || HOLDS.test(line),
];
const runsOn = (prev: string, line: string): boolean => !BREAKS.some((b) => b(prev, line));
function fencesAfter(open: { code: boolean; blocks: number }, line: string): { code: boolean; blocks: number } {
  const t = line.trim();
  if (t.startsWith("```")) return { ...open, code: !open.code };
  if (open.code || !t.startsWith(":::")) return open;
  return { ...open, blocks: t === ":::" ? Math.max(0, open.blocks - 1) : open.blocks + 1 };
}
/* the terminal's margin is the indent every line shares. A message's ⏺
   or a command's ⎿ stands in it (pin: terminalCopy.test › a command's output,
   opening on ⎿), and a first line indented less than two was begun mid-line,
   its one space the gap before its word, which taken off ran two words
   together (pin: a terminal's copy pasted › a terminal's copy pasted into a
   list item); neither counts, and the first keeps its spaces (pin:
   terminalCopy.test › a terminal's margin is taken off); one line has no margin
   (pin: paste.test › a terminal's copy that is not blocks) */
const MESSAGE = /^\s*[⏺⎿]\s/;
const indentOf = (l: string): number => l.length - l.trimStart().length;
function marginOff(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  const [first, ...rest] = lines, firstCounts = indentOf(first) >= 2;
  const indents = (firstCounts ? lines : rest).filter((l) => /\S/.test(l) && !MESSAGE.test(l)).map(indentOf);
  const margin = indents.length ? Math.min(...indents) : 0, lead = new RegExp("^[ \\t]{0," + margin + "}"), off = (l: string) => l.replace(lead, "");
  return [firstCounts ? off(first) : first, ...rest.map(off)];
}
/* a terminal draws a table in box characters, each cell wrapped within its
   column; joined as prose its borders and cells ran together (pin:
   terminalCopy.test › a terminal's box-drawn table). A box is a table only when
   every line between its top and bottom is a row or a rule: a diagram's
   box ran on to a tree listing's └ and cut every line between into cells
   (pin: terminalCopy.test › a box is a table only when) */
const BOX_TOP = /^\s*┌/, BOX_BOTTOM = /^\s*└/, BOX_RULE = /^\s*├/, BOX_INSIDE = /^\s*[│├]/;
const cellsOf = (line: string): string[] => line.trim().slice(1, -1).split("│").map((c) => c.trim());
function boxCells(lines: string[]): string[] {
  const rows = lines.map(cellsOf);
  return rows[0].map((_, i) => rows.map((r) => r[i] ?? "").filter(Boolean).join(" "));
}
/* lines between rules are one row wrapped; where no rule falls between body
   rows each line is a row, a wrapped row too, the two drawn alike (pin:
   terminalCopy.test › a terminal's box-drawn table) */
function boxRows(inside: string[]): string[][] {
  const groups: string[][] = [[]];
  for (const l of inside) if (BOX_RULE.test(l)) groups.push([]); else groups.at(-1)!.push(l);
  const rows = groups.filter((g) => g.length);
  return groups.length > 2 ? rows : [rows[0], ...rows.slice(1).flat().map((l) => [l])];
}
const boxTable = (inside: string[]): string[] => tableLines(boxRows(inside).map(boxCells));
function boxEnd(lines: string[], top: number): number {
  let j = top + 1;
  while (j < lines.length && BOX_INSIDE.test(lines[j])) j++;
  const rows = lines.slice(top + 1, j).some((l) => !BOX_RULE.test(l));
  return rows && j < lines.length && BOX_BOTTOM.test(lines[j]) ? j : -1;
}
function boxTablesOff(lines: string[]): string[] {
  const out: string[] = [];
  let code = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("```")) code = !code;
    const end = !code && BOX_TOP.test(lines[i]) ? boxEnd(lines, i) : -1;
    if (end < 0) out.push(lines[i]);
    else { out.push(...boxTable(lines.slice(i + 1, end))); i = end; }
  }
  return out;
}
export function terminalText(text: string): string {
  const out: string[] = [];
  let open = { code: false, blocks: 0 };
  for (const line of boxTablesOff(marginOff(text.split("\n")))) {
    const last = open.code || open.blocks > 0 ? undefined : out.at(-1);
    if (last !== undefined && runsOn(last, line)) out[out.length - 1] = last.trimEnd() + " " + line.trimStart();
    else out.push(line);
    open = fencesAfter(open, line);
  }
  return out.join("\n");
}
