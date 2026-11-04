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
import { lineUnits, blockUnits, paintsLines, countsSentences, hasFacing, ownNumbers } from "./numbering.ts";

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
  /* a numbered block quoted, or in a note or a card, carries its numbers
     with it (pin: lineNumbers.test › a numbered block quoted in an entry) */
  doc.descendants((n, pos, parent) => {
    if (n.isTextblock || n.type === schema.nodes.margin_note) return false;
    if (n.type !== schema.nodes.verse && n.type !== schema.nodes.prose) return true;
    if (n.attrs.numbered && parent && GUTTERED.has(parent.type.name)) {
      for (const u of blockUnits(n, pos, 1)) if (u.shown) rows.set(u.pos, { end: u.pos + u.node.nodeSize, attrs: { class: "ln shown", "data-line": String(u.line) } });
      if (n.attrs.facing != null) for (const u of blockUnits(n, pos, 1, "right")) {
        const row = rows.get(u.pos) ?? { end: u.pos + u.node.nodeSize, attrs: { class: "" } };
        row.attrs.class = (row.attrs.class + " rn rshown").trim();
        row.attrs["data-facing"] = String(u.line);
        rows.set(u.pos, row);
      }
    }
    return true;
  });
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
