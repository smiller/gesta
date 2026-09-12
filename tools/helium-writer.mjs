// The CURRENT APP (../writer) in headless Helium over a fresh profile: the
// shared steps played over the writer's adapter, so its output is the
// approved behaviour the successor is measured against.
// `node tools/helium-writer.mjs`
import { chromium } from "playwright-core";
import * as A from "./adapters/writer.mjs";
import { runSteps } from "./helium-steps.mjs";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const logs = [];
const ctx = await chromium.launchPersistentContext(A.profile, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
try { await runSteps(page, ctx, A, {}); }
catch (e) { console.log("STOPPED:", String(e).split("\n").slice(0, 3).join(" ")); }
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
