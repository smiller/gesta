/* The key and namespace vocabulary: what an entry key IS, apart from what is
   stored under it. Pure — no DOM, no storage. Ported 2026-09-07 from
   ../writer/src/js/keys.mjs, whose comments hold the measurements behind
   each rule; kept here are the rules, and the decisions this port made. */

/* the ONE spelling of "is this a day key": a key one site accepts and another
   rejects is a silently unroutable or unexportable entry. Day-facing guards
   test !isDayKey; page-facing branches test === PAGE_KEY. */
export const DATE_KEY_SRC = "\\d{4}-\\d{2}-\\d{2}";   /* the unanchored spelling link patterns embed */
export const DATE_KEY_RE = new RegExp("^" + DATE_KEY_SRC + "$");
export function isDayKey(key: string): boolean { return DATE_KEY_RE.test(key); }
/* the reserved word in the date slot that holds the named, non-dated pages —
   not date-shaped, so no real day can collide */
export const PAGE_KEY = "page";
/* the localStorage namespace every stored key wears. OUTSIDE page750.* —
   every file:// page shares one storage origin (MEASURED 2026-09-07 in
   Helium), and the successor never reads the old databases. */
export const NS = "gesta.v1.";

/* A namespace an entry key's first slot can hold besides a date. A ROW per
   namespace, differing only in DATA: a guard widened from `date === PAGE_KEY`
   to a namespace test, over a body that still builds a page key, is WRONG
   rather than unfinished — it files a book's sub-pages into a page's list the
   moment a second row exists. Only what DIFFERS earns a column. */
export interface Namespace {
  key: string;
  /* what each level is called in the copy the user reads — the delete confirm
     above all. Two nouns because the two levels genuinely differ; subNoun also
     words the create control ("New page…", "New author…"). */
  noun: string;
  subNoun: string;
  /* an unknown key opens, and registers on its first save */
  mintsOnVisit: boolean;
  /* whether a citation from here carries a locator — the selection's line
     range, or the leaf it sits on. A named document or a day is not about
     that: its citation names the entry and stops. */
  citesLocator: boolean;
  /* whether a root's KEY and its LABEL are different strings: a book's root is
     an author, keyed "Milton, John" and labelled "John Milton" by the entry's
     own heading. A page's name is the label, so nothing is read over it. */
  titledRoots: boolean;
  /* whether a reference reads a DIVISION WORD plus a number as a numeral —
     "Book 1", "Scène 2". False for pages, and measured: "Books 1–25" read as
     a division swallowed the whole page name. */
  numeralDivisions: boolean;
}
export const NS_PAGE: Namespace = {
  key: PAGE_KEY,
  noun: "page", subNoun: "sub-page",
  mintsOnVisit: true, citesLocator: false, titledRoots: false, numeralDivisions: false,
};
export const NS_BOOK: Namespace = {
  key: "bookshelf",
  /* "author": not every root is one — Doctor Who is a series — but they ran
     18 to 1 (counted 2026-08-11). Deeper than one level the sub noun still
     applies, so a scene of a play confirms as a "book". */
  noun: "author", subNoun: "book",
  mintsOnVisit: false, citesLocator: true, titledRoots: true, numeralDivisions: true,
};
/* a null-prototype map: a hand-typed #constructor or #__proto__ has to answer
   "not a namespace" */
export const KEYED_NS: Record<string, Namespace> = Object.create(null);
for (const ns of [NS_PAGE, NS_BOOK]) KEYED_NS[ns.key] = ns;
export const NS_KEYS: string[] = Object.keys(KEYED_NS);
/* the descriptor an entry key's date slot names — null on a day, and on any
   first slot that is neither. Day-facing guards still ask isDayKey: a hash
   that routes nowhere would pass !nsOf. */
export function nsOf(date: string): Namespace | null { return KEYED_NS[date] || null; }

