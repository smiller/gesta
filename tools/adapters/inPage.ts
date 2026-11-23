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
    const said = () => JSON.parse(document.documentElement.dataset.said || "{}");
    window.__corner = () => ((f) => [f.error, f.warning].filter(Boolean).join(" · ") || f[f.latest])(live());
    /* the corner with the newer of info and success as last said, not as
       still shown: its time on screen is the clock's, which a run's load can
       outlast */
    window.__said = () => ((f, s) => [f.error, f.warning].filter(Boolean).join(" · ") || s[s.latest])(live(), said());
    window.__alerts = () => ((f) => [f.error, f.warning, f.info, f.success].filter(Boolean).join(" · "))(live());
    /* where the page shows from, as the page publishes it */
    window.__pageTop = () => parseFloat(document.documentElement.style.getPropertyValue("--alert-area-bottom")) || 0;
  });
}
/* the live alerts as the page publishes them, to compare against after a gesture */
export function textOf(): string {
  return document.documentElement.dataset.alerts || "{}";
}
/* the awaited alert once the gesture raised it; or, where the gesture
   changed nothing, one already live that says what is awaited, raised again.
   A count shown at launch while the gesture ran is no answer of its own */
export function alertSince([b, src]: [string, string]): string | false {
  const was = JSON.parse(b), now = JSON.parse(document.documentElement.dataset.alerts || "{}"), re = new RegExp(src);
  const kinds = ["error", "warning", "info", "success"];
  const changed = kinds.filter((k) => now[k] && now[k] !== was[k]).map((k) => now[k] as string);
  const awaited = (changed.length ? changed : kinds.map((k) => now[k]).filter(Boolean)).filter((t) => re.test(t));
  return awaited.length ? awaited.join(" · ") : false;
}
/* what the gesture changed, the awaited answer or not, for a wait that ran out */
export function changedSince(b: string): string {
  const was = JSON.parse(b), now = JSON.parse(document.documentElement.dataset.alerts || "{}");
  return ["error", "warning", "info", "success"].filter((k) => now[k] && now[k] !== was[k]).map((k) => now[k]).join(" · ");
}
