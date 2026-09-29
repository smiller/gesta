/* AN ENTRY TAKES THE MEASURE ITS WIDEST PAIRED LINE NEEDS (pin: fit.test ›
   an entry takes the measure its widest paired line needs). ONE COLUMN EDGE
   PER ENTRY, written as two custom properties on the
   editor root, which is outside the document: nothing can carry it into a
   save. THE MEASUREMENT IS ONE WRITE, THEN EVERY READ: the fitting class
   goes on, the floor and every cell are read against it, and it comes off
   inside one synchronous call, so no frame is painted in that state. */
import { Plugin, PluginKey, type PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/* px. The narrowest original the fit will ask for — a caret target rather
   than a reading measure — so a block whose translations are typed before
   its originals is not laid out on a 1px track (pin: fit.test › the
   original is never measured below a column a caret can land in) */
export const MIN_COL = 48;
/* px per column: a track laid out at the exact measured width still wrapped
   on the sub-pixel a rect reports */
export const FIT_SLACK = 1;
export const CAP = 1285;
/* the <main> element's own padding plus a classic scrollbar: 100vw counts the scrollbar,
   documentElement.clientWidth does not */
export const WINDOW_MARGIN = 64;

export interface Measured {
  /* the entry's own box with no block on it — the prose measure, the floor */
  floor: number;
  /* the widest original and the widest translation, each unwrapped */
  c1: number;
  c2: number;
  /* the row's column gap, and the block's padding and border */
  gap: number;
  frame: number;
  cap: number;
}
export interface Fit { width: number; col: number | null }

/* the entry's width and its original column from one measurement. A grow
   (the typing side) may only widen: a line being written widens the entry
   so it never wraps under the caret, while narrowing waits for the settle,
   so a deletion cannot yank the column in mid-keystroke (pin: fit.test › a
   grow only widens) */
export function fitWidth(m: Measured, prev: Fit | null, growOnly: boolean): Fit | null {
  /* an entry the layout cannot place measures 0 at every level; the last
     good answer is left standing (pin: fit.test › a settle narrows again, and
     an entry the layout cannot place is no answer) */
  if (!m.floor) return null;
  const c1 = Math.max(Math.ceil(m.c1), MIN_COL) + FIT_SLACK;
  const c2 = Math.ceil(m.c2) + FIT_SLACK;
  const extra = m.gap + m.frame;
  let width = Math.ceil(Math.min(Math.max(m.floor, c1 + c2 + extra), m.cap));
  /* clamped to the cap even while growing: the window can have narrowed */
  if (growOnly && prev) width = Math.min(m.cap, Math.max(width, prev.width));
  const room = width - extra;
  let col = c1;
  /* past the cap the two give way in proportion, and the original takes no
     more than two thirds however lopsided the proportion — one over-wide
     line (a URL) must not set the split for every row (pin: fit.test › past
     the cap the two give way in proportion) */
  if (c1 + c2 > room) col = Math.min(Math.round(room * c1 / (c1 + c2)), Math.round(room * 2 / 3));
  /* the remembered column, and what this room affords: never less than the
     root carries, never more than the room holds — and the room holds more
     than the fresh answer wherever the translation only needs c2 */
  if (growOnly && prev && prev.col != null) {
    col = Math.min(Math.max(col, prev.col), Math.max(col, Math.round(room * 2 / 3), room - c2));
  }
  return { width, col };
}

export function sideBox(cs: { paddingLeft: string; paddingRight: string; borderLeftWidth: string; borderRightWidth: string }): number {
  return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
}
/* ---------- the DOM side ---------- */

/* NOT a quotation: a paired citation is fitted with the entry (tried as an
   inset box, equal halves wrapped its English column) */
const INSET = "div.note, div[class^=\"card-\"]";

/* every paired block the width rule governs for one form: a descendant
   match minus the inset boxes, so a quoted paired block widens the entry
   with the rest and takes its column with it */
function pairedBlocksIn(host: HTMLElement, sel: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  host.querySelectorAll<HTMLElement>(sel).forEach((blk) => {
    if (blk.parentElement?.closest(INSET)) return;
    if (blk.querySelector(":scope > .vpair")) out.push(blk);
  });
  return out;
}

function readFit(host: HTMLElement): Fit | null {
  const w = parseFloat(host.style.getPropertyValue("--par-w"));
  if (!w) return null;
  const col = parseFloat(host.style.getPropertyValue("--vb-col"));
  return { width: w, col: col || null };
}
/* the answer as ONE class beside the two properties, so the containers a
   pair may stand in are never enumerated: enumerated, a pair two quotes
   deep was measured and never widened */
function writeFit(host: HTMLElement, fit: Fit | null): void {
  host.classList.toggle("fitted", !!fit);
  if (!fit) { host.style.removeProperty("--par-w"); host.style.removeProperty("--vb-col"); return; }
  host.style.setProperty("--par-w", fit.width + "px");
  if (fit.col == null) host.style.removeProperty("--vb-col");
  else host.style.setProperty("--vb-col", fit.col + "px");
}
export function fitCap(): number { return Math.min(CAP, window.innerWidth - WINDOW_MARGIN); }

/* the measuring pass. The bracket is the invariant: one throw between the
   class going on and coming off would leave every entry with no side
   margins and every paired block at max-content, with nothing on screen
   naming the cause. And a reader's place is held across it: under the
   class rows un-wrap, the document collapses and the engine clamps
   scrollTop — MEASURED, 22,313px of jump on a 400-row block. */
export function measure(host: HTMLElement): Measured | "prose" | null {
  const verse = pairedBlocksIn(host, "div.verse");
  if (!verse.length) return pairedBlocksIn(host, "div.prose").length ? "prose" : null;
  const scroller = document.scrollingElement || document.documentElement;
  const held = scroller.scrollTop;
  let floor = 0, c1 = 0, c2 = 0, gap = 0, frame = 0;
  let gapRow: HTMLElement | null = null;
  host.classList.add("fitting");
  try {
    floor = host.getBoundingClientRect().width;
    for (const b of verse) {
      /* the block's own box, and in a book that includes the line-number
         gutter, so a four-digit number sits inside the fitted width; and
         a quoted block pays its quotation's padding and rule: the columns
         have the entry's measure less that box, and a citation's English
         column wrapped by exactly it (found by hand) */
      let own = sideBox(getComputedStyle(b));
      for (let el = b.parentElement; el && el !== host; el = el.parentElement) {
        if (el.tagName === "BLOCKQUOTE") own += sideBox(getComputedStyle(el));
      }
      frame = Math.max(frame, own);
      b.querySelectorAll<HTMLElement>(":scope > .vpair").forEach((r) => {
        gapRow ??= r;
        const cells = r.children;
        if (cells[0]) c1 = Math.max(c1, cells[0].getBoundingClientRect().width);
        if (cells[1]) c2 = Math.max(c2, cells[1].getBoundingClientRect().width);
      });
    }
    /* the gap is the row's, not the block's, read once off the first pair */
    if (gapRow) gap = parseFloat(getComputedStyle(gapRow).columnGap) || 0;
  } finally {
    host.classList.remove("fitting");
    scroller.scrollTop = held;
  }
  return { floor, c1, c2, gap, frame, cap: fitCap() };
}

/* has this row spilled to a second line — asked without suspending
   anything, the gate that keeps the full pass off every keystroke. Three
   shapes spill: a cell wrapping, a cell hanging out of its column, the row
   hanging out of the block. The line test is an overlap, not an equality
   of tops (inline runs share a baseline, not a top), and a break the writer
   asked for is not a wrap: lines are counted against the breaks that earn
   one, and the LAST break earns one only if something stands on it — the
   trailing break ProseMirror keeps in an empty textblock earns nothing. */
export function rowSpills(row: HTMLElement): boolean {
  if (row.scrollWidth > row.clientWidth + 1) return true;
  const r = document.createRange();
  for (const c of Array.from(row.children) as HTMLElement[]) {
    if (c.scrollWidth > c.clientWidth + 1) return true;
    r.selectNodeContents(c);
    let bottom: number | null = null, lines = 0;
    for (const rect of Array.from(r.getClientRects())) {
      if (!rect.height) continue;
      if (bottom === null) bottom = rect.bottom;
      else if (rect.top >= bottom - 1) { lines++; bottom = rect.bottom; }
      else bottom = Math.max(bottom, rect.bottom);
    }
    if (!lines) continue;
    const brs = c.getElementsByTagName("br");
    let earned = brs.length;
    if (earned) {
      r.setStartAfter(brs[earned - 1]);
      if (!Array.from(r.getClientRects()).some((x) => x.height)) earned--;
    }
    if (lines > earned) return true;
  }
  return false;
}

function caretRow(view: EditorView): HTMLElement | null {
  const { node } = view.domAtPos(view.state.selection.from);
  const el = node instanceof Element ? node : node.parentElement;
  const row = el?.closest<HTMLElement>(".verse > .vpair") ?? null;
  return row && row.closest(".page") === view.dom && !row.parentElement?.closest(INSET) ? row : null;
}

const SETTLE_MS = 500;

class FitView implements PluginView {
  private readonly view: EditorView;
  private frame = 0;
  private settle = 0;
  private window = 0;
  private readonly onResize = (): void => { if (window.innerWidth !== this.window) this.schedule(false); };
  constructor(view: EditorView) {
    this.view = view;
    window.addEventListener("resize", this.onResize);
    this.schedule(false);
  }
  update(view: EditorView, prev: { doc: unknown }): void {
    if (view.state.doc === prev.doc) return;
    /* THE GROW SIDE, gated on the caret being in a row the fit measures
       and on that row having spilled: a grow can only raise the width,
       only this row can raise it, and asking it is cheap where the pass
       is not. Unfitted, there is nothing to compare and the pass must run
       (pin: reference paste › typed into the quoted pair) */
    const row = caretRow(view);
    if (row && (!readFit(view.dom) || rowSpills(row))) this.schedule(true);
    clearTimeout(this.settle);
    this.settle = window.setTimeout(() => this.schedule(false), SETTLE_MS);
  }
  destroy(): void {
    window.removeEventListener("resize", this.onResize);
    if (this.frame) cancelAnimationFrame(this.frame);
    clearTimeout(this.settle);
    writeFit(this.view.dom, null);
  }
  /* one measurement per frame; a settle takes the frame over rather than
     queueing behind a grow, which would re-read a width computed for the
     old window and put it straight back */
  private schedule(growOnly: boolean): void {
    if (this.frame) {
      if (growOnly) return;
      cancelAnimationFrame(this.frame);
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.fit(growOnly);
    });
  }
  private fit(growOnly: boolean): void {
    const host = this.view.dom;
    const m = measure(host);
    if (m === null) { writeFit(host, null); if (!growOnly) this.window = window.innerWidth; return; }
    /* a paired prose block takes the cap, not a measurement: its cells wrap,
       and the columns are equal halves of whatever the entry gets */
    if (m === "prose") { writeFit(host, { width: fitCap(), col: null }); if (!growOnly) this.window = window.innerWidth; return; }
    const fit = fitWidth(m, readFit(host), growOnly);
    if (!fit) return;
    writeFit(host, fit);
    /* the inputs, readable off the DOM: what a headless dump or the
       inspector can compare against the answer */
    host.dataset.fit = [m.floor, m.c1, m.c2, m.gap, m.frame, m.cap].map((n) => Math.round(n * 10) / 10).join(" ");
    if (!growOnly) this.window = window.innerWidth;
  }
}

export const fitKey = new PluginKey("fit");
export function fittedMeasure(): Plugin {
  return new Plugin({ key: fitKey, view: (view) => new FitView(view) });
}
