/* THE PAINT MARKS, IT NEVER WRAPS, and it is never in the document: a
   decoration adds no node and no text, so a save, a copy and a search see
   none of it (pin: lineNumbers.test › setLineInterval repaints without
   touching the document). Recomputed whole on every change, from position:
   a row inserted above line 40 makes it 41 with nothing to migrate (pin:
   lineNumbers.test › the numbers are computed from position) */
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { lineUnits, paintsLines, countsSentences, hasFacing } from "./numbering.ts";

export interface LineNumbersState {
  /* every nth line carries a drawn number; 0 draws none */
  interval: number;
  decorations: DecorationSet;
}

export const lineNumbersKey = new PluginKey<LineNumbersState>("lineNumbers");

/* ONE decoration a row, both columns' numbers on it */
export function rowDecorations(doc: Node, interval: number): Decoration[] {
  const rows = new Map<number, { end: number; attrs: Record<string, string> }>();
  for (const u of lineUnits(doc, interval)) {
    if (u.kind === "sentence" && !doc.nodeAt(u.blockPos)!.attrs.numbered || u.skip) continue;
    let cls = "ln";
    if (u.kind === "stage") cls += " stage";
    if (u.shown) cls += " shown";
    const attrs: Record<string, string> = { class: cls };
    if (u.line) attrs["data-line"] = String(u.line);
    rows.set(u.pos, { end: u.pos + u.node.nodeSize, attrs });
  }
  if (!hasFacing(doc)) return [...rows].map(([pos, r]) => Decoration.node(pos, r.end, r.attrs));
  for (const u of lineUnits(doc, interval, "right")) {
    const row = rows.get(u.pos) ?? { end: u.pos + u.node.nodeSize, attrs: { class: "" } };
    row.attrs.class = (row.attrs.class + " rn" + (u.shown ? " rshown" : "")).trim();
    row.attrs["data-facing"] = String(u.line);
    rows.set(u.pos, row);
  }
  return [...rows].sort(([a], [b]) => a - b).map(([pos, r]) => Decoration.node(pos, r.end, r.attrs));
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
        const cls = [paintsLines(state.doc) ? "versepage" : "", countsSentences(state.doc) ? "prosepage" : ""].filter(Boolean).join(" ");
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
