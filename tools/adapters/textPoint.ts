/* a point in the editor's text: the `i`th character of a needle's first occurrence */
export type TextPoint = [needle: string, i: number];
/* a point between two pieces is the later one's start unless it closes
   its needle: taken as the earlier one's end, a selection's start ran
   across the block before (pin: textPoint.test › a point between two
   pieces) */
export function pieceAt(lengths: number[], k: number, closing: boolean): [number, number] {
  const holds = (len: number, at: number): boolean => (closing ? at <= len : at < len);
  for (let n = 0; n < lengths.length; n++) {
    if (holds(lengths[n], k)) return [n, k];
    k -= lengths[n];
  }
  return [-1, 0];
}
export function closesNeedle(needle: string, i: number): boolean {
  return i > 0 && i === needle.length;
}
