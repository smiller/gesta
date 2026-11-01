// The reader build in headless Helium over a fresh profile under tools/out:
// launched with nothing kept, a bundle picked through "open backup", then
// relaunched to read what was kept. `node tools/helium-reader.mjs [zip]`,
// the zip tools/readerBundle.ts writes by default.
import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = resolve("tools/out/helium-reader-profile");
const PAGE = "file://" + resolve("dist-reader/index.html");
const ZIP = resolve(process.argv[2] || "tools/out/gesta.zip");
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1024, height: 1366 } });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
const screen = () => page.evaluate(() => ({
  entry: document.documentElement.dataset.entry, store: document.documentElement.dataset.store,
  held: document.querySelector(".held")?.textContent, corner: document.querySelector(".saved")?.textContent?.trim(),
  editable: document.querySelector(".ProseMirror")?.getAttribute("contenteditable"),
  tools: [...document.querySelectorAll(".site-tools > :not([hidden])")].map((e) => e.textContent.trim()),
  text: document.querySelector(".ProseMirror")?.textContent.slice(0, 80),
}));
const settled = () => page.waitForFunction(() => /all|fail/.test(document.documentElement.dataset.probe || ""), null, { timeout: 60000 }).catch(() => logs.push("no warm"));
await page.goto(PAGE + "#page/Horace");
await settled();
console.log("bare:", JSON.stringify(await screen()));
const t0 = Date.now();
await page.setInputFiles(".site-tools input[type=file]", ZIP);
await page.waitForFunction(() => /bundle/.test(document.documentElement.dataset.probe || ""), null, { timeout: 120000 }).catch(() => logs.push("no bundle"));
const opened = Date.now() - t0;
await settled();
console.log("picked (" + opened + " ms to the bundle, " + (Date.now() - t0) + " ms to the warm):", JSON.stringify(await screen()));
await ctx.close();
const ctx2 = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1024, height: 1366 } });
const p2 = await ctx2.newPage();
p2.on("console", (m) => logs.push(m.text()));
p2.on("pageerror", (e) => logs.push("pageerror: " + e.message));
const t1 = Date.now();
await p2.goto(PAGE + "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201");
await p2.waitForFunction(() => /all|fail/.test(document.documentElement.dataset.probe || ""), null, { timeout: 60000 }).catch(() => logs.push("no warm 2"));
console.log("relaunched (" + (Date.now() - t1) + " ms to the warm):", JSON.stringify(await p2.evaluate(() => ({
  entry: document.documentElement.dataset.entry, store: document.documentElement.dataset.store, held: document.querySelector(".held")?.textContent,
  text: document.querySelector(".ProseMirror")?.textContent.slice(0, 80), heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6) + " MB",
}))));
const look = (label, extra = () => ({})) => p2.evaluate((x) => ({
  entry: document.documentElement.dataset.entry, editable: document.querySelector(".ProseMirror")?.getAttribute("contenteditable"),
  corner: document.querySelector(".saved.show")?.textContent?.trim() || "", hit: [...document.querySelectorAll(".jump-hit")].map((e) => e.textContent).join("|"),
  y: Math.round(scrollY), lines: !document.querySelector(".page-lines")?.hidden,
}), null).then(async (r) => console.log(label + ":", JSON.stringify({ ...r, ...(await extra()) })));
const rest = () => p2.waitForTimeout(400);
await p2.goto(PAGE + "#bookshelf/Milton%2C%20John/Paradise%20Lost");
await rest();
await p2.click(".ProseMirror a");
await rest();
await look("a contents link tapped");
await p2.click(".page-search > summary");
await p2.fill(".search-input", "darkness visible");
const t2 = Date.now();
await p2.waitForSelector(".search-results li.hit", { timeout: 90000 }).catch(() => logs.push("no hits"));
console.log("the first search's index built in " + (Date.now() - t2) + " ms");
const rows = await p2.$$eval(".search-results li.hit", (l) => l.length);
await p2.click(".search-results li.hit");
await p2.waitForTimeout(800);
await look("search 'darkness visible', the first of " + rows + " rows tapped");
const before = await p2.evaluate(() => document.querySelector(".ProseMirror").textContent.length);
await p2.click(".ProseMirror p");
await p2.keyboard.type("xyz");
await p2.keyboard.press("Enter");
await rest();
await look("a line tapped, xyz and Enter typed", () => p2.evaluate((b) => ({ changed: document.querySelector(".ProseMirror").textContent.length !== b, focus: document.activeElement?.className }), before));
await p2.keyboard.press("Control+Meta+m");
await rest();
await look("⌃⌘M");
await p2.goto(PAGE + "#2026-05-07");
await p2.waitForTimeout(1500);
await look("a day with a picture", () => p2.evaluate(() => ({ pictures: [...document.querySelectorAll(".ProseMirror img:not(.ProseMirror-separator)")].map((i) => i.naturalWidth) })));
const crumb = () => p2.evaluate(() => ({ crumb: document.querySelector(".datelabel")?.textContent.replace(/\s+/g, " ").trim(), walk: [...document.querySelectorAll(".walk")].map((b) => { const r = b.getBoundingClientRect(); return b.textContent + " " + Math.round(r.width) + "×" + Math.round(r.height); }) }));
await p2.click("button[aria-label='Next entry']");
await p2.waitForTimeout(800);
await look("› tapped on 2026-05-07", crumb);
await p2.click("button[aria-label='Previous entry']");
await p2.waitForTimeout(800);
await look("‹ tapped after it", crumb);
await p2.goto(PAGE + "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201");
await rest();
await p2.click("button[aria-label='Next entry']");
await p2.waitForTimeout(800);
await look("› tapped on Paradise Lost Book 1", crumb);
await p2.click("button[aria-label='List the authors on the bookshelf']");
await rest();
await look("the bookshelf list", () => p2.evaluate(() => ({ rows: document.querySelectorAll(".pages a").length, buttons: [...document.querySelectorAll(".pages button")].map((b) => b.textContent) })));
await p2.keyboard.press("Escape");
await p2.click(".page-goto > summary");
await rest();
await look("Go to", () => p2.evaluate(() => ({ selects: document.querySelectorAll(".page-goto select").length })));
await ctx2.close();
console.log("console:", logs.join(" / "));
