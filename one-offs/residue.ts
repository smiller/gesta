/* Every file the corpus report lists, as file:line and the line itself, grouped
   by class — the walk-through list for fixing data by hand. Reads
   tools/out/corpus-report.txt and the corpus it names; writes nothing. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLASS = /^(NOT A FIXED POINT|DOCUMENT CHANGED|ROUND TRIP DIFFERS|ASTERISKS GREW|MORE ASTERISKS|FEWER ASTERISKS|TEXT DIFFERS|THREW)/;
const OPENS = /^(NOT A FIXED|DOCUMENT|ROUND TRIP|ASTERISKS|MORE|FEWER|TEXT DIFFERS|THREW)/;
interface Block { file: string; classes: Map<string, string[]> }
interface Site { file: string; n: number | null; text: string; became: string }

interface Reading { blocks: Block[]; cur: Block | null; last: string | null }
/* a line inside a file's block: a class opening, or a line of the class open */
function classLine(r: Reading, l: string): void {
  const m = CLASS.exec(l);
  if (m) { r.last = m[1]; r.cur!.classes.set(r.last, []); }
  else if (r.last) r.cur!.classes.get(r.last)!.push(l);
}
function readLine(r: Reading, l: string): void {
  if (!l.trim()) { if (r.cur) r.blocks.push(r.cur); r.cur = null; return; }
  if (!l.startsWith("  ") && !OPENS.test(l)) { r.cur = { file: l, classes: new Map() }; r.last = null; return; }
  if (r.cur) classLine(r, l);
}
/* the report's files, each with its classes and their lines */
function blocksOf(report: string[]): Block[] {
  const r: Reading = { blocks: [], cur: null, last: null };
  for (const l of report.slice(4)) readLine(r, l);
  if (r.cur) r.blocks.push(r.cur);
  return r.blocks;
}
const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();
const findLine = (lines: string[], text: string): number | null => { const i = lines.indexOf(text); return i < 0 ? null : i + 1; };
/* the longest run of the words, from the most down to three, that the line holds */
function longestRun(words: string[], line: string): number {
  for (let n = words.length; n > 2; n--) {
    for (let k = 0; k + n <= words.length; k++) if (line.includes(words.slice(k, k + n).join(" "))) return n;
  }
  return 0;
}
/* the line holding the longest run of the snippet's words */
function findSnippet(lines: string[], snippet: string): number | null {
  const words = collapse(snippet).split(" ");
  let best = 0, at: number | null = null;
  lines.forEach((l, i) => { const n = longestRun(words, collapse(l)); if (n > best) { best = n; at = i + 1; } });
  return at;
}
const quoted = (s: string): string => (s.startsWith('"') ? JSON.parse(s) : s);
function roundTripSites(file: string, lines: string[], d: string[]): Site[] {
  const out: Site[] = [];
  for (let k = 0; k < d.length; k += 2) {
    const src = /^ {2}line \d+: (.*)$/.exec(d[k]);
    if (!src) continue;
    const text = quoted(src[1]);
    out.push({ file, n: findLine(lines, text), text, became: k + 1 < d.length ? JSON.parse(d[k + 1].split(": ").slice(1).join(": ")) : "" });
  }
  return out;
}
function textSites(file: string, lines: string[], d: string[]): Site[] {
  const out: Site[] = [];
  for (let k = 0; k < d.length; k += 2) {
    const at = /^ {2}at \d+: (.*)$/.exec(d[k]);
    if (!at) continue;
    const snippet = JSON.parse(at[1]), n = findSnippet(lines, snippet);
    out.push({ file, n, text: n ? lines[n - 1] : snippet, became: JSON.parse(d[k + 1].split(": ").slice(1).join(": ")) });
  }
  return out;
}
function sitesByClass(blocks: Block[], corpus: string): Map<string, Site[]> {
  const out = new Map<string, Site[]>();
  for (const b of blocks) {
    const lines = readFileSync(join(corpus, b.file), "utf8").split("\n");
    for (const [cls, d] of b.classes) {
      const sites = cls === "ROUND TRIP DIFFERS" ? roundTripSites(b.file, lines, d) : textSites(b.file, lines, d);
      out.set(cls, [...(out.get(cls) ?? []), ...sites]);
    }
  }
  return out;
}

/* shapes that need no hand: the successor's own canonical spelling, or a
   reading that is right where the current parser's was not */
const SETTLED: [RegExp, string][] = [
  [/^\*\[[^\]]*\]\([^)]*\)\*$/, "emphasis and link on one title: written [*t*](u)"],
  [/^\*{5,}\s*$/, "a rule of asterisks"],
  [/\(\*1\.5\)/, "a multiplication sign kept literal"],
  [/^\[[^\]]*\[[^\]]*\]\(/, "a bracketed note holding a link, read right"],
  [/^\[(20\d\d-\d\d-\d\d|From |Yes, |Greek )/, "a bracketed note holding a link, read right"],
];
/* an italic run that opens on this line and closes on a later one: the
   current app shows the stars, the successor reads the italics */
function settledWhy(cls: string, text: string): string | null {
  const why = SETTLED.find(([rx]) => rx.test(text))?.[1];
  if (why) return why;
  return cls === "FEWER ASTERISKS" && /^>? ?\*[^*]+$/.test(text) ? "italics across lines, read as italics" : null;
}
const W = 120;
const cut = (s: string): string => Array.from(s).slice(0, W).join("");
function printClass(cls: string, sites: Site[], settled: Map<string, number>): void {
  const open = sites.filter((s) => {
    const why = settledWhy(cls, s.text);
    if (why) settled.set(why, (settled.get(why) ?? 0) + 1);
    return !why;
  });
  console.log("\n## " + cls + " (" + open.length + " sites to look at)");
  for (const s of open) {
    console.log(s.file + ":" + (s.n || "?"));
    console.log("    " + cut(s.text));
    console.log((cls === "ROUND TRIP DIFFERS" ? "    -> " : "    read as: ") + cut(s.became));
  }
}

const report = readFileSync("tools/out/corpus-report.txt", "utf8").split("\n");
const sites = sitesByClass(blocksOf(report), report[0].split(": ").slice(1).join(": "));
const settled = new Map<string, number>();
for (const cls of ["ROUND TRIP DIFFERS", "MORE ASTERISKS", "FEWER ASTERISKS", "TEXT DIFFERS"]) printClass(cls, sites.get(cls) ?? [], settled);
console.log("\n## settled, no hand needed");
for (const [why, c] of [...settled].sort((a, b) => b[1] - a[1])) console.log("  " + String(c).padStart(3) + "  " + why);
