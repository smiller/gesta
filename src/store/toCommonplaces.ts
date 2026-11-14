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
interface Planned { moves: Record<string, string>; writes: Record<string, string>; pictures: [string, string][] }

/* a commonplace's key is the page's with its first segment changed, so an
   address into one is followed by changing the same segment, its payload
   as written */
const followed = (md: string): string =>
  rewriteLinks(md, (run) => (run.href.startsWith("#" + OLD) ? { href: "#" + NEW + run.href.slice(OLD.length + 1) } : null)) ?? md;
function movedText(p: Planned, key: string, md: string): void {
  const tag = key.slice(OLD.length), a = keyedFile(RETIRED, tag), b = entryFile(COMMONPLACE_KEY, tag);
  const names = pictureNamesBetween(a, b, followed(md), []);
  for (const src of Object.keys(names)) p.pictures.push([a.dir + src, b.dir + names[src]]);
  p.moves[key] = NEW + tag;
  p.writes[NEW + tag] = renamePictures(followed(md), names);
}
function planned(cache: Record<string, string>): Planned | null {
  const keys = Object.keys(cache), olds = keys.filter((k) => k.startsWith(OLD));
  if (!olds.length) return null;
  const p: Planned = { moves: Object.create(null), writes: Object.create(null), pictures: [] };
  for (const k of olds) movedText(p, k, cache[k]);
  for (const k of keys.filter((x) => !x.startsWith(OLD))) {
    const md = followed(cache[k]);
    if (md !== cache[k]) p.writes[k] = md;
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
   land before any old one goes, and a copy or a write that does not land
   leaves every page and picture standing for the next start (pin: toCommonplaces.test › with no page
   left nothing moves) */
export function toCommonplaces(m: MoveParts): Promise<boolean> {
  const p = planned(m.layer.cache);
  if (!p) return Promise.resolve(false);
  return Promise.all(p.pictures.map(([from, to]) => m.pictures.copyPicture(from, to)))
    .then(() => Promise.all(Object.keys(p.writes).map((k) => m.layer.setEntry(k, p.writes[k]))))
    .then((landed) => (landed.includes(false) ? false : cleared(m, p)), () => false);
}
/* the step after the journal loads: nothing moves in the read-only reader
   or over a store that could not be read */
export function afterLoad(m: MoveParts & { readOnly: boolean }): () => Promise<boolean> {
  return () => (m.readOnly || m.layer.storeReadFailed ? Promise.resolve(false) : toCommonplaces(m));
}
