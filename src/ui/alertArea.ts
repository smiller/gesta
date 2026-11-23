/* the alert area under the masthead: sticky at its foot, and the bars,
   lists and dialogs that hang from the masthead start below it, so an alert
   covers none of them nor any of them an alert */
export function areaPlace(headHeight: number, areaHeight: number): Record<string, string> {
  return { "--alert-area-top": headHeight + "px", "--alert-area-h": areaHeight + "px", "--alert-area-bottom": headHeight + areaHeight + "px" };
}

/* how far down the masthead and the alert area reach while stuck: what a
   scroll to the caret keeps clear of, read at every keystroke and so cached */
let clear = 0;
export const areaClear = (): number => clear;

/* sets the alert area's place on the root and keeps the cached reach,
   whenever the masthead or the alert area changes size */
export function placeArea(root: HTMLElement, head: HTMLElement, area: HTMLElement): void {
  const place = (): void => {
    for (const [name, value] of Object.entries(areaPlace(head.offsetHeight, area.offsetHeight))) root.style.setProperty(name, value);
    clear = head.offsetHeight + area.offsetHeight;
  };
  place();
  if (typeof ResizeObserver !== "function") return;
  const watch = new ResizeObserver(place);
  for (const el of [head, area]) watch.observe(el);
}
