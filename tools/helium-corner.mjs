// The successor in headless Helium over a fresh profile: the shared steps
// (helium-steps.mjs) played over the successor's adapter. Prints each
// step's reading and the screen after it, then the console; screenshots
// when given a path. The approved output is tools/expected/corner.approved.txt
// (helium-approve.mjs). `node tools/helium-corner.mjs [profileDir] [screenshot.png]`.
import { chromium } from "playwright-core";
import * as A from "./adapters/successor.mjs";
import { runSteps, TODAY } from "./helium-steps.mjs";
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = process.argv[2] || A.profile;
/* the tool's own profile starts empty, as the verdict's does: a development
   run found the last run's entries still stored (2026-10-05, the
   author-filing record); a profile passed in is the caller's to keep */
if (PROFILE === A.profile) {
  spawnSync("pkill", ["-f", basename(PROFILE)]);
  for (let i = 0; i < 20; i++) { try { rmSync(PROFILE, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
}
const logs = [];
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));
const page = await ctx.newPage();
page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
/* STEPS=a,b runs the first section and the named ones: a development run, never the verdict's */
await runSteps(page, ctx, { ...A, pill: true }, { screenshot: process.argv[3], only: process.env.STEPS ? process.env.STEPS.split(",") : null });
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
