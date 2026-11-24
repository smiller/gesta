import type { BrowserContext } from "../heliumPage.ts";
/* a reading made of top-level functions run in the page as one script: each
   part's source declared, then the first called. A function handed to an
   evaluate travels as its own source alone, so a part it calls must travel
   with it. */
export const inPage = (main: Function, ...parts: Function[]): string => inPageWith(undefined, main, ...parts);
/* the same, the first called with `arg`, which travels as JSON */
export const inPageWith = (arg: unknown, main: Function, ...parts: Function[]): string =>
  "(() => {\n" + parts.map((f) => f.toString()).join("\n") + "\nreturn (" + main.toString() + ")(" + (arg === undefined ? "" : JSON.stringify(arg)) + ");\n})()";

/* the alerts as the page publishes them, read the same way by every
   reading: the error and the warning standing, else the newer of info and
   success, as one place showed them; or every one live, in the stack's order */
export async function installAlertReaders(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    const live = () => JSON.parse(document.documentElement.dataset.alerts || "{}");
    const saidLog = () => JSON.parse(document.documentElement.dataset.saidLog || '{"n":0,"recent":[]}');
    window.__corner = () => ((f) => [f.error, f.warning].filter(Boolean).join(" · ") || f[f.latest])(live());
    /* what the page said since the mark, oldest first, whether or not it
       still shows: an alert's time on screen is the clock's, which a run's
       load can outlast, and what was said before the mark belongs to an
       earlier step; "…" where more was said than the page keeps */
    window.__mark = () => { window.__saidMark = saidLog().n; };
    window.__said = () => {
      const log = saidLog(), mark = window.__saidMark ?? 0, since = log.recent.filter((r: { n: number }) => r.n > mark);
      return (log.n - mark > since.length ? "… " : "") + since.map((r: { text: string }) => r.text).join(" · ");
    };
    /* where the page shows from, as the page publishes it */
    window.__pageTop = () => parseFloat(document.documentElement.style.getPropertyValue("--alert-area-bottom")) || 0;
  });
}
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
