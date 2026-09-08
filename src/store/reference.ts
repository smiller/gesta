/* The citation grammar and the label built by it: what a key segment reads
   as (a NUMERAL or a TITLE), how a numeral joins its parent's, how a line
   range and a leaf label elide, what stands before the pieces, and the
   whole label. Ported 2026-09-07 from ../writer/src/js/reference.mjs and
   the label half of 24-copying-a-reference.js, the entry reads (a title's
   heading, a root's directive) arriving through a Journal the caller
   supplies. Strings in, strings out. */
import { isDayKey, titlesRoots, nsOf, entryKey, dateLabel } from "./keys.ts";
import { FOLIO_ARABIC } from "./folio.ts";

/* WHAT STANDS BEFORE THE PIECES, three answers: a BOOK names its author as
   the SURNAME off the KEY (a root key is surname-first for byName's sake; a
   comma-less root is a mononym); a DATED ENTRY names the journal, Gesta; a
   NAMED PAGE names NOTHING — it is its own document. */
export function referenceAuthor(date: string, root: string | null): string {
  if (titlesRoots(date)) return (root || "").split(",")[0].trim() || root || "";
  return isDayKey(date) ? "Gesta" : "";
}
/* A SEGMENT IS A NUMERAL OR IT IS A TITLE. Measured against every key in
   the corpus, a numeral is spelled two ways: a digit-led token ("19",
   "2.1", Boethius's "3m9"), or a division word and a number with an
   optional title after ("Book 1", "Scène 2", "Fit 1. The Landing").
   EVERYTHING ELSE IS A TITLE, load-bearing: "25. The Oracles" and "29-2
   The Shakespeare Code" look numbered and must not be. A DATED SUB-PAGE
   NAME IS A NAME (the app mints "2023-11-12-the-article" from a URL); a
   bare date stays a numeral. */
export const REFERENCE_DATED = /^\d{4}-\d{2}-\d{2}-\S/;
export const REFERENCE_TOKEN = /^\d[\w.\-]*$/;
export const REFERENCE_DIVISION = /^\p{L}+\s+(\d+(?:[.\-]\d+)*)(?:\s*[.·\-–—:]\s*\S.*)?$/u;
/* the division arm is the caller's to allow (the namespace's
   numeralDivisions column); the bare-number arm stays everywhere */
export function referenceNumeral(seg: string, divisions: boolean): string | null {
  if (REFERENCE_DATED.test(seg)) return null;
  if (REFERENCE_TOKEN.test(seg)) return seg;
  if (!divisions) return null;
  const m = (seg || "").match(REFERENCE_DIVISION);
  return m ? m[1] : null;
}
/* A NUMERAL THAT ALREADY SPELLS ITS PARENT'S DOES NOT REPEAT IT: Boethius
   "Book 3/3m9" cites as 3m9. The remainder must begin with a NON-digit, so
   "Acte 2/Scène 2" stays 2.2 and "11m2" under Book 1 names book 11. */
export function referenceAbsorbs(prev: string, next: string): boolean {
  if (!prev || next.length <= prev.length || next.slice(0, prev.length) !== prev) return false;
  return !/^\d/.test(next.charAt(prev.length));
}
/* THE LINE RANGE, ELIDED TO CHICAGO 9.61: under 100 or a multiple of 100,
   every digit; a zero in the tens, the changed part alone; else two digits,
   or all when the digits above them differ. The minimal elision shipped
   first and produced ranges read backwards (151-99, 100-1). The last band
   is narrowed to all digits: a five-figure line number cannot arise. */
export function elideRange(from: number, to: number): string {
  if (from === to) return String(from);
  const a = String(from), b = String(to), whole = a + "-" + b;
  if (a.length !== b.length) return whole;
  if (from < 100 || from % 100 === 0) return whole;
  if (Math.floor(from / 10) % 10 === 0) {
    let i = 0;
    while (i < b.length - 1 && a.charAt(i) === b.charAt(i)) i++;
    return a + "-" + b.slice(i);
  }
  if (a.slice(0, -2) !== b.slice(0, -2)) return whole;
  return a + "-" + b.slice(-2);
}
/* THE ONE SPELLING OF A LEAF LABEL: arabic elides, roman never, and a
   zero-padded token cannot (the gutter draws the token as stored) */
export function folioLabel(from: string, to?: string | null): string {
  if (!to || from === to) return "p. " + from;
  const pair = FOLIO_ARABIC.test(from) && FOLIO_ARABIC.test(to) && String(+from) === from && String(+to) === to;
  return "pp. " + (pair ? elideRange(+from, +to) : from + "-" + to);
}

/* what the label reads off the journal: an entry's TITLE (its first
   level-one heading, decision 5) and whether a root's `::: reference`
   directive says "from the last title" */
