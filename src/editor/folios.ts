import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { schema, isNote } from "../model/schema.ts";
import { measurePass } from "./measurePass.ts";

const N = schema.nodes;

export function hasFolios(doc: Node): boolean {
  let found = false;
  const walk = (node: Node): void => {
    node.forEach((child) => {
      if (found || isNote(child)) return;
      if (child.type === N.folio) found = true;
      else walk(child);
    });
  };
  walk(doc);
  return found;
}

/* WHERE EACH LEAF BEGINS: the first character after its marker — past a
   space, a block's end and a note, which is not the text — null where
   nothing follows (pin: folios.test › leafStarts) */
export function leafStarts(doc: Node): { pos: number; at: number | null }[] {
  const out: { pos: number; at: number | null }[] = [];
  let waiting: { pos: number; at: number | null }[] = [];
  doc.descendants((n, p) => {
    if (n.type === N.note || n.type === N.margin_note) return false;
    if (n.type === N.folio) { const f = { pos: p, at: null }; out.push(f); waiting.push(f); return false; }
    if (n.isText && waiting.length) {
      const i = n.text!.search(/\S/);
      if (i >= 0) { for (const f of waiting) f.at = p + i; waiting = []; }
    }
    return true;
  });
  return out;
}
/* THE LABEL STANDS BESIDE THE LINE ITS LEAF BEGINS ON: a line wrapping
   between a marker and its first word left the marker, and the label drawn
   from it, a line high — 8 of 60 markers followed by a space (MEASURED).
   The drop is measured and written on the marker as --folio-drop, every
   reading first, then every write
   (pin: editing as the old app does › page labels beside their leaf's first word) */
function place(view: EditorView): void {
  const drops: [HTMLElement, number][] = [];
  for (const { pos, at } of leafStarts(view.state.doc)) {
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) continue;
    let drop = 0;
    if (at !== null) { try { drop = view.coordsAtPos(at, 1).top - dom.getBoundingClientRect().top; } catch { drop = 0; } }
    drops.push([dom, Math.abs(drop) > 2 ? Math.round(drop) : 0]);
  }
  for (const [dom, drop] of drops) {
    if (drop) dom.style.setProperty("--folio-drop", drop + "px");
    else dom.style.removeProperty("--folio-drop");
  }
}
export const foliosKey = new PluginKey("folios");
export function folios(): Plugin {
  return new Plugin({
    key: foliosKey,
    props: {
      attributes: (state): Record<string, string> => (hasFolios(state.doc) ? { class: "foliopage" } : {}),
    },
    view: measurePass(place),
  });
}
