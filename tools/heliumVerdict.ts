import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { mayReuse, approvalRefusal, failedRun } from "./heliumStamp.ts";
import { orderDifferences } from "./heliumOrder.ts";
import type { PlayRecord, RunResult } from "./heliumLedger.ts";

export type Compared = { pass: true } | { pass: false; failed: string } | { pass: false; order: string[] } | { pass: false; differs: "new" | "changed" };
/* two runs failing alike read the same, so a run held to another fails
   on a failed run of its own (pin: heliumVerdict.test › a run held to
   another fails on a failed run) */
export function compared(received: string, baseline: string | null, held: boolean): Compared {
  if (held) {
    const failed = received.split("\n").find((l) => failedRun(l));
    if (failed !== undefined) return { pass: false, failed };
    const order = baseline === null ? ["(no approved copy)"] : orderDifferences(baseline, received);
    return order.length ? { pass: false, order } : { pass: true };
  }
  if (baseline === received) return { pass: true };
  return { pass: false, differs: baseline === null ? "new" : "changed" };
}

/* today is pinned, not scrubbed: a scrub of today's key, its crumb label
   and its day number missed the day number until a verify on another day
   went red on it */
export function scrub(text: string): string {
  return text
    .replace(/"opacity":"[0-9.e-]+"/g, '"opacity":"[fading]"')
    /* the corner's text in the screen line is an info's clock against
       the tool's waits: the steps that care read the corner themselves */
    .replace(/· corner \\"(?:[^"\\]|\\.)*\\"/g, "· corner [whatever stood]")
    .replace(/file:\/\/\/[^"\\ ]*\/dist\/index\.html/g, "file:///[app]/index.html")
    /* a logged Error's frames are the minified build's line and column,
       moved by any change elsewhere in the bundle */
    .replace(/^ +at .*\n/gm, "");
}

export const READ_OTHERWISE = "section read otherwise — ";
/* each section a failed comparison read otherwise, a line of its own:
   the section's name alone heads every run's print, passed or not
   (pin: heliumVerdict.test › a run that differs names each section) */
export function readOtherwise(name: string, c: Compared, received: string, baseline: string | null): string[] {
  const sections = "order" in c ? c.order : "differs" in c && baseline !== null ? orderDifferences(baseline, received) : [];
  return sections.map((s) => name + ": " + READ_OTHERWISE + s);
}

/* order differs only where two plays of the same steps disagreed: a
   reading changed on purpose differs alike in both and leaves order ok.
   Both are played again, unchanged, to put the pair on record. Bridge,
   reader and a failed section have no second play to tell them by */
export function replayed(results: Record<string, string>, steps: boolean, asked: string[]): string[] {
  const both = ["corner", "order"];
  return !steps && results.order === "differs" && both.every((n) => asked.includes(n)) ? both : [];
}

export interface Played { received: string; fp: string; steps: boolean; held: boolean }
/* a failed run's print kept under its time: the received copy goes when
   the next play passes, and a flake's diff went with it */
function keptAt(dir: string, name: string, received: string): string {
  const d = new Date(), two = (n: number): string => String(n).padStart(2, "0");
  const at = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "-" + two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name + "-" + at + ".txt");
  writeFileSync(path, received);
  return path;
}
/* a run's four files: its approved copy and its received copy under
   `expected`, its pass stamp and its played print under `stamps`; a failed
   run's print kept under `failed` */
