import type { Page, BrowserContext } from "../heliumPage.ts";
import { current } from "./kit.ts";

/* TIMING=1: each section's time and the fixed waits within it, to stderr */
export interface Clock {
  slept: number; expired: number; counted: Set<Page>;
  sites: Record<string, number>; lapses: Record<string, number>; sections: [string, number, number][];
}
/* where a fixed wait was asked for: the first step or adapter frame under it */
const site = (stack: string): string =>
  (stack.split("\n").filter((l) => /helium-steps|steps\/|adapters/.test(l))[1] || "").replace(/.*\/(tools\/[^:]+:\d+).*/, "$1");
function countSleeps(c: Clock, p: Page): void {
  const w = p.waitForTimeout.bind(p);
  p.waitForTimeout = (ms: number) => { c.slept += ms; const at = site(new Error().stack); c.sites[at] = (c.sites[at] || 0) + ms; return w(ms); };
}
function countLapses(c: Clock, p: Page): void {
  const f = p.waitForFunction.bind(p);
  p.waitForFunction = (async (...a: Parameters<Page["waitForFunction"]>) => {
    const t = Date.now();
    try { return await f(...a); } catch (e) {
      const ms = Date.now() - t; c.expired += ms;
      const k = current + " · " + String(a[0]).slice(0, 70).replace(/\s+/g, " ");
      c.lapses[k] = (c.lapses[k] || 0) + ms;
      throw e;
    }
  }) as Page["waitForFunction"];
}
function watch(c: Clock, p: Page): void {
  if (c.counted.has(p)) return;
  c.counted.add(p);
  countSleeps(c, p);
  countLapses(c, p);
}
export function startClock(ctx: BrowserContext): Clock {
  const c: Clock = { slept: 0, expired: 0, counted: new Set(), sites: {}, lapses: {}, sections: [] };
  for (const p of ctx.pages()) watch(c, p);
  ctx.on("page", (p) => watch(c, p));
  return c;
}
const seconds = (ms: number, width: number): string => String(ms / 1000).padStart(width);
export function report(c: Clock): void {
  for (const [n, ms, w] of c.sections.sort((a, b) => b[1] - a[1])) console.error(String(Math.round(ms / 100) / 10).padStart(6) + "s " + String(Math.round(w / 100) / 10).padStart(6) + "s waits  " + n);
  console.error("total " + c.sections.reduce((a, t) => a + t[1], 0) / 1000 + "s, fixed waits " + c.slept / 1000 + "s");
  for (const [k, ms] of Object.entries(c.sites).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.error("sleep " + seconds(ms, 6) + "s  " + k);
  console.error("condition waits run out: " + c.expired / 1000 + "s");
  for (const [k, ms] of Object.entries(c.lapses).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.error(seconds(ms, 7) + "s  " + k);
}
