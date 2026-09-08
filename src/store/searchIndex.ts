/* The search index over the cache: one row per non-blank entry, the
   entry's flat text and its fold, memoised on the exact stored markdown so
   a rebuild re-flattens only what moved and needs no invalidation hook.
   Ported 2026-09-07 from buildSearchIndex (23-search.js), re-asked of a
   cache that holds markdown: the flatten is a PARSE, MEASURED at 4.4 s
   over the whole mirror under node (123 MB, 13,565 files) against 0.15 s
   to lowercase the raw text — so the first build is CHUNKED, each step
   working until its deadline and reporting where it is, and the page
   decides when to run it. After that a rows() call is a walk over the
   keys with memo hits, a few milliseconds. ORDER: the keyed namespaces
   first, then the days newest first, a day's tagged entries after its
   main — the README's "pages listed before the dated journal". */
import { searchFold, type IndexRow } from "./search.ts";
import { isDayKey, byName, NS_KEYS } from "./keys.ts";

/* ONE PASS over the keys, bucketed by their first segment. The first
   spelling filtered the whole key list once per day — O(days × keys),
   MEASURED 2026-09-08 by the review at 500–708 ms a call over 13,600
   keys, paid on every scan; this one is 13,600 keys in under 100 ms
   (pinned in the test). A day with no main entry of its own stands in
   date order among the days, where the first spelling appended its
   tagged entries at the end. */
export function indexOrder(keys: string[]): string[] {
  const ns: Record<string, string[]> = Object.create(null);
  for (const n of NS_KEYS) ns[n] = [];
  const dayMain = new Set<string>(), dayTags: Record<string, string[]> = Object.create(null);
  for (const k of keys) {
    if (isDayKey(k)) { dayMain.add(k); if (!dayTags[k]) dayTags[k] = []; continue; }
    const cut = k.indexOf("/"), head = cut === -1 ? k : k.slice(0, cut);
    if (head in ns) ns[head].push(k);
    else if (cut !== -1 && isDayKey(head)) (dayTags[head] || (dayTags[head] = [])).push(k);
  }
  const out: string[] = [];
  for (const n of NS_KEYS) out.push(...ns[n].sort(byName));
  for (const d of Object.keys(dayTags).sort().reverse()) {
    if (dayMain.has(d)) out.push(d);
    out.push(...dayTags[d].sort(byName));
  }
  return out;
}
export interface SearchIndex {
  /* flatten until the deadline; how far it got. Repeated until done. */
  step(deadlineMs: number): { done: number; total: number };
  readonly complete: boolean;
  /* the rows, current to the cache: any entry whose text moved is
     re-flattened here, so a search after an edit needs no invalidation */
  rows(): IndexRow[];
}
export function searchIndex(cache: Record<string, string>, flatten: (md: string) => string, now: () => number = () => performance.now()): SearchIndex {
  const memo: Record<string, { md: string; text: string; lower: string }> = Object.create(null);
  let order: string[] | null = null, at = 0;
  const entry = (key: string): { text: string; lower: string } | null => {
    const md = cache[key];
    if (!md || !md.trim()) return null;
    const m = memo[key];
    if (m && m.md === md) return m;
    const text = flatten(md);
    const fresh = { md, text, lower: searchFold(text) };
    memo[key] = fresh;
    return fresh;
  };
  const split = (key: string): { date: string; tag: string | null } => {
    const cut = key.indexOf("/");
    return cut === -1 ? { date: key, tag: null } : { date: key.slice(0, cut), tag: key.slice(cut + 1) };
  };
  /* the order is kept while the KEY SET stands — a scan per keystroke
     re-ordered 13,600 keys before it read a byte (the review, 2026-09-08) */
  let orderSig = "", ordered: string[] = [];
  const currentOrder = (): string[] => {
    const keys = Object.keys(cache), sig = keys.length + "\n" + keys.join("\n");
    if (sig !== orderSig) { orderSig = sig; ordered = indexOrder(keys); }
    return ordered;
  };
  return {
    step(deadlineMs) {
      if (!order) { order = currentOrder(); at = 0; }
      while (at < order.length && now() < deadlineMs) { entry(order[at]); at++; }
      return { done: at, total: order.length };
    },
    get complete() { return !!order && at >= order.length; },
    rows() {
      const out: IndexRow[] = [];
      for (const key of currentOrder()) {
        const e = entry(key);
        if (e) out.push({ ...split(key), text: e.text, lower: e.lower });
      }
      return out;
    },
  };
}
