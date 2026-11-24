import type { Page } from "../heliumPage.ts";

/* one line for every wait that ran out, the thing it waited for named
   first, which `ranOutCounts` reads back (pin: waits.test › a print's
   waits) */
export function ranOutLine(name: string, ms: number, stood?: unknown): string {
  return (/^[aeiou]/.test(name) ? "an " : "a ") + name + "'s wait ran out after " + ms + " ms" + (stood === undefined ? "" : ": " + JSON.stringify(stood));
}
export function ranOutCounts(print: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of print.matchAll(/^an? (.+?)'s wait ran out after /gm)) out[m[1]] = (out[m[1]] ?? 0) + 1;
  return out;
}
const timedOut = (e: unknown): boolean => e instanceof Error && e.name === "TimeoutError";
/* whether the thing came within `ms`: one that did not prints its line,
   with what stood, and the step goes on to read what is there; a failure
   other than running out is the step's (pin: waits.test › a wait that) */
export async function expected(name: string, ms: number, came: (ms: number) => Promise<unknown>, stood?: () => Promise<unknown>): Promise<boolean> {
  try {
    await came(ms);
    return true;
  } catch (e) {
    if (!timedOut(e)) throw e;
    console.log(ranOutLine(name, ms, stood ? await stood().catch((x: unknown) => String(x)) : undefined));
    return false;
  }
}
/* a wait for what should not come: running out is the answer, and says nothing */
export const nothingCame = (coming: Promise<unknown>): Promise<boolean> => coming.then(() => false, () => true);

/* `stood` reads what the page showed instead, for the line of a wait that ran out */
export interface Waiting { name: string; ms: number; polling?: number | "raf"; stood?: () => Promise<unknown> }
type Condition = Parameters<Page["waitForFunction"]>[0];
export const waitState = <A>(page: Page, w: Waiting, condition: string | ((arg: A) => unknown), arg?: A): Promise<boolean> =>
  expected(w.name, w.ms, (ms) => page.waitForFunction(condition as Condition, arg, { timeout: ms, polling: w.polling }), w.stood);
export const waitShown = (page: Page, w: Waiting, selector: string, state?: "attached" | "detached" | "visible" | "hidden"): Promise<boolean> =>
  expected(w.name, w.ms, (ms) => page.waitForSelector(selector, { timeout: ms, state }), w.stood);
