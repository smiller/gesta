/* THE LANDING MARK: the row or the leaf marker ⌃⌘G landed on, held as a
   position in a plugin and drawn as a node decoration — never in the
   document, never stored, gone when the bar closes. The position maps
   through every edit, so the mark survives typing and a deleted row
   simply has no mark; the bar's cycle asks where the mark stands rather
   than carrying an index of its own (the current app's lesson, 2026-08). */
import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

export const landingKey = new PluginKey<number | null>("landing");
export function landing(): Plugin<number | null> {
  return new Plugin<number | null>({
    key: landingKey,
    state: {
      init: () => null,
      apply(tr, pos) {
        const set = tr.getMeta(landingKey);
        if (set !== undefined) return set as number | null;
        if (pos === null || !tr.docChanged) return pos;
        const r = tr.mapping.mapResult(pos);
        return r.deleted ? null : r.pos;
      },
    },
    props: {
      decorations(state) {
        const pos = landingKey.getState(state);
        if (pos === null || pos === undefined) return null;
        const node = state.doc.nodeAt(pos);
        if (!node) return null;
        return DecorationSet.create(state.doc, [Decoration.node(pos, pos + node.nodeSize, { class: "landed" })]);
      },
    },
  });
}
export const landingPos = (state: EditorState): number | null => landingKey.getState(state) ?? null;
export function setLanding(view: EditorView, pos: number | null): void {
  view.dispatch(view.state.tr.setMeta(landingKey, pos));
}
