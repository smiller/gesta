/* the alert area under the masthead: sticky at its foot, and the bars,
   lists and dialogs that hang from the masthead start below it, so an alert
   covers none of them nor any of them an alert */
export function areaPlace(headHeight: number, areaHeight: number): Record<string, string> {
  return { "--alert-area-top": headHeight + "px", "--alert-area-h": areaHeight + "px", "--alert-area-bottom": headHeight + areaHeight + "px" };
}

/* where the page shows from, under the masthead and the alert area: measured
   now, for placing anything just after a change, since a frame queued as a row
   opens runs before the observer below has told the new height; or as the
   last resize left it, for the scroll to the caret at every keystroke, which
   a layout forced per key would slow (pin: alertArea.test › the page's top) */
let clear = 0, bands: HTMLElement[] = [];
export const pageTop = (): number => Math.max(0, ...bands.map((b) => b.getBoundingClientRect().bottom));
export const pageTopCached = (): number => clear;

/* sets the alert area's place on the root and keeps the cached reach,
   whenever the masthead or the alert area changes size */
export function placeArea(root: HTMLElement, head: HTMLElement, area: HTMLElement): void {
  bands = [head, area];
  const place = (): void => {
    for (const [name, value] of Object.entries(areaPlace(head.offsetHeight, area.offsetHeight))) root.style.setProperty(name, value);
    clear = head.offsetHeight + area.offsetHeight;
  };
  place();
  if (typeof ResizeObserver !== "function") return;
  const watch = new ResizeObserver(place);
  for (const el of [head, area]) watch.observe(el);
}
