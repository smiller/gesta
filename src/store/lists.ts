/* The derived lists — which days have entries, what sits under a key, the
   neighbours a walk steps to — RE-ASKED OF THE CACHE'S KEYS (decided
   2026-09-07). The current app kept them as localStorage lists, healed
   from the cache after every warm, with a debt ledger for a listing that
   failed to write; here the warm leaves every key in the cache, so the
   lists are a walk over Object.keys and there is nothing to heal or owe.
   Pure over a key list, so a node test supplies one. */
import { isDayKey, entryKey, byName, nsOf } from "./keys.ts";
import { pageParts } from "./keys.ts";

/* the days with a main entry, ascending */
export function dayKeys(keys: string[]): string[] {
  return keys.filter(isDayKey).sort();
}
export interface Neighbors { prev: string | null; next: string | null }
/* the nearest day with an entry on either side of `date` — which need not
   itself have one, so the walk starts from any open day */
export function entryNeighbors(keys: string[], date: string): Neighbors {
  let prev: string | null = null, next: string | null = null;
  for (const d of dayKeys(keys)) {
    if (d < date) prev = d;
    else if (d > date) { next = d; break; }
  }
  return { prev, next };
}
/* the names registered directly under a key — a day's tags, a page's
   sub-pages, a namespace's roots — in byName order, an ancestor counting
   whether or not it has a body of its own */
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
/* is this key registered — itself present, or an ancestor of one that is */
export function registered(keys: string[], date: string, tag: string | null): boolean {
  const k = entryKey(date, tag), pre = k + "/";
  return keys.some((x) => x === k || x.slice(0, pre.length) === pre);
}
/* would this key be refused: a namespace that does not mint on visit
   refuses an unknown key — the bookshelf import rewrites thousands of
   cross-links, and a stale one has to read as dead rather than become a
   blank book page the autosave makes permanent */
export function unmintedKey(keys: string[], date: string, tag: string | null): boolean {
  const ns = nsOf(date);
  return !!(ns && !ns.mintsOnVisit && tag && !registered(keys, date, tag));
}
/* the nearest content-bearing sibling on either side of `sub` under its
   parent, in byName order; a sub the list does not hold still resolves, by
   comparison. Blank siblings are skipped lazily, each direction probing
   only until its first hit. */
/* THE ORDER IS THE CALLER'S TO GIVE: a book's index states its own — in
   the Consolatio the prose and the verse alternate, 3pr1 then 3m1 — and
   the walk follows it where the go-to row does (contents.ts); by name
   otherwise, as the current app's walk was. Asked 2026-09-12, when ⌃⌘.
   from 3pr1 went to 3pr2. */
export function subPageNeighbors(keys: string[], parentKey: string, sub: string, bearing: (key: string) => boolean, order?: string[]): Neighbors {
  const subs = order || childrenOf(keys, parentKey);
  let at = subs.indexOf(sub);
  if (at < 0) { at = 0; while (at < subs.length && byName(subs[at], sub) < 0) at++; }
  let prev: string | null = null, next: string | null = null;
  for (let i = at - 1; i >= 0 && !prev; i--) if (bearing(entryKey(parentKey, subs[i]))) prev = subs[i];
  for (let i = at; i < subs.length && !next; i++) if (subs[i] !== sub && bearing(entryKey(parentKey, subs[i]))) next = subs[i];
  return { prev, next };
}
/* the open entry's previous and next as {date, tag}: a day's are the
   adjacent days, a sub-page's the adjacent content-bearing siblings; a day's
   tagged entry and a top-level page have neither */
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
