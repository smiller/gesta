import type { EntryLayer } from "./entries.ts";
import type { PictureMoves } from "./pictures.ts";
import { COMMONPLACE_KEY } from "./keys.ts";
import { entryFile, keyedFile } from "./names.ts";
import { rewriteLinks } from "./links.ts";
import { pictureNamesBetween, renamePictures } from "./move.ts";

const RETIRED = "page";
const OLD = RETIRED + "/", NEW = COMMONPLACE_KEY + "/";

export interface MoveParts {
  layer: Pick<EntryLayer, "cache" | "setEntry" | "removeEntry" | "storeReadFailed">;
  pictures: Pick<PictureMoves, "copyPicture" | "removePictures">;
  /* each keeper of state by entry key: bookmarks, places, folds */
  kept: ((moves: Record<string, string>) => void)[];
}
interface Planned { moves: Record<string, string>; writes: Record<string, string>; links: Record<string, string>; pictures: [string, string][] }

/* a commonplace's key is the page's with its first segment changed, so an
   address into one is followed by changing the same segment, its payload
   as written */
export const commonplaceLinks = (md: string): string =>
  rewriteLinks(md, (run) => (run.href.startsWith("#" + OLD) ? { href: "#" + NEW + run.href.slice(OLD.length + 1) } : null)) ?? md;
/* a page's text as the commonplace of its tag, with each picture it names
   whose key changes, from the old key to the new */
export function asCommonplace(tag: string, md: string): { md: string; pictures: [string, string][] } {
  const a = keyedFile(RETIRED, tag), b = entryFile(COMMONPLACE_KEY, tag);
  const linked = commonplaceLinks(md), names = pictureNamesBetween(a, b, linked, []);
  const pictures = Object.keys(names).map((src): [string, string] => [a.dir + src, b.dir + names[src]]);
  return { md: renamePictures(linked, names), pictures: pictures.filter(([from, to]) => from !== to) };
}
/* a commonplace already there is not written over: a run cut short
   landed it, and it may have been edited since (pin: toCommonplaces.test ›
   other entries' links are rewritten only once every commonplace has landed) */
function movedText(p: Planned, cache: Record<string, string>, key: string): void {
  const tag = key.slice(OLD.length);
  p.moves[key] = NEW + tag;
  if (NEW + tag in cache) return;
  const moved = asCommonplace(tag, cache[key]);
  p.pictures.push(...moved.pictures);
  p.writes[NEW + tag] = moved.md;
}
function planned(cache: Record<string, string>): Planned | null {
  const keys = Object.keys(cache), olds = keys.filter((k) => k.startsWith(OLD));
  if (!olds.length) return null;
  const p: Planned = { moves: Object.create(null), writes: Object.create(null), links: Object.create(null), pictures: [] };
  for (const k of olds) movedText(p, cache, k);
  for (const k of keys.filter((x) => !x.startsWith(OLD))) {
    const md = commonplaceLinks(cache[k]);
    if (md !== cache[k]) p.links[k] = md;
  }
  return p;
}
function cleared(m: MoveParts, p: Planned): Promise<boolean> {
  for (const keep of m.kept) keep(p.moves);
  return Promise.all(Object.keys(p.moves).map((k) => m.layer.removeEntry(k)))
    .then(() => m.pictures.removePictures(p.pictures.map(([from]) => from)))
    .then(() => true);
}
/* THE PAGES BECOME COMMONPLACES, once: the new entries and their pictures
   land before any link is rewritten, the links before any old one goes,
   and a copy or a write that does not land leaves every page and picture
   standing for the next start (pin: toCommonplaces.test › with no page
   left nothing moves) */
export function toCommonplaces(m: MoveParts): Promise<boolean> {
  const p = planned(m.layer.cache);
  if (!p) return Promise.resolve(false);
  const landed = (texts: Record<string, string>): Promise<boolean> =>
    Promise.all(Object.keys(texts).map((k) => m.layer.setEntry(k, texts[k]))).then((all) => !all.includes(false));
  return Promise.all(p.pictures.map(([from, to]) => m.pictures.copyPicture(from, to)))
    .then(() => landed(p.writes))
    .then((moved) => moved && landed(p.links))
    .then((linked) => linked && cleared(m, p))
    .catch(() => false);
}
/* the step after the journal loads: nothing moves in the read-only reader
   or over a store that could not be read */
export function afterLoad(m: MoveParts & { readOnly: boolean }): () => Promise<boolean> {
  return () => (m.readOnly || m.layer.storeReadFailed ? Promise.resolve(false) : toCommonplaces(m));
}
