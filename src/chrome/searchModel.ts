/* What the Search row READS, pure: the scope it starts in, the scope
   select's options, and a result row's "where" label. Ported 2026-09-07
   from defaultScope (06-save-load.js), buildSearchScope (27-…js) and
   resultLabel (26-…js). An option IS a scope; the fixed rows come first,
   then one labelled group per keyed namespace holding its ROOTS only (an
   imported library's every level would run to four figures), the open
   book unioned into its own namespace's group so a preselect can never
   name a row the list does not hold. */
import { nsOf, pageParts, entryKey, isDayKey, KEYED_NS, NS_KEYS, PAGE_KEY, capitalized } from "../store/keys.ts";
import { childrenOf } from "../store/lists.ts";
import type { Journal } from "../store/reference.ts";
import { SCOPE_EVERYTHING, SCOPE_JOURNAL, SCOPE_PAGES, bookScope, type Scope, type Result } from "../store/search.ts";
import { rootLabel, trimLabel, LABEL_CAP } from "./mastheadModel.ts";

export interface ScopeOption { label: string; scope: Scope; group: string | null }
/* the open book on a page or a book page, else the dated journal */
export function defaultScope(date: string, tag: string | null): Scope {
  return nsOf(date) && tag ? bookScope(date, pageParts(tag).name) : SCOPE_JOURNAL;
}
export function sameScope(a: Scope, b: Scope): boolean {
  return a.kind === b.kind && (a.kind !== "book" || b.kind !== "book" || (a.ns === b.ns && a.book === b.book));
}
export function nsGroupLabel(ns: string): string { return capitalized(KEYED_NS[ns].noun) + "s"; }
export function scopeOptions(date: string, tag: string | null, keys: string[], journal: Journal): ScopeOption[] {
  const out: ScopeOption[] = [
    { label: "Everything", scope: SCOPE_EVERYTHING, group: null },
    { label: "Journal", scope: SCOPE_JOURNAL, group: null },
    { label: "All " + nsGroupLabel(PAGE_KEY), scope: SCOPE_PAGES, group: null },
  ];
  const open = defaultScope(date, tag);
  for (const ns of NS_KEYS) {
    const roots = childrenOf(keys, ns);
    if (open.kind === "book" && open.ns === ns && roots.indexOf(open.book) === -1) roots.push(open.book);
    for (const name of roots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
      out.push({ label: trimLabel(rootLabel(ns, name, journal), LABEL_CAP), scope: bookScope(ns, name), group: nsGroupLabel(ns) });
    }
  }
  return out;
}
/* a result row's "where": a day by its DATE (identity, not title), a page
   by its name, a sub-page as book › parent › leaf (the parent is what
   tells siblings-of-siblings apart), the book dropped under a scope that
   already names it; every untrusted NAME bounded on its own */
export function resultLabel(r: Result, scope: Scope, journal: Journal): string {
  if (isDayKey(r.date)) return r.tag ? r.date + " · " + trimLabel(r.tag, LABEL_CAP) : r.date;
  if (!r.tag) return "";
  const parts = pageParts(r.tag);
  const book = trimLabel(rootLabel(r.date, parts.name, journal), LABEL_CAP);
  if (!parts.sub) return book;
  const leaf = trimLabel(journal.heading(entryKey(r.date, r.tag)) || parts.leaf, LABEL_CAP);
  const mid = parts.parent === parts.name ? "" : trimLabel(pageParts(parts.parent!).leaf, LABEL_CAP) + " › ";
  return scope.kind === "book" && scope.ns === r.date && scope.book === parts.name ? mid + leaf : book + " › " + mid + leaf;
}
