/* Memoised on the exact stored markdown, so a rebuild re-flattens only what
   moved and needs no invalidation hook. The flatten is a PARSE, MEASURED at
   4.4 s over the whole mirror under node (123 MB, 13,565 files) against
   0.15 s to lowercase the raw text, so the first build is CHUNKED, each
   step working until its deadline (pin: searchIndex.test › the chunked
   build stops at its deadline and resumes) */
import { searchFold, type IndexRow } from "./search.ts";
import { isDayKey, byName, NS_KEYS } from "./keys.ts";

/* ONE PASS over the keys, bucketed by their first segment: filtering the
   whole key list once per day, O(days × keys), MEASURED 500–708 ms a call
   over 13,600 keys, paid on every scan; this is under 100 ms (pin:
   searchIndex.test › orders 13,600 keys in one pass). A day with no main
   entry of its own stands in date order among the days (pin:
   searchIndex.test › keyed namespaces first by name, then the days newest
   first) */
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
  /* any entry whose text moved is re-flattened here, so a search after an
     edit needs no invalidation (pin: searchIndex.test › rows over the
     non-blank entries, flattened once and reused until the text moves) */
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
    /* a text the model refuses is indexed as its source: the build never
       stops on one entry, and the entry is still found by its words (pin:
       searchIndex.test › an entry whose flatten throws is indexed as its
       raw source) */
    let text: string;
    try { text = flatten(md); } catch { text = md; }
    const fresh = { md, text, lower: searchFold(text) };
    memo[key] = fresh;
    return fresh;
  };
  const split = (key: string): { date: string; tag: string | null } => {
    const cut = key.indexOf("/");
    return cut === -1 ? { date: key, tag: null } : { date: key.slice(0, cut), tag: key.slice(cut + 1) };
  };
  /* the order is kept while the KEY SET stands: a scan per keystroke
     re-ordered 13,600 keys before it read a byte (pin: searchIndex.test ›
     orders 13,600 keys in one pass, and rows() reuses the order) */
  let orderSig = "", ordered: string[] = [];
  const currentOrder = (): string[] => {
    const keys = Object.keys(cache), sig = JSON.stringify(keys);   /* a key may hold any character; the join is unambiguous */
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
