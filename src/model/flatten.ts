/* EXACTLY `doc.textBetween(0, size, " ", " ").replace(/\s+/g, " ")`, built by
   hand so each character knows the position it came from, null for a
   separator or a folded run's tail (pin: flatten.test › is textBetween with
   a space between blocks and for each leaf, whitespace folded) — less the
   footnote marks */
import type { Node } from "prosemirror-model";

export interface Flat { text: string; pos: (number | null)[] }
/* A FOOTNOTE MARK is a space and superscript digits after a word
   ("Pedenteria ¹ in"): skipped with its space, so a phrase reads across
   it; a superscript joined to its word ("m²") or opening a block is text
   (pin: flatten.test › a space and superscript digits after a word are skipped)
   (pin: flatten.test › a superscript joined to its word stays)
   (pin: flatten.test › a superscript opening a block is not a mark) */
const SUPERSCRIPT = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/;
type Pos = (number | null)[];
function startsMark(chars: string[], pos: Pos, spaceInText: (at: number) => boolean): boolean {
  const n = chars.length, at = pos[n - 1];
  if (n < 2 || chars[n - 1] !== " ") return false;
  if (at == null || /\s/.test(chars[n - 2])) return false;
  return spaceInText(at);
}
function marks(chars: string[], pos: Pos, spaceInText: (at: number) => boolean): (ch: string) => boolean {
  let inMark = false;
  return (ch) => {
    if (!SUPERSCRIPT.test(ch)) { inMark = false; return false; }
    if (inMark) return true;
    if (!startsMark(chars, pos, spaceInText)) return false;
    chars.pop(); pos.pop();
    inMark = true;
    return true;
  };
}
type Push = (ch: string, at: number | null) => void;
function collector(spaceInText: (at: number) => boolean): { push: Push; flat: () => Flat } {
  const chars: string[] = [], pos: Pos = [];
  const mark = marks(chars, pos, spaceInText);
  const push: Push = (ch, at) => {
    if (mark(ch)) return;
    const ws = /\s/.test(ch);
    if (ws && chars[chars.length - 1] === " ") return;
    chars.push(ws ? " " : ch);
    pos.push(at);
  };
  return { push, flat: () => ({ text: chars.join(""), pos }) };
}
const opensUnit = (node: Node): boolean => node.isBlock && (node.isTextblock || node.isLeaf);
function pushText(push: Push, s: string, at: number): void {
  for (let i = 0; i < s.length; i++) push(s.charAt(i), at + i);
}
export function flattenDoc(doc: Node): Flat {
  const c = collector(() => true);
  let first = true;
  doc.nodesBetween(0, doc.content.size, (node, at) => {
    const unit = opensUnit(node);
    if (unit && !first) c.push(" ", null);
    first &&= !unit;
    if (node.isText) pushText(c.push, node.text!, at);
    else if (node.isLeaf) c.push(" ", null);
    return true;
  });
  return c.flat();
}
/* flattenDoc's text without the position map, from string operations:
   equal to it on all 17,128 entries of a library, 1.3 s against 7.1 s over
   148 MB (MEASURED) (pin: flatten.test › is flattenDoc's text, built
   without the position map). A separator is \u0001 until the end, so a
   footnote mark is skipped only after a space that came from the text */
export function flattenDocText(doc: Node): string {
  const parts: string[] = [];
  let first = true;
  doc.nodesBetween(0, doc.content.size, (node) => {
    const unit = opensUnit(node);
    if (unit && !first) parts.push("\u0001");
    first &&= !unit;
    if (node.isText) parts.push(node.text!);
    else if (node.isLeaf) parts.push("\u0001");
    return true;
  });
  return parts.join("")
    .replace(/[\s\u0001]+/g, (run) => (run[0] === "\u0001" ? "\u0001" : " "))
    .replace(/(?<=[^\s\u0001]) [⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "")
    .replace(/\u0001/g, " ");
}
/* null when either end sits on a separator: the fail-safe if a fold ever
   drifts an offset */
export function flatRange(flat: Flat, at: number, len: number): { from: number; to: number } | null {
  const s = flat.pos[at], e = flat.pos[at + len - 1];
  if (s == null || e == null) return null;
  return { from: s, to: e + 1 };
}
export function flattenText(s: string): Flat {
  const c = collector((at) => s.charAt(at) === " ");
  for (let i = 0; i < s.length; i++) c.push(s.charAt(i), i);
  return c.flat();
}
export function lastMapped(flat: Flat, before: number): number {
  for (let i = Math.min(before, flat.pos.length) - 1; i >= 0; i--) if (flat.pos[i] != null) return i;
  return -1;
}
