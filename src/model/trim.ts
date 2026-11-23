/* cut at the cap with an ellipsis, never inside a surrogate pair (pin: trim.test › trimLabel) */
export function trimLabel(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = max - 1;
  if (/[\uD800-\uDBFF]/.test(s.charAt(cut - 1))) cut--;
  return s.slice(0, cut) + "…";
}
