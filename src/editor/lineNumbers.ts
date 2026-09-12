/* The line-number decoration: the unit walk's answer drawn on the rows as
   node decorations — a class, and the number as an attribute the stylesheet
   paints in the gutter (editor.css, `.ln::before`). THE PAINT MARKS, IT
   NEVER WRAPS, and it is never in the document: a decoration adds no node
   and no text, so a save, a copy and a search see none of it. Recomputed
   whole on every change to the document, from position: a row inserted
   above line 40 makes it 41 on the next paint with nothing to migrate. */
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { lineUnits, paintsLines, countsSentences } from "./numbering.ts";

export interface LineNumbersState {
  /* every nth line carries a drawn number; 0 draws none. The gutter is
     reserved whatever the interval, so changing it can never move a word. */
  interval: number;
  decorations: DecorationSet;
}

export const lineNumbersKey = new PluginKey<LineNumbersState>("lineNumbers");

/* one decoration per verse row that is a unit. A sentence never paints, so
   the prose block's units are left out here; they still count, for the jump
   and the citation to come. */
export function rowDecorations(doc: Node, interval: number): Decoration[] {
  const out: Decoration[] = [];
  for (const u of lineUnits(doc, interval)) {
    if (u.kind === "sentence") continue;
    let cls = "ln";
    if (u.kind === "stage") cls += " stage";
    if (u.shown) cls += " shown";
    const attrs: Record<string, string> = { class: cls };
    if (u.line) attrs["data-line"] = String(u.line);
    out.push(Decoration.node(u.pos, u.pos + u.node.nodeSize, attrs));
  }
  return out;
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
      /* the classes the stylesheet hangs on: `versepage` exactly where the
         document numbers its own lines (the gutter), `prosepage` where it
         counts sentences (no gutter, but the text is the text) */
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
