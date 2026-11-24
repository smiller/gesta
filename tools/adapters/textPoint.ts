/* a point in the editor's text: the `i`th character of a needle's first occurrence */
export type TextPoint = [needle: string, i: number];
/* where a point lands: its block, the piece of text in it, the offset in that piece */
export type Landing = [block: number, piece: number, offset: number];
/* a point lands in a piece holding its needle's text: between two
   pieces, the later one's start, or the earlier one's end where the point
   closes its needle (pin: textPoint.test › a point that closes) */
export function pieceAt(lengths: number[], k: number, closing: boolean): [number, number] | null {
  const holds = (len: number, at: number): boolean => (closing ? at <= len : at < len);
  for (let n = 0; n < lengths.length; n++) {
    if (holds(lengths[n], k)) return [n, k];
    k -= lengths[n];
  }
  return null;
}
export function closesNeedle(needle: string, i: number): boolean {
  return i > 0 && i >= needle.length;
}
/* a needle is sought within one block, its pieces joined: marks split a
   block's text into pieces, and a span across blocks is two needles
   (pin: textPoint.test › a needle is found only) */
export function landing(blocks: string[][], [needle, i]: TextPoint): Landing | null {
  for (let b = 0; b < blocks.length; b++) {
    const at = blocks[b].join("").indexOf(needle);
    if (at < 0) continue;
    const p = pieceAt(blocks[b].map((s) => s.length), at + i, closesNeedle(needle, i));
    return p && [b, p[0], p[1]];
  }
  return null;
}
export function landings(blocks: string[][], from: TextPoint, to: TextPoint): [Landing, Landing] | null {
  const a = landing(blocks, from), z = landing(blocks, to);
  return a && z && [a, z];
}
