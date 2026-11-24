import type { BrowserContext } from "../heliumPage.ts";
import { decoded } from "../../src/published.ts";
/* a reading made of top-level functions run in the page as one script: each
   part's source declared, then the first called. A function handed to an
   evaluate travels as its own source alone, so a part it calls must travel
   with it. */
export const inPage = (main: Function, ...parts: Function[]): string => inPageWith(undefined, main, ...parts);
/* the same, the first called with `arg`, which travels as JSON */
export const inPageWith = (arg: unknown, main: Function, ...parts: Function[]): string =>
  "(() => {\n" + parts.map((f) => f.toString()).join("\n") + "\nreturn (" + main.toString() + ")(" + (arg === undefined ? "" : JSON.stringify(arg)) + ");\n})()";

/* the page's published state, each value in its own shape; the corner
   as the page publishes it: the error and the warning standing, else the
   newer of info and success, as one place showed them */
function pageReaders(): void {
  window.__published = (name) => decoded(name, document.documentElement.dataset[name]);
  window.__corner = () => ((f) => [f.error, f.warning].filter(Boolean).join(" · ") || f[f.latest])(window.__published("alerts"));
  /* where the page shows from, as the page publishes it */
  window.__pageTop = () => parseFloat(document.documentElement.style.getPropertyValue("--alert-area-bottom")) || 0;
}
export async function installPageReaders(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(inPage(pageReaders, decoded));
}
