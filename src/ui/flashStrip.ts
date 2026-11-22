/* the strip of flashes under the header: sticky at its foot, and the bars,
   lists and dialogs that hang from the header start below it, so a flash covers
   none of them nor any of them a flash */
export function stripPlace(headHeight: number, stripHeight: number): Record<string, string> {
  return { "--strip-top": headHeight + "px", "--strip-h": stripHeight + "px", "--strip-bottom": headHeight + stripHeight + "px" };
}

/* how far down the header and the strip reach while stuck: what a scroll
   to the caret keeps clear of, read at every keystroke and so cached */
let clear = 0;
export const stripClear = (): number => clear;

/* sets the strip's place on the root and keeps the cached reach, whenever
   the header or the strip changes size */
export function placeStrip(root: HTMLElement, head: HTMLElement, strip: HTMLElement): void {
  const place = (): void => {
    for (const [name, value] of Object.entries(stripPlace(head.offsetHeight, strip.offsetHeight))) root.style.setProperty(name, value);
    clear = head.offsetHeight + strip.offsetHeight;
  };
  place();
  if (typeof ResizeObserver !== "function") return;
  const watch = new ResizeObserver(place);
  for (const el of [head, strip]) watch.observe(el);
}
