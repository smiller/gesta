/* An option IS a scope; the fixed rows come first,
   then each keyed namespace's ROOTS only (an imported library's every
   level would run to four figures) in labelled groups, an author's its
   shelf (pin: searchModel.test › an author's group is its shelf), the open
   book unioned into its own namespace's group so a preselect can never
   name a row the list does not hold (pin: searchModel.test › the open
   unregistered book joins its own group) */
import { nsOf, tagParts, entryKey, isDayKey, KEYED_NS, NS_KEYS, COMMONPLACE_KEY, capitalized, plural } from "../store/keys.ts";
import type { Journal } from "../store/reference.ts";
import { SCOPE_EVERYTHING, SCOPE_JOURNAL, SCOPE_COMMONPLACES, bookScope, type Scope, type Result } from "../store/search.ts";
import { rootLabel, listing, LABEL_CAP, type Listed } from "./rootListing.ts";
import { trimLabel } from "../model/trim.ts";
import type { SearchState } from "./screen.svelte.ts";

export interface ScopeOption { label: string; scope: Scope; group: string | null }
export function defaultScope(date: string, tag: string | null): Scope {
  return nsOf(date) && tag ? bookScope(date, tagParts(tag).name) : SCOPE_JOURNAL;
}
export function sameScope(a: Scope, b: Scope): boolean {
  if (a.kind === "book" && b.kind === "book") return a.ns === b.ns && a.book === b.book;
  if (a.kind === "shelf" && b.kind === "shelf") return a.ns === b.ns && a.shelf === b.shelf;
  return a.kind === b.kind;
}
export function nsGroupLabel(ns: string): string { return capitalized(plural(KEYED_NS[ns].noun)); }
export interface ScopeWorld { keys: string[]; journal: Journal; shelvesMd?: string }
const openBook = (open: Scope, ns: string): string | null => (open.kind === "book" && open.ns === ns ? open.book : null);
function groupOptions(ns: string, g: Listed): ScopeOption[] {
  const group = g.shelfLabel ?? nsGroupLabel(ns);
  const books = g.roots.map((r): ScopeOption => ({ label: r.label, scope: bookScope(ns, r.name), group }));
  if (g.shelf === null || g.roots.length < 2) return books;
  return [{ label: trimLabel("All " + g.shelf, LABEL_CAP), scope: { kind: "shelf", ns, shelf: g.shelf, books: new Set(g.roots.map((r) => r.name)) }, group }, ...books];
}
function nsOptions(ns: string, open: Scope, w: ScopeWorld): ScopeOption[] {
  return listing(ns, { keys: w.keys, journal: w.journal, shelvesMd: w.shelvesMd ?? "" }, openBook(open, ns), true).flatMap((g) => groupOptions(ns, g));
}
export function scopeOptions(date: string, tag: string | null, w: ScopeWorld): ScopeOption[] {
  const open = defaultScope(date, tag);
  return [
    { label: "Everything", scope: SCOPE_EVERYTHING, group: null },
    { label: "Journal", scope: SCOPE_JOURNAL, group: null },
    { label: "All " + nsGroupLabel(COMMONPLACE_KEY), scope: SCOPE_COMMONPLACES, group: null },
    ...NS_KEYS.flatMap((ns) => nsOptions(ns, open, w)),
  ];
}
/* the dropdown's runs of options under one optgroup: a run breaks where
   its namespace does as well as its label, so a shelf named "Commonplaces" is not
   drawn among the commonplaces, and each run is keyed by where it starts (pin:
   searchModel.test › the dropdown's runs) */
export function optionGroups(options: ScopeOption[]): { group: string | null; at: number[] }[] {
  const nsOfOption = (o: ScopeOption): string => (o.scope.kind === "book" || o.scope.kind === "shelf" ? o.scope.ns : "");
  const out: { group: string | null; at: number[]; ns: string }[] = [];
  options.forEach((o, i) => {
    const last = out[out.length - 1], ns = nsOfOption(o);
    if (last && last.group === o.group && last.ns === ns) last.at.push(i); else out.push({ group: o.group, at: [i], ns });
  });
  return out.map(({ group, at }) => ({ group, at }));
}
/* a result row's "where": a day by its DATE (identity, not title), a commonplace by its name, a sub-entry as book › parent › leaf (the parent is what
   tells siblings-of-siblings apart), the book dropped under a scope that
   already names it; every untrusted NAME bounded on its own (pin:
   searchModel.test › a day by its date and tag) */
const scopeNames = (scope: Scope, date: string, name: string): boolean => scope.kind === "book" && scope.ns === date && scope.book === name;
function pageLabel(date: string, tag: string, scope: Scope, journal: Journal): string {
  const parts = tagParts(tag);
  const book = trimLabel(rootLabel(date, parts.name, journal), LABEL_CAP);
  if (!parts.sub) return book;
  const leaf = trimLabel(journal.heading(entryKey(date, tag)) || parts.leaf, LABEL_CAP);
  const mid = parts.parent === parts.name ? "" : trimLabel(tagParts(parts.parent!).leaf, LABEL_CAP) + " › ";
  return scopeNames(scope, date, parts.name) ? mid + leaf : book + " › " + mid + leaf;
}
export function resultLabel(r: Result, scope: Scope, journal: Journal): string {
  if (isDayKey(r.date)) return r.tag ? r.date + " · " + trimLabel(r.tag, LABEL_CAP) : r.date;
  return r.tag ? pageLabel(r.date, r.tag, scope, journal) : "";
}
export interface SearchShown { open: boolean; answered: string | null; rows: number; empty: string }
export const searchShown = (sr: SearchState): SearchShown => ({ open: sr.open, answered: sr.answered, rows: sr.rows.length, empty: sr.empty });
