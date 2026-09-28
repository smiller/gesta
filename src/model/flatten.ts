/* EXACTLY `doc.textBetween(0, size, " ", " ").replace(/\s+/g, " ")`, built by
   hand so each character knows the position it came from, null for a
   separator or a folded run's tail (pin: flatten.test › is textBetween with
   a space between blocks and for each leaf, whitespace folded) */
import type { Node } from "prosemirror-model";

export interface Flat { text: string; pos: (number | null)[] }
export function flattenDoc(doc: Node): Flat {
  const chars: string[] = [], pos: (number | null)[] = [];
  let first = true;
  const push = (ch: string, at: number | null): void => {
    const ws = /\s/.test(ch);
    if (ws && chars.length && /\s/.test(chars[chars.length - 1])) return;
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
/* null when either end sits on a separator: the fail-safe if a fold ever
   drifts an offset */
export function flatRange(flat: Flat, at: number, len: number): { from: number; to: number } | null {
  const s = flat.pos[at], e = flat.pos[at + len - 1];
  if (s == null || e == null) return null;
  return { from: s, to: e + 1 };
}
/* flattenDoc's fold, over a plain text (pin: flatten.test › folds a plain
   text as flattenDoc does) */
export function flattenText(s: string): Flat {
  const chars: string[] = [], pos: (number | null)[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i), ws = /\s/.test(ch);
    if (ws && chars.length && chars[chars.length - 1] === " ") continue;
    chars.push(ws ? " " : ch);
    pos.push(i);
  }
  return { text: chars.join(""), pos };
}
/* a block edge is a character with no position under it */
export function lastMapped(flat: Flat, before: number): number {
  for (let i = Math.min(before, flat.pos.length) - 1; i >= 0; i--) if (flat.pos[i] != null) return i;
  return -1;
}
