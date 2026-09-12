// The two apps' runs compared STEP BY STEP: each step's fields, the
// successor's against the current app's, with the screen line left out
// (its panel names and view flags have no exact twin). Reads the two
// scrubbed outputs helium-approve.mjs writes — tools/expected/corner.writer.txt
// and tools/expected/corner.received.txt or .approved.txt — and prints one
// line per differing field, then the steps one side lacks. Written
// 2026-09-12 so the first comparison could be read whole.
import { readFileSync, existsSync } from "node:fs";
const parse = (path) => { const out = new Map(); for (const line of readFileSync(path, "utf8").split("\n")) { const m = /^(.*?): (\{.*\}|".*")$/.exec(line); if (!m) continue; let v; try { v = JSON.parse(m[2]); } catch { continue; } if (v && typeof v === "object") delete v.screen; out.set(m[1], v); } return out; };
/* the decided differences: `label · field · why`, a `*` field covering the step */
const accepted = new Set();
if (existsSync("tools/expected/corner.differences.txt")) for (const line of readFileSync("tools/expected/corner.differences.txt", "utf8").split("\n")) { if (!line || line.startsWith("#")) continue; const [label, field] = line.split(" · "); accepted.add(label + " · " + field); }
const isAccepted = (label, k) => accepted.has(label + " · " + k) || accepted.has(label + " · *");
const writer = parse("tools/expected/corner.writer.txt");
const succ = parse(existsSync("tools/expected/corner.received.txt") ? "tools/expected/corner.received.txt" : "tools/expected/corner.approved.txt");
let same = 0, diff = 0, decided = 0;
for (const [label, w] of writer) {
  if (!succ.has(label)) { if (isAccepted(label, "*")) { decided++; continue; } console.log("only the current app: " + label); diff++; continue; }
  const s = succ.get(label);
  const keys = new Set([...Object.keys(w && typeof w === "object" ? w : { value: w }), ...Object.keys(s && typeof s === "object" ? s : { value: s })]);
  let any = false;
  for (const k of keys) {
    const a = JSON.stringify((w && typeof w === "object" ? w : { value: w })[k]), b = JSON.stringify((s && typeof s === "object" ? s : { value: s })[k]);
    if (a !== b && isAccepted(label, k)) { decided++; continue; }
    if (a !== b) { if (!any) { console.log("\n" + label); any = true; } console.log("  " + k + ": current " + (a ?? "—").slice(0, 160) + "\n  " + " ".repeat(k.length) + "  successor " + (b ?? "—").slice(0, 160)); }
  }
  if (any) diff++; else same++;
}
for (const label of succ.keys()) if (!writer.has(label)) { if (isAccepted(label, "*")) { decided++; continue; } console.log("only the successor: " + label); diff++; }
console.log("\n" + same + " steps read the same, " + decided + " decided differences, " + diff + " steps differ");
process.exit(diff ? 1 : 0);
