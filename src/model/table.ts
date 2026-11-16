const ROW = /^\s*\|.*\|\s*$/;
const DIVIDER = /^\s*\|[\s:|-]*-[\s:|-]*\|\s*$/;
/* a cell escapes its pipe alone, as GitHub's tables do: escaping the
   backslash too would rewrite every stored cell holding one (pin:
   table.test › cells written and read back are the cells) */
const UNESCAPED_PIPE = /(?<!\\)\|/;
const escaped = (cell: string): string => cell.replace(/\|/g, "\\|");
const cellsOf = (line: string): string[] =>
  line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(UNESCAPED_PIPE).map((c) => c.trim().replace(/\\\|/g, "|"));

export function isTableStart(lines: string[], i: number): boolean {
  return ROW.test(lines[i]) && i + 1 < lines.length && DIVIDER.test(lines[i + 1]);
}
export function tableLines(rows: string[][]): string[] {
  if (!rows.length) return [];
  const line = (cells: string[]): string => "| " + cells.map(escaped).join(" | ") + " |";
  return [line(rows[0]), "| " + rows[0].map(() => "---").join(" | ") + " |", ...rows.slice(1).map(line)];
}
export function readTable(lines: string[], from: number): { rows: string[][]; next: number } | null {
  if (!isTableStart(lines, from)) return null;
  const head = cellsOf(lines[from]), rows = [head];
  let next = from + 2;
  for (; next < lines.length && ROW.test(lines[next]); next++) {
    const cells = cellsOf(lines[next]);
    rows.push(head.map((_, k) => cells[k] ?? ""));
  }
  return { rows, next };
}
