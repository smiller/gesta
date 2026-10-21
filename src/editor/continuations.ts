import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { blockUnits } from "./numbering.ts";
import { measurePass } from "./measurePass.ts";

const N = schema.nodes;

/* `end` where a row's text ends from its left edge when not set in, `room`
   the row's width; the indent each row is set in by, a rest past the end of
   the half above as the 1671 printing staggers it, asked over a fixed
   indent */
export interface RowMeasure { kind: "line" | "cont" | "other"; end: number; room: number }
export function contIndents(rows: RowMeasure[], space: number): number[] {
  let above: number | null = null;
  return rows.map((r) => {
    if (r.kind === "other") return 0;
    if (r.kind === "line" || above === null) { above = r.end; return 0; }
    const indent = Math.max(0, Math.min(above + space, r.room - r.end));
    above = indent + r.end;
    return indent;
  });
}

/* ---------- the DOM side ---------- */
function textEnd(el: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = range.getClientRects();
  if (!rects.length) return 0;
  const box = el.getBoundingClientRect(), pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
  return rects[rects.length - 1].right - box.left - pad;
}
/* written only where a value differs, so a keystroke that moves no rest
   invalidates nothing */
function place(view: EditorView): void {
  view.state.doc.descendants((block, pos) => {
    if (block.type !== N.verse && block.type !== N.prose) return true;
    const units = blockUnits(block, pos, 0);
    if (!units.some((u) => u.node.attrs.kind === "cont")) return false;
    const els = units.map((u) => view.nodeDOM(u.pos) as HTMLElement | null);
    const rows: RowMeasure[] = units.map((u, i) => {
      const el = els[i];
      if (!el || !u.line) return { kind: "other", end: 0, room: 0 };
      return { kind: u.node.attrs.kind === "cont" ? "cont" : "line", end: textEnd(el), room: el.clientWidth };
    });
    const space = els[0] ? parseFloat(getComputedStyle(els[0]).fontSize) * 0.3 : 0;
    contIndents(rows, space).forEach((x, i) => {
      const el = els[i];
      if (!el || rows[i].kind !== "cont") return;
      const value = x ? Math.round(x) + "px" : "";
      if (el.style.getPropertyValue("--cont-x") === value) return;
      if (value) el.style.setProperty("--cont-x", value);
      else el.style.removeProperty("--cont-x");
    });
    return false;
  });
}
export function continuations(): Plugin {
  return new Plugin({ key: new PluginKey("continuations"), view: measurePass(place) });
}
