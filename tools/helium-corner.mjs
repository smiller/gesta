// The corner in headless Helium over a fresh profile: seed the fixtures,
// read the indicator after the warm and past its whisper, type and wait
// for "saved", click it away, press ⌃⌘, at the first entry; prints what
// the span and the pill read at each step, then the pill under
// `?corner=pill`, then the console.
// `node tools/helium-corner.mjs [profileDir] [screenshot.png]`.
import { chromium } from "playwright-core";
import { resolve } from "node:path";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PAGE = "file://" + resolve("dist/index.html");
const PROFILE = process.argv[2] || resolve("tools/out/helium-corner-profile");
const logs = [];
const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true, viewport: { width: 1000, height: 600 } });
const page = await ctx.newPage();
page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await page.goto(PAGE + "?store=seed#page/Horace");
await page.waitForFunction(() => document.documentElement.dataset.probe?.includes("all;"), null, { timeout: 15000 });
const corner = () => page.evaluate(() => { const s = document.querySelector(".saved"); return { text: s?.textContent, show: s?.classList.contains("show"), opacity: getComputedStyle(s).opacity, pill: document.querySelector(".backup-paused")?.hidden }; });
console.log("after warm:", JSON.stringify(await corner()));
await page.waitForTimeout(3200);
console.log("3.2 s later:", JSON.stringify(await corner()));
await page.click("#editor .ProseMirror");
await page.keyboard.press("End");
await page.keyboard.type(" corner");
await page.waitForFunction(() => document.querySelector(".saved.show")?.textContent === "saved", null, { timeout: 5000 });
console.log("after typing:", JSON.stringify(await corner()));
if (process.argv[3]) await page.screenshot({ path: process.argv[3], clip: { x: 0, y: 500, width: 500, height: 100 } });
await page.click(".saved.show");
console.log("after the click:", JSON.stringify(await corner()));
await page.keyboard.press("Control+Meta+,");
await page.waitForTimeout(100);
console.log("after ⌃⌘, on the first entry:", JSON.stringify(await corner()));
await page.goto(PAGE + "?corner=pill#page/Horace");
await page.waitForFunction(() => document.documentElement.dataset.probe?.includes("all;"), null, { timeout: 15000 });
console.log("with ?corner=pill:", JSON.stringify(await page.evaluate(() => { const b = document.querySelector(".backup-paused"); const r = b.getBoundingClientRect(); return { text: b.textContent, hidden: b.hidden, display: getComputedStyle(b).display, right: innerWidth - r.right, bottom: innerHeight - r.bottom }; })));
if (process.argv[3]) await page.screenshot({ path: process.argv[3].replace(/\.png$/, "-pill.png"), clip: { x: 500, y: 500, width: 500, height: 100 } });
await ctx.close();
console.log("console:", logs.length ? logs.join("\n") : "(nothing)");