export function todayKey(): string {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}
/* the masthead date: the weekday, then dateLabel's "30 June 2026" */
export function prettyDate(key: string): string {
  const p = key.split("-");
  const weekday = new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: "long" });
  return weekday + ", " + dateLabel(key);
}
export const MONTH_NAMES = ["january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"];
/* a month number (1-based) as its capitalized English name. English-fixed
   where prettyDate's weekday is locale-aware: these can end up in text that
   travels — a pasted link label. */
export function monthLabel(n: number): string {
  const m = MONTH_NAMES[n - 1] || "";
  return m.charAt(0).toUpperCase() + m.slice(1);
}
/* a compact "5 May 1998" for the key YYYY-MM-DD */
export function dateLabel(key: string): string {
  const p = key.split("-");
  return +p[2] + " " + monthLabel(+p[1]) + " " + p[0];
}

/* the ONE spelling of "split a page tag". Four fields because depth is
   uncapped and the two ends of a path are different questions: `name` the
   ROOT (which book), `sub` whether anything sits under it (a flag, every
   reader being a truthiness test), `parent` the immediate parent's path or
   null at the root (the list a name registers in, the crumb), `leaf` the last
   segment (the name this entry is renamed, deleted, labelled and filed by). */
export interface PageParts { name: string; sub: boolean; parent: string | null; leaf: string }
export function pageParts(tag: string): PageParts {
  const segs = tag.split("/");
  return {
    name: segs[0],
    sub: segs.length > 1,
    parent: segs.length > 1 ? segs.slice(0, -1).join("/") : null,
    leaf: segs[segs.length - 1],
  };
}
/* date + optional tag → the entry key, the ONE join everything files under */
export function entryKey(date: string, tag?: string | null): string { return date + (tag ? "/" + tag : ""); }
/* encodeURIComponent leaves ( ) literal, but a ) closes the markdown-link
   container these hash parts ride in — encode both */
export function encPart(s: string): string {
  return encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
export interface Highlight { q?: string; nth?: number }
/* a KEYED tag's slash is STRUCTURE (#page/Parent/Sub, one canonical spelling
   matched byte-for-byte by link retargeting); a day tag's slash is content
   and stays whole-encoded. `hl` is the selection-link payload, "?h=…&n=…". */
export function entryHash(date: string, tag?: string | null, hl?: Highlight): string {
  const enc = !tag ? "" : nsOf(date)
    ? tag.split("/").map(encPart).join("/")
    : encodeURIComponent(tag);
  const h = "#" + date + (tag ? "/" + enc : "");
  let p = "";
  if (hl && hl.q) p += "&h=" + encPart(hl.q) + (hl.nth ? "&n=" + hl.nth : "");
  return p ? h + "?" + p.slice(1) : h;
}
/* the DESTINATION half of a hash — everything before the "?h=…" payload */
export function hashTarget(raw: string): string {
  const q = raw.indexOf("?");
  return q === -1 ? raw : raw.slice(0, q);
}
export function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
/* the noun the copy uses for the LEVEL a key sits at — null on a day */
export function entryNoun(date: string, tag?: string | null): string | null {
  const ns = nsOf(date);
  return ns && (pageParts(tag || "").sub ? ns.subNoun : ns.noun);
}
/* can a root's label move at all — what a save asks before repainting */
export function titlesRoots(ns: string): boolean {
  const desc = nsOf(ns);
  return !!(desc && desc.titledRoots);
}
/* the comparator every name list shares: numeric-aware, so "2" sorts before
   "10" and "8" before "8b". Numeric collation ties DISTINCT names ("2" vs
   "02"), so ties break by code points — byName must stay a total order, or a
   tied pair sorts unstably and reads as "the sub itself" to a neighbour walk.
   A HELD collator: an options object per call defeats the engine's collator
   cache (MEASURED 1.5µs a call against 0.10µs held). */
export const nameColl = new Intl.Collator(undefined, { numeric: true });
export function byName(a: string, b: string): number {
  return nameColl.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}
