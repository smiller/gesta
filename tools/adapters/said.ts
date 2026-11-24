import type { Page } from "../heliumPage.ts";
import { inPage, inPageWith } from "./inPage.ts";
import { waitState } from "./waits.ts";
import type { SaidLog } from "../../src/published.ts";

/* read from the numbered log, not the alerts on screen: an alert's time
   on screen is the clock's, which a run's load can outlast, and what was
   said before the mark belongs to an earlier step (pin: said.test › opens
   with …) */
export function saidSince(log: SaidLog, mark: number): string {
  const since = log.recent.filter((r) => r.n > mark);
  return (log.n - mark > since.length ? "… " : "") + since.map((r) => r.text).join(" · ");
}
function saidLogNow(): SaidLog {
  return window.__published("saidLog");
}
function saidNow(): string {
  return saidSince(saidLogNow(), window.__saidMark ?? 0);
}
function markNow(): void {
  window.__saidMark = saidLogNow().n;
}
function saidAfter(from: number): string {
  return saidSince(saidLogNow(), from);
}
function matchesAfter([from, src]: [number, string]): boolean {
  return new RegExp(src).test(saidSince(saidLogNow(), from));
}
/* what was said since the step's mark */
export const said = (page: Page): Promise<string> => page.evaluate(inPage(saidNow, saidSince, saidLogNow)) as Promise<string>;
/* the step's window starts here */
export const markSaid = (page: Page): Promise<void> => page.evaluate(inPage(markNow, saidLogNow)) as Promise<void>;
const counted = (page: Page): Promise<number> => page.evaluate(inPage(saidLogNow)).then((l) => (l as SaidLog).n);
/* what was said since the step's mark once it matches, or once `ms` has
   gone by: given back either way */
export async function waitSaid(page: Page, re: RegExp, ms = 3000): Promise<string> {
  const from = await page.evaluate(() => window.__saidMark ?? 0);
  await waitState(page, { name: "said", ms }, inPageWith([from, re.source], matchesAfter, saidSince, saidLogNow));
  return said(page);
}
/* what a gesture said, matching `re` or not: a wait for the match alone
   swallowed its timeout, and a refusal's 3s info had faded by the 5s read,
   so a chord that did not take read as no corner and an older clipboard,
   with nothing to say why. The step's window is left where it was: a
   reading of what was said after this one still covers the whole step */
export async function saidAfterGesture(page: Page, gesture: () => Promise<unknown>, re: RegExp): Promise<string> {
  const from = await counted(page);
  await gesture();
  await waitState(page, { name: "said", ms: 5000 }, inPageWith([from, re.source], matchesAfter, saidSince, saidLogNow));
  return (await page.evaluate(inPageWith(from, saidAfter, saidSince, saidLogNow)) as string) || "(no alert within 5s)";
}
