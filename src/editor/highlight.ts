/* The jump: the nth occurrence of a query in the open document, selected
   and scrolled to — non-destructive, never in the saved text. Ported
   2026-09-07 from highlightMatch (23-search.js), re-asked of positions:
   the document is flattened the SAME way the index flattened the stored
   text and the query parsed the same way, so nth lines up. honorMarkers
   distinguishes a live search-box jump (an edge "_" is a boundary marker)
   from a deep-link replay (the passage is LITERAL text, and an old link's
   nth, counted under substring rules, still lands). */
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
export function highlightIn(view: EditorView, query: string, nth: number, honorMarkers: boolean): boolean {
  const hit = findHit(view.state.doc, query, nth, honorMarkers);
  if (!hit) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, hit.from, hit.to)).scrollIntoView());
  view.focus();
  return true;
}
