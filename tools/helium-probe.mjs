// Helium by executable path over ONE persistent profile, driven by
// playwright-core: opens the built page at each query string given, waits
// for the root's data-store attribute, prints it with data-probe and the
// console. `node tools/helium-probe.mjs '?store=write' '' '?store=write'`
// is phase 2's persistence question: write, relaunch and read, write.
// Headless dumps could not answer it (MEASURED 2026-09-07):
// --virtual-time-budget dumps before IndexedDB's real-time I/O settles,
// and --timeout never exited. The profile lives under tools/out, so a run
// never touches Sean's own Helium profile.
import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = resolve("tools/out/helium-profile");
const PAGE = "file://" + resolve("dist/index.html");
const queries = process.argv.slice(2);
if (queries.includes("--fresh")) { rmSync(PROFILE, { recursive: true, force: true }); queries.splice(queries.indexOf("--fresh"), 1); }
mkdirSync(PROFILE, { recursive: true });
for (const qs of queries.length ? queries : [""]) {
  const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await page.goto(PAGE + qs);
  try {
    await page.waitForFunction(() => document.documentElement.dataset.store !== undefined, null, { timeout: 15000 });
  } catch { logs.push("timed out waiting for data-store"); }
  const got = await page.evaluate(() => ({ store: document.documentElement.dataset.store, probe: document.documentElement.dataset.probe,
    entry: document.documentElement.dataset.entry, status: document.querySelector(".saved.show")?.textContent || "" }));
  console.log("run [" + qs + "]", JSON.stringify(got), "| console:", logs.join(" / "));
  await ctx.close();
}
