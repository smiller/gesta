const CONSOLE = "(console)";

function blocksOf(run: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>([["(start)", []]]);
  let current = blocks.get("(start)")!;
  for (const line of run.split("\n")) {
    const opens = line.startsWith("== ") ? line.slice(3) : line.startsWith("console:") ? CONSOLE : null;
    if (opens !== null) { current = []; blocks.set(opens, current); }
    if (!line.startsWith("== ")) current.push(opens === CONSOLE ? line.slice("console:".length).trim() : line);
  }
  return blocks;
}
/* the console's lines arrive in the order the sections played */
const reading = (name: string, lines: string[] | undefined): string | undefined =>
  lines && (name === CONSOLE ? [...lines].sort() : lines).join("\n");

/* the sections, and the console, that read otherwise in a run played in
   another order; a section in one run and not the other is named too */
export function orderDifferences(approved: string, played: string): string[] {
  const a = blocksOf(approved), p = blocksOf(played);
  const names = [...new Set([...a.keys(), ...p.keys()])];
  return names.filter((n) => reading(n, a.get(n)) !== reading(n, p.get(n)));
}
