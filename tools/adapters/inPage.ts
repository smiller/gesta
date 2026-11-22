import type { BrowserContext } from "../heliumPage.ts";
/* a reading made of top-level functions run in the page as one script: each
   part's source declared, then the first called. A function handed to an
   evaluate travels as its own source alone, so a part it calls must travel
   with it. */
export const inPage = (main: Function, ...parts: Function[]): string => inPageWith(undefined, main, ...parts);
/* the same, the first called with `arg`, which travels as JSON */
export const inPageWith = (arg: unknown, main: Function, ...parts: Function[]): string =>
  "(() => {\n" + parts.map((f) => f.toString()).join("\n") + "\nreturn (" + main.toString() + ")(" + (arg === undefined ? "" : JSON.stringify(arg)) + ");\n})()";

/* the flashes as the page publishes them, read the same way by every
   reading: the error and the warning standing, else the newer of info and
   success, as one place showed them; or every one live, in the stack's order */
export async function installFlashReaders(ctx: BrowserContext): Promise<void> {
  await ctx.addInitScript(() => {
    const live = () => JSON.parse(document.documentElement.dataset.flashes || "{}");
    window.__corner = () => ((f) => [f.failure, f.refusal].filter(Boolean).join(" · ") || f[f.latest])(live());
    window.__flashes = () => ((f) => [f.failure, f.refusal, f.info, f.success].filter(Boolean).join(" · "))(live());
  });
}
/* the live flashes as the page publishes them, to compare against after a gesture */
export function textOf(): string {
  return document.documentElement.dataset.flashes || "{}";
}
/* the awaited flash once the gesture raised it; or, where the gesture
   changed nothing, one already live that says what is awaited, raised again.
   A count shown at launch while the gesture ran is no answer of its own */
export function whisperSince([b, src]: [string, string]): string | false {
  const was = JSON.parse(b), now = JSON.parse(document.documentElement.dataset.flashes || "{}"), re = new RegExp(src);
  const kinds = ["failure", "refusal", "info", "success"];
  const changed = kinds.filter((k) => now[k] && now[k] !== was[k]).map((k) => now[k] as string);
  const awaited = (changed.length ? changed : kinds.map((k) => now[k]).filter(Boolean)).filter((t) => re.test(t));
  return awaited.length ? awaited.join(" · ") : false;
}
/* what the gesture changed, the awaited answer or not, for a wait that ran out */
export function changedSince(b: string): string {
  const was = JSON.parse(b), now = JSON.parse(document.documentElement.dataset.flashes || "{}");
  return ["failure", "refusal", "info", "success"].filter((k) => now[k] && now[k] !== was[k]).map((k) => now[k]).join(" · ");
}
