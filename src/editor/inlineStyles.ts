/* anything whose LOOK is class-driven CSS is written inline, read off the
   LIVE twin's computed style, so the palette stays spelled once. TWO RULES:
   `el` must be in the document — a detached element's computed style is ""
   for every property — and the pairing is BY INDEX per selector, so both
   trees must hold the same nodes when this runs (pin: card copy › a card
   ⌘C'd) */
const BOX = ["background-color", "color", "border", "border-radius", "padding"];
const STYLED: { sel: string; props: string[] }[] = [
  { sel: "div[class^='card-']", props: BOX },
  { sel: "div.note", props: BOX.concat(["font-size"]) },
  /* the pairing lives on the row, and only a row that holds a translation */
  { sel: "div.vrow.vpair", props: ["display", "grid-template-columns", "column-gap"] },
  /* so a copied grid arrives as one (pin: grid › the grid copied) */
  { sel: "div.grid", props: ["display", "grid-template-columns", "gap"] },
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
