// `node tools/helium-corner.ts [profileDir] [screenshot.png]`
import { chromium } from "playwright-core";
import * as A from "./adapters/app.ts";
import { runSteps, TODAY } from "./helium-steps.ts";
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = process.argv[2] || A.profile;
/* the tool's own profile starts empty, as the verdict's does: a development
   run found the last run's entries still stored; a profile passed in is the
   caller's to keep */
if (PROFILE === A.profile) {
  spawnSync("pkill", ["-f", basename(PROFILE)]);
  for (let i = 0; i < 20; i++) { try { rmSync(PROFILE, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); } }
}
const logs: string[] = [];
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));
/* the last edit's time and the store writes still open, for a read of the
   stored text to wait on rather than sleep */
await ctx.addInitScript(() => {
  window.__lastEdit = 0; window.__writes = 0;
  for (const t of ["keydown", "input", "paste", "drop", "cut", "pointerdown", "click"]) addEventListener(t, () => { window.__lastEdit = performance.now(); }, true);
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
    window.__writes++;
    const tx = this.transaction, done = () => { window.__writes--; tx.removeEventListener("complete", done); tx.removeEventListener("error", done); tx.removeEventListener("abort", done); };
    tx.addEventListener("complete", done); tx.addEventListener("error", done); tx.addEventListener("abort", done);
    return put.apply(this, args);
  };
});
const page = await ctx.newPage();
page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
/* STEPS=a,b runs the named sections, a development run never the verdict's;
   ORDER=reverse all of them last first */
await runSteps(page, ctx, { ...A, pill: true }, { screenshot: process.argv[3], only: process.env.STEPS ? process.env.STEPS.split(",") : null, reverse: process.env.ORDER === "reverse" });
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