export interface Journal {
  heading(ekey: string): string;
  fromLastTitle(rootKey: string): boolean;
}
export interface Piece { t?: string; n?: string; plain?: string; after?: string | null }
/* the "<key><separator> " an entry's own heading opens with when it repeats
   the number it is keyed by */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function referenceHeadPrefix(seg: string): RegExp {
  return new RegExp("^" + escapeRe(seg) + "\\s*[:.\u2014-]\\s*");
}
/* THE REFERENCE'S PIECES, read off the corpus and not off one book:
     Milton    Paradise Lost / Book 1        -> *Paradise Lost*, 1
     Shakes.   King John / 3.1               -> *King John*, 3.1
     Rostand   Cyrano… / Acte 2 / Scène 2    -> *Cyrano de Bergerac*, 2.2
     Boethius  Consolatio / Book 3 / 3m9     -> *De consolatione…*, 3m9
     Housman   Last Poems / 25. The Oracles  -> *Last Poems*, *25. The Oracles*
   Every level below the author contributes one piece; consecutive numerals
   join with dots; a TITLE IS SHOWN AS THE ENTRY'S OWN HEADING, never the
   key segment. A numbered entry that has a name shows it after a colon —
   NOT IN THE BOOKSHELF, measured: 1,099 of 1,340 numeral leaves are headed
   differently from their key, so the colon would repeat the reference. */
export function referenceParts(date: string, tag: string | null, journal: Journal): Piece[] {
  const segs = tag ? tag.split("/") : [];
  const desc = nsOf(date);
  const books = titlesRoots(date);
  const divisions = !!(desc && desc.numeralDivisions);
  const parts: Piece[] = [];
  for (let i = books ? 1 : 0; i < segs.length; i++) {
    const parentKey = entryKey(date, segs.slice(0, i).join("/"));
    const n = referenceNumeral(segs[i], divisions);
    if (n === null) {
      /* the root and the levels below read differently: a page's root is
         its own name, a level below it its heading or its bare name */
      const own = journal.heading(entryKey(parentKey, segs[i]));
      parts.push({ t: i === 0 ? (titlesRoots(date) ? own || segs[0] : segs[0]) : own || segs[i] });
      continue;
    }
    let last = parts[parts.length - 1];
    if (!last || last.n === undefined) { last = { n }; parts.push(last); }
    else {
      const runs = last.n.split(".");
      if (referenceAbsorbs(runs[runs.length - 1], n)) runs[runs.length - 1] = n;
      else runs.push(n);
      last.n = runs.join(".");
    }
    if (!divisions) {
      let head = journal.heading(entryKey(parentKey, segs[i]));
      if (head) head = head.replace(referenceHeadPrefix(segs[i]), "").trim();
      last.after = head && head !== segs[i] ? head : null;
    }
  }
  return parts;
}
export interface FolioRange { from: string; to: string }
/* the whole label: author, the pieces, and the locator — a line range or a
   leaf range, never both. The LINE range joins with a DOT onto a trailing
   numeral run and with a COMMA after a title; a LEAF range is always
   comma-joined. A day names itself by its date. A LINE RANGE WINS OVER A
   LEAF ONE, in a book alone (the citesLocator column). A LEAF LOCATES WHAT
   HAS NO NUMBER OF ITS OWN: numbered, the deepest division stands and the
   leaf drops (Screwtape came back cited by leaf for Letter 12, 2026-08-16);
   titled, the leaf replaces every level below the work. */
export function referenceLabel(date: string, tag: string | null, range: string, folio: FolioRange | null, journal: Journal): string {
  const root = (tag || "").split("/")[0];
  let parts = referenceParts(date, tag, journal);
  if (isDayKey(date)) parts.unshift({ plain: dateLabel(date) });
  if (titlesRoots(date) && journal.fromLastTitle(entryKey(date, root))) {
    let at = -1;
    parts.forEach((p, i) => { if (p.t !== undefined) at = i; });
    if (at >= 0) parts.splice(0, at);
  }
  const books = titlesRoots(date), deepest = parts[parts.length - 1];
  const ns = nsOf(date), locates = !!(ns && ns.citesLocator);
  if (range && locates) {
    if (deepest && deepest.n !== undefined) deepest.n += "." + range;
    else parts.push({ n: range });
  } else if (folio && locates) {
    if (!(books && deepest && deepest.n !== undefined)) {
      if (books) parts = parts.slice(0, 1);
      parts.push({ plain: folioLabel(folio.from, folio.to) });
    }
  }
  /* the first field is a person (roman), a title (italic), or nothing */
  const first = referenceAuthor(date, root);
  if (first) parts.unshift(books ? { plain: first } : { t: first });
  return parts.map((p) => {
    if (p.t !== undefined) return "*" + p.t + "*";
    if (p.plain !== undefined) return p.plain;
    return p.n + (p.after ? ": *" + p.after + "*" : "");
  }).join(", ");
}
/* a label as a markdown LINK TEXT: no "]" and no newline */
export function mdLabel(text: string, fallback: string): string {
  return (text || "").replace(/[\]\n]/g, " ").replace(/\s+/g, " ").trim() || fallback;
}
