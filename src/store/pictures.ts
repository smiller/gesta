import { entryFile, pictureIn } from "./names.ts";
import { imageRefs, patternRefs, splitKey } from "./exportEntries.ts";
import type { ImageStore } from "./store.ts";

/* a text's pictures read both ways, parsed and by their syntax alone: a
   reading in doubt keeps a picture, never frees one (pin: pictures.test ›
   a picture only the syntax reads) */
export function picturesOf(key: string, md: string): string[] {
  if (!md || md.indexOf("![") === -1) return [];
  const [date, tag] = splitKey(key);
  const at = entryFile(date, tag);
  return Array.from(new Set([...imageRefs(md), ...patternRefs(md)])).map((ref) => pictureIn(at, ref));
}
export function namedPictures(cache: Record<string, string>): Set<string> {
  const out = new Set<string>();
  for (const key of Object.keys(cache)) for (const k of picturesOf(key, cache[key])) out.add(k);
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

export interface PictureMoves {
  /* false when the store holds no picture under `from`; rejects when the write failed */
  copyPicture(from: string, to: string): Promise<boolean>;
  /* whether `to` holds a picture other than the one under `from` */
  pictureClash(from: string, to: string): Promise<boolean>;
  removePictures(keys: string[]): Promise<void>;
}
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
export function pictureMoves(images: Pick<ImageStore, "get" | "set" | "del">): PictureMoves {
  return {
    copyPicture: (from, to) => images.get(from).then((row) => row ? images.set(to, row.bytes).then(() => true) : false),
    pictureClash: (from, to) => images.get(to).then((b) => !b ? false : images.get(from).then((a) => !a || !sameBytes(a.bytes, b.bytes))),
    removePictures: (keys) => Promise.all(keys.map((k) => images.del(k))).then(() => {}),
  };
}
