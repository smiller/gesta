// The bridge in headless Helium over one fresh profile: seed the fixtures
// as entries, open each by hash and compare the editor's markdown with the
// store's, refuse an unknown book, then TYPE into an entry, wait past the
// debounce, relaunch and read the text back. `node tools/helium-bridge.mjs`
import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = resolve("tools/out/helium-bridge-profile");
const PAGE = "file://" + resolve("dist/index.html");
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
const read = (page) => page.evaluate(() => ({
  entry: document.documentElement.dataset.entry, store: document.documentElement.dataset.store,
  same: document.getElementById("same")?.textContent, status: document.getElementById("status")?.textContent,
  first: document.querySelector("#editor .ProseMirror")?.firstElementChild?.textContent?.slice(0, 60),
  images: [...document.querySelectorAll("#editor img")].map((i) => (i.getAttribute("src") || "").slice(0, 30) + (i.dataset.missing ? " MISSING" : "")),
}));
async function launch(url, fn) {
  const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true });
  const page = await ctx.newPage();
  const logs = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.dataset.entry !== undefined, null, { timeout: 15000 }).catch(() => logs.push("no entry opened"));
  const out = await fn(page);
  if (logs.length) out.logs = logs;
  await ctx.close();
  return out;
}
const say = (label, o) => console.log(label.padEnd(34), JSON.stringify(o));
say("seed, open #page/Horace", await launch(PAGE + "?store=seed#page/Horace", read));
say("open a book page", await launch(PAGE + "#bookshelf/Browning,%20Robert/Pippa%20Passes", read));
say("open a day", await launch(PAGE + "#2026-09-06", read));
say("an unknown book is refused", await launch(PAGE + "#bookshelf/Nobody/Nothing", read));
say("an unknown page mints on visit", await launch(PAGE + "#page/Brand%20New", read));
say("type, wait past the debounce", await launch(PAGE + "#page/Brand%20New", async (page) => {
  await page.click("#editor .ProseMirror");
  await page.keyboard.type("Typed in headless Helium.");
  await page.waitForFunction(() => document.getElementById("status")?.textContent === "saved", null, { timeout: 5000 }).catch(() => {});
  return read(page);
}));
say("relaunch: the text came back", await launch(PAGE + "#page/Brand%20New", read));
say("an unknown book under a known author", await launch(PAGE + "#bookshelf/Browning,%20Robert/Nothing", read));
say("walk: next from the earlier day", await launch(PAGE + "#2026-09-05", async (page) => {
  await page.keyboard.press("Control+Meta+Period");
  await page.waitForTimeout(500);
  return read(page);
}));
