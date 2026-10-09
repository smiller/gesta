/* AN ENTRY TAKES THE MEASURE ITS WIDEST PAIRED LINE NEEDS (pin: fit.test ›
   an entry takes the measure its widest paired line needs). ONE COLUMN EDGE
   PER ENTRY, written as two custom properties on the
   editor root, which is outside the document: nothing can carry it into a
   save. THE MEASUREMENT IS ONE WRITE, THEN EVERY READ: the fitting class
   goes on, the floor and every cell are read against it, and it comes off
   inside one synchronous call, so no frame is painted in that state. */
import { Plugin, PluginKey, type PluginView } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

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

/* a card's or a note's own split, its width being the box's and not the
   entry's: where both columns' widest lines fit, the spare room is shared
   between them; where they do not, the column whose widest line is the
   shorter keeps it and the other wraps; where neither fits in half, equal
   halves. Equal halves wrapped four lines of a card whose translation
   needed a third of it (pin: fit.test › an inset block's split) */
export function insetCol(room: number, c1: number, c2: number): number {
  const a = Math.max(Math.ceil(c1), MIN_COL) + FIT_SLACK;
  const b = Math.ceil(c2) + FIT_SLACK;
  if (a + b <= room) return Math.round(a + (room - a - b) / 2);
  if (b <= room / 2) return Math.round(room - b);
  if (a <= room / 2) return a;
  return Math.round(room / 2);
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

/* a card's and a note's paired blocks, each measured in its own box. The
   split is a node decoration, the editor's own: a style written straight
   onto the block was drawn away by the editor's next pass over it. The
   measuring class goes on the root, as the entry's does. */
function insetBlocks(view: EditorView): { pos: number; dom: HTMLElement }[] {
  const out: { pos: number; dom: HTMLElement }[] = [];
  view.state.doc.descendants((n, pos) => {
    if (n.type.name !== "verse" && n.type.name !== "prose") return true;
    const $pos = view.state.doc.resolve(pos);
    for (let d = $pos.depth; d > 0; d--) {
      const t = $pos.node(d).type.name;
      if (t !== "card" && t !== "note") continue;
      const dom = view.nodeDOM(pos);
      if (dom instanceof HTMLElement && dom.querySelector(":scope > .vpair")) out.push({ pos, dom });
      break;
    }
    return false;
  });
  return out;
}
export function measureInsets(view: EditorView): { pos: number; col: number }[] {
  const blocks = insetBlocks(view);
  if (!blocks.length) return [];
  const rooms = blocks.map(({ dom }) => {
    const r = dom.querySelector<HTMLElement>(":scope > .vpair")!;
    return r.getBoundingClientRect().width - (parseFloat(getComputedStyle(r).columnGap) || 0);
  });
  const scroller = document.scrollingElement || document.documentElement;
  const held = scroller.scrollTop;
  const widths: [number, number][] = [];
  view.dom.classList.add("fitting-insets");
  try {
    for (const { dom } of blocks) {
      let c1 = 0, c2 = 0;
      dom.querySelectorAll<HTMLElement>(":scope > .vpair").forEach((r) => {
        const cells = r.children;
        if (cells[0]) c1 = Math.max(c1, cells[0].getBoundingClientRect().width);
        if (cells[1]) c2 = Math.max(c2, cells[1].getBoundingClientRect().width);
      });
      widths.push([c1, c2]);
    }
  } finally {
    view.dom.classList.remove("fitting-insets");
    scroller.scrollTop = held;
  }
  return blocks.flatMap((b, i) => rooms[i] > 0 ? [{ pos: b.pos, col: insetCol(rooms[i], widths[i][0], widths[i][1]) }] : []);
}
function insetDecorations(doc: EditorView["state"]["doc"], cols: { pos: number; col: number }[]): DecorationSet {
  return DecorationSet.create(doc, cols.map(({ pos, col }) => Decoration.node(pos, pos + doc.nodeAt(pos)!.nodeSize, { style: "--inset-col: " + col + "px" }, { col })));
}
function sameInsets(set: DecorationSet, cols: { pos: number; col: number }[]): boolean {
  const now = set.find();
  return now.length === cols.length && now.every((d, i) => d.from === cols[i].pos && (d.spec as { col: number }).col === cols[i].col);
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

function caretRow(view: EditorView, inset: boolean): HTMLElement | null {
  const { node } = view.domAtPos(view.state.selection.from);
  const el = node instanceof Element ? node : node.parentElement;
  const row = el?.closest<HTMLElement>(":is(.verse, .prose) > .vpair") ?? null;
  return row && row.closest(".page") === view.dom && !!row.parentElement?.closest(INSET) === inset ? row : null;
}

const SETTLE_MS = 500;

class FitView implements PluginView {
  private readonly view: EditorView;
  private frame = 0;
  private settle = 0;
  private window = 0;
  private readonly onResize = (): void => { if (window.innerWidth !== this.window) this.schedule(false); };
  /* the boxes again when the root's size has settled: at the window's
     resize event a card in a grid still had the last width, and each
     split was one resize behind (MEASURED, page/3x3 from 1280 to 1700px) */
  private readonly observer = new ResizeObserver(() => this.scheduleInsets());
  private insetFrame = 0;
  constructor(view: EditorView) {
    this.view = view;
    this.observer.observe(view.dom);
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
    const row = caretRow(view, false);
    const inset = caretRow(view, true);
    if ((row && row.parentElement!.matches(".verse") && (!readFit(view.dom) || rowSpills(row))) || (inset && rowSpills(inset))) this.schedule(true);
    clearTimeout(this.settle);
    this.settle = window.setTimeout(() => this.schedule(false), SETTLE_MS);
  }
  private destroyed = false;
  destroy(): void {
    this.destroyed = true;
    this.observer.disconnect();
    if (this.insetFrame) cancelAnimationFrame(this.insetFrame);
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
  private scheduleInsets(): void {
    if (this.insetFrame) return;
    this.insetFrame = requestAnimationFrame(() => { this.insetFrame = 0; this.fitInsets(); });
  }
  private fitInsets(): void {
    if (this.destroyed) return;
    const cols = measureInsets(this.view);
    if (!sameInsets(fitKey.getState(this.view.state)!, cols)) this.view.dispatch(this.view.state.tr.setMeta(fitKey, cols));
  }
  private fit(growOnly: boolean): void {
    const host = this.view.dom;
    /* a card in a grid is as wide as the entry's fit leaves its track, so
       the boxes are measured after the entry is written */
    queueMicrotask(() => this.fitInsets());
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

export const fitKey = new PluginKey<DecorationSet>("fit");
export function fittedMeasure(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: fitKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        const cols = tr.getMeta(fitKey) as { pos: number; col: number }[] | undefined;
        return cols ? insetDecorations(tr.doc, cols) : set.map(tr.mapping, tr.doc);
      },
    },
    props: { decorations: (state) => fitKey.getState(state) },
    view: (view) => new FitView(view),
  });
}
