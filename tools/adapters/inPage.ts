/* a reading made of top-level functions run in the page as one script: each
   part's source declared, then the first called. A function handed to an
   evaluate travels as its own source alone, so a part it calls must travel
   with it. */
export const inPage = (main: Function, ...parts: Function[]): string => inPageWith(undefined, main, ...parts);
/* the same, the first called with `arg`, which travels as JSON */
export const inPageWith = (arg: unknown, main: Function, ...parts: Function[]): string =>
  "(() => {\n" + parts.map((f) => f.toString()).join("\n") + "\nreturn (" + main.toString() + ")(" + (arg === undefined ? "" : JSON.stringify(arg)) + ");\n})()";

export function textOf(s: string): string {
  return document.querySelector(s)?.textContent || "";
}
/* the corner's text once it differs from what it said before the gesture, or says what is awaited */
export function whisperSince([s, b, src]: [string, string, string]): string | false {
  const t = document.querySelector(s)?.textContent || "";
  return (t && t !== b) || new RegExp(src).test(t) ? t : false;
}
