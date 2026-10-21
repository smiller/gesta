import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { schema } from "../model/schema.ts";
import { blockUnits } from "./numbering.ts";
import { measurePass } from "./measurePass.ts";

const N = schema.nodes;

/* `end` where a row's text ends from its left edge when not set in, `room`
   the row's width; the indent each row is set in by, a rest past the end of
   the half above as the 1671 printing staggers it */
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
/* each visual line's extent, from the row's left edge past its indent */
function lineExtents(el: HTMLElement): { left: number; right: number }[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const box = el.getBoundingClientRect(), pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
  const lines: { top: number; left: number; right: number }[] = [];
  for (const r of range.getClientRects()) {
    if (!r.width) continue;
    const l = lines.find((x) => Math.abs(x.top - r.top) < r.height / 2);
    if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); }
    else lines.push({ top: r.top, left: r.left, right: r.right });
  }
  return lines.map((l) => ({ left: l.left - box.left - pad, right: l.right - box.left - pad }));
}
/* a line ends where its last visual line does; a rest is measured as it
   would run unwrapped, so a rest the indent has wrapped is still pulled
   back to fit (pin: split lines › a rest typed past its row's width) */
const lineEnd = (el: HTMLElement): number => lineExtents(el).at(-1)?.right ?? 0;
const restWidth = (el: HTMLElement): number => lineExtents(el).reduce((w, l) => w + l.right - l.left, 0);

/* written only where a value differs, so a keystroke that moves no rest
   invalidates nothing; only a rest and the line it finishes are measured,
   and a ⟨…⟩ row with no line above it is cleared */
function place(view: EditorView): void {
  view.state.doc.descendants((block, pos) => {
    if (block.isTextblock) return false;
    if (block.type !== N.verse) return true;
    let any = false;
    block.forEach((row) => { if (row.attrs.kind === "cont") any = true; });
    if (!any) return false;
    const units = blockUnits(block, pos, 0).filter((u) => u.line);
    const els = units.map((u, i) => (u.rest || units[i + 1]?.rest || u.node.attrs.kind === "cont" ? (view.nodeDOM(u.pos) as HTMLElement | null) : null));
    const rows: RowMeasure[] = units.map((u, i) => {
      const el = els[i];
      if (!el) return { kind: "other", end: 0, room: 0 };
      return u.rest ? { kind: "cont", end: restWidth(el), room: el.clientWidth } : { kind: "line", end: lineEnd(el), room: el.clientWidth };
    });
    const first = els.find(Boolean);
    const space = first ? parseFloat(getComputedStyle(first).fontSize) * 0.3 : 0;
    contIndents(rows, space).forEach((x, i) => {
      const el = els[i];
      if (!el || units[i].node.attrs.kind !== "cont") return;
      const value = rows[i].kind === "cont" && x ? Math.round(x) + "px" : "";
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