export function runFiles(at: { expected: string; stamps: string; failed: string }) {
  const approved = (n: string) => join(at.expected, n + ".approved.txt"), received = (n: string) => join(at.expected, n + ".received.txt");
  const stamp = (n: string) => join(at.stamps, n + ".txt"), played = (n: string) => join(at.stamps, n + ".played.txt");
  const read = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf8") : null);
  const write = (p: string, text: string): void => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
  const remove = (p: string): void => rmSync(p, { force: true });
  return {
    approvedPath: approved, receivedPath: received,
    keep: (n: string, text: string): string => keptAt(at.failed, n, text),
    diff: (n: string): string => spawnSync("diff", ["-u", approved(n), received(n)], { encoding: "utf8" }).stdout || "",
    baseline: (n: string): string | null => read(approved(n)),
    received: (n: string): string | null => read(received(n)),
    reusable: (n: string, fp: string, steps: boolean): boolean => mayReuse(read(stamp(n)), fp, { steps }),
    clear(n: string): void { remove(stamp(n)); remove(played(n)); },
    /* a run of some steps is never stamped nor noted as played, so it can
       be neither reused nor approved (pin: heliumVerdict.test › after a
       fail the received copy is kept) */
    after(n: string, run: Played, c: Compared): void {
      if (c.pass) { remove(received(n)); if (!run.steps) write(stamp(n), run.fp); return; }
      write(received(n), run.received);
      if (!run.steps && !run.held) write(played(n), run.fp);
    },
    refusal: (n: string, fp: string): string | null => approvalRefusal(read(received(n)), read(played(n)), fp),
    /* the stamp is taken after the approved copy is written, the copy being
       one of the run's inputs: taken before, the next run replayed whole
       (pin: heliumVerdict.test › a run is approved only when) */
    approve(n: string, stampAfter: () => string): string {
      const text = read(received(n))!;
      write(approved(n), text);
      remove(received(n));
      remove(played(n));
      write(stamp(n), stampAfter());
      return text;
    },
  };
}
export type RunFiles = ReturnType<typeof runFiles>;

export interface VerdictPorts {
  player: { play(name: string): Promise<string>; clear(name: string): void };
  fingerprint(name: string): string;
  files: RunFiles;
  tree(): string;
  /* a line saying why the record was not kept, or null */
  record(r: PlayRecord): string | null;
  wake(print: string): void;
  print(line: string): void;
  clock(): number;
}
export interface VerdictAsk { asked: string[]; together: string[][]; heldTo: Record<string, string>; steps: boolean; windows: number }
interface Verdict { ask: VerdictAsk; ports: VerdictPorts }
interface Play { results: Record<string, RunResult>; otherwiseBy: Record<string, string[]>; inputsBy: Record<string, string>; outputs: string[]; failed: number; tree: string; since: number; replay: boolean }
interface Playing { name: string; played: string }
interface Read extends Playing { received: string; baseline: string | null }

/* a run to play, its stamps cleared and its windows emptied before any run
   of its group starts; null where a passing run's stamp stands, except in
   a replay, which plays every run it names */
function prepare(v: Verdict, p: Play, name: string): Playing | null {
  /* an edit made while it plays is not what it played */
  const fp = v.ports.fingerprint(name);
  p.inputsBy[name] = fp.slice(0, 16);
  if (!p.replay && v.ports.files.reusable(name, fp, v.ask.steps)) { p.results[name] = "not replayed"; v.ports.print(name + ": ok — not replayed, its inputs those of a passing run"); return null; }
  v.ports.files.clear(name);
  v.ports.player.clear(name);
  return { name, played: fp };
}
/* a run held to another is held to that one's run played beside it, so a
   reading changed on purpose is not taken for an order; else to its copy */
const baselineOf = (v: Verdict, name: string, played: Map<string, string>): string | null =>
  played.get(v.ask.heldTo[name] ?? "") ?? v.ports.files.baseline(v.ask.heldTo[name] ?? name);
