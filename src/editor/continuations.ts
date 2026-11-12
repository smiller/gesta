import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { blockUnits, type Unit } from "./numbering.ts";
import { measurePass } from "./measurePass.ts";

const N = schema.nodes;

/* `end` where a row's text ends from its left edge when not set in, `room`
   the row's width; the indent each row is set in by, a rest past the end of
   the half above as the 1671 printing staggers it */
export interface RowMeasure { kind: "line" | "cont" | "other"; end: number; room: number }
export function contIndents(rows: RowMeasure[], space: number, carried: number | null = null): number[] {
  let above: number | null = carried;
  return rows.map((r) => {
    if (r.kind === "other") return 0;
    if (r.kind === "line" || above === null) { above = r.end; return 0; }
    /* (pin: continuations.test › a rest past the end of the half above that would overrun its row) */
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
/* a row's room to the fraction of a pixel, and an indent written rounded
   down: the room read as a whole clientWidth and the indent rounded to the
   nearest pixel overran a row a rest exactly filled, and its last word
   wrapped (MEASURED, Ovid 6 "magnum, quodcumque paravi;") */
const sideBorders = (el: HTMLElement): number => { const cs = getComputedStyle(el); return (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0); };
const restWidth = (el: HTMLElement): number => lineExtents(el).reduce((w, l) => w + l.right - l.left, 0);

/* written only where a value differs, so a keystroke that moves no rest
   invalidates nothing; only a rest and the line it finishes are measured,
   and a ⟨…⟩ row with no line above it is cleared. In a dual-language block
   only the Latin cell is the line, and a rest opening the block finishes
   the line closing the dual-language block straight before it; that line is
   measured only when the next block opens with a rest */
const opensWithRest = (n: Node | null | undefined): boolean => !!n && n.type === N.verse && !!n.attrs.dual && n.firstChild?.attrs.kind === "cont";
interface Carry { end: number; at: number }
interface BlockCtx { view: EditorView; units: Unit[]; dual: boolean; carries: boolean; from: number | null }
function hasRest(block: Node): boolean {
  let any = false;
  block.forEach((row) => { if (row.attrs.kind === "cont") any = true; });
  return any;
}
function carriesInto(view: EditorView, block: Node, pos: number): boolean {
  if (!block.attrs.dual) return false;
  const $end = view.state.doc.resolve(pos + block.nodeSize);
  return opensWithRest($end.parent.maybeChild($end.index()));
}
const latinOf = (el: HTMLElement | null, dual: boolean): HTMLElement | null =>
  (el && dual && el.classList.contains("vpair") ? (el.firstElementChild as HTMLElement | null) : el);
/* a ⟨…⟩ row opening a dual-language block is the rest of the line the
   block before closes, though it begins this block's count */
const restAt = (c: BlockCtx, i: number): boolean =>
  !!c.units[i].rest || (i === 0 && c.from !== null && c.units[0].node.attrs.kind === "cont");
const measured = (c: BlockCtx, i: number): boolean =>
  restAt(c, i) || (i < c.units.length - 1 && restAt(c, i + 1)) || c.units[i].node.attrs.kind === "cont" || (c.carries && i === c.units.length - 1);
function rowMeasure(c: BlockCtx, el: HTMLElement | null, i: number): RowMeasure {
  if (!el) return { kind: "other", end: 0, room: 0 };
  const room = el.getBoundingClientRect().width - sideBorders(el);
  return restAt(c, i) ? { kind: "cont", end: restWidth(el), room } : { kind: "line", end: lineEnd(el), room };
}
function writeIndent(view: EditorView, u: Unit, row: RowMeasure, x: number): void {
  if (u.node.attrs.kind !== "cont") return;
  const el = view.nodeDOM(u.pos) as HTMLElement;
  const value = row.kind === "cont" && x ? Math.floor(x) + "px" : "";
  if (el.style.getPropertyValue("--cont-x") === value) return;
  if (value) el.style.setProperty("--cont-x", value);
  else el.style.removeProperty("--cont-x");
}
function carryOut(c: BlockCtx, rows: RowMeasure[], indents: number[], at: number): Carry | null {
  const last = rows.length - 1;
  if (!c.carries || last < 0) return null;
  return rows[last].kind === "other" ? null : { end: indents[last] + rows[last].end, at };
}
const carriedFrom = (dual: boolean, carried: Carry | null, pos: number): number | null => (dual && carried?.at === pos ? carried.end : null);
const restSpace = (first: HTMLElement | null | undefined): number => (first ? parseFloat(getComputedStyle(first).fontSize) * 0.3 : 0);
const measuredEls = (c: BlockCtx): (HTMLElement | null)[] =>
  c.units.map((u, i) => (measured(c, i) ? latinOf(c.view.nodeDOM(u.pos) as HTMLElement | null, c.dual) : null));
function placeBlock(view: EditorView, block: Node, pos: number, carried: Carry | null): Carry | null {
  const dual = !!block.attrs.dual, carries = carriesInto(view, block, pos);
  if (!hasRest(block) && !carries) return carried;
  const units = blockUnits(block, pos, 0).filter((u) => u.line && !u.skip);
  const c: BlockCtx = { view, units, dual, carries, from: carriedFrom(dual, carried, pos) };
  const els = measuredEls(c);
  const rows = units.map((_, i) => rowMeasure(c, els[i], i));
  const indents = contIndents(rows, restSpace(els.find(Boolean)), c.from);
  indents.forEach((x, i) => { if (els[i]) writeIndent(view, units[i], rows[i], x); });
  return carryOut(c, rows, indents, pos + block.nodeSize);
}
function place(view: EditorView): void {
  let carried: Carry | null = null;
  view.state.doc.descendants((block, pos) => {
    if (block.isTextblock) return false;
    if (block.type !== N.verse) return true;
    carried = placeBlock(view, block, pos, carried);
    return false;
  });
}
export function continuations(): Plugin {
  return new Plugin({ key: new PluginKey("continuations"), view: measurePass(place) });
}
