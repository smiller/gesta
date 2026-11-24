// `node tools/heliumThrottle.ts <rate> [windows]`
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { freshProfile } from "./adapters/launch.ts";
import { merged } from "./heliumShards.ts";
import { scrub } from "./heliumVerdict.ts";
import { orderDifferences } from "./heliumOrder.ts";

/* the corner's steps with every page's CPU `rate` times slower: a section
   that reads otherwise than the approved copy waits on a clock somewhere,
   which a loaded machine reaches now and then and this every time */
const rate = +(process.argv[2] ?? 4), windows = +(process.argv[3] ?? 5);
const profile = (k: number): string => resolve(tmpdir(), "gesta-helium-throttle-" + k + "-profile");
function playWindow(k: number): Promise<string> {
  freshProfile(profile(k));
  return new Promise((done) => {
    let out = "";
    const child = spawn("node", ["tools/helium-corner.ts", profile(k)], { env: { ...process.env, THROTTLE: String(rate), SHARD: k + "/" + windows } });
    child.stdout.on("data", (b) => { out += b; });
    child.on("close", () => done(out));
  });
}
const outs = await Promise.all([...Array(windows).keys()].map(playWindow));
const received = scrub(merged(outs));
const approved = readFileSync("tools/expected/corner.approved.txt", "utf8");
mkdirSync("tools/out/throttle", { recursive: true });
const kept = "tools/out/throttle/" + (process.env.ORDER === "reverse" ? "order" : "corner") + "-" + rate + "x.txt";
writeFileSync(kept, received);
const otherwise = orderDifferences(approved, received);
for (const s of otherwise) console.log("read otherwise at " + rate + "x — " + s);
console.log(otherwise.length + " sections read otherwise at " + rate + "x; the run kept at " + kept);
