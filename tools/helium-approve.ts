// The headless tools under a VERDICT: each tool's whole printed run is
// compared against its approved copy in tools/expected/, the volatile
// bits scrubbed — a fade's opacity, a whisper still on screen at an
// incidental step, the app's path. A difference writes the received copy
// beside the approved one, prints the diff and exits 1; `--approve` makes
// that received copy the approved one without playing again, which is a
// judgement to be made after reading it, and refuses a run that failed or
// whose inputs have moved. Without it a seam only these runs cover could
// move without warning under `npm test`.
// `order` plays the steps last first beside `corner`, held to corner's
// approved copy section by section; it has no copy of its own to approve.
// `node tools/helium-approve.ts [--approve] [corner|order|bridge|reader ...]`
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fingerprint, mayReuse, approvalRefusal, stamped } from "./heliumStamp.ts";
import { orderDifferences } from "./heliumOrder.ts";

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
   the app, its fixtures and its libraries), the drivers, steps and
   adapters, the source files an adapter or the `--mode reader` bundle
   imports, the approved copy, and the browser, node and playwright that
   play it. A run whose inputs match a passing run's stamp is not played
   again: a commit replayed for seven minutes a run approved minutes
   before */
const HELIUM_PLIST = "/Applications/Helium.app/Contents/Info.plist";
const file = (p: string) => ({ name: p, bytes: existsSync(p) ? readFileSync(p) : "(missing)" });
const approvedOf = (name: string): string => resolve("tools/expected/" + (TOOLS[name].heldTo ?? name) + ".approved.txt");
function inputsFor(name: string) {
  const helium = (/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/.exec(readFileSync(HELIUM_PLIST, "utf8")) ?? [])[1] ?? "(unknown)";
  return [
    file("dist/index.html"), file("dist-reader/index.html"),
    ...["tools", "tools/steps", "tools/adapters"].flatMap((d) => readdirSync(d).map((f) => d + "/" + f)).filter(stamped).map(file),
    file("src/store/keys.ts"), file("src/store/store.ts"),
    ...["io", "zip", "files", "plans", "names"].map((m) => file("src/store/" + m + ".ts")),
    file(approvedOf(name)),
    { name: "helium", bytes: helium },
    { name: "node", bytes: process.version },
    { name: "playwright-core", bytes: JSON.parse(readFileSync("node_modules/playwright-core/package.json", "utf8")).version },
  ];
}
const STAMPS = resolve("tools/out/helium-pass");
const stampPath = (name: string): string => resolve(STAMPS, name + ".txt");
const stamp = (name: string, print = fingerprint(inputsFor(name))): void => { mkdirSync(STAMPS, { recursive: true }); writeFileSync(stampPath(name), print); };
let failed = 0;
for (const script of ["build", "build:reader"]) {
  const build = spawnSync("npm", ["run", script], { env, encoding: "utf8" });
  if (build.status !== 0) { console.error(build.stdout, build.stderr); process.exit(1); }
}
const readOrNull = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf8") : null);
const playedPath = (name: string): string => resolve(STAMPS, name + ".played.txt");
const receivedOf = (name: string): string => resolve("tools/expected/" + name + ".received.txt");

function approveOne(name: string): void {
  const receivedPath = receivedOf(name);
  if (TOOLS[name].heldTo) { if (names.includes(name)) { failed++; console.log(name + ": nothing to approve — a section reading otherwise in another order is given its own setup"); } return; }
  const received = readOrNull(receivedPath);
  if (received === null && !names.length) return;
  const refusal = approvalRefusal(received, readOrNull(playedPath(name)), fingerprint(inputsFor(name)));
  if (refusal) { failed++; console.log(name + ": not approved — " + refusal); return; }
  const d = spawnSync("diff", ["-u", approvedOf(name), receivedPath], { encoding: "utf8" });
  console.log(d.stdout || "");
  writeFileSync(approvedOf(name), received!);
  rmSync(receivedPath, { force: true });
  rmSync(playedPath(name), { force: true });
  stamp(name);
  console.log(name + ": approved, the run that was played (" + received!.split("\n").length + " lines)");
}
/* the last run's browser may still be exiting: kill, then retry the
   delete for a few seconds rather than fail on a held directory */
function clearProfile(name: string): void {
  spawnSync("pkill", ["-f", "gesta-helium-" + name + "-profile"]);
  for (let i = 0; i < 20; i++) { try { rmSync(profileOf(name), { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
}
function play(tool: Tool): Promise<string> {
  return new Promise((done) => {
    const child = spawn("node", [tool.script, ...(tool.args ?? [])], { env: { ...env, ...tool.env } });
    let out = "", err = "";
    child.stdout.on("data", (b) => { out += b; });
    child.stderr.on("data", (b) => { err += b; });
    child.on("close", (code, signal) => { const bad = code || signal; done(scrub(out + (bad ? "\nEXIT " + bad + "\n" + err : ""))); });
  });
}
function differs(name: string, received: string, approved: string | null): string | null {
  if (TOOLS[name].heldTo) {
    const off = approved === null ? ["(no approved copy)"] : orderDifferences(approved, received);
    return off.length ? name + ": DIFFERS in another order — " + off.join("; ") : null;
  }
  if (approved === received) return null;
  const d = spawnSync("diff", ["-u", approvedOf(name), receivedOf(name)], { encoding: "utf8" });
  const diffLines = (d.stdout || "").split("\n");
  return [name + ": DIFFERS from " + approvedOf(name) + (approved === null ? " (no approved copy yet)" : ""), ...diffLines.slice(0, 80),
    ...(diffLines.length > 80 ? ["… " + (diffLines.length - 80) + " more lines of the diff: read the received copy whole"] : []),
    "read tools/expected/" + name + ".received.txt; if it is right, `node tools/helium-approve.ts --approve " + name + "`"].join("\n");
}
async function verdictOne(name: string): Promise<void> {
  if (mayReuse(readOrNull(stampPath(name)), fingerprint(inputsFor(name)), { steps: !!process.env.STEPS })) { console.log(name + ": ok — not replayed, its inputs those of a passing run"); return; }
  rmSync(stampPath(name), { force: true });
  rmSync(playedPath(name), { force: true });
  clearProfile(name);
  /* an edit made while it plays is not what it played */
  const played = fingerprint(inputsFor(name));
  const received = await play(TOOLS[name]);
  if (!TOOLS[name].heldTo) writeFileSync(receivedOf(name), received);
  const failure = differs(name, received, readOrNull(approvedOf(name)));
  if (!failure) { rmSync(receivedOf(name), { force: true }); if (!process.env.STEPS) stamp(name, played); console.log(name + ": ok"); return; }
  failed++;
  writeFileSync(receivedOf(name), received);
  if (!process.env.STEPS && !TOOLS[name].heldTo) { mkdirSync(STAMPS, { recursive: true }); writeFileSync(playedPath(name), played); }
  console.log(failure);
}
if (approve) for (const name of run) approveOne(name);
else for (const group of TOGETHER) await Promise.all(group.filter((n) => run.includes(n)).map(verdictOne));
process.exit(failed ? 1 : 0);
