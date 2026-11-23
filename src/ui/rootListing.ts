import type { Journal } from "../store/reference.ts";
import { entryKey, NS_BOOK, titlesRoots } from "../store/keys.ts";
import { shelvedRoots, SHELVES } from "../store/shelves.ts";
import { trimLabel } from "../model/trim.ts";

/* the row-label cap every list surface shares, so their truncation of an
   untrusted name cannot drift apart */
export const LABEL_CAP = 60;
export function rootLabel(ns: string, name: string, journal: Journal): string {
  return (titlesRoots(ns) && journal.heading(entryKey(ns, name))) || name;
}
export const shelvesText = (cache: Record<string, string>): string => cache[entryKey(NS_BOOK.key, SHELVES)] || "";

/* `shelf` names the shelf, `shelfLabel` shows it, both null for the roots
   on no shelf */
export interface Listed { shelf: string | null; shelfLabel: string | null; roots: { name: string; label: string }[] }
export interface ListingWorld { keys: string[]; journal: Journal; shelvesMd: string }
/* `cap`: true where a row cannot be cut with "…", as in a <select>; false
   where it can, the whole label kept for the row's title */
export function listing(ns: string, w: ListingWorld, open: string | null, cap: boolean): Listed[] {
  const shown = (s: string): string => (cap ? trimLabel(s, LABEL_CAP) : s);
  return shelvedRoots(ns, w.keys, w.shelvesMd, open).map((g) => ({
    shelf: g.shelf,
    shelfLabel: g.shelf === null ? null : trimLabel(g.shelf, LABEL_CAP),
    roots: g.roots.map((name) => ({ name, label: shown(rootLabel(ns, name, w.journal)) })),
  }));
}
