/* the document flattened and the query parsed as the index's were, so nth
   lines up (pin: highlight.test › what selectionLink minted, findHit lands
   on). honorMarkers tells a live search-box jump (an edge "_" is a boundary
   marker) from a deep-link replay (the passage is LITERAL text, and an old
   link's nth, counted under substring rules, still lands) (pin:
   highlight.test › a deep link replays literally) */
import type { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { flattenDoc, flatRange } from "../model/flatten.ts";
import { parseSearchQuery, searchFold, searchHits } from "../store/search.ts";

export function findHit(doc: Node, query: string, nth: number, honorMarkers: boolean): { from: number; to: number } | null {
  const p = honorMarkers ? parseSearchQuery(query) : { needle: searchFold((query || "").trim()), left: false, right: false };
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
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, hit.from, hit.to)));
  return true;
}
