// The CURRENT APP (../writer) in headless Helium over a fresh profile: the
// shared steps played over the writer's adapter, so its output is the
// approved behaviour the successor is measured against.
// `node tools/helium-writer.ts`
import { chromium } from "playwright-core";
import * as A from "./adapters/writer.ts";
import { runSteps, TODAY, type Adapter } from "./helium-steps.ts";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const logs: string[] = [];
const ctx = await chromium.launchPersistentContext(A.profile, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") logs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
/* the old app's adapter answers the steps as they stood when it was frozen;
   a reader added since is the successor's alone, its step never played here */
try { await runSteps(page, ctx, A as unknown as Adapter, {}); }
catch (e) { console.log("STOPPED:", String(e).split("\n").slice(0, 3).join(" ")); }
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
