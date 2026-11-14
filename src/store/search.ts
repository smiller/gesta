/* THE FOLD is 1:1 in code units, so offsets found on the folded string stay
   valid against the original: U+0130 İ — the one char whose toLowerCase
   expands — is pre-folded to I (pin: search.test › lower-cases, straightens
   curly apostrophes, stays 1:1 in code units). Every occurrence-counting
   site folds through searchFold, or their nth indices drift apart (pin:
   highlight.test › what selectionLink minted, findHit lands on) */
import { isDayKey, COMMONPLACE_KEY, pageParts } from "./keys.ts";

export function searchFold(s: string): string {
  return s.replace(/İ/g, "I").toLowerCase().replace(/[‘’]/g, "'");
}
export interface IndexRow { date: string; tag: string | null; text: string; lower: string }
export type Scope = { kind: "everything" } | { kind: "journal" } | { kind: "commonplaces" } | { kind: "book"; ns: string; book: string } | { kind: "shelf"; ns: string; shelf: string; books: ReadonlySet<string> };
export const SCOPE_EVERYTHING: Scope = Object.freeze({ kind: "everything" }) as Scope;
export const SCOPE_JOURNAL: Scope = Object.freeze({ kind: "journal" }) as Scope;
export const SCOPE_COMMONPLACES: Scope = Object.freeze({ kind: "commonplaces" }) as Scope;
export function bookScope(ns: string, book: string): Scope { return { kind: "book", ns, book }; }
/* a row's book: the same keyed namespace and the same root name — the
   parent's own body and every sub-entry share it, while "Sean" cannot
   swallow "Sean's Books". The namespace is half the question: a commonplace and
   a book may both be called "Shakespeare" (pin: search.test › a book scope
   carries its namespace) */
export function inBook(row: { date: string; tag: string | null }, ns: string, root: string): boolean {
  return row.date === ns && pageParts(row.tag || "").name === root;
}
/* the ONE spelling of the filter; every arm positive, an unknown kind
   STATED false rather than riding a fall-through. The COMMONPLACES kind
   stays the commonplaces' alone: "All Commonplaces" is a named surface, and a bookshelf reached
   through it would silently widen what that row promises (pin: search.test
   › the ONE filter) */
export function inScope(row: { date: string; tag: string | null }, scope: Scope): boolean {
  if (scope.kind === "everything") return true;
  if (scope.kind === "journal") return isDayKey(row.date);
  if (scope.kind === "commonplaces") return row.date === COMMONPLACE_KEY;
  if (scope.kind === "book") return inBook(row, scope.ns, scope.book);
  if (scope.kind === "shelf") return row.date === scope.ns && scope.books.has(pageParts(row.tag || "").name);
  return false;
}
export interface Query { needle: string; left: boolean; right: boolean }
/* substring by DEFAULT; an edge "_" requires a word boundary on that end,
   so "_sister_" is the whole word; a doubled edge underscore searches the
   literal one; an only-underscores query is a literal search (pin:
   search.test › substring by default) */
/* a footnote mark, a space and superscript digits after a word, dropped;
   "m²" stays (pin: highlight.test › a deep link whose passage carries its footnote marks) */
export function withoutNoteMarks(s: string): string {
  return s.replace(/(?<=\S) [⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "");
}
export function parseSearchQuery(raw: string | null | undefined): Query {
  const t = withoutNoteMarks(raw || "").trim();
  const left = t.charAt(0) === "_";
  let core = left ? t.slice(1) : t;
  const right = core.length > 0 && core.charAt(core.length - 1) === "_";
  if (right) core = core.slice(0, -1);
  core = core.trim();
  if (!core) return { needle: searchFold(t), left: false, right: false };
  return { needle: searchFold(core), left, right };
}
/* the apostrophe at a word's edge is quote punctuation, not word glue (pin:
   search.test › letters and digits only) */
export function isWordChar(text: string, i: number): boolean {
  return /[\p{L}\p{N}]/u.test(text.charAt(i));
}
/* every occurrence as flat offsets, keeping the ones whose boundaries
   hold. Unbounded, the scan steps by the needle's length (the stride nth
   has always used); bounded, by 1, so a valid hit overlapping a rejected
   one is kept ("ana_" in "banana") (pin: search.test › boundaries, the
   stride, and the limit) */
const holds = (hay: string, at: number, q: Query): boolean =>
  (!q.left || !isWordChar(hay, at - 1)) && (!q.right || !isWordChar(hay, at + q.needle.length));
export function searchHits(hay: string, q: Query, limit?: number): number[] {
  const out: number[] = [];
  if (!q.needle) return out;
  const step = q.left || q.right ? 1 : q.needle.length;
  for (let at = hay.indexOf(q.needle); at !== -1; at = hay.indexOf(q.needle, at + step)) {
    if (!holds(hay, at, q)) continue;
    out.push(at);
    if (limit && out.length >= limit) break;
  }
  return out;
}
/* the most matches one query collects: a common word matches a large
   slice of the journal, and a row per occurrence would freeze the panel */
export const SEARCH_CAP = 200;
export interface Result { date: string; tag: string | null; nth: number; snippet: string }
/* query in, matches out: one per occurrence with its index, so the jump
   lands on THAT occurrence; a snippet windowed 30 either side in the
   original case. ONE past the cap is collected, to tell "exactly the cap"
   from "more, clipped" (pin: search.test › the snippet elides on both
   sides, and the scan collects one past the cap) */
export function searchEntries(index: IndexRow[], query: string, scope: Scope): Result[] {
  const p = parseSearchQuery(query);
  const results: Result[] = [];
  if (!p.needle) return results;
  for (let i = 0; i < index.length && results.length <= SEARCH_CAP; i++) if (inScope(index[i], scope)) collect(results, index[i], p);
  return results;
}
function snippetAt(text: string, at: number, len: number): string {
  const start = Math.max(0, at - 30), end = Math.min(text.length, at + len + 30);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}
function collect(results: Result[], e: IndexRow, p: Query): void {
  const hits = searchHits(e.lower, p, SEARCH_CAP + 1 - results.length);
  for (let h = 0; h < hits.length && results.length <= SEARCH_CAP; h++) {
    results.push({ date: e.date, tag: e.tag, nth: h, snippet: snippetAt(e.text, hits[h], p.needle.length) });
  }
}
/* a snippet cut into plain and marked runs under the SAME parse the row
   was built under — best-effort at the "…" edges, cosmetic, never nth (pin:
   search.test › snippetRuns) */
export function snippetRuns(snippet: string, query: string): { text: string; mark: boolean }[] {
  const p = parseSearchQuery(query);
  if (!p.needle) return [{ text: snippet, mark: false }];
  const out: { text: string; mark: boolean }[] = [];
  let i = 0;
  for (const at of searchHits(searchFold(snippet), p)) {
    if (at < i) continue;
    if (at > i) out.push({ text: snippet.slice(i, at), mark: false });
    out.push({ text: snippet.slice(at, at + p.needle.length), mark: true });
    i = at + p.needle.length;
  }
  if (i < snippet.length) out.push({ text: snippet.slice(i), mark: false });
  return out;
}
