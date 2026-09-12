// The two apps' runs compared STEP BY STEP: each step's fields, the
// successor's against the current app's, with the screen line left out
// (its panel names and view flags have no exact twin). Reads the two
// scrubbed outputs helium-approve.mjs writes — tools/expected/corner.writer.txt
// and the successor's approved copy, or the file named as the argument
// (`node tools/helium-compare.mjs [successorRun]`) — and prints which it
// read, one line per differing field, then the steps one side lacks.
// Written 2026-09-12 so the first comparison could be read whole. A
// label that repeats — five steps are "Escape" — is keyed with its
// count from the second on, "Escape (2)", so every occurrence is
// compared (until the same day's review the last overwrote the rest);
// a decided difference names the step by that key.
import { readFileSync, existsSync } from "node:fs";
const parse = (path) => { const out = new Map(), seen = new Map(); for (const line of readFileSync(path, "utf8").split("\n")) { const m = /^(.*?): (\{.*\}|".*")$/.exec(line); if (!m) continue; let v; try { v = JSON.parse(m[2]); } catch { continue; } if (v && typeof v === "object") delete v.screen; const n = (seen.get(m[1]) || 0) + 1; seen.set(m[1], n); out.set(n > 1 ? m[1] + " (" + n + ")" : m[1], v); } return out; };
/* the decided differences: `label · field · why`, a `*` field covering the step */
const accepted = new Set();
if (existsSync("tools/expected/corner.differences.txt")) for (const line of readFileSync("tools/expected/corner.differences.txt", "utf8").split("\n")) { if (!line || line.startsWith("#")) continue; const [label, field] = line.split(" · "); accepted.add(label + " · " + field); }
const isAccepted = (label, k) => accepted.has(label + " · " + k) || accepted.has(label + " · *");
const writer = parse("tools/expected/corner.writer.txt");
const succPath = process.argv[2] || "tools/expected/corner.approved.txt";
if (!existsSync(succPath)) { console.error("no such run: " + succPath); process.exit(2); }
console.log("the successor's run: " + succPath);
const succ = parse(succPath);
/* STEPS in one count and FIELDS in another: a step is identical, differs
   only where a decision is listed, or is open; the fields are tallied
   beside them (a summary that summed the two was misread 2026-09-12) */
let identical = 0, decidedOnly = 0, open = 0, decidedFields = 0, openFields = 0;
for (const [label, w] of writer) {
  if (!succ.has(label)) { if (isAccepted(label, "*")) { decidedOnly++; continue; } console.log("only the current app: " + label); open++; continue; }
  const s = succ.get(label);
  const keys = new Set([...Object.keys(w && typeof w === "object" ? w : { value: w }), ...Object.keys(s && typeof s === "object" ? s : { value: s })]);
  let any = false, decidedHere = 0;
  for (const k of keys) {
    const a = JSON.stringify((w && typeof w === "object" ? w : { value: w })[k]), b = JSON.stringify((s && typeof s === "object" ? s : { value: s })[k]);
    if (a !== b && isAccepted(label, k)) { decidedFields++; decidedHere++; continue; }
    if (a !== b) { openFields++; if (!any) { console.log("\n" + label); any = true; } console.log("  " + k + ": current " + (a ?? "—").slice(0, 160) + "\n  " + " ".repeat(k.length) + "  successor " + (b ?? "—").slice(0, 160)); }
  }
  if (any) open++; else if (decidedHere) decidedOnly++; else identical++;
}
for (const label of succ.keys()) if (!writer.has(label)) { if (isAccepted(label, "*")) { decidedOnly++; continue; } console.log("only the successor: " + label); open++; }
console.log("\nsteps: " + (identical + decidedOnly + open) + " — " + identical + " identical, " + decidedOnly + " differing only where a decision is listed, " + open + " open");
console.log("fields: " + decidedFields + " decided, " + openFields + " open");
process.exit(open ? 1 : 0);
