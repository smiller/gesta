import type { Page, BrowserContext } from "../heliumPage.ts";
import { current, rests } from "./kit.ts";

/* TIMING=1: each section's time and the fixed waits within it, to stderr */
export interface Clock {
  slept: number; expired: number; counted: Set<Page>;
  sites: Record<string, number>; waits: Record<string, Waited>; sections: [string, number, number][];
}
/* a wait's calls at one place, those that ran out, and the time they spent running out */
interface Waited { calls: number; ranOut: number; ms: number }
/* where a fixed wait was asked for: the first step or adapter frame under it */
const site = (stack: string): string =>
  (stack.split("\n").filter((l) => /helium-steps|steps\/|adapters/.test(l))[1] || "").replace(/.*\/(tools\/[^:]+:\d+).*/, "$1");
function countSleeps(c: Clock, p: Page): void {
  const w = p.waitForTimeout.bind(p);
  p.waitForTimeout = (ms: number) => { c.slept += ms; const at = site(new Error().stack); c.sites[at] = (c.sites[at] || 0) + ms; return w(ms); };
}
/* where a wait was asked for: the step and adapter frames under it, the clock's own aside */
const callers = (stack: string): string =>
  stack.split("\n").filter((l) => /steps\/|adapters\//.test(l) && !l.includes("steps/timing.ts")).slice(0, 2).map((l) => l.replace(/.*\/(tools\/[^:]+:\d+).*/, "$1")).join(" < ");
function countWaits(c: Clock, p: Page): void {
  const q = p as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  for (const name of ["waitForFunction", "waitForSelector"]) {
    const f = q[name].bind(p);
    q[name] = async (...a: unknown[]) => {
      const w = (c.waits[current + " · " + callers(new Error().stack ?? "")] ??= { calls: 0, ranOut: 0, ms: 0 });
      w.calls++;
      const t = Date.now();
      try { return await f(...a); } catch (e) {
        if ((e as Error).name === "TimeoutError") { w.ranOut++; w.ms += Date.now() - t; c.expired += Date.now() - t; }
        throw e;
      }
    };
  }
}
function watch(c: Clock, p: Page): void {
  if (c.counted.has(p)) return;
  c.counted.add(p);
  countSleeps(c, p);
  countWaits(c, p);
}
export function startClock(ctx: BrowserContext): Clock {
  const c: Clock = { slept: 0, expired: 0, counted: new Set(), sites: {}, waits: {}, sections: [] };
  for (const p of ctx.pages()) watch(c, p);
  ctx.on("page", (p) => watch(c, p));
  return c;
}
const seconds = (ms: number, width: number): string => String(ms / 1000).padStart(width);
export function report(c: Clock): void {
  for (const [n, ms, w] of c.sections.sort((a, b) => b[1] - a[1])) console.error(String(Math.round(ms / 100) / 10).padStart(6) + "s " + String(Math.round(w / 100) / 10).padStart(6) + "s waits  " + n);
  console.error("total " + c.sections.reduce((a, t) => a + t[1], 0) / 1000 + "s, fixed waits " + c.slept / 1000 + "s");
  for (const [k, ms] of Object.entries(c.sites).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.error("sleep " + seconds(ms, 6) + "s  " + k);
  const capped = Object.entries(rests).filter(([, r]) => r.capped).sort((a, b) => b[1].capped - a[1].capped);
  console.error("rests " + Object.values(rests).reduce((a, r) => a + r.all, 0) + ", ended by the 100 ms before two frames " + capped.reduce((a, [, r]) => a + r.capped, 0));
  for (const [s, r] of capped) console.error("rest capped " + r.capped + " of " + r.all + "  " + s);
  console.error("condition waits run out: " + c.expired / 1000 + "s");
  for (const [k, w] of Object.entries(c.waits).filter(([, w]) => w.ranOut).sort((a, b) => b[1].ranOut - a[1].ranOut)) console.error("ran out " + w.ranOut + " of " + w.calls + ", " + seconds(w.ms, 6) + "s  " + k);
  console.error("waits: " + Object.values(c.waits).reduce((a, w) => a + w.calls, 0) + " calls at " + Object.keys(c.waits).length + " places");
}
