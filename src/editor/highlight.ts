/* the document flattened and the query parsed as the index's were, so nth
   lines up (pin: highlight.test › what selectionLink minted, findHit lands
   on). honorMarkers tells a live search-box jump (an edge "_" is a boundary
   marker) from a deep-link replay (the passage is LITERAL text less its footnote marks, and an old
   link's nth, counted under substring rules, still lands) (pin:
   highlight.test › a deep link replays literally) */
import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { flattenDoc, flatRange } from "../model/flatten.ts";
import { parseSearchQuery, searchFold, searchHits, withoutNoteMarks } from "../store/search.ts";

export function findHit(doc: Node, query: string, nth: number, honorMarkers: boolean): { from: number; to: number } | null {
  const p = honorMarkers ? parseSearchQuery(query) : { needle: searchFold(withoutNoteMarks(query || "").trim()), left: false, right: false };
  if (!p.needle) return null;
  const flat = flattenDoc(doc);
  const hits = searchHits(searchFold(flat.text), p.needle, p.left, p.right, nth + 1);
  if (nth >= hits.length) return null;
  return flatRange(flat, hits[nth], p.needle.length);
}
/* NO SCROLL HERE: the selection's box is not yet where it will be a frame
   after the mount, and a scroll here landed a reference link into Paradise
   Lost 1.254 at the top of the book (pin: reference paste › a link deep
   into a long entry followed) */
export function highlightIn(view: EditorView, query: string, nth: number, honorMarkers: boolean): boolean {
  const hit = findHit(view.state.doc, query, nth, honorMarkers);
  if (!hit) return false;
  view.focus();
  view.dispatch(jumpTo(view.state, hit.from, hit.to));
  return true;
}
/* the jump's selection, until anything else moves the selection or the text:
   Escape takes back only a selection a reader did not make */
const jumpKey = new PluginKey<{ from: number; to: number } | null>("jump");
export function jumpTo(state: EditorState, from: number, to: number): Transaction {
  return state.tr.setSelection(TextSelection.create(state.doc, from, to)).setMeta(jumpKey, { from, to });
}
export const escapeJump: Command = (state, dispatch) => {
  const hit = jumpKey.getState(state);
  if (!hit || state.selection.from !== hit.from || state.selection.to !== hit.to) return false;
  dispatch?.(state.tr.setSelection(TextSelection.create(state.doc, hit.to)));
  return true;
};
export const jump = new Plugin<{ from: number; to: number } | null>({
  key: jumpKey,
  state: {
    init: () => null,
    apply: (tr, was) => (tr.getMeta(jumpKey) as { from: number; to: number } | undefined) ?? (tr.docChanged || tr.selectionSet ? null : was),
  },
});
