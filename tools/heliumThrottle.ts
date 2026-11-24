// `node tools/heliumThrottle.ts <rate> [windows]`
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { orderDifferences } from "./heliumOrder.ts";
import { built, clearProfile, playDealt, playEnv, windowNames } from "./heliumPlay.ts";

/* the corner's steps with every page's CPU `rate` times slower: a section
   that reads otherwise than the approved copy waits on a clock somewhere,
   which a loaded machine reaches now and then and this every time */
const rate = +(process.argv[2] ?? 4), windows = +(process.argv[3] ?? 5);
const env = playEnv(process.env, {}, rate);
built(["build"], env);
for (const w of windowNames("throttle", windows)) clearProfile(w);
const received = await playDealt({ name: "throttle", script: "tools/helium-corner.ts", windows, env, shown: true });
const approved = readFileSync("tools/expected/corner.approved.txt", "utf8");
mkdirSync("tools/out/throttle", { recursive: true });
const kept = "tools/out/throttle/" + (process.env.ORDER === "reverse" ? "order" : "corner") + "-" + rate + "x.txt";
writeFileSync(kept, received);
const otherwise = orderDifferences(approved, received);
for (const s of otherwise) console.log("read otherwise at " + rate + "x — " + s);
for (const c of received.match(/^EXIT .*/gm) ?? []) console.log("a window ended early: " + c);
console.log(otherwise.length + " sections read otherwise at " + rate + "x; the run kept at " + kept);
