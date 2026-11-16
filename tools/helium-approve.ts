// The headless tools under a VERDICT: each tool's whole printed run is
// compared against its approved copy in tools/expected/, the volatile
// bits scrubbed — a fade's opacity, a whisper still on screen at an
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
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { fingerprint, readByDrivers, DRIVERS } from "./heliumStamp.ts";
import { compared, ledger, type Compared } from "./heliumVerdict.ts";

const profileOf = (name: string): string => resolve(tmpdir(), "gesta-helium-" + name + "-profile");
interface Tool { script: string; args?: string[]; env?: Record<string, string>; heldTo?: string }
const TOOLS: Record<string, Tool> = {
  corner: { script: "tools/helium-corner.ts" },
  order: { script: "tools/helium-corner.ts", args: [profileOf("order")], env: { ORDER: "reverse" }, heldTo: "corner" },
  bridge: { script: "tools/helium-bridge.ts" },
  reader: { script: "tools/helium-reader.ts" },
};
/* played side by side: the two longest, measured to read the same so */
const TOGETHER = [["corner", "order"], ["bridge"], ["reader"]];
const args = process.argv.slice(2);
const approve = args.includes("--approve");
const names = args.filter((a) => a in TOOLS);
const run = names.length ? names : Object.keys(TOOLS);

/* today is pinned, not scrubbed: a scrub of today's key, its crumb label
   and its day number missed the day number until a verify on another day
   went red on it */
