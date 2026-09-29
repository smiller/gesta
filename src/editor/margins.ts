/* THE FORM IS A CLASS ON THE NOTE'S OWN NODE, never a decoration: the
   margin form is the same editable node, so the caret stays in it across
   a change of form (pin: margin-note › narrowed to 1000px, typed on) */
import { Plugin, PluginKey, type PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/* em of the host's text; 2.2 of gap and 2.4 for the line numbers (pin:
   margins.test › the margin form's width) */
const REACH = 4.6;
/* em of the note's own text */
const WIDEST = 15;
const NARROWEST = 10;
/* px between a pushed note and the one above it */
const CLEAR = 4;

/* the width to a tenth of the note's em; null is the form in the text */
export function marginWidth(room: number, hostFont: number, noteFont: number): number | null {
  const w = Math.min(WIDEST, Math.floor(((room - REACH * hostFont) / noteFont) * 10) / 10);
  return w >= NARROWEST ? w : null;
}

/* px from where the note would stand in the text, the host's content edge,
   to where its right edge stands the reach left of the host's own edge */
export function marginShift(width: number, hostFont: number, noteFont: number, inset: number): number {
  return -(inset + REACH * hostFont + width * noteFont);
}

/* a box of no height is a note not drawn */
export function pushes(boxes: { top: number; height: number }[]): number[] {
  let floor = -Infinity;
  return boxes.map((b) => {
    if (!b.height) return 0;
    const push = Math.max(0, floor - b.top);
    floor = b.top + push + b.height + CLEAR;
    return push;
  });
}

/* ---------- the DOM side ---------- */

const prop = (n: HTMLElement, name: string): string => n.style.getPropertyValue(name);
function write(n: HTMLElement, name: string, value: string): void {
  if (prop(n, name) === value) return;
  if (value) n.style.setProperty(name, value);
  else n.style.removeProperty(name);
}

/* written only where a value differs, so a keystroke that moves no note
   invalidates nothing */
function place(root: HTMLElement): void {
  const notes = Array.from(root.querySelectorAll<HTMLElement>("div.margin-note"));
  if (!notes.length) return;
  const hosts = new Map<HTMLElement, { left: number; font: number; inset: number }>();
  const hostOf = (el: HTMLElement) => {
    let h = hosts.get(el);
    if (!h) {
      const cs = getComputedStyle(el);
      h = { left: el.getBoundingClientRect().left, font: parseFloat(cs.fontSize), inset: parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) };
      hosts.set(el, h);
    }
    return h;
  };
  const forms = notes.map((n) => {
    /* a card in a grid can have a neighbour to its left (pin: margin-note ›
       margin-notes between paragraphs and in a grid at 1500px) */
    if (n.closest(".grid")) return null;
    const host = hostOf(n.parentElement!), noteFont = parseFloat(getComputedStyle(n).fontSize);
    const w = marginWidth(host.left, host.font, noteFont);
    return w == null ? null : { w: w + "em", x: marginShift(w, host.font, noteFont, host.inset) + "px" };
  });
  notes.forEach((n, i) => {
    const f = forms[i];
    n.classList.toggle("in-margin", !!f);
    write(n, "--mn-w", f ? f.w : "");
    write(n, "--mn-x", f ? f.x : "");
    if (!f) write(n, "--mn-push", "");
  });
  const inMargin = notes.filter((_, i) => forms[i]);
  const boxes = inMargin.map((n) => {
    const r = n.getBoundingClientRect();
    return { top: r.top - (parseFloat(prop(n, "--mn-push")) || 0), height: r.height };
  });
  pushes(boxes).forEach((p, i) => write(inMargin[i], "--mn-push", p ? p + "px" : ""));
}

class MarginsView implements PluginView {
  private readonly view: EditorView;
  private frame = 0;
  /* a window wider than the page moves the page's left edge and not its
     size: a pass on the root's size alone left the notes in the margin at
     900px (pin: margin-note › narrowed to 1000px, typed on) */
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

export function marginNotes(): Plugin {
  return new Plugin({ key: new PluginKey("margins"), view: (view) => new MarginsView(view) });
}
