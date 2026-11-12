import type { Page, BrowserContext } from "./heliumPage.ts";
import { bind, setSection, freshStart, SECTIONS, type Adapter, type RunOptions } from "./steps/kit.ts";
import { startClock, report, type Clock } from "./steps/timing.ts";
import "./steps/launch.ts";
import "./steps/references.ts";
import "./steps/panels.ts";
import "./steps/views.ts";
import "./steps/places.ts";
import "./steps/filing.ts";
import "./steps/keys.ts";
import "./steps/editing.ts";
import "./steps/notices.ts";
import "./steps/verse.ts";
import "./steps/lines.ts";
import "./steps/moving.ts";

export { TODAY, type Adapter, type RunOptions } from "./steps/kit.ts";

/* each section starts from the one window, in front, nothing open over
   it: windows a section left open held the focus, and a click in the
   next section moved no caret */
async function settle(page: Page): Promise<void> {
  for (const p of page.context().pages()) if (p !== page) await p.close().catch(() => {});
  await page.bringToFront();
  await page.keyboard.press("Escape").catch(() => {});
}
const skipped = (opts: RunOptions, name: string): boolean => !!opts.only && !opts.only.includes(name);
async function playSection(page: Page, [name, fn]: (typeof SECTIONS)[number], clock: Clock | null): Promise<void> {
  const t0 = Date.now(), s0 = clock?.slept ?? 0;
  console.log("== " + name);
  await settle(page);
  await freshStart(name);
  setSection(name);
  try { await fn(); }
  catch (e) { console.log("SECTION FAILED (" + name + "): " + String(e).split("\n")[0].slice(0, 200)); }
  clock?.sections.push([name, Date.now() - t0, clock.slept - s0]);
}
export async function runSteps(page: Page, ctx: BrowserContext, A: Adapter, opts: RunOptions = {}) {
  bind(page, ctx, A, opts);
  const clock = process.env.TIMING ? startClock(ctx) : null;
  const order = opts.reverse ? [...SECTIONS].reverse() : SECTIONS;
  for (const s of order) if (!skipped(opts, s[0])) await playSection(page, s, clock);
  if (clock) report(clock);
}
