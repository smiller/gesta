import type { Node } from "prosemirror-model";
import { Fragment } from "prosemirror-model";
import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import { schema } from "../model/schema.ts";
import { serializeMarkdown } from "../model/serialize.ts";
import { dropFolios } from "../editor/copy.ts";
import { writeClipboard } from "./clipboard.ts";
import { richBlockHtml, withPictureBytes } from "./richCopy.ts";
import { mastheadBottom } from "./mastheadBottom.ts";

export interface CopyDeps {
  cp: Screen["copy"];
  session: Pick<Session, "view" | "mdView">;
  say(text: string, ms?: number): void;
}
export function copyButton(d: CopyDeps): { copyBlock(): void; dropStale(): void } {
  const { cp, session, say } = d;
  /* THE COPY BUTTON: over whichever code block, quote, card, verse or
     prose block, note or reference the mouse is nearest inside; a quote
     inside a quote is ONE block with levels, so the copy is the whole
     nest, a card or a code block between them stopping the climb. It
     copies a code block's lines, or the block's FULL markdown — fences
     and "> " markers included — with the rendered HTML beside it. The
     label says "copied" only for the block it is still over, keyed on
     the element and a click counter, since a two-flavour write does not
     settle at once. */
  let copyTarget: HTMLElement | null = null, copySeq = 0, copyReset: ReturnType<typeof setTimeout> | null = null;
  const BLOCKS = "pre, blockquote, div.note, div.reference, div[class^='card-'], div.verse, div.prose, div.grid";
  /* THE GRID'S BUTTON: a card wins while the mouse is
     over it, so the grid's own corner is a card's. Its button is drawn
     ABOVE the top-right corner, and appears when the mouse comes to the
     band just above that corner — the way every block's appears at its
     corner — or is in a gap between the cards: drawn inside the corner it
     could not be reached from a gap without crossing the card, which took
     it over. Its idle label says which one it is (pin: grid › hovered above
     its corner). */
  const idle = (t: HTMLElement | null): string => t?.classList.contains("grid") ? "copy grid" : "copy";
  const hideCopy = (): void => { copyTarget = null; cp.show = false; if (copyReset) clearTimeout(copyReset); cp.label = "copy"; };
  /* a block gone from the screen takes its copy button with it, whether or
     not the window scrolled (pin: notices and surfaces › the copy button
     after a navigation) */
  const dropStale = (): void => { if (copyTarget && !session.view?.dom.contains(copyTarget)) hideCopy(); };
  const COPY_TITLES: [string, string][] = [["grid", "Copy this grid"], ["verse", "Copy this verse"], ["prose", "Copy this prose"], ["reference", "Copy this reference"], ["note", "Copy this note"]];
  const copyTitle = (target: HTMLElement): string => {
    if (target.tagName === "PRE") return "Copy this code block";
    if (/^card-/.test(target.className || "")) return "Copy this card";
    return COPY_TITLES.find(([cls]) => target.classList.contains(cls))?.[1] ?? "Copy this quote";
  };
  const codeCover = (target: HTMLElement): number => {
    if (target.tagName !== "PRE" || !target.dataset.lang) return 0;
    const cs = getComputedStyle(target, "::after");
    return (parseFloat(cs.width) + parseFloat(cs.right) || 0) - 4;
  };
  const copyTop = (target: HTMLElement, rect: DOMRect): number =>
    Math.max(target.classList.contains("grid") ? rect.top - 25 : rect.top + 5, mastheadBottom() + 7);
  const offScreen = (top: number, rect: DOMRect): boolean => top > rect.bottom - 27 || rect.top > window.innerHeight;
  const newTarget = (target: HTMLElement): void => {
    if (copyReset) clearTimeout(copyReset);
    cp.label = idle(target);
  };
  const showCopy = (target: HTMLElement): void => {
    if (target !== copyTarget) newTarget(target);
    copyTarget = target;
    const rect = target.getBoundingClientRect(), top = copyTop(target, rect);
    if (offScreen(top, rect)) { hideCopy(); return; }
    const cover = codeCover(target);
    cp.title = copyTitle(target);
    cp.minWidth = cover > 0 ? Math.ceil(cover) : 0;
    cp.top = top;
    cp.right = document.documentElement.clientWidth - rect.right + 8;
    cp.show = true;
  };
  /* the band above a grid's top-right corner: 26px tall, the rightmost
     140px. The band is asked first, on mouseover and on mousemove alike, because a card
     directly above a grid covers most of it and the band wins there; and
     leaving the band falls back to the block under the mouse, so the card
     above keeps its own button. The grid list is read afresh each time:
     MEASURED in headless Helium, 1,000 synthetic moves over
     an entry with one grid: 0.012 ms per move over a clean tree, 0.028 ms
     with the tree dirtied before each. */
  const GRID_BAND = { above: 26, wide: 140 };
  const inBand = (x: number, y: number, r: DOMRect): boolean =>
    x >= r.right - GRID_BAND.wide && x <= r.right + 8 && y >= r.top - GRID_BAND.above && y <= r.top + 2;
  const bandGrid = (x: number, y: number): HTMLElement | null => {
    const grids = session.view?.dom.getElementsByClassName("grid");
    if (!grids?.length) return null;
    for (const g of Array.from(grids) as HTMLElement[]) {
      const r = g.getBoundingClientRect();
      if (inBand(x, y, r)) return g;
    }
    return null;
  };
  const quoteInQuote = (el: HTMLElement | null): el is HTMLElement => !!el?.parentElement && el.tagName === "BLOCKQUOTE" && el.parentElement.tagName === "BLOCKQUOTE";
  const shownBlock = (el: HTMLElement | null): el is HTMLElement => !!el && !!session.view?.dom.contains(el) && !session.mdView;
  const blockUnder = (t: Element): HTMLElement | null => {
    let target = t.closest(BLOCKS) as HTMLElement | null;
    while (quoteInQuote(target)) target = target.parentElement;
    return shownBlock(target) ? target : null;
  };
  const point = (e: MouseEvent, t: Element): void => {
    const target = (session.view && !session.mdView && bandGrid(e.clientX, e.clientY)) || blockUnder(t);
    if (target) { if (target !== copyTarget) showCopy(target); } else hideCopy();
  };
  const gridsShown = (): boolean => !!session.view && !session.mdView && session.view.dom.getElementsByClassName("grid").length > 0;
  document.addEventListener("mouseover", (e) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest(".copybtn")) return;
    point(e, t);
  });
  document.addEventListener("mousemove", (e) => {
    const t = e.target as Element | null;
    if (!t?.closest || t.closest(".copybtn")) return;
    if (gridsShown()) point(e, t);
  });
  window.addEventListener("scroll", () => { if (copyTarget) showCopy(copyTarget); }, { passive: true });
  const blockAt = (el: HTMLElement): Node | null => {
    const view = session.view;
    if (!view) return null;
    const pos = view.posAtDOM(el, 0);
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d >= 1; d--) if (view.nodeDOM($pos.before(d)) === el) return $pos.node(d);
    const after = view.state.doc.nodeAt(pos);
    return after && view.nodeDOM(pos) === el ? after : null;
  };
  const copyGone = (view: typeof session.view): boolean => !copyTarget || !view || !view.dom.contains(copyTarget);
  const settled = (mine: HTMLElement, seq: number) => (ok: boolean): void => {
    if (mine !== copyTarget || seq !== copySeq) return;
    cp.label = ok ? "copied" : "copy failed";
    if (copyReset) clearTimeout(copyReset);
    copyReset = setTimeout(() => { cp.label = idle(mine); }, 1200);
  };
  const written = (node: Node, mine: HTMLElement): Promise<boolean> => (node.type === schema.nodes.code_block
    ? writeClipboard(node.textContent.replace(/\n$/, ""))
    /* the swept HTML, not the raw: with the raw outerHTML a card pasted into
       Mail arrived as plain lines (pin: card copy › a card hover-copied) */
    : withPictureBytes(richBlockHtml(mine)).then((html) => writeClipboard({ text: serializeMarkdown(schema.nodes.doc.create(null, dropFolios(Fragment.from(node)))), html })));
  const copyBlock = (): void => {
    const view = session.view;
    if (copyGone(view)) { hideCopy(); say("Nothing to copy", 2000); return; }
    const mine = copyTarget!, seq = ++copySeq, done = settled(mine, seq);
    const node = blockAt(mine);
    if (!node) { done(false); say("Copy failed", 3000); return; }
    written(node, mine).then((ok) => { done(ok); if (!ok && seq === copySeq) say("Copy failed", 3000); });
  };
  return { copyBlock, dropStale };
}
