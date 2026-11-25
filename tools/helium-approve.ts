// The headless tools under a VERDICT: each tool's whole printed run is
// compared against its approved copy in tools/expected/, the volatile
// bits scrubbed — a fade's opacity, an info still on screen at an
// incidental step, the app's path. A difference writes the received copy
// beside the approved one, prints the diff and exits 1; `--approve` makes
// that received copy the approved one without playing again, which is a
// judgement to be made after reading it, and refuses a run that failed or
// whose inputs have moved. Without it a seam only these runs cover could
// move without warning under `npm test`.
// `order` plays the steps last first beside `corner`, held section by
// section to the corner run played with it, or to corner's approved copy
// where corner was not played; it has no copy of its own to approve.
// `node tools/helium-approve.ts [--approve] [corner|order|bridge|reader ...]`
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, readByDrivers, DRIVERS } from "./heliumStamp.ts";
import { runFiles, scrub, verdict, type VerdictPorts } from "./heliumVerdict.ts";
import { built, clearProfile, playDealt, playEnv, playOne, profileOf, windowNames } from "./heliumPlay.ts";

interface Tool { script: string; args?: string[]; env?: Record<string, string>; heldTo?: string; dealt?: boolean }
const TOOLS: Record<string, Tool> = {
  corner: { script: "tools/helium-corner.ts", dealt: true },
  order: { script: "tools/helium-corner.ts", args: [profileOf("order")], env: { ORDER: "reverse" }, heldTo: "corner", dealt: true },
  bridge: { script: "tools/helium-bridge.ts" },
  reader: { script: "tools/helium-reader.ts" },
};
/* all four at once: the whole verdict 86-94 s, where bridge and reader
   played after corner and order took 92-101 s */
const TOGETHER = [["corner", "order", "bridge", "reader"]];
const args = process.argv.slice(2);
const approve = args.includes("--approve");
const names = args.filter((a) => a in TOOLS);
const run = names.length ? names : Object.keys(TOOLS);

/* the verdict reads the page at its own speed: a throttled page is a
   tool for finding a step that waits on a clock */
const env = playEnv(process.env, {}, 1);
/* WHAT A RUN READS, fingerprinted after the build: the pages (every line of
   the app and its libraries), the fixtures the steps seed, the code its
   drivers reach through their imports, the approved copy, and the browser,
   node and playwright that play it. A run whose inputs match a passing run's stamp is not played
   again: a commit replayed for seven minutes a run approved minutes
   before */
const HELIUM_PLIST = "/Applications/Helium.app/Contents/Info.plist";
const file = (p: string) => ({ name: p, bytes: existsSync(p) ? readFileSync(p) : "(missing)" });
const L = runFiles({ expected: resolve("tools/expected"), stamps: resolve("tools/out/helium-pass"), failed: resolve("tools/out/helium-failed") });
const approvedOf = (name: string): string => L.approvedPath(TOOLS[name].heldTo ?? name);
function inputsFor(name: string) {
  const helium = (/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/.exec(readFileSync(HELIUM_PLIST, "utf8")) ?? [])[1] ?? "(unknown)";
  return [
    file("dist/index.html"), file("dist-reader/index.html"),
    ...readByDrivers(DRIVERS, (p) => (existsSync(p) ? readFileSync(p, "utf8") : null)).map(file),
    ...readdirSync("fixtures").map((f) => file("fixtures/" + f)),
    file(approvedOf(name)),
    { name: "helium", bytes: helium },
    { name: "node", bytes: process.version },
    { name: "playwright-core", bytes: JSON.parse(readFileSync("node_modules/playwright-core/package.json", "utf8")).version },
  ];
}
let failed = 0;
built(["build", "build:reader"], env);

function approveOne(name: string): void {
  if (TOOLS[name].heldTo) { if (names.includes(name)) { failed++; console.log(name + ": nothing to approve — a section reading otherwise in another order is given its own setup"); } return; }
  if (L.received(name) === null && !names.length) return;
  const fp = fingerprint(inputsFor(name)), refusal = L.refusal(name, fp);
  if (refusal) { failed++; console.log(name + ": not approved — " + refusal); return; }
  console.log(L.diff(name));
  console.log(name + ": approved, the run that was played (" + L.approve(name, () => fingerprint(inputsFor(name))).split("\n").length + " lines)");
}
/* the sections dealt over this many windows, each with its own browser
   and profile: corner and order together took 268 s in 1, 122 in 3, 96
   in 4, 74-82 in 5, 100 in 6 on ten cores, and 8 read one section
   otherwise */
const WINDOWS = Math.max(1, +(process.env.WINDOWS ?? 5));
const windowsOf = (name: string): string[] => windowNames(name, TOOLS[name].dealt ? WINDOWS : 1);
async function play(name: string): Promise<string> {
  const tool = TOOLS[name], runEnv = { ...env, ...tool.env };
  if (!tool.dealt || WINDOWS === 1) { const p = await playOne(tool.script, tool.args ?? [], runEnv); return scrub(p.out + p.tail); }
  return playDealt({ name, script: tool.script, windows: WINDOWS, env: runEnv });
}
/* a child, not an import: imported, the progress tools were the run's
   inputs, and an edit to the day's page replayed it; its failure said, a
   silent one leaving a watched item asleep */
function wake(print: string): void {
  const w = spawnSync("node", [fileURLToPath(new URL("./progress/wake.ts", import.meta.url))], { input: print, encoding: "utf8" });
  process.stdout.write(w.stdout ?? "");
  if (w.status !== 0) console.log("wake failed (" + (w.status ?? w.signal) + "): " + (w.stderr || w.error?.message || "").trim());
}
/* the ledger a child, as the wake is, so an edit to it is not the run's
   input */
const LEDGER = fileURLToPath(new URL("./heliumLedger.ts", import.meta.url));
const ports: VerdictPorts = {
  player: { play, clear: (name) => { for (const w of windowsOf(name)) clearProfile(w); } },
  fingerprint: (name) => fingerprint(inputsFor(name)),
  files: L,
  tree: () => spawnSync("node", [LEDGER, "--tree"], { encoding: "utf8" }).stdout,
  record: (r) => {
    const l = spawnSync("node", [LEDGER], { input: JSON.stringify(r), encoding: "utf8" });
    return l.status === 0 ? null : "ledger failed (" + (l.status ?? l.signal) + "): " + (l.stderr || l.error?.message || "").trim();
  },
  wake,
  print: (line) => { console.log(line); },
  clock: () => process.uptime(),
};
const heldTo = Object.fromEntries(Object.entries(TOOLS).flatMap(([n, t]) => (t.heldTo ? [[n, t.heldTo]] : [])));
if (approve) for (const name of run) approveOne(name);
else failed = await verdict({ asked: run, together: TOGETHER, heldTo, steps: !!process.env.STEPS, windows: WINDOWS }, ports);
process.exit(failed ? 1 : 0);
