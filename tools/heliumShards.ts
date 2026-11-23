const TRAILER = "console by section: ";

/* window k of n plays every n-th section from the k-th, so the merge can
   put each back by its place alone */
export const dealt = <T>(sections: T[], [k, n]: [number, number]): T[] => sections.filter((_, i) => i % n === k);

export const shardTrailer = (bySection: string[][]): string => TRAILER + JSON.stringify(bySection) + "\n";

interface Window { blocks: string[]; logs: string[][] }
function parsed(out: string): Window {
  const lines = out.split(/(?<=\n)/), at = lines.findIndex((l) => l.startsWith(TRAILER));
  const body = at < 0 ? lines : lines.slice(0, at);
  const logs: string[][] = at < 0 ? [] : JSON.parse(lines[at].slice(TRAILER.length));
  const blocks: string[] = [];
  for (const l of body) if (l.startsWith("== ") || !blocks.length) blocks.push(l); else blocks[blocks.length - 1] += l;
  return { blocks, logs };
}
/* the console lines follow the sections' order, not the windows'
   (pin: heliumShards.test › merges the windows' runs) */
export function merged(outs: string[]): string {
  const ws = outs.map(parsed), n = ws.length, total = ws.reduce((a, w) => a + w.blocks.length, 0);
  let text = "";
  const logs: string[] = [];
  for (let g = 0; g < total; g++) {
    const w = ws[g % n], j = Math.floor(g / n);
    if (j >= w.blocks.length) continue;
    text += w.blocks[j];
    logs.push(...(w.logs[j] ?? []));
  }
  return text + "console: " + (logs.length ? logs.join("\n") : "(nothing)") + "\n";
}
