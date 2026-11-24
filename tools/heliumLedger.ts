import { appendFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadavg } from "node:os";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ranOutCounts } from "./adapters/waits.ts";

export type RunResult = "ok" | "differs" | "not replayed" | "failed";
export interface PlayContext { at: string; head: string; committed: boolean; steps: boolean; windows: number; secs: number; load: number }
export interface LedgerLine extends PlayContext {
  runs: Record<string, RunResult>;
  readOtherwise: Record<string, string[]>;
  /* each wait that ran out, by what it waited for: "save", "search" */
  ranOut: Record<string, number>;
}
const RESULT: [RegExp, RunResult][] = [[/^ok — not replayed/, "not replayed"], [/^ok$/, "ok"], [/^FAILED/, "failed"], [/^DIFFERS/, "differs"]];
function runsIn(print: string): Record<string, RunResult> {
  const runs: Record<string, RunResult> = {};
  for (const m of print.matchAll(/^(corner|order|bridge|reader): (.*)$/gm)) {
    const hit = RESULT.find(([re]) => re.test(m[2]));
    if (hit && !(m[1] in runs)) runs[m[1]] = hit[1];
  }
  return runs;
}
function otherwiseIn(print: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const m of print.matchAll(/^(corner|order|bridge|reader): section read otherwise — (.*)$/gm)) {
    const sections = (out[m[1]] ??= []);
    if (!sections.includes(m[2])) sections.push(m[2]);
  }
  return out;
}
export function ledgerLine(print: string, context: PlayContext): LedgerLine {
  return { ...context, runs: runsIn(print), readOtherwise: otherwiseIn(print), ranOut: ranOutCounts(print) };
}
/* only a whole play of a committed tree is flake evidence: on an
   uncommitted tree, or a play of some sections, a section read otherwise
   may be the change in hand; a run not replayed played nothing */
export interface Rate { plays: number; flaky: number; byWindows: Record<number, { plays: number; flaky: number }>; bySection: Record<string, number> }
export function rateOf(lines: LedgerLine[]): Rate {
  const r: Rate = { plays: 0, flaky: 0, byWindows: {}, bySection: {} };
  const whole = (x: LedgerLine): boolean => x.committed && !x.steps && !Object.values(x.runs).includes("not replayed");
  for (const l of lines.filter(whole)) {
    const sections = Object.values(l.readOtherwise).flat(), w = (r.byWindows[l.windows] ??= { plays: 0, flaky: 0 });
    r.plays++; w.plays++;
    if (!sections.length) continue;
    r.flaky++; w.flaky++;
    for (const s of new Set(sections)) r.bySection[s] = (r.bySection[s] ?? 0) + 1;
  }
  return r;
}
const DIR = resolve("docs/helium-runs");
const day = (at: string): string => at.slice(0, 10);
interface Tree { head: string; committed: boolean }
/* every input a play reads, fixtures and packages too, is outside docs/,
   where the ledger itself is written */
const TREE_PATHS = [".", ":!docs"];
function treeNow(): Tree {
  const committed = execSync("git status --porcelain -- " + TREE_PATHS.map((p) => "'" + p + "'").join(" "), { encoding: "utf8" }).trim() === "";
  return { head: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(), committed };
}
function contextNow(tree: Tree, windows: number, steps: boolean, secs: number): PlayContext {
  const d = new Date(), two = (n: number): string => String(n).padStart(2, "0");
  const at = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
  return { at, ...tree, steps, windows, secs, load: Math.round(loadavg()[0] * 10) / 10 };
}
export function readLedger(): LedgerLine[] {
  let files: string[] = [];
  try { files = readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).sort(); } catch { return []; }
  return files.flatMap((f) => readFileSync(join(DIR, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as LedgerLine));
}
/* `node tools/heliumLedger.ts --tree` prints the tree as a play starts,
   not at its end, where an edit or a commit made while it played would
   count as what it played. `node tools/heliumLedger.ts <windows>
   <steps 0|1> <secs> <tree>`, the play's print on stdin: its line
   appended to the day's ledger */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--tree") process.stdout.write(JSON.stringify(treeNow()));
  else {
    const print = readFileSync(0, "utf8");
    const line = ledgerLine(print, contextNow(JSON.parse(process.argv[5]) as Tree, +process.argv[2], process.argv[3] === "1", +process.argv[4]));
    mkdirSync(DIR, { recursive: true });
    appendFileSync(join(DIR, day(line.at) + ".jsonl"), JSON.stringify(line) + "\n");
  }
}
