import { appendFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadavg } from "node:os";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ranOutCounts } from "./adapters/waits.ts";

export type RunResult = "ok" | "differs" | "not replayed" | "failed";
interface PlayContext { at: string; head: string; committed: boolean; steps: boolean; windows: number; secs: number; load: number }
export interface LedgerLine extends PlayContext {
  runs: Record<string, RunResult>;
  readOtherwise: Record<string, string[]>;
  /* each wait that ran out, by what it waited for: "save", "search" */
  ranOut: Record<string, number>;
  /* each run's inputs fingerprinted as it began; absent before they were kept */
  inputs?: Record<string, string>;
  replay?: boolean;
}
export interface Tree { head: string; committed: boolean }
/* a play's results as it ends, each run's by its name; its print kept
   only for the waits that ran out in it */
export interface PlayRecord { runs: Record<string, RunResult>; readOtherwise: Record<string, string[]>; windows: number; steps: boolean; secs: number; tree: Tree; print: string; inputs: Record<string, string>; replay?: boolean }
export function ledgerLine(r: PlayRecord, at: string, load: number): LedgerLine {
  return { at, ...r.tree, steps: r.steps, windows: r.windows, secs: r.secs, load, runs: r.runs, readOtherwise: r.readOtherwise, ranOut: ranOutCounts(r.print), inputs: r.inputs, ...(r.replay ? { replay: true } : {}) };
}
/* only a whole play of a committed tree is flake evidence: on an
   uncommitted tree, or a play of some sections, a section read otherwise
   may be the change in hand; a run not replayed played nothing; a
   verdict's replay is the same play again, its pair read by readTwoWays */
export interface Rate { plays: number; flaky: number; byWindows: Record<number, { plays: number; flaky: number }>; bySection: Record<string, number> }
export function rateOf(lines: LedgerLine[]): Rate {
  const r: Rate = { plays: 0, flaky: 0, byWindows: {}, bySection: {} };
  const whole = (x: LedgerLine): boolean => x.committed && !x.steps && !x.replay && !Object.values(x.runs).includes("not replayed");
  for (const l of lines.filter(whole)) {
    const sections = Object.values(l.readOtherwise).flat(), w = (r.byWindows[l.windows] ??= { plays: 0, flaky: 0 });
    r.plays++; w.plays++;
    if (!sections.length) continue;
    r.flaky++; w.flaky++;
    for (const s of new Set(sections)) r.bySection[s] = (r.bySection[s] ?? 0) + 1;
  }
  return r;
}
/* a flake is the same inputs read more than one way, on any tree, so
   the plays before a commit count; a whole play only, as a play of some
   sections reads only those */
export interface TwoWays { run: string; inputs: string; ways: Record<string, number>; first: string; last: string }
const wayOf = (l: LedgerLine, run: string): string => {
  const sections = l.readOtherwise[run] ?? [];
  return l.runs[run] + (sections.length ? ": " + sections.join("; ") : "");
};
function playsByInputs(lines: LedgerLine[]): Map<string, TwoWays & { plays: number }> {
  const by = new Map<string, TwoWays & { plays: number }>();
  for (const l of lines.filter((x) => !x.steps)) {
    for (const [run, inputs] of Object.entries(l.inputs ?? {})) {
      if (!l.runs[run] || l.runs[run] === "not replayed") continue;
      const k = run + " " + inputs, e = by.get(k) ?? { run, inputs, ways: {}, first: l.at, last: l.at, plays: 0 };
      e.ways[wayOf(l, run)] = (e.ways[wayOf(l, run)] ?? 0) + 1;
      e.plays++; e.last = l.at;
      by.set(k, e);
    }
  }
  return by;
}
export function readTwoWays(lines: LedgerLine[]): { playedAgain: number; twoWays: TwoWays[] } {
  const again = [...playsByInputs(lines).values()].filter((e) => e.plays > 1);
  return { playedAgain: again.length, twoWays: again.filter((e) => Object.keys(e.ways).length > 1).map(({ plays: _, ...e }) => e) };
}
const DIR = resolve("docs/helium-runs");
const day = (at: string): string => at.slice(0, 10);
/* every input a play reads, fixtures and packages too, is outside docs/,
   where the ledger itself is written */
const TREE_PATHS = [".", ":!docs"];
function treeNow(): Tree {
  const committed = execSync("git status --porcelain -- " + TREE_PATHS.map((p) => "'" + p + "'").join(" "), { encoding: "utf8" }).trim() === "";
  return { head: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(), committed };
}
function now(): string {
  const d = new Date(), two = (n: number): string => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + two(d.getHours()) + ":" + two(d.getMinutes()) + ":" + two(d.getSeconds());
}
export function readLedger(): LedgerLine[] {
  let files: string[] = [];
  try { files = readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).sort(); } catch { return []; }
  return files.flatMap((f) => readFileSync(join(DIR, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as LedgerLine));
}
/* `node tools/heliumLedger.ts --tree` prints the tree as a play starts,
   not at its end, where an edit or a commit made while it played would
   count as what it played. `node tools/heliumLedger.ts`, the play's record
   as JSON on stdin: its line appended to the day's ledger */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--tree") process.stdout.write(JSON.stringify(treeNow()));
  else {
    const line = ledgerLine(JSON.parse(readFileSync(0, "utf8")) as PlayRecord, now(), Math.round(loadavg()[0] * 10) / 10);
    mkdirSync(DIR, { recursive: true });
    appendFileSync(join(DIR, day(line.at) + ".jsonl"), JSON.stringify(line) + "\n");
  }
}
