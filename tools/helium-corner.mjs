// The successor in headless Helium over a fresh profile: the shared steps
// (helium-steps.mjs) played over the successor's adapter. Prints each
// step's reading and the screen after it, then the console; screenshots
// when given a path. The approved output is tools/expected/corner.approved.txt
// (helium-approve.mjs). `node tools/helium-corner.mjs [profileDir] [screenshot.png]`.
import { chromium } from "playwright-core";
import * as A from "./adapters/successor.mjs";
import { runSteps } from "./helium-steps.mjs";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = process.argv[2] || A.profile;
const logs = [];
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
const page = await ctx.newPage();
page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await runSteps(page, ctx, { ...A, pill: true }, { screenshot: process.argv[3] });
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
