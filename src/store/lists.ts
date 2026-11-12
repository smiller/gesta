/* Derived from the keys on every call, never stored: nothing to heal or owe */
import { isDayKey, entryKey, byName, nsOf } from "./keys.ts";
import { pageParts } from "./keys.ts";

export function dayKeys(keys: string[]): string[] {
  return keys.filter(isDayKey).sort();
}
export interface Neighbors { prev: string | null; next: string | null }
export function entryNeighbors(keys: string[], date: string): Neighbors {
  let prev: string | null = null, next: string | null = null;
  for (const d of dayKeys(keys)) {
    if (d < date) prev = d;
    else if (d > date) { next = d; break; }
  }
  return { prev, next };
}
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
export interface Walk { keys: string[]; bearing: (key: string) => boolean }
function startAt(subs: string[], sub: string, stated: boolean): number {
  const at = subs.indexOf(sub);
  if (at >= 0) return at;
  if (stated) return subs.length;
  let i = 0;
  while (i < subs.length && byName(subs[i], sub) < 0) i++;
  return i;
}
export function subPageNeighbors(walk: Walk, parentKey: string, sub: string, order?: string[]): Neighbors {
  const subs = order || childrenOf(walk.keys, parentKey);
  const at = startAt(subs, sub, !!order);
  const bears = (s: string): boolean => s !== sub && walk.bearing(entryKey(parentKey, s));
  return { prev: subs.slice(0, at).reverse().find(bears) ?? null, next: subs.slice(at).find(bears) ?? null };
}
type Step = [string, string | null] | null;
export interface NavSteps { prev: Step; next: Step }
function subNeighbors(walk: Walk, date: string, pp: ReturnType<typeof pageParts>, orderOf?: (parentKey: string) => string[]): NavSteps {
  const parentKey = entryKey(date, pp.parent);
  const nb = subPageNeighbors(walk, parentKey, pp.leaf, orderOf?.(parentKey));
  const at = (s: string | null): Step => (s ? [date, pp.parent + "/" + s] : null);
  return { prev: at(nb.prev), next: at(nb.next) };
}
export function navNeighbors(walk: Walk, date: string, tag: string | null, orderOf?: (parentKey: string) => string[]): NavSteps {
  const pp = nsOf(date) && tag ? pageParts(tag) : null;
  if (pp?.sub) return subNeighbors(walk, date, pp, orderOf);
  if (tag) return { prev: null, next: null };
  const nb = entryNeighbors(walk.keys, date);
  return { prev: nb.prev ? [nb.prev, null] : null, next: nb.next ? [nb.next, null] : null };
}
