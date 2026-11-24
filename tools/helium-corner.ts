// `node tools/helium-corner.ts [profileDir] [screenshot.png]`
import { installWriteWatcher, installAlertReaders } from "./adapters/inPage.ts";
import { chromium } from "playwright-core";
import * as A from "./adapters/app.ts";
import { runSteps, TODAY } from "./helium-steps.ts";
import { current } from "./steps/kit.ts";
import { shardTrailer } from "./heliumShards.ts";
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
const logs: [string, string][] = [];
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
await installAlertReaders(ctx);
await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
await ctx.clock.install({ time: new Date(TODAY + "T12:00:00") });
await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));
await installWriteWatcher(ctx);
await ctx.addInitScript(() => {
  /* the editor's last writes, for a selection the editor redrew */
  window.__muts = [];
  addEventListener("DOMContentLoaded", () => new MutationObserver((rs) => {
    for (const r of rs) {
      const el = r.target instanceof Element ? r.target : r.target.parentElement;
      if (!el?.closest(".ProseMirror")) continue;
      window.__muts.push({ t: Math.round(performance.now()), type: r.type, attr: r.attributeName ?? "", on: el.tagName.toLowerCase() + "." + [...el.classList].join(".") });
      if (window.__muts.length > 6) window.__muts.shift();
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, characterData: true }));
  window.__selCalls = [];
  for (const m of ["addRange", "removeAllRanges", "collapse", "setBaseAndExtent", "extend", "empty"] as const) {
    const was = Selection.prototype[m] as (...a: unknown[]) => void;
    (Selection.prototype as unknown as Record<string, unknown>)[m] = function (this: Selection, ...a: unknown[]) {
      const had = !this.isCollapsed, out = was.apply(this, a), emptied = had && this.isCollapsed;
      /* a stack only for the call that empties a selection: one on every
         call costs a stack capture per selection update */
      const by = emptied ? (new Error().stack ?? "").split("\n").slice(2, 12).map((l) => l.trim().replace(/\(?file:\/\/\S*\//, "(")).join(" < ") : "";
      window.__selCalls.push({ m, t: Math.round(performance.now()), collapsed: this.isCollapsed, by });
      if (window.__selCalls.length > 8) window.__selCalls.shift();
      return out;
    };
  }
});
const page = await ctx.newPage();
page.on("console", (m) => logs.push([current, m.type() + ": " + m.text()]));
page.on("pageerror", (e) => logs.push([current, "pageerror: " + e.message]));
/* STEPS=a,b runs the named sections, a development run never the verdict's,
   the whole value a name too, for a section whose name holds a comma;
   ORDER=reverse all of them last first; SHARD=k/n every n-th from the
   k-th, its console lines printed by section */
const shard = /^(\d+)\/(\d+)$/.exec(process.env.SHARD ?? "");
const played = await runSteps(page, ctx, { screenshot: process.argv[3], only: process.env.STEPS ? [process.env.STEPS, ...process.env.STEPS.split(",")] : null, reverse: process.env.ORDER === "reverse", ...(shard ? { shard: [+shard[1], +shard[2]] as [number, number] } : {}) });
await ctx.close();
if (shard) process.stdout.write(shardTrailer(played.map((n) => logs.filter(([s]) => s === n).map(([, t]) => t))));
else console.log("console:", logs.length ? logs.map(([, t]) => t).join("\n") : "(nothing)");
