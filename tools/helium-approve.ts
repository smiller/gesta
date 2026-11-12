// The headless tools under a VERDICT: each tool's whole printed run is
// compared against its approved copy in tools/expected/, the volatile
// bits scrubbed — a fade's opacity, a whisper still on screen at an
// incidental step, the app's path. A difference writes the received copy
// beside the approved one, prints the diff and exits 1; `--approve` makes
// that received copy the approved one without playing again, which is a
// judgement to be made after reading it, and refuses a run that failed or
// whose inputs have moved. Decided 2026-09-12, asked: the tools printed and a
// reader judged, so a seam only they cover (the walk's order from the
// session) could move without warning under `npm test`.
// `node tools/helium-approve.ts [--approve] [corner|bridge|reader ...]`
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { fingerprint, mayReuse, approvalRefusal, stamped } from "./heliumStamp.ts";

const TOOLS: Record<string, string> = { corner: "tools/helium-corner.ts", bridge: "tools/helium-bridge.ts", reader: "tools/helium-reader.ts" };
const args = process.argv.slice(2);
const approve = args.includes("--approve");
const names = args.filter((a) => a in TOOLS);
const run = names.length ? names : Object.keys(TOOLS);

/* today is not scrubbed: the drivers pin the page's clock to
   helium-steps.ts's TODAY since 2026-09-22. The scrub used to rewrite
   today's key, its crumb label and its day number, and the day number
   was missed until the first verify on another day went red on it. */
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
   adapters, the source files an adapter or the reader's bundle imports,
   the approved copy, and the browser, node and playwright that play it. A run whose inputs
   match a passing run's stamp is not played again; asked 2026-10-17, after
   a commit replayed for seven minutes a run approved minutes before */
const HELIUM_PLIST = "/Applications/Helium.app/Contents/Info.plist";
const file = (p: string) => ({ name: p, bytes: existsSync(p) ? readFileSync(p) : "(missing)" });
function inputsFor(name: string) {
  const helium = (/<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/.exec(readFileSync(HELIUM_PLIST, "utf8")) ?? [])[1] ?? "(unknown)";
  return [
    file("dist/index.html"), file("dist-reader/index.html"),
    ...["tools", "tools/steps", "tools/adapters"].flatMap((d) => readdirSync(d).map((f) => d + "/" + f)).filter(stamped).map(file),
    file("src/store/keys.ts"), file("src/store/store.ts"),
    ...["io", "zip", "files", "plans", "names"].map((m) => file("src/store/" + m + ".ts")),
    file("tools/expected/" + name + ".approved.txt"),
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
for (const name of run) {
  const approvedPath = resolve("tools/expected/" + name + ".approved.txt"), receivedPath = resolve("tools/expected/" + name + ".received.txt");
  if (approve) {
    const received = readOrNull(receivedPath);
    if (received === null && !names.length) continue;
    const refusal = approvalRefusal(received, readOrNull(playedPath(name)), fingerprint(inputsFor(name)));
    if (refusal) { failed++; console.log(name + ": not approved — " + refusal); continue; }
    const d = spawnSync("diff", ["-u", approvedPath, receivedPath], { encoding: "utf8" });
    console.log(d.stdout || "");
    writeFileSync(approvedPath, received!);
    rmSync(receivedPath, { force: true });
    rmSync(playedPath(name), { force: true });
    stamp(name);
    console.log(name + ": approved, the run that was played (" + received!.split("\n").length + " lines)");
    continue;
  }
  const before = readOrNull(stampPath(name));
  if (mayReuse(before, fingerprint(inputsFor(name)), { steps: !!process.env.STEPS })) { console.log(name + ": ok — not replayed, its inputs those of a passing run"); continue; }
  rmSync(stampPath(name), { force: true });
  rmSync(playedPath(name), { force: true });
  /* the last run's browser may still be exiting: kill, then retry the
     delete for a few seconds rather than fail on a held directory */
  spawnSync("pkill", ["-f", "gesta-helium-" + name + "-profile"]);
  const prof = resolve(tmpdir(), "gesta-helium-" + name + "-profile");
  for (let i = 0; i < 20; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
  /* an edit made while it plays is not what it played */
  const played = fingerprint(inputsFor(name));
  const r = spawnSync("node", [TOOLS[name]], { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const bad = r.status || r.signal;
  const received = scrub((r.stdout || "") + (bad ? "\nEXIT " + bad + "\n" + (r.stderr || "") : ""));
  const approved = readOrNull(approvedPath);
  if (approved === received) { rmSync(receivedPath, { force: true }); if (!process.env.STEPS) stamp(name, played); console.log(name + ": ok"); continue; }
  failed++;
  writeFileSync(receivedPath, received);
  if (!process.env.STEPS) { mkdirSync(STAMPS, { recursive: true }); writeFileSync(playedPath(name), played); }
  console.log(name + ": DIFFERS from " + approvedPath + (approved === null ? " (no approved copy yet)" : ""));
  const d = spawnSync("diff", ["-u", approvedPath, receivedPath], { encoding: "utf8" });
  const diffLines = (d.stdout || "").split("\n");
  console.log(diffLines.slice(0, 80).join("\n"));
  if (diffLines.length > 80) console.log("… " + (diffLines.length - 80) + " more lines of the diff: read the received copy whole");
  console.log("read tools/expected/" + name + ".received.txt; if it is right, `node tools/helium-approve.ts --approve " + name + "`");
}
process.exit(failed ? 1 : 0);
