import type { BrowserContext, Page } from "../heliumPage.ts";
import { inPage } from "./inPage.ts";
import { ranOutLine } from "./waits.ts";

/* the store's write transactions still open, for a read of the stored
   text to wait on rather than sleep: a transaction, not a put, since a
   write reads the row before it puts; counted once it exists, so one that
   throws as it is made leaves no count behind */
export async function installWriteWatcher(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    window.__writes = 0;
    const open = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (this: IDBDatabase, ...args: Parameters<IDBDatabase["transaction"]>) {
      const tx = open.apply(this, args);
      if (tx.mode === "readonly") return tx;
      window.__writes++;
      const done = () => { window.__writes--; tx.removeEventListener("complete", done); tx.removeEventListener("error", done); tx.removeEventListener("abort", done); };
      tx.addEventListener("complete", done); tx.addEventListener("error", done); tx.addEventListener("abort", done);
      return tx;
    };
  });
}
/* a save has landed when the page has none pending (a debounce running,
   a write not yet landed or failed) and no store write is open: read from
   the page, not guessed from the time since the last edit (pin: saves.test
   › a save has landed) */
export function saveLanded(pending: number, writes: number): boolean {
  return !pending && !writes;
}
function landedNow(): boolean {
  return saveLanded(window.__published("savesPending"), window.__writes);
}
/* once the last edit's save has landed, or `ms` has gone by: a wait that
   runs out says so in the run's own output, where the verdict reads it */
export async function waitSaveLanded(page: Page, ms: number): Promise<"landed" | "ran out"> {
  const outcome = await page.waitForFunction(inPage(landedNow, saveLanded), undefined, { timeout: ms, polling: 25 }).then(() => "landed" as const, () => "ran out" as const);
  if (outcome === "ran out") console.log(ranOutLine("save", ms, await page.evaluate(() => ({ pending: window.__published("savesPending"), writes: window.__writes })).catch((): null => null)));
  return outcome;
}
