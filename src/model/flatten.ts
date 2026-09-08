/* The document as ONE character stream with a position map, the stream
   every search site shares: the index text, the jump, and the reference
   payload's occurrence count. It is exactly
   `doc.textBetween(0, size, " ", " ").replace(/\s+/g, " ")` — a space
   between textblocks, a space for each leaf (a break, a picture, a folio),
   whitespace runs folded to one — but built by hand so each character
   knows the document position it came from (null for a separator or a
   folded run's tail), which is what turns a flat offset back into a
   selection. Ported 2026-09-07 from the current app's flattenSearch
   (dom.mjs), re-asked of positions; the whitespace fold is what its DOM
   walk did through the browser's own collapse. */
import type { Node } from "prosemirror-model";

export interface Flat { text: string; pos: (number | null)[] }
export function flattenDoc(doc: Node): Flat {
  const chars: string[] = [], pos: (number | null)[] = [];
  let first = true;
  const push = (ch: string, at: number | null): void => {
    const ws = /\s/.test(ch);
    if (ws && chars.length && /\s/.test(chars[chars.length - 1])) return;   /* fold the run */
    chars.push(ws ? " " : ch);
    pos.push(at);
  };
  doc.nodesBetween(0, doc.content.size, (node, at) => {
    if (node.isBlock && (node.isTextblock || node.isLeaf) && !first) push(" ", null);
    if (node.isBlock && (node.isTextblock || node.isLeaf)) first = false;
    if (node.isText) {
      const s = node.text!;
      for (let i = 0; i < s.length; i++) push(s.charAt(i), at + i);
    } else if (node.isLeaf) push(" ", null);
    return true;
  });
  return { text: chars.join(""), pos };
}
/* a flat span back to document positions, null when either end sits on
   a separator — the fail-safe if a fold ever drifts an offset */
export function flatRange(flat: Flat, at: number, len: number): { from: number; to: number } | null {
  const s = flat.pos[at], e = flat.pos[at + len - 1];
  if (s == null || e == null) return null;
  return { from: s, to: e + 1 };
}
