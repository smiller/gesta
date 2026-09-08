/* Search: the query grammar, the scope filter and the scan over an index.
   Ported 2026-09-07 from ../writer/src/js/search.mjs and the string half
   of 23-search.js. Every function takes strings or plain rows and returns
   the same; the index rows are built by searchIndex.ts, the jump by the
   editor. THE FOLD is 1:1 in code units, so offsets found on the folded
   string stay valid against the original: U+0130 İ — the one char whose
   toLowerCase expands — is pre-folded to I. Every occurrence-counting site
   folds through searchFold, or their nth indices drift apart. */
import { isDayKey, PAGE_KEY, pageParts } from "./keys.ts";

export function searchFold(s: string): string {
  return s.replace(/İ/g, "I").toLowerCase().replace(/[‘’]/g, "'");
}
export interface IndexRow { date: string; tag: string | null; text: string; lower: string }
export type Scope = { kind: "everything" } | { kind: "journal" } | { kind: "pages" } | { kind: "book"; ns: string; book: string };
export const SCOPE_EVERYTHING: Scope = Object.freeze({ kind: "everything" }) as Scope;
export const SCOPE_JOURNAL: Scope = Object.freeze({ kind: "journal" }) as Scope;
export const SCOPE_PAGES: Scope = Object.freeze({ kind: "pages" }) as Scope;
export function bookScope(ns: string, book: string): Scope { return { kind: "book", ns, book }; }
/* a row's book: the same keyed namespace and the same root name — the
   parent's own body and every sub-page share it, while "Sean" cannot
   swallow "Sean's Books". The namespace is half the question: a page and
   a book may both be called "Shakespeare". */
export function inBook(row: { date: string; tag: string | null }, ns: string, root: string): boolean {
  return row.date === ns && pageParts(row.tag || "").name === root;
}
/* the ONE spelling of the filter; every arm positive, an unknown kind
   STATED false rather than riding a fall-through. The PAGES kind stays
   page's alone: "All Pages" is a named surface, and a bookshelf reached
   through it would silently widen what that row promises. */
export function inScope(row: { date: string; tag: string | null }, scope: Scope): boolean {
  if (scope.kind === "everything") return true;
  if (scope.kind === "journal") return isDayKey(row.date);
  if (scope.kind === "pages") return row.date === PAGE_KEY;
  if (scope.kind === "book") return inBook(row, scope.ns, scope.book);
  return false;
}
export interface Query { needle: string; left: boolean; right: boolean }
/* substring by DEFAULT; an edge "_" requires a word boundary on that end,
   so "_sister_" is the whole word; a doubled edge underscore searches the
   literal one; an only-underscores query is a literal search */
export function parseSearchQuery(raw: string | null | undefined): Query {
  const t = (raw || "").trim();
  const left = t.charAt(0) === "_";
  let core = left ? t.slice(1) : t;
  const right = core.length > 0 && core.charAt(core.length - 1) === "_";
  if (right) core = core.slice(0, -1);
  core = core.trim();
  if (!core) return { needle: searchFold(t), left: false, right: false };
  return { needle: searchFold(core), left, right };
}
/* letters and digits only — the apostrophe at a word's edge is quote
   punctuation, not word glue */
export function isWordChar(text: string, i: number): boolean {
  return /[\p{L}\p{N}]/u.test(text.charAt(i));
}
/* every occurrence as flat offsets, keeping the ones whose boundaries
   hold. Unbounded, the scan steps by the needle's length (the stride nth
   has always used); bounded, by 1, so a valid hit overlapping a rejected
   one is kept ("ana_" in "banana"). */
export function searchHits(hay: string, needle: string, left: boolean, right: boolean, limit?: number): number[] {
  const out: number[] = [];
  if (!needle) return out;
  const step = left || right ? 1 : needle.length;
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + step)) {
    if ((!left || !isWordChar(hay, at - 1)) && (!right || !isWordChar(hay, at + needle.length))) {
      out.push(at);
      if (limit && out.length >= limit) break;
    }
  }
  return out;
}
/* the most matches one query collects: a common word matches a large
   slice of the journal, and a row per occurrence would freeze the panel */
export const SEARCH_CAP = 200;
export interface Result { date: string; tag: string | null; nth: number; snippet: string }
/* query in, matches out: one per occurrence with its index, so the jump
   lands on THAT occurrence; a snippet windowed 30 either side in the
   original case. ONE past the cap is collected so the renderer can tell
   "exactly the cap" from "more, clipped". */
export function searchEntries(index: IndexRow[], query: string, scope: Scope): Result[] {
  const p = parseSearchQuery(query);
  const results: Result[] = [];
  if (!p.needle) return results;
  for (let i = 0; i < index.length && results.length <= SEARCH_CAP; i++) {
    const e = index[i];
    if (!inScope(e, scope)) continue;
    const hits = searchHits(e.lower, p.needle, p.left, p.right, SEARCH_CAP + 1 - results.length);
    for (let h = 0; h < hits.length && results.length <= SEARCH_CAP; h++) {
      const at = hits[h];
      const start = Math.max(0, at - 30), end = Math.min(e.text.length, at + p.needle.length + 30);
      results.push({ date: e.date, tag: e.tag, nth: h, snippet: (start > 0 ? "…" : "") + e.text.slice(start, end) + (end < e.text.length ? "…" : "") });
    }
  }
  return results;
}
/* a snippet cut into plain and marked runs under the SAME parse the row
   was built under — best-effort at the "…" edges, cosmetic, never nth */
export function snippetRuns(snippet: string, query: string): { text: string; mark: boolean }[] {
  const p = parseSearchQuery(query);
  if (!p.needle) return [{ text: snippet, mark: false }];
  const out: { text: string; mark: boolean }[] = [];
  let i = 0;
  for (const at of searchHits(searchFold(snippet), p.needle, p.left, p.right)) {
    if (at < i) continue;
    if (at > i) out.push({ text: snippet.slice(i, at), mark: false });
    out.push({ text: snippet.slice(at, at + p.needle.length), mark: true });
    i = at + p.needle.length;
  }
  if (i < snippet.length) out.push({ text: snippet.slice(i), mark: false });
  return out;
}
