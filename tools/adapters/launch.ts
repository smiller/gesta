import { chromium } from "playwright-core";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import type { BrowserContext, Page } from "../heliumPage.ts";
import { installPageReaders } from "./inPage.ts";
import { installWriteWatcher } from "./saves.ts";

const HELIUM = "/Applications/Helium.app/Contents/MacOS/Helium";
/* a lingering headless process is killed by its profile's name, never the
   app's; the delete is tried again while the exiting process lets go */
export function freshProfile(path: string): void {
  spawnSync("pkill", ["-f", basename(path)]);
  for (let i = 0; i < 20; i++) {
    try { rmSync(path, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); }
  }
  if (existsSync(path)) throw new Error("the profile at " + path + " would not clear: a run over it would read the last run's entries");
  mkdirSync(path, { recursive: true });
}
/* `clock.install`: the page's timers too, for a step to move them on; else
   the date alone is pinned. `watcher: false` for a page no save is read on */
export interface LaunchOptions {
  viewport?: { width: number; height: number };
  clock?: { at: Date; install?: boolean };
  watcher?: boolean;
}
export async function launchHelium(profile: string, o: LaunchOptions = {}): Promise<BrowserContext> {
  const ctx = await chromium.launchPersistentContext(profile, { executablePath: HELIUM, headless: true, ...(o.viewport ? { viewport: o.viewport } : {}) });
  await installPageReaders(ctx);
  if (o.clock?.install) await ctx.clock.install({ time: o.clock.at });
  if (o.clock) await ctx.clock.setFixedTime(o.clock.at);
  if (o.watcher !== false) await installWriteWatcher(ctx);
  await throttled(ctx as BrowserContext, +(process.env.THROTTLE ?? 1));
  return ctx as BrowserContext;
}
/* `THROTTLE=n`: every page's CPU n times slower, as a loaded machine makes
   it, so a step that waits on a clock rather than the page's state reads
   otherwise every time instead of now and then. The session stays
   attached: detached, it lifts the throttle */
async function throttled(ctx: BrowserContext, rate: number): Promise<void> {
  if (!(rate > 1)) return;
  const slow = async (p: Page): Promise<void> => { await (await ctx.newCDPSession(p)).send("Emulation.setCPUThrottlingRate", { rate }); };
  ctx.on("page", (p) => { slow(p).catch(() => {}); });
  await Promise.all(ctx.pages().map(slow));
}
