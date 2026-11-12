/* THE PAINT MARKS, IT NEVER WRAPS, and it is never in the document: a
   decoration adds no node and no text, so a save, a copy and a search see
   none of it (pin: lineNumbers.test › setLineInterval repaints without
   touching the document). Recomputed whole on every change, from position:
   a row inserted above line 40 makes it 41 with nothing to migrate (pin:
   lineNumbers.test › the numbers are computed from position) */
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema } from "../model/schema.ts";
import { lineUnits, blockUnits, paintsLines, countsSentences, hasFacing, ownNumbers, type Unit } from "./numbering.ts";

export interface LineNumbersState {
  /* every nth line carries a drawn number; 0 draws none */
  interval: number;
  decorations: DecorationSet;
}

export const lineNumbersKey = new PluginKey<LineNumbersState>("lineNumbers");

/* the containers a numbered block below the top level is numbered in, and
   no other (pin: lineNumbers.test › a numbered block's numbers travel only
   where a gutter is drawn for them) */
const GUTTERED = new Set(["blockquote", "note", "card"]);
type Rows = Map<number, { end: number; attrs: Record<string, string> }>;
const unpainted = (doc: Node, u: Unit): boolean => (u.kind === "sentence" && !doc.nodeAt(u.blockPos)!.attrs.numbered) || !!u.skip;
function leftAttrs(u: Unit): Record<string, string> {
  let cls = "ln";
  if (u.kind === "stage") cls += " stage";
  if (u.shown) cls += " shown";
  const attrs: Record<string, string> = { class: cls };
  if (u.line) attrs["data-line"] = u.label ?? String(u.line);
  return attrs;
}
function addFacing(rows: Rows, u: Unit, shown: boolean): void {
  const row = rows.get(u.pos) ?? { end: u.pos + u.node.nodeSize, attrs: { class: "" } };
  row.attrs.class = (row.attrs.class + " rn" + (shown ? " rshown" : "")).trim();
  row.attrs["data-facing"] = String(u.line);
  rows.set(u.pos, row);
}
function nestedRows(rows: Rows, n: Node, pos: number): void {
  for (const u of blockUnits(n, pos, 1)) if (u.shown) rows.set(u.pos, { end: u.pos + u.node.nodeSize, attrs: { class: "ln shown", "data-line": u.label ?? String(u.line) } });
  if (n.attrs.facing != null) for (const u of blockUnits(n, pos, 1, "right")) addFacing(rows, u, true);
}
const isRowBlock = (n: Node): boolean => n.type === schema.nodes.verse || n.type === schema.nodes.prose;
const guttered = (n: Node, parent: Node | null): boolean => !!n.attrs.numbered && !!parent && GUTTERED.has(parent.type.name);
/* a numbered block quoted, or in a note or a card, carries its numbers
   with it (pin: lineNumbers.test › a numbered block quoted in an entry) */
function quotedRows(doc: Node, rows: Rows): void {
  doc.descendants((n, pos, parent) => {
    if (n.isTextblock || n.type === schema.nodes.margin_note) return false;
    if (isRowBlock(n) && guttered(n, parent)) nestedRows(rows, n, pos);
    return true;
  });
}
const decorations = (rows: [number, { end: number; attrs: Record<string, string> }][]): Decoration[] =>
  rows.map(([pos, r]) => Decoration.node(pos, r.end, r.attrs));
/* ONE decoration a row, both columns' numbers on it */
export function rowDecorations(doc: Node, interval: number): Decoration[] {
  const rows: Rows = new Map();
  for (const u of lineUnits(doc, interval)) if (!unpainted(doc, u)) rows.set(u.pos, { end: u.pos + u.node.nodeSize, attrs: leftAttrs(u) });
  quotedRows(doc, rows);
  if (!hasFacing(doc)) return decorations([...rows]);
  for (const u of lineUnits(doc, interval, "right")) addFacing(rows, u, !!u.shown);
  return decorations([...rows].sort(([a], [b]) => a - b));
}

function build(doc: Node, interval: number): LineNumbersState {
  return { interval, decorations: DecorationSet.create(doc, rowDecorations(doc, interval)) };
}

export function lineNumbers(interval: number): Plugin<LineNumbersState> {
  return new Plugin<LineNumbersState>({
    key: lineNumbersKey,
    state: {
      init: (_config, state) => build(state.doc, interval),
      apply: (tr, prev) => {
        const next = tr.getMeta(lineNumbersKey) as number | undefined;
        if (next !== undefined && next !== prev.interval) return build(tr.doc, next);
        return tr.docChanged ? build(tr.doc, prev.interval) : prev;
      },
    },
    props: {
      decorations: (state) => lineNumbersKey.getState(state)!.decorations,
      attributes: (state): Record<string, string> => {
        const cls = [paintsLines(state.doc) ? "versepage" : "", ownNumbers(state.doc) ? "ownnumbers" : "", countsSentences(state.doc) ? "prosepage" : ""].filter(Boolean).join(" ");
        return cls ? { class: cls } : {};
      },
    },
  });
}

export function setLineInterval(interval: number): Command {
  return (state, dispatch) => {
    if (lineNumbersKey.getState(state)!.interval === interval) return false;
    dispatch?.(state.tr.setMeta(lineNumbersKey, interval));
    return true;
  };
}
