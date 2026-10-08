export function matches(text: string, q: string): number[] {
  const out: number[] = [];
  if (!q) return out;
  for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + q.length)) out.push(i);
  return out;
}

export function nearest(hits: number[], pos: number): number {
  if (!hits.length) return -1;
  const k = hits.findIndex((h) => h >= pos);
  return k < 0 ? 0 : k;
}

export function replaceAt(text: string, hit: number, q: string, w: string): { text: string; caret: number } {
  return { text: text.slice(0, hit) + w + text.slice(hit + q.length), caret: hit + w.length };
}

/* the kept place is the current match's, not the text's end
   (pin: replace.test › every match replaced) */
export function replaceEvery(text: string, q: string, w: string, keep: number): { text: string; n: number; caret: number } {
  const hits = matches(text, q);
  const before = hits.filter((h) => h < keep).length;
  return { text: hits.length ? text.split(q).join(w) : text, n: hits.length, caret: keep + before * (w.length - q.length) };
}

/* `at` -1: no current match, the text having moved under the bar */
export function countLabel(q: string, n: number, at: number): string {
  if (!q) return "";
  if (!n) return "none";
  return at < 0 ? `${n} found` : `${at + 1} of ${n}`;
}
