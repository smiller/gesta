import { entryFile, pictureIn, nextImageName, RELATIVE_SRC, type EntryFile } from "./names.ts";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { splitKey } from "./keys.ts";
import type { ImageStore } from "./store.ts";

/* group 1 the address as written, bracketed or bare, a bare one holding one
   level of balanced brackets; a title and brackets in the words allowed */
export const imageLinks = (): RegExp => /!\[(?:[^\]\n\\[]|\\.|\[[^\]\n]*\])*\]\((<[^>\n]*>|(?:[^()\s]|\([^()\s]*\))*)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g;
const relative = (srcs: string[]): string[] => Array.from(new Set(srcs.filter((s) => s && RELATIVE_SRC.test(s))));
/* the picture syntax alone: a name with brackets, a title or brackets in the
   words misread (pin: pictures.test › imageRefs: a text the editor
   cannot read) */
export function patternRefs(md: string): string[] {
  const out: string[] = [];
  if (md.indexOf("![") === -1) return out;
  const re = imageLinks();
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) out.push(m[1].charAt(0) === "<" ? m[1].slice(1, -1) : m[1]);
  return relative(out);
}
/* the pictures a text holds, read by parsing it as markdown, so a name with
   brackets, a title or brackets in the words are read whole (pin:
   pictures.test › imageRefs: every picture the editor shows) */
export function imageRefs(md: string): string[] {
  if (md.indexOf("![") === -1) return [];
  const shown = shownPictures(md);
  return shown ? relative(shown) : patternRefs(md);
}
/* every picture the parsed text holds, in order, null where it will not
   parse; the last text's answer is kept, the same text being asked twice in
   a row */
let lastShown: [string, string[] | null] | null = null;
export function shownPictures(md: string): string[] | null {
  if (lastShown && lastShown[0] === md) return lastShown[1];
  let out: string[] | null = [];
  try { parseMarkdown(md).descendants((n) => { if (n.type === schema.nodes.image) out!.push(String(n.attrs.src)); return true; }); }
  catch { out = null; }
  lastShown = [md, out];
  return out;
}
const keptRefs = (md: string): string[] => Array.from(new Set([...imageRefs(md), ...patternRefs(md)]));
/* a text's pictures read both ways, parsed and by their syntax alone: a
   reading in doubt keeps a picture, never frees one (pin: pictures.test ›
   a picture only the syntax reads) */
export function picturesOf(key: string, md: string): string[] {
  if (!md || md.indexOf("![") === -1) return [];
  const [date, tag] = splitKey(key);
  const at = entryFile(date, tag);
  return keptRefs(md).map((ref) => pictureIn(at, ref));
}
/* A NEW PICTURE NEVER TAKES A STORED NAME: one deleted from the text stays
   stored, unused, until it is swept, and a write under its name would put
   another picture in its place (pin: pictures.test › a picture stored under
   the entry's folder) */
export function takenNames(at: EntryFile, md: string, stored: string[]): string[] {
  const stems = [at.base + "-img-", at.flatBase + "-img-"];
  const here = stored.filter((k) => k.startsWith(at.dir)).map((k) => k.slice(at.dir.length));
  return [...keptRefs(md), ...here.filter((n) => !n.includes("/") && stems.some((s) => n.startsWith(s)))];
}
export const nextPictureName = (at: EntryFile, md: string, stored: string[]): string => nextImageName(at.base, takenNames(at, md, stored));
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
  pictureKeys(): Promise<string[]>;
}
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
export function pictureMoves(images: Pick<ImageStore, "get" | "set" | "del" | "keys">): PictureMoves {
  return {
    copyPicture: (from, to) => images.get(from).then((row) => row ? images.set(to, row.bytes).then(() => true) : false),
    pictureClash: (from, to) => images.get(to).then((b) => !b ? false : images.get(from).then((a) => !a || !sameBytes(a.bytes, b.bytes))),
    removePictures: (keys) => Promise.all(keys.map((k) => images.del(k))).then(() => {}),
    pictureKeys: () => images.keys(),
  };
}

const MIME: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml" };
export function pictureBlob(name: string, bytes: Uint8Array): Blob {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return new Blob([bytes as BlobPart], { type: MIME[ext] || "application/octet-stream" });
}
