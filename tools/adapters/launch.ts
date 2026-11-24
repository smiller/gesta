import { chromium } from "playwright-core";
import { mkdirSync, rmSync } from "node:fs";
import { basename } from "node:path";
import { spawnSync } from "node:child_process";
import type { BrowserContext } from "../heliumPage.ts";
import { installAlertReaders } from "./inPage.ts";
import { installWriteWatcher } from "./saves.ts";

const HELIUM = "/Applications/Helium.app/Contents/MacOS/Helium";
/* a lingering headless process is killed by its profile's name, never the
   app's; the delete is tried again while the exiting process lets go */
export function freshProfile(path: string): void {
  spawnSync("pkill", ["-f", basename(path)]);
  for (let i = 0; i < 20; i++) {
    try { rmSync(path, { recursive: true, force: true }); break; } catch { spawnSync("sleep", ["0.5"]); }
  }
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
  await installAlertReaders(ctx);
  if (o.clock?.install) await ctx.clock.install({ time: o.clock.at });
  if (o.clock) await ctx.clock.setFixedTime(o.clock.at);
  if (o.watcher !== false) await installWriteWatcher(ctx);
  return ctx as BrowserContext;
}
