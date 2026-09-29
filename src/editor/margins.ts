/* THE FORM IS A CLASS ON THE NOTE'S OWN NODE, never a decoration: the
   margin form is the same editable node, so the caret stays in it across
   a change of form (pin: margin-note › narrowed to 1000px, typed on) */
import { Plugin, PluginKey, type PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/* em of the host's text; the reach is 2.2 of gap and 2.4 for the line
   numbers (pin: margins.test › the margin form's width) */
export const NOTE_SIZE = 0.8;
export const REACH = 4.6;
/* em of the note's own text */
export const WIDEST = 15;
export const NARROWEST = 10;
/* px between a pushed note and the one above it */
export const CLEAR = 4;

/* the margin form's width, in the note's em, to a tenth; null is the form
   in the text */
export function marginWidth(room: number, hostFont: number): number | null {
  const w = Math.min(WIDEST, Math.floor(((room - REACH * hostFont) / (NOTE_SIZE * hostFont)) * 10) / 10);
  return w >= NARROWEST ? w : null;
}

/* how far each note, in document order, moves down to clear the one above */
export function pushes(boxes: { top: number; height: number }[]): number[] {
  let floor = -Infinity;
  return boxes.map((b) => {
    const push = Math.max(0, floor - b.top);
    floor = b.top + push + b.height + CLEAR;
    return push;
  });
}

/* ---------- the DOM side ---------- */

export function place(root: HTMLElement): void {
  const notes = Array.from(root.querySelectorAll<HTMLElement>("div.margin-note"));
  if (!notes.length) return;
  const widths = notes.map((n) => {
    const host = n.parentElement!;
    return marginWidth(host.getBoundingClientRect().left, parseFloat(getComputedStyle(host).fontSize));
  });
  notes.forEach((n, i) => {
    const w = widths[i];
    n.classList.toggle("in-margin", w != null);
    if (w == null) n.style.removeProperty("--mn-w");
    else n.style.setProperty("--mn-w", w + "em");
    n.style.removeProperty("--mn-push");
  });
  const inMargin = notes.filter((_, i) => widths[i] != null);
  const boxes = inMargin.map((n) => { const r = n.getBoundingClientRect(); return { top: r.top, height: r.height }; });
  pushes(boxes).forEach((p, i) => { if (p) inMargin[i].style.setProperty("--mn-push", p + "px"); });
}

class MarginsView implements PluginView {
  private readonly view: EditorView;
  private frame = 0;
  /* the root's size moves with the fitted measure and the text, each of
     which can move a block's left edge or a note's top; a window wider than
     the page moves the page's left edge and not its size, and a pass on
     the root's size alone left the notes in the margin at 900px (pin:
     margin-note › narrowed to 1000px, typed on) */
  private readonly observer = new ResizeObserver(() => this.schedule());
  private readonly onResize = (): void => this.schedule();
  constructor(view: EditorView) {
    this.view = view;
    this.observer.observe(view.dom);
    window.addEventListener("resize", this.onResize);
    this.schedule();
  }
  update(view: EditorView, prev: { doc: unknown }): void {
    if (view.state.doc !== prev.doc) this.schedule();
  }
  destroy(): void {
    this.observer.disconnect();
    window.removeEventListener("resize", this.onResize);
    if (this.frame) cancelAnimationFrame(this.frame);
  }
  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      place(this.view.dom);
    });
  }
}

export const marginsKey = new PluginKey("margins");
export function marginNotes(): Plugin {
  return new Plugin({ key: marginsKey, view: (view) => new MarginsView(view) });
}
