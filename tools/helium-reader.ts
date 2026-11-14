// The `--mode reader` build in headless Helium over a fresh profile:
// launched with nothing kept, a bundle picked through "open backup", then
// relaunched to read what was kept and played. With no argument the bundle
// is made here from fixtures/ and the run is the one under a verdict;
// `node tools/helium-reader.ts <zip>` times a real one instead: the pick,
// the relaunch, the heap, the first search's index.
import { chromium } from "playwright-core";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { zipTo } from "../src/store/io.ts";
import { TODAY } from "./helium-steps.ts";
import type { Page } from "./heliumPage.ts";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = resolve(tmpdir(), "gesta-helium-reader-profile");
const PAGE = "file://" + resolve("dist-reader/index.html");
const TIMED = process.argv[2] ? resolve(process.argv[2]) : null;
const fixture = (name: string): string => readFileSync(resolve("fixtures", name), "utf8");
const PNG = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"));
const FILES = [
  { dir: "bookshelf/Horace/", name: "Odes.md", text: "# Odes\n\n- [1.1](#bookshelf/Horace/Odes/1.1)\n- [1.2](#bookshelf/Horace/Odes/1.2)\n" },
  { dir: "bookshelf/Horace/Odes/", name: "1.1.md", text: fixture("horace-odes-1.1.md") },
  { dir: "bookshelf/Horace/Odes/", name: "1.2.md", text: "# Odes, 1.2\n\n::: verse\nIam satis terris nivis atque dirae\ngrandinis misit Pater\n:::\n" },
  { dir: "journal/2026/", name: "2026-09-10.md", text: "# A pictured day\n\n![](2026-09-10-img-1.png)\n" },
  { dir: "journal/2026/", name: "2026-09-10-img-1.png", bytes: PNG },
  { dir: "journal/2026/", name: "2026-09-11.md", text: "# The day after\n\nA line.\n" },
  { dir: "commonplace/", name: "Witchcraft.md", text: fixture("williams-witchcraft-3.md") },
];
const ZIP = TIMED || resolve("tools/out/reader-fixture.zip");
if (!TIMED) {
  const parts: Uint8Array[] = [];
  await zipTo(FILES, TODAY, (c) => { parts.push(c); }, TODAY + "T08:30:00.000Z");
  mkdirSync(resolve("tools/out"), { recursive: true });
  writeFileSync(ZIP, Buffer.concat(parts));
}
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
const logs: string[] = [];
const launch = async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1024, height: 1366 } });
  if (!TIMED) await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));
  const page = await ctx.newPage();
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  return { ctx, page };
};
const settled = (page: Page, what: string) => page.waitForFunction(() => /all|fail/.test(document.documentElement.dataset.probe || ""), null, { timeout: 60000 }).catch(() => logs.push("no warm " + what));
const ms = (t: number): string => TIMED ? " (" + (Date.now() - t) + " ms)" : "";
const first = await launch();
await first.page.goto(PAGE + "#commonplace/Witchcraft");
await settled(first.page, "bare");
const screen = (page: Page) => page.evaluate(() => ({
  entry: document.documentElement.dataset.entry, store: document.documentElement.dataset.store,
  held: document.querySelector(".held")?.textContent, corner: document.querySelector(".saved")?.textContent?.trim(),
  editable: document.querySelector(".ProseMirror")?.getAttribute("contenteditable"),
  tools: [...document.querySelectorAll(".site-tools > :not([hidden])")].map((e) => e.textContent.trim()),
}));
console.log("nothing kept:", JSON.stringify(await screen(first.page)));
let t = Date.now();
await first.page.setInputFiles(".site-tools input[type=file]", ZIP);
await first.page.waitForFunction(() => /bundle/.test(document.documentElement.dataset.probe || ""), null, { timeout: 120000 }).catch(() => logs.push("no bundle"));
await settled(first.page, "picked");
console.log("the bundle picked" + ms(t) + ":", JSON.stringify(await screen(first.page)));
await first.ctx.close();
const { ctx, page } = await launch();
t = Date.now();
await page.goto(PAGE + (TIMED ? "#bookshelf/Milton%2C%20John/Paradise%20Lost/Book%201" : "#bookshelf/Horace/Odes"));
await settled(page, "relaunched");
console.log("relaunched" + ms(t) + ":", JSON.stringify({ ...(await screen(page)), ...(TIMED ? { heap: Math.round(await page.evaluate(() => (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0) / 1e6) + " MB" } : {}) }));
const rest = () => page.waitForTimeout(400);

/* the corner only where a step is about what it says: a whisper's fade
   is the clock's, not the step's */
const look = (label: string, extra: () => Promise<object> | object = () => ({}), corner = false) => page.evaluate((corner) => ({
  entry: document.documentElement.dataset.entry, editable: document.querySelector(".ProseMirror")?.getAttribute("contenteditable"),
  ...(corner ? { corner: document.querySelector(".saved.show")?.textContent?.trim() || "" } : {}), hit: [...document.querySelectorAll(".jump-hit")].map((e) => e.textContent).join("|"),
  crumb: document.querySelector(".datelabel")?.textContent.replace(/\s+/g, " ").trim(),
}), corner).then(async (r) => console.log(label + ":", JSON.stringify({ ...r, ...(await extra()) })));
const search = async (q: string): Promise<number> => {
  await page.click(".page-search > summary");
  await page.fill(".search-input", q);
  const t2 = Date.now();
  await page.waitForSelector(".search-results li.hit", { timeout: 90000 }).catch(() => logs.push("no hits"));
  const rows = await page.$$eval(".search-results li.hit", (l) => l.length);
  if (TIMED) console.log("the first search's index built in " + (Date.now() - t2) + " ms");
  await page.click(".search-results li.hit");
  await page.waitForTimeout(800);
  return rows;
};
if (TIMED) {
  await search("darkness visible");
  await look("the hit", undefined, true);
  await ctx.close();
  console.log("console:", logs.join(" / "));
  process.exit(0);
}
await page.click(".ProseMirror a");
await rest();
await look("a contents link clicked");
/* a row's label clicked and, before the browser's toggle event, a value
   its render reads changed, as a redraw at launch did */
const raced = (row: string, change: string) => page.evaluate(([row, change]) => {
  document.querySelector<HTMLElement>(row + " > summary")!.click();
  const el = document.querySelector<HTMLInputElement>(change)!;
  el.value = el.tagName === "SELECT" ? "1" : "Goetia";
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}, [row, change]).then(() => page.waitForTimeout(400)).then(() => page.evaluate((row) => document.querySelector<HTMLDetailsElement>(row)!.open, row));
console.log("Search clicked under a redraw:", JSON.stringify({ open: await raced(".page-search", ".search-input") }));
await page.keyboard.press("Escape");
console.log("Line numbering clicked under a redraw:", JSON.stringify({ open: await raced(".page-lines", ".page-lines select") }));
await page.keyboard.press("Escape");
await page.evaluate(() => { const s = document.querySelector<HTMLSelectElement>(".page-lines select")!; s.value = "5"; s.dispatchEvent(new Event("change", { bubbles: true })); });
await rest();
await page.click("button[aria-label='Next entry']");
await rest();
await look("› clicked");
await page.click("button[aria-label='Previous entry']");
await rest();
await look("‹ clicked");
await page.click("button[aria-label='Previous entry']");
await rest();
await look("‹ clicked on the first", undefined, true);
await page.goto(PAGE + "#commonplace/Witchcraft");
await rest();
const rows = await search("rumoured Goetia");
await look("a search row clicked, of " + rows, () => page.evaluate(() => ({ scrolled: scrollY > 1000 })));
await page.keyboard.press("Escape");
await rest();
await look("Escape after the hit");
const before = await page.evaluate(() => document.querySelector(".ProseMirror")!.textContent);
await page.click(".ProseMirror p");
await page.keyboard.type("xyz");
await page.keyboard.press("Enter");
await page.keyboard.press("Backspace");
await rest();
await look("a line clicked, xyz, Enter and Backspace typed", () => page.evaluate((b) => ({ changed: document.querySelector(".ProseMirror")!.textContent !== b, focus: document.activeElement?.tagName }), before));
await page.keyboard.press("Control+Meta+m");
await rest();
await look("⌃⌘M", undefined, true);
for (const k of ["h", "b", "s", "n", "e"]) await page.keyboard.press("Control+Meta+" + k);
await rest();
await look("⌃⌘H, B, S, N and E", () => page.evaluate(() => ({ open: [...document.querySelectorAll(".site-head details[open], .site-head .pages, .help:not([hidden]), dialog[open]")].map((e) => e.className.split(" ")[0]) })));
await page.goto(PAGE + "#2026-09-10");
await page.waitForTimeout(800);
await look("a day with a picture", () => page.evaluate(() => ({ pictures: [...document.querySelectorAll<HTMLImageElement>(".ProseMirror img:not(.ProseMirror-separator)")].map((i) => i.naturalWidth) })));
await page.click("button[aria-label='Next entry']");
await rest();
await look("› clicked on the day");
await page.click("button[aria-label='List the authors on the bookshelf']");
await rest();
await look("the bookshelf list", () => page.evaluate(() => ({ rows: [...document.querySelectorAll(".pages a")].map((a) => a.textContent), buttons: document.querySelectorAll(".pages button").length })));
await page.keyboard.press("Escape");
await page.click(".page-goto > summary");
await rest();
await look("Go to", () => page.evaluate(() => ({ selects: document.querySelectorAll(".page-goto select").length })));
await ctx.close();
console.log("console:", logs.join(" / "));
