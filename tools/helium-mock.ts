import { freshProfile, launchHelium } from "./adapters/launch.ts";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import type { Page } from "./heliumPage.ts";
import { foreignWrite, url, waitEntry, waitWarm } from "./adapters/app.ts";
import { settled } from "./steps/kit.ts";
import { backupFile, mockPage, type Frame } from "./mockPage.ts";

export interface MockSpec {
  title: string;
  /* the backup's entries the states open, seeded as they stand there */
  entries: string[];
  states: { name: string; entry: string; width?: number; act?: (page: Page) => Promise<void> }[];
  options: { name: string; css?: string; script?: (page: Page) => Promise<void> }[];
  read?: (page: Page) => Promise<Record<string, unknown>>;
  bars?: string[];
  height?: number;
}
const BACKUP = join(process.env.HOME ?? "", "Library/CloudStorage/Dropbox/gesta-backups/current");
const BARS = [".fmt.show", ".menu", ".goto-toolbar:not([hidden])", ".replace-toolbar:not([hidden])", ".copybtn.show"];
const NOW = { name: "now" };

/* a profile of its own outside Dropbox, which held one under tools/out
   past the run's end */
const PROFILE = resolve(tmpdir(), "gesta-mock-profile");

async function seeded(page: Page, spec: MockSpec): Promise<void> {
  await page.goto(url(spec.entries[0]));
  await page.waitForFunction(() => window.__published("store") !== null, null, { timeout: 15000 });
  for (const key of spec.entries) await foreignWrite(page, key, readFileSync(join(BACKUP, backupFile(key)), "utf8"));
}
/* the entry opened afresh, the warm done, no alert standing, at its top
   by a wheel of just its scroll (a script's scroll is undone by the
   entry's held place; a wheel far past the top left a band above the
   masthead in every shot), the pointer away in the corner */
async function opened(page: Page, entry: string, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("about:blank");
  await page.goto(url(entry));
  await waitEntry(page, entry);
  await waitWarm(page).catch(() => {});
  await page.waitForFunction(() => Object.keys(window.__published("alerts")).length === 0, null, { timeout: 8000 }).catch(() => {});
  await page.mouse.move(width / 2, height / 2);
  const y = await page.evaluate(() => scrollY);
  if (y) { await page.mouse.wheel(0, -y); await page.waitForFunction(() => scrollY === 0, null, { timeout: 3000 }).catch(() => {}); }
  await page.mouse.move(width - 2, height - 2);
  await settled(page);
}
const shot = async (page: Page): Promise<string> => "data:image/png;base64," + (await page.screenshot()).toString("base64");

/* every floating bar lifted and outlined where it stood, and the text a
   click at its middle would have reached */
async function covered(page: Page, bars: string[]): Promise<Frame["covered"]> {
  const under = await page.evaluate((sels) => {
    const shown = sels.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)]).filter((b) => b.getClientRects().length);
    const boxes = shown.map((b) => b.getBoundingClientRect());
    for (const b of shown) b.style.visibility = "hidden";
    const texts = boxes.map((r) => (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.textContent ?? "").trim().slice(0, 60));
    for (const r of boxes) {
      const o = document.body.appendChild(document.createElement("div"));
      o.className = "mock-outline";
      Object.assign(o.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", outline: "2px dashed #c2410c", pointerEvents: "none", zIndex: "99999" });
    }
    return texts;
  }, bars);
  if (!under.length) return undefined;
  return { png: await shot(page), under };
}
const readingOf = (page: Page): Promise<Record<string, unknown>> =>
  page.evaluate(() => ({ entry: window.__published("entry"), alerts: window.__published("alerts"), scrollY: Math.round(scrollY) }));

async function frame(page: Page, spec: MockSpec, state: MockSpec["states"][number], option: MockSpec["options"][number]): Promise<Frame> {
  const width = state.width ?? 1280, height = spec.height ?? 800;
  await opened(page, state.entry, width, height);
  if (option.css) await page.addStyleTag({ content: option.css });
  await option.script?.(page);
  await state.act?.(page);
  await page.mouse.move(width - 2, height - 2);
  await settled(page);
  const png = await shot(page), reading = { ...(await readingOf(page)), ...(await spec.read?.(page)) };
  return { state: state.name, option: option.name, png, reading, covered: await covered(page, spec.bars ?? BARS) };
}

async function main(specPath: string): Promise<void> {
  const spec: MockSpec = (await import(pathToFileURL(resolve(specPath)).href)).default;
  const out = resolve("tools/out/mocks", basename(specPath).replace(/\.ts$/, ""));
  mkdirSync(out, { recursive: true });
  freshProfile(PROFILE);
  const ctx = await launchHelium(PROFILE, { viewport: { width: 1280, height: spec.height ?? 800 } });
  const page = await ctx.newPage();
  await seeded(page, spec);
  const frames: Frame[] = [];
  for (const state of spec.states) for (const option of [NOW, ...spec.options]) frames.push(await frame(page, spec, state, option));
  await ctx.close();
  freshProfile(PROFILE);
  writeFileSync(join(out, "index.html"), mockPage(spec.title, frames));
  for (const f of frames) console.log(f.state + " · " + f.option + ": " + JSON.stringify(f.reading) + (f.covered ? " · under the bars: " + f.covered.under.join(" | ") : ""));
  console.log("the page: " + join(out, "index.html"));
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main(process.argv[2]);