function scrub(text: string): string {
  return text
    .replace(/"opacity":"[0-9.e-]+"/g, '"opacity":"[fading]"')
    /* the corner's text in the screen line is a whisper's clock against
       the tool's waits: the steps that care read the corner themselves */
    .replace(/· corner \\"(?:[^"\\]|\\.)*\\"/g, "· corner [whatever stood]")
    .replace(/file:\/\/\/[^"\\ ]*\/dist\/index\.html/g, "file:///[app]/index.html")
    /* a logged Error's frames are the minified build's line and column,
       moved by any change elsewhere in the bundle */
    .replace(/^ +at .*\n/gm, "");
}
const env = { ...process.env, NODE_OPTIONS: "" };
/* WHAT A RUN READS, fingerprinted after the build: the pages (every line of
   the app and its libraries), the fixtures the steps seed, the code its
   drivers reach through their imports, the approved copy, and the browser,
   node and playwright that play it. A run whose inputs match a passing run's stamp is not played
   again: a commit replayed for seven minutes a run approved minutes
   before */
const HELIUM_PLIST = "/Applications/Helium.app/Contents/Info.plist";
const file = (p: string) => ({ name: p, bytes: existsSync(p) ? readFileSync(p) : "(missing)" });
const L = ledger({ expected: resolve("tools/expected"), stamps: resolve("tools/out/helium-pass") });
const approvedOf = (name: string): string => L.approvedPath(TOOLS[name].heldTo ?? name);
function inputsFor(name: string) {
  const helium = (/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/.exec(readFileSync(HELIUM_PLIST, "utf8")) ?? [])[1] ?? "(unknown)";
  return [
    file("dist/index.html"), file("dist-reader/index.html"),
    ...readByDrivers(DRIVERS, (p) => readFileSync(p, "utf8")).map(file),
    ...readdirSync("fixtures").map((f) => file("fixtures/" + f)),
    file(approvedOf(name)),
    { name: "helium", bytes: helium },
    { name: "node", bytes: process.version },
    { name: "playwright-core", bytes: JSON.parse(readFileSync("node_modules/playwright-core/package.json", "utf8")).version },
  ];
}
let failed = 0;
const outputs: string[] = [];
for (const script of ["build", "build:reader"]) {
  const build = spawnSync("npm", ["run", script], { env, encoding: "utf8" });
  if (build.status !== 0) { console.error(build.stdout, build.stderr); process.exit(1); }
}

function approveOne(name: string): void {
  if (TOOLS[name].heldTo) { if (names.includes(name)) { failed++; console.log(name + ": nothing to approve — a section reading otherwise in another order is given its own setup"); } return; }
  if (L.received(name) === null && !names.length) return;
  const fp = fingerprint(inputsFor(name)), refusal = L.refusal(name, fp);
  if (refusal) { failed++; console.log(name + ": not approved — " + refusal); return; }
  console.log(spawnSync("diff", ["-u", L.approvedPath(name), L.receivedPath(name)], { encoding: "utf8" }).stdout || "");
  console.log(name + ": approved, the run that was played (" + L.approve(name, fp).split("\n").length + " lines)");
}
/* the last run's browser may still be exiting: kill, then retry the
   delete for a few seconds rather than fail on a held directory */
function clearProfile(name: string): void {
  spawnSync("pkill", ["-f", "gesta-helium-" + name + "-profile"]);
  for (let i = 0; i < 20; i++) { try { rmSync(profileOf(name), { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
}
function play(tool: Tool): Promise<string> {
  return new Promise((done) => {
    let out = "", err = "", settled = false;
    const finish = (tail: string): void => { if (!settled) { settled = true; done(scrub(out + tail)); } };
    const child = spawn("node", [tool.script, ...(tool.args ?? [])], { env: { ...env, ...tool.env } });
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", (b) => { err += b; });
    child.on("error", (e) => finish("\nEXIT " + e.message + "\n"));
    child.on("close", (code, signal) => { const bad = code || signal; finish(bad ? "\nEXIT " + bad + "\n" + err : ""); });
  });
}
function said(name: string, c: Exclude<Compared, { pass: true }>): string {
  if ("failed" in c) return name + ": FAILED — " + c.failed;
  if ("order" in c) return name + ": DIFFERS in another order — " + c.order.join("; ");
  const d = spawnSync("diff", ["-u", L.approvedPath(name), L.receivedPath(name)], { encoding: "utf8" });
  const diffLines = (d.stdout || "").split("\n");
  return [name + ": DIFFERS from " + L.approvedPath(name) + (c.differs === "new" ? " (no approved copy yet)" : ""), ...diffLines.slice(0, 80),
    ...(diffLines.length > 80 ? ["… " + (diffLines.length - 80) + " more lines of the diff: read the received copy whole"] : []),
    "read tools/expected/" + name + ".received.txt; if it is right, `node tools/helium-approve.ts --approve " + name + "`"].join("\n");
}
interface Playing { name: string; played: string }
/* a run to play, its stamps cleared and its profile emptied before any run
   of its group starts; null where a passing run's stamp stands */
function prepare(name: string): Playing | null {
  /* an edit made while it plays is not what it played */
  const fp = fingerprint(inputsFor(name));
  if (!L.plays(name, fp, !!process.env.STEPS)) { console.log(name + ": ok — not replayed, its inputs those of a passing run"); return null; }
  clearProfile(name);
  return { name, played: fp };
}
/* a run held to another is held to that one's run played beside it, so a
   reading changed on purpose is not taken for an order; else to its copy */
const baselineOf = (name: string, played: Map<string, string>): string | null =>
  played.get(TOOLS[name].heldTo ?? "") ?? L.baseline(TOOLS[name].heldTo ?? name);
function judge({ name, played }: Playing, received: string, baseline: string | null): void {
  outputs.push(received);
  const held = !!TOOLS[name].heldTo, c = compared(received, baseline, held);
  L.after(name, { received, fp: played, steps: !!process.env.STEPS, held }, c);
  if (c.pass === true) { console.log(name + ": ok"); return; }
  failed++;
  console.log(said(name, c));
}
async function playGroup(group: string[]): Promise<void> {
  const runs = group.filter((n) => run.includes(n)).map(prepare).filter((r): r is Playing => r !== null);
  const outs = await Promise.all(runs.map((r) => play(TOOLS[r.name])));
  const played = new Map(runs.map((r, i) => [r.name, outs[i]]));
  for (const r of runs) judge(r, played.get(r.name)!, baselineOf(r.name, played));
}
/* a child, not an import: imported, the progress tools were the run's
   inputs, and an edit to the day's page replayed it; once over every run
   played, and its failure said, a silent one leaving a watched item
   asleep */
function wakeOnce(): void {
  if (!outputs.length) return;
  const w = spawnSync("node", [fileURLToPath(new URL("./progress/wake.ts", import.meta.url))], { input: outputs.join("\n"), encoding: "utf8" });
  process.stdout.write(w.stdout ?? "");
  if (w.status !== 0) console.log("wake failed (" + (w.status ?? w.signal) + "): " + (w.stderr || w.error?.message || "").trim());
}
if (approve) for (const name of run) approveOne(name);
else { for (const group of TOGETHER) await playGroup(group); wakeOnce(); }
process.exit(failed ? 1 : 0);
