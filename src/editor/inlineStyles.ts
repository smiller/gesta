/* The sweep both HTML flavours call (the hover copy, ⌘C, the reference):
   anything whose LOOK is class-driven CSS is written inline, read off the
   LIVE twin's computed style, so the palette stays spelled once in the
   stylesheet. TWO RULES, from the current app's 12-block-clipboard.js:
   `el` must be in the document — a detached element's computed style is
   "" for every property — and the pairing is BY INDEX per selector, so
   both trees must hold the same nodes when this runs. Pulled out of
   richCopy.ts 2026-09-08 when the editor's own ⌘C took the sweep. */
const BOX = ["background-color", "color", "border", "border-radius", "padding"];
const STYLED: { sel: string; props: string[] }[] = [
  { sel: "div[class^='card-']", props: BOX },
  { sel: "div.note", props: BOX.concat(["font-size"]) },
  /* the pairing lives on the row, and only a row that holds a translation */
  { sel: "div.vrow.vpair", props: ["display", "grid-template-columns", "column-gap"] },
  { sel: "pre", props: BOX.concat(["font-family", "font-size", "white-space"]) },
  { sel: "pre span", props: ["color", "font-style", "font-weight"] },
];
export function inlineBlockStyles(el: Element, clone: Element): void {
  for (const kind of STYLED) {
    const live = Array.from(el.querySelectorAll(kind.sel)), copies = Array.from(clone.querySelectorAll(kind.sel));
    if (el.matches(kind.sel)) { live.unshift(el); copies.unshift(clone); }
    live.forEach((node, i) => {
      const cs = getComputedStyle(node);
      for (const prop of kind.props) (copies[i] as HTMLElement).style.setProperty(prop, cs.getPropertyValue(prop));
    });
  }
}
