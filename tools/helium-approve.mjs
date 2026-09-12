// The headless tools under a VERDICT: each tool's whole printed run is
// compared against its approved copy in tools/expected/, the volatile
// bits scrubbed — a fade's opacity, a whisper still on screen at an
// incidental step, today's date. A difference writes the received copy
// beside the approved one, prints the diff and exits 1; `--approve` makes
// the received copy the approved one, which is a judgement to be made
// after reading it. Decided 2026-09-12, asked: the tools printed and a
// reader judged, so a seam only they cover (the walk's order from the
// session) could move without warning under `npm test`.
// `node tools/helium-approve.mjs [--approve] [corner|bridge ...]`
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const TOOLS = { corner: "tools/helium-corner.mjs", bridge: "tools/helium-bridge.mjs" };
/* `--writer` runs the CURRENT APP's driver over the same steps and keeps
   its scrubbed output as tools/expected/corner.writer.txt — the behaviour
   the successor is measured against (helium-compare.mjs) */
const WRITER = "tools/helium-writer.mjs";
const args = process.argv.slice(2);
const approve = args.includes("--approve");
const names = args.filter((a) => a in TOOLS);
const run = names.length ? names : Object.keys(TOOLS);

const today = new Date();
const todayKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
/* today's label as the crumb spells it, "Tuesday, 8 September 2026" — the
   seeded days keep their own fixed labels */
const todayLabel = today.toLocaleDateString("en-US", { weekday: "long" }) + ", " + today.getDate() + " " + today.toLocaleDateString("en-GB", { month: "long" }) + " " + today.getFullYear();
function scrub(text) {
  return text
    .replace(/"opacity":"[0-9.e-]+"/g, '"opacity":"[fading]"')
    /* the corner's text in the screen line is a whisper's clock against
       the tool's waits: the steps that care read the corner themselves */
    .replace(/· corner \\"(?:[^"\\]|\\.)*\\"/g, "· corner [whatever stood]")
    .replace(new RegExp(todayKey, "g"), "[today]")
    .split(todayLabel).join("[today's label]")
    .replace(/file:\/\/\/[^"\\ ]*\/(dist|writer)\/index\.html/g, "file:///[app]/index.html");
}
const env = { ...process.env, NODE_OPTIONS: "" };
if (args.includes("--writer")) {
  spawnSync("pkill", ["-f", "gesta-helium-writer-profile"]);
  const prof = resolve(tmpdir(), "gesta-helium-writer-profile");
  for (let i = 0; i < 20; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
  const r = spawnSync("node", [WRITER], { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  /* a child killed by a signal has a null status: read as clean, its
     truncated run became the reference (the 2026-09-12 review) */
  const bad = r.status || r.signal;
  writeFileSync(resolve("tools/expected/corner.writer.txt"), scrub((r.stdout || "") + (bad ? "\nEXIT " + bad + "\n" + (r.stderr || "") : "")));
  console.log("writer: " + (r.stdout || "").split("\n").length + " lines to tools/expected/corner.writer.txt" + (bad ? " — FAILED, " + bad : ""));
  process.exit(bad ? (r.status || 1) : 0);
}
let failed = 0;
const build = spawnSync("npm", ["run", "build"], { env, encoding: "utf8" });
if (build.status !== 0) { console.error(build.stdout, build.stderr); process.exit(1); }
for (const name of run) {
  /* the last run's browser may still be exiting: kill, then retry the
     delete for a few seconds rather than fail on a held directory */
  spawnSync("pkill", ["-f", "gesta-helium-" + name + "-profile"]);
  const prof = resolve(tmpdir(), "gesta-helium-" + name + "-profile");
  for (let i = 0; i < 20; i++) { try { rmSync(prof, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
  const r = spawnSync("node", [TOOLS[name]], { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const bad = r.status || r.signal;
  const received = scrub((r.stdout || "") + (bad ? "\nEXIT " + bad + "\n" + (r.stderr || "") : ""));
  const approvedPath = resolve("tools/expected/" + name + ".approved.txt"), receivedPath = resolve("tools/expected/" + name + ".received.txt");
  const approved = existsSync(approvedPath) ? readFileSync(approvedPath, "utf8") : null;
  /* a run that died is never the approved copy, whatever the flag */
  if (approve && bad) { failed++; writeFileSync(receivedPath, received); console.log(name + ": FAILED (" + bad + "), not approved; see " + receivedPath); continue; }
  if (approve) { writeFileSync(approvedPath, received); rmSync(receivedPath, { force: true }); console.log(name + ": approved (" + received.split("\n").length + " lines)"); continue; }
  if (approved === received) { rmSync(receivedPath, { force: true }); console.log(name + ": ok"); continue; }
  failed++;
  writeFileSync(receivedPath, received);
  console.log(name + ": DIFFERS from " + approvedPath + (approved === null ? " (no approved copy yet)" : ""));
  const d = spawnSync("diff", ["-u", approvedPath, receivedPath], { encoding: "utf8" });
  console.log((d.stdout || "").split("\n").slice(0, 80).join("\n"));
  console.log("read tools/expected/" + name + ".received.txt; if it is right, `node tools/helium-approve.mjs --approve " + name + "`" + (name === "corner" ? "; to compare it as it stands, `node tools/helium-compare.mjs tools/expected/corner.received.txt`" : ""));
}
process.exit(failed ? 1 : 0);