function said(v: Verdict, name: string, c: Exclude<Compared, { pass: true }>): string {
  if ("failed" in c) return name + ": FAILED — " + c.failed;
  if ("order" in c) return name + ": DIFFERS in another order — " + c.order.join("; ");
  const f = v.ports.files, diffLines = f.diff(name).split("\n");
  return [name + ": DIFFERS from " + f.approvedPath(name) + (c.differs === "new" ? " (no approved copy yet)" : ""), ...diffLines.slice(0, 80),
    ...(diffLines.length > 80 ? ["… " + (diffLines.length - 80) + " more lines of the diff: read the received copy whole"] : []),
    "read " + relative(process.cwd(), f.receivedPath(name)) + "; if it is right, `node tools/helium-approve.ts --approve " + name + "`"].join("\n");
}
function judge(v: Verdict, p: Play, { name, played, received, baseline }: Read): void {
  p.outputs.push(received);
  const held = name in v.ask.heldTo, c = compared(received, baseline, held);
  v.ports.files.after(name, { received, fp: played, steps: v.ask.steps, held }, c);
  p.results[name] = c.pass ? "ok" : "failed" in c ? "failed" : "differs";
  if (c.pass === true) { v.ports.print(name + ": ok"); return; }
  p.failed++;
  v.ports.print(said(v, name, c));
  const otherwise = readOtherwise(name, c, received, baseline);
  p.otherwiseBy[name] = [...new Set(otherwise.map((l) => l.slice(name.length + 2 + READ_OTHERWISE.length)))];
  for (const l of otherwise) v.ports.print(l);
  p.outputs.push(otherwise.join("\n"));
  v.ports.print(name + ": this run kept at " + relative(process.cwd(), v.ports.files.keep(name, received)));
}
async function playGroup(v: Verdict, p: Play, group: string[], only: string[]): Promise<void> {
  const runs = group.filter((n) => only.includes(n)).map((n) => prepare(v, p, n)).filter((r): r is Playing => r !== null);
  const outs = await Promise.all(runs.map((r) => v.ports.player.play(r.name)));
  const played = new Map(runs.map((r, i) => [r.name, outs[i]]));
  for (const r of runs) judge(v, p, { ...r, received: played.get(r.name)!, baseline: baselineOf(v, r.name, played) });
}
function treeOf(said: string): PlayRecord["tree"] | null {
  try { return JSON.parse(said); } catch { return null; }
}
function recorded(v: Verdict, p: Play): void {
  if (!p.outputs.length) return;
  const tree = treeOf(p.tree);
  if (!tree) { v.ports.print("ledger failed: the tree was not read as the play started"); return; }
  const why = v.ports.record({ runs: p.results, readOtherwise: p.otherwiseBy, windows: v.ask.windows, steps: v.ask.steps, secs: Math.round(v.ports.clock() - p.since), tree, print: p.outputs.join("\n"), inputs: p.inputsBy, replay: p.replay });
  if (why) v.ports.print(why);
}
async function played(v: Verdict, only: string[], replay: boolean): Promise<Play> {
  const p: Play = { results: {}, otherwiseBy: {}, inputsBy: {}, outputs: [], failed: 0, tree: v.ports.tree(), since: v.ports.clock(), replay };
  for (const group of v.ask.together) await playGroup(v, p, group, only);
  recorded(v, p);
  return p;
}
/* once over every run played, the replay's prints with the first's */
function wakeOnce(v: Verdict, plays: Play[]): void {
  const outputs = plays.flatMap((p) => p.outputs);
  if (outputs.length) v.ports.wake(outputs.join("\n"));
}
/* a flake shows only as the same inputs read two ways; the play that
   read otherwise still fails the verdict, its replay passing or not */
export async function verdict(ask: VerdictAsk, ports: VerdictPorts): Promise<number> {
  const v: Verdict = { ask, ports }, first = await played(v, ask.asked, false), again = replayed(first.results, ask.steps, ask.asked);
  if (!again.length) {
    if (first.failed && !ask.steps) ports.print("replay it unchanged before any edit: a run its same inputs read another way is a flake (node tools/heliumRate.ts)");
    wakeOnce(v, [first]);
    return first.failed;
  }
  ports.print("order read otherwise beside corner: both played again, unchanged");
  const second = await played(v, again, true);
  wakeOnce(v, [first, second]);
  return first.failed + second.failed;
}
