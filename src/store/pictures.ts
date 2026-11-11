import { entryFile, pictureIn } from "./names.ts";
import { imageRefs, splitKey } from "./exportEntries.ts";

export function namedPictures(cache: Record<string, string>): Set<string> {
  const out = new Set<string>();
  for (const key of Object.keys(cache)) {
    const md = cache[key];
    if (!md || md.indexOf("![") === -1) continue;
    const [date, tag] = splitKey(key);
    const at = entryFile(date, tag);
    for (const ref of imageRefs(md)) out.add(pictureIn(at, ref));
  }
  return out;
}
export function unnamed(keys: string[], cache: Record<string, string>): string[] {
  const named = namedPictures(cache);
  return keys.filter((k) => !named.has(k));
}
/* THE BELT: more than half the pictures
   unnamed at once is a symptom — a journal read short, a rule gone wrong —
   not a tidy-up, so nothing goes (pin: pictures.test › refuses, dropping
   nothing) */
export const SWEEP_FLOOR = 20;
export function sweepPlan(stored: string[], cache: Record<string, string>): { drop: string[]; refused: number } {
  const drop = unnamed(stored, cache);
  const over = drop.length > Math.max(SWEEP_FLOOR, stored.length / 2);
  return { drop: over ? [] : drop, refused: over ? drop.length : 0 };
}
