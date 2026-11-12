// The bridge in headless Helium over one fresh profile: seed the fixtures
// as entries, open each by hash and compare the editor's markdown with the
// store's, refuse an unknown book, then TYPE into an entry, wait past the
// debounce, relaunch and read the text back. `node tools/helium-bridge.ts`
import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { TODAY } from "./helium-steps.ts";
import type { Page } from "./heliumPage.ts";
import { inPage } from "./adapters/inPage.ts";
const H = "/Applications/Helium.app/Contents/MacOS/Helium";
const PROFILE = resolve(tmpdir(), "gesta-helium-bridge-profile");   /* the system temp, not Dropbox: a profile there is held by the sync, and its delete failed */
const PAGE = "file://" + resolve("dist/index.html");
rmSync(PROFILE, { recursive: true, force: true });
mkdirSync(PROFILE, { recursive: true });
/* what a launch shows, read in the page: its parts top-level functions run there as one script */
function imageLine(i: HTMLElement): string {
  return (i.getAttribute("src") || "").slice(0, 30) + (i.dataset.missing ? " MISSING" : "");
}
function crumbShown(): string | undefined {
  return document.querySelector(".datelabel")?.textContent?.replace(/\s+/g, " ").trim();
}
function firstLineShown(): string | undefined {
  return document.querySelector("#editor .ProseMirror")?.firstElementChild?.textContent?.slice(0, 60);
}
function textsShown(): Record<string, unknown> {
  return {
    crumb: crumbShown(), title: document.querySelector(".page-title")?.textContent,
    status: document.querySelector(".saved.show")?.textContent || "",
    first: firstLineShown(),
  };
}
function launchShows(): Record<string, unknown> {
  const { crumb, title, status, first } = textsShown() as Record<string, string>;
  return {
    entry: document.documentElement.dataset.entry, store: document.documentElement.dataset.store,
    crumb, title, status, first,
    images: [...document.querySelectorAll<HTMLElement>("#editor img")].map(imageLine),
  };
}
const read = (page: Page): Promise<Record<string, unknown>> => page.evaluate(inPage(launchShows, textsShown, crumbShown, firstLineShown, imageLine));
async function launch(url: string, fn: (page: Page) => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const ctx = await chromium.launchPersistentContext(PROFILE, { executablePath: H, headless: true });
  await ctx.clock.setFixedTime(new Date(TODAY + "T12:00:00"));   /* the refusals land on today: pinned, not scrubbed */
  const page = await ctx.newPage();
  const logs: string[] = [];
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
  await page.goto(url);
  /* the WARM, not the primed open: the store count and the status are read at every step */
  await page.waitForFunction(() => document.documentElement.dataset.probe?.includes("all;") || document.documentElement.dataset.probe?.includes("fail"), null, { timeout: 15000 }).catch(() => logs.push("no warm"));
  const out = await fn(page);
  if (logs.length) out.logs = logs;
  await ctx.close();
  return out;
}
const say = (label: string, o: unknown): void => console.log(label.padEnd(34), JSON.stringify(o));
say("seed, open #page/Horace", await launch(PAGE + "?store=seed#page/Horace", read));
say("open a book page", await launch(PAGE + "#bookshelf/Browning,%20Robert/Pippa%20Passes", read));
say("open a day", await launch(PAGE + "#2026-09-06", read));
say("an unknown book is refused", await launch(PAGE + "#bookshelf/Nobody/Nothing", read));
say("an unknown page mints on visit", await launch(PAGE + "#page/Brand%20New", read));
say("type, wait past the debounce", await launch(PAGE + "#page/Brand%20New", async (page) => {
  await page.click("#editor .ProseMirror");
  await page.keyboard.type("Typed in headless Helium.");
  await page.waitForFunction(() => document.querySelector(".saved.show")?.textContent === "saved", null, { timeout: 5000 }).catch(() => {});
  return read(page);
}));
say("relaunch: the text came back", await launch(PAGE + "#page/Brand%20New", read));
say("an unknown book under a known author", await launch(PAGE + "#bookshelf/Browning,%20Robert/Nothing", read));
say("walk: next from the earlier day", await launch(PAGE + "#2026-09-05", async (page) => {
  await page.keyboard.press("Control+Meta+Period");
  await page.waitForTimeout(500);
  return read(page);
}));
