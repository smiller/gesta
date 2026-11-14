import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { hasPages, pages } from "./pages.ts";
import { measurePass } from "./measurePass.ts";


/* THE LABEL STANDS BESIDE THE LINE ITS PAGE BEGINS ON: a line wrapping
   between a marker and its first word left the marker, and the label drawn
   from it, a line high — 8 of 60 markers followed by a space (MEASURED).
   The drop is measured and written on the marker as --page-drop, every
   reading first, then every write
   (pin: editing › page labels beside their leaf's first word) */
function place(view: EditorView): void {
  const drops: [HTMLElement, number][] = [];
  for (const { pos, at } of pages(view.state.doc)) {
    const dom = view.nodeDOM(pos);
    if (!(dom instanceof HTMLElement)) continue;
    let drop = 0;
    if (at !== null) { try { drop = view.coordsAtPos(at, 1).top - dom.getBoundingClientRect().top; } catch { drop = 0; } }
    drops.push([dom, Math.abs(drop) > 2 ? Math.round(drop) : 0]);
  }
  for (const [dom, drop] of drops) {
    if (drop) dom.style.setProperty("--page-drop", drop + "px");
    else dom.style.removeProperty("--page-drop");
  }
}
export const pageGutterKey = new PluginKey("pageGutter");
export function pageGutter(): Plugin {
  return new Plugin({
    key: pageGutterKey,
    props: {
      attributes: (state): Record<string, string> => (hasPages(state.doc) ? { class: "paged" } : {}),
    },
    view: measurePass(place),
  });
}
