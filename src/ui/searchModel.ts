/* An option IS a scope; the fixed rows come first,
   then each keyed namespace's ROOTS only (an imported library's every
   level would run to four figures) in labelled groups, an author's its
   shelf (pin: searchModel.test › an author's group is its shelf), the open
   book unioned into its own namespace's group so a preselect can never
   name a row the list does not hold (pin: searchModel.test › the open
   unregistered book joins its own group) */
import { nsOf, pageParts, entryKey, isDayKey, KEYED_NS, NS_KEYS, PAGE_KEY, NS_BOOK, capitalized } from "../store/keys.ts";
import { SHELVES, parseShelves, shelved } from "../store/shelves.ts";
import { childrenOf } from "../store/lists.ts";
import type { Journal } from "../store/reference.ts";
import { SCOPE_EVERYTHING, SCOPE_JOURNAL, SCOPE_PAGES, bookScope, type Scope, type Result } from "../store/search.ts";
import { rootLabel, trimLabel, LABEL_CAP } from "./mastheadModel.ts";

export interface ScopeOption { label: string; scope: Scope; group: string | null }
export function defaultScope(date: string, tag: string | null): Scope {
  return nsOf(date) && tag ? bookScope(date, pageParts(tag).name) : SCOPE_JOURNAL;
}
export function sameScope(a: Scope, b: Scope): boolean {
  if (a.kind === "book" && b.kind === "book") return a.ns === b.ns && a.book === b.book;
  if (a.kind === "shelf" && b.kind === "shelf") return a.ns === b.ns && a.shelf === b.shelf;
  return a.kind === b.kind;
}
export function nsGroupLabel(ns: string): string { return capitalized(KEYED_NS[ns].noun) + "s"; }
export function scopeOptions(date: string, tag: string | null, keys: string[], journal: Journal, shelvesMd = ""): ScopeOption[] {
  const out: ScopeOption[] = [
    { label: "Everything", scope: SCOPE_EVERYTHING, group: null },
    { label: "Journal", scope: SCOPE_JOURNAL, group: null },
    { label: "All " + nsGroupLabel(PAGE_KEY), scope: SCOPE_PAGES, group: null },
  ];
  const open = defaultScope(date, tag);
  for (const ns of NS_KEYS) {
    const roots = childrenOf(keys, ns);
    if (open.kind === "book" && open.ns === ns && roots.indexOf(open.book) === -1) roots.push(open.book);
    roots.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const groups = ns === NS_BOOK.key ? shelved(roots, parseShelves(shelvesMd)) : [{ shelf: null, roots }];
    if (ns === NS_BOOK.key && open.kind === "book" && open.ns === ns && open.book === SHELVES) groups.push({ shelf: null, roots: [SHELVES] });
    for (const g of groups) {
      if (g.shelf !== null && g.roots.length > 1) out.push({ label: trimLabel("All " + g.shelf, LABEL_CAP), scope: { kind: "shelf", ns, shelf: g.shelf, books: g.roots }, group: g.shelf });
      for (const name of g.roots) out.push({ label: trimLabel(rootLabel(ns, name, journal), LABEL_CAP), scope: bookScope(ns, name), group: g.shelf ?? nsGroupLabel(ns) });
    }
  }
  return out;
}
/* a result row's "where": a day by its DATE (identity, not title), a page
   by its name, a sub-page as book › parent › leaf (the parent is what
   tells siblings-of-siblings apart), the book dropped under a scope that
   already names it; every untrusted NAME bounded on its own (pin:
   searchModel.test › a day by its date and tag) */
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
