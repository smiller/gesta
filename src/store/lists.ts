/* Derived from the keys on every call, never stored: nothing to heal or owe */
import { isDayKey, entryKey, byName, nsOf } from "./keys.ts";
import { pageParts } from "./keys.ts";

export function dayKeys(keys: string[]): string[] {
  return keys.filter(isDayKey).sort();
}
export interface Neighbors { prev: string | null; next: string | null }
/* `date` need not itself have an entry, so the walk starts from any open
   day (pin: lists.test › entryNeighbors from an indexed day and from a day
   between) */
export function entryNeighbors(keys: string[], date: string): Neighbors {
  let prev: string | null = null, next: string | null = null;
  for (const d of dayKeys(keys)) {
    if (d < date) prev = d;
    else if (d > date) { next = d; break; }
  }
  return { prev, next };
}
/* an ancestor counts whether or not it has a body of its own (pin:
   lists.test › childrenOf: the names directly under a key, in reading order,
   ancestors included) */
export function childrenOf(keys: string[], parentKey: string): string[] {
  const pre = parentKey + "/";
  const seen: Record<string, true> = Object.create(null);
  for (const k of keys) {
    if (k.slice(0, pre.length) !== pre) continue;
    const rest = k.slice(pre.length);
    const cut = rest.indexOf("/");
    seen[cut === -1 ? rest : rest.slice(0, cut)] = true;
  }
  return Object.keys(seen).sort(byName);
}
export function registered(keys: string[], date: string, tag: string | null): boolean {
  const k = entryKey(date, tag), pre = k + "/";
  return keys.some((x) => x === k || x.slice(0, pre.length) === pre);
}
/* a namespace that does not mint on visit refuses an unknown key: a book's
   pages carry thousands of cross-links, and a stale one has to read as dead
   rather than become a blank page a save makes permanent (pin: bridge › an
   unknown book is refused) */
export function unmintedKey(keys: string[], date: string, tag: string | null): boolean {
  const ns = nsOf(date);
  return !!(ns && !ns.mintsOnVisit && tag && !registered(keys, date, tag));
}
/* a sub the list does not hold still resolves, by comparison — or, under a
   stated order, at its END: an unsaved sub placed by comparison in an order
   that is not alphabetical walked to the top of the index. Blank siblings
   are skipped lazily, each direction probing only until its first hit (pin:
   lists.test › subPageNeighbors: siblings in reading order, blanks skipped,
   an unlisted sub placed by comparison) */
/* THE ORDER IS THE CALLER'S TO GIVE: a book's index states its own — in the
   Consolatio the prose and the verse alternate, 3pr1 then 3m1; by name, ⌃⌘.
   from 3pr1 went to 3pr2 (pin: lists.test › subPageNeighbors walks the
   order it is given) */
export function subPageNeighbors(keys: string[], parentKey: string, sub: string, bearing: (key: string) => boolean, order?: string[]): Neighbors {
  const subs = order || childrenOf(keys, parentKey);
  let at = subs.indexOf(sub);
  if (at < 0) { if (order) at = subs.length; else { at = 0; while (at < subs.length && byName(subs[at], sub) < 0) at++; } }
  let prev: string | null = null, next: string | null = null;
  for (let i = at - 1; i >= 0 && !prev; i--) if (bearing(entryKey(parentKey, subs[i]))) prev = subs[i];
  for (let i = at; i < subs.length && !next; i++) if (subs[i] !== sub && bearing(entryKey(parentKey, subs[i]))) next = subs[i];
  return { prev, next };
}
/* a day's tagged entry and a top-level page have neither (pin: lists.test ›
   navNeighbors) */
export function navNeighbors(keys: string[], date: string, tag: string | null, bearing: (key: string) => boolean, orderOf?: (parentKey: string) => string[]): { prev: [string, string | null] | null; next: [string, string | null] | null } {
  const pp = nsOf(date) && tag ? pageParts(tag) : null;
  if (pp && pp.sub) {
    const parentKey = entryKey(date, pp.parent);
    const nb = subPageNeighbors(keys, parentKey, pp.leaf, bearing, orderOf?.(parentKey));
    return { prev: nb.prev ? [date, pp.parent + "/" + nb.prev] : null, next: nb.next ? [date, pp.parent + "/" + nb.next] : null };
  }
  if (tag) return { prev: null, next: null };
  const nb = entryNeighbors(keys, date);
  return { prev: nb.prev ? [nb.prev, null] : null, next: nb.next ? [nb.next, null] : null };
}
