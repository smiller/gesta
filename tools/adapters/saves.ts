import type { BrowserContext, Page } from "../heliumPage.ts";
import { SAVE_DEBOUNCE_MS } from "../../src/store/entrySave.ts";
import { inPageWith } from "./inPage.ts";

/* the last edit's time and the store writes still open, for a read of the
   stored text to wait on rather than sleep */
export async function installWriteWatcher(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    window.__lastEdit = 0; window.__writes = 0;
    for (const t of ["keydown", "input", "paste", "drop", "cut", "pointerdown", "click"]) addEventListener(t, () => { window.__lastEdit = performance.now(); }, true);
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      window.__writes++;
      const tx = this.transaction, done = () => { window.__writes--; tx.removeEventListener("complete", done); tx.removeEventListener("error", done); tx.removeEventListener("abort", done); };
      tx.addEventListener("complete", done); tx.addEventListener("error", done); tx.addEventListener("abort", done);
      return put.apply(this, args);
    };
  });
}
/* the store's write lands a moment after the debounce: a margin of 150 ms */
export const LANDS_AFTER_MS = SAVE_DEBOUNCE_MS + 150;
export function saveLanded(now: number, lastEdit: number, writes: number, after: number): boolean {
  return now - lastEdit > after && !writes;
}
function landedNow(after: number): boolean {
  return saveLanded(performance.now(), window.__lastEdit, window.__writes, after);
}
/* once the last edit's save has landed, or `ms` has gone by: a wait that
   runs out says so in the run's own output, where the verdict reads it */
export async function waitSaveLanded(page: Page, ms: number): Promise<"landed" | "ran out"> {
  const landed = inPageWith(LANDS_AFTER_MS, landedNow, saveLanded);
  const outcome = await page.waitForFunction(landed, undefined, { timeout: ms, polling: 25 }).then(() => "landed" as const, () => "ran out" as const);
  if (outcome === "ran out") console.log("a save's wait ran out after " + ms + " ms:", JSON.stringify(await page.evaluate(() => ({ now: Math.round(performance.now()), lastEdit: Math.round(window.__lastEdit), writes: window.__writes })).catch((): null => null)));
  return outcome;
}
