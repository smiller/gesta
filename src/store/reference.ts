import { isDayKey, titlesRoots, nsOf, entryKey, dateLabel } from "./keys.ts";
import { FOLIO_ARABIC } from "./folio.ts";

/* WHAT STANDS BEFORE THE PIECES, three answers: a BOOK names its author as
   the SURNAME off the KEY (a root key is surname-first so it sorts by surname; a
   comma-less root is a mononym); a DATED ENTRY names the journal, Gesta; a
   NAMED PAGE names NOTHING — it is its own document (pin: reference.test ›
   referenceAuthor) */
const surname = (root: string): string => root.split(",")[0].trim() || root;
export function referenceAuthor(date: string, root: string | null): string {
  if (titlesRoots(date)) return surname(root || "");
  return isDayKey(date) ? "Gesta" : "";
}
/* A SEGMENT IS A NUMERAL OR IT IS A TITLE. Measured against every key in
   the corpus, a numeral is spelled two ways: a digit-led token ("19",
   "2.1", Boethius's "3m9"), or a division word and a number with an
   optional title after ("Book 1", "Scène 2", "Fit 1. The Landing").
   EVERYTHING ELSE IS A TITLE, load-bearing: "25. The Oracles" and "29-2
   The Shakespeare Code" look numbered and must not be. A DATED SUB-PAGE
   NAME IS A NAME (the app mints "2023-11-12-the-article" from a URL); a
   bare date stays a numeral (pin: reference.test › referenceNumeral) */
export const REFERENCE_DATED = /^\d{4}-\d{2}-\d{2}-\S/;
export const REFERENCE_TOKEN = /^\d[\w.\-]*$/;
export const REFERENCE_DIVISION = /^\p{L}+\s+(\d+(?:[.\-]\d+)*)(?:\s*[.·\-–—:]\s*\S.*)?$/u;
/* the division arm is the caller's to allow; the bare-number arm stays
   everywhere */
export function referenceNumeral(seg: string, divisions: boolean): string | null {
  if (REFERENCE_DATED.test(seg)) return null;
  if (REFERENCE_TOKEN.test(seg)) return seg;
  if (!divisions) return null;
  const m = (seg || "").match(REFERENCE_DIVISION);
  return m ? m[1] : null;
}
/* A NUMERAL THAT ALREADY SPELLS ITS PARENT'S DOES NOT REPEAT IT: Boethius
   "Book 3/3m9" refers as 3m9. The remainder must begin with a NON-digit, so
   "Acte 2/Scène 2" stays 2.2 and "11m2" under Book 1 names book 11 (pin:
   reference.test › referenceAbsorbs) */
export function referenceAbsorbs(prev: string, next: string): boolean {
  if (!prev || !next.startsWith(prev)) return false;
  return next.length > prev.length && !/^\d/.test(next.charAt(prev.length));
}
/* THE LINE RANGE, ELIDED TO CHICAGO 9.61: under 100 or a multiple of 100,
   every digit; a zero in the tens, the changed part alone; else two digits,
   or all when the digits above them differ. The minimal elision shipped
   first and produced ranges read backwards (151-99, 100-1). The last band
   is narrowed to all digits: a five-figure line number cannot arise (pin:
   reference.test › elideRange: Chicago 9.61's bands) */
function changedPart(a: string, b: string): string {
  let i = 0;
  while (i < b.length - 1 && a.charAt(i) === b.charAt(i)) i++;
  return a + "-" + b.slice(i);
}
const unelided = (a: string, b: string, from: number): boolean => a.length !== b.length || from < 100 || from % 100 === 0;
export function elideRange(from: number, to: number): string {
  if (from === to) return String(from);
  const a = String(from), b = String(to), whole = a + "-" + b;
  if (unelided(a, b, from)) return whole;
  if (Math.floor(from / 10) % 10 === 0) return changedPart(a, b);
  return a.slice(0, -2) === b.slice(0, -2) ? a + "-" + b.slice(-2) : whole;
}
const plainArabic = (s: string): boolean => FOLIO_ARABIC.test(s) && String(+s) === s;
export function folioLabel(from: string, to?: string | null): string {
  if (!to || from === to) return "p. " + from;
  return "pp. " + ([from, to].every(plainArabic) ? elideRange(+from, +to) : from + "-" + to);
}

export interface Journal {
  heading(ekey: string): string;
  fromLastTitle(rootKey: string): boolean;
  /* the WORK's page carries `roman book and canto` */
  romanBookCanto(workKey: string): boolean;
  /* the ROOT's page carries `no author`: a heading that gathers works, not a person */
  noAuthor(rootKey: string): boolean;
  /* the page carries `Old English verse`: its lines are referred to by half-line */
  oldEnglishVerse(ekey: string): boolean;
  /* the WORK's page carries `prosimetrum`: a chapter's prose and its poems are referred to apart */
  prosimetrum(workKey: string): boolean;
  byBookChapterParagraph(workKey: string): boolean;
  /* the ROOT's page carries `scripture`: a book named plainly, its chapter and verse after a space */
  scripture(rootKey: string): boolean;
  /* the WORK's page carries `parts in roman`: its tales and parts named in roman after its italic title */
  partsInRoman(workKey: string): boolean;
}

/* THE FAERIE QUEENE'S SPELLING: its keys stay digit-led so book and canto
   join as numerals (`1.1`, `1.pr`), and a
   work whose page says `roman book and canto` refers to them as Spenserians
   do — the book upper-case Roman, the canto lower-case, `pr` (the proem)
   as it stands: I.i.2.1. Subtractive, the modern reference's form (IV, ix),
   not the print's IIII (pin: reference.test › roman: upper case for a book,
   lower for a canto, subtractive) */
const ROMAN: [number, string][] = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
export function roman(n: number, lower = false): string {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return lower ? out : out.toUpperCase();
}
export function romanKey(seg: string): string {
  const m = seg.match(/^(\d+)(?:\.(\d+|pr))?$/);
  if (!m) return seg;
  return roman(+m[1]) + cantoPart(m[2]);
}
function cantoPart(canto: string | undefined): string {
  if (canto === undefined) return "";
  return "." + (canto === "pr" ? "pr" : roman(+canto, true));
}
/* the work's key when an entry below it sits under the directive, else
   null: a book's author/work/leaf, the work being the second level */
export function romanWorkKey(date: string, tag: string | null, journal: Journal): string | null {
  const segs = tag ? tag.split("/") : [];
  if (!titlesRoots(date) || segs.length < 3) return null;
  const work = entryKey(date, segs[0] + "/" + segs[1]);
  return journal.romanBookCanto(work) ? work : null;
}
/* a book entry refers to half-lines when its own page or any above it says
   `Old English verse`: a root of works with no author says it once for all
   of them, an author's work for its parts */
export function refersByHalfLine(date: string, tag: string | null, journal: Journal): boolean {
  const segs = tag ? tag.split("/") : [];
  return titlesRoots(date) && segs.some((_, i) => journal.oldEnglishVerse(entryKey(date, segs.slice(0, i + 1).join("/"))));
}
const workKeyOf = (date: string, tag: string | null): string | null => {
  const segs = tag ? tag.split("/") : [];
  return titlesRoots(date) && segs.length >= 3 ? entryKey(date, segs[0] + "/" + segs[1]) : null;
};
export function refersAsProsimetrum(date: string, tag: string | null, journal: Journal): boolean {
  const work = workKeyOf(date, tag);
  return !!work && journal.prosimetrum(work);
}
export function refersByBookChapterParagraph(date: string, tag: string | null, journal: Journal): boolean {
  const work = workKeyOf(date, tag);
  return !!work && journal.byBookChapterParagraph(work);
}
export function refersAsScripture(date: string, tag: string | null, journal: Journal): boolean {
  return titlesRoots(date) && !!tag && journal.scripture(entryKey(date, tag.split("/")[0]));
}
export interface Piece { t?: string; n?: string; plain?: string; after?: string | null; translator?: string; division?: string }
/* a work headed "Metamorphoses (with Golding’s translation)": the title,
   and the translator a reference names its own lines by (pin:
   reference.test › referenceLabel: a work headed as given with a translation) */
const WITH_TRANSLATION = /^(.+?)\s+\(with\s+(.+?)[’']s translation\)$/;
/* the "<key><separator> " an entry's own heading opens with when it repeats
   the number it is keyed by */
export const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
   NOT IN THE BOOKSHELF, MEASURED: 1,099 of 1,340 numeral leaves are headed
   differently from their key, so the colon would repeat the reference (pin:
   reference.test › referenceLabel: the corpus table) */
/* the root and the levels below read differently: a page's root is
   its own name, a level below it its heading or its bare name */
function titlePiece(journal: Journal, key: string, i: number, seg: string): Piece {
  const t = i === 0 ? seg : journal.heading(key) || seg;
  const w = i > 0 ? WITH_TRANSLATION.exec(t) : null;
  return w ? { t: w[1], translator: w[2] } : { t };
}
function spelledPiece(seg: string, n: string, parts: Piece[]): Piece {
  const word = /^(\p{L}+)\s+\d/u.exec(seg)?.[1].toLowerCase() ?? (parts.some((p) => p.division) ? "chapter" : "book");
  return { plain: word + " " + n, division: n };
}
function joinNumeral(parts: Piece[], n: string): Piece {
  const last = parts[parts.length - 1];
  if (last?.n === undefined) {
    parts.push({ n });
    return parts[parts.length - 1];
  }
  const runs = last.n.split(".");
  if (referenceAbsorbs(runs[runs.length - 1], n)) runs[runs.length - 1] = n;
  else runs.push(n);
  last.n = runs.join(".");
  return last;
}
function afterHeading(journal: Journal, key: string, seg: string): string | null {
  const head = journal.heading(key).replace(referenceHeadPrefix(seg), "").trim();
  return head && head !== seg ? head : null;
}
interface PartsCtx { date: string; segs: string[]; journal: Journal; divisions: boolean; spelled: boolean }
function addPiece(parts: Piece[], c: PartsCtx, i: number): void {
  const seg = c.segs[i], key = entryKey(entryKey(c.date, c.segs.slice(0, i).join("/")), seg);
  const n = referenceNumeral(seg, c.divisions);
  if (n === null) { parts.push(titlePiece(c.journal, key, i, seg)); return; }
  if (c.spelled) { parts.push(spelledPiece(seg, n, parts)); return; }
  const last = joinNumeral(parts, n);
  if (!c.divisions) last.after = afterHeading(c.journal, key, seg);
}
export function referenceParts(date: string, tag: string | null, journal: Journal, spelled = false): Piece[] {
  const c: PartsCtx = { date, segs: tag ? tag.split("/") : [], journal, divisions: !!nsOf(date)?.numeralDivisions, spelled };
  const parts: Piece[] = [];
  for (let i = titlesRoots(date) ? 1 : 0; i < c.segs.length; i++) addPiece(parts, c, i);
  return parts;
}
export interface FolioRange { from: string; to: string }
/* the whole label: author, the pieces, and the locator — a line range or a
   leaf range, never both. The LINE range joins with a DOT onto a trailing
   numeral run and with a COMMA after a title; a LEAF range is always
   comma-joined. A day names itself by its date. A LINE RANGE WINS OVER A
   LEAF ONE, in a book alone (the refersWithLocator column). A LEAF LOCATES WHAT
   HAS NO NUMBER OF ITS OWN: numbered, the deepest division stands and the
   leaf drops (Screwtape came back referred to by leaf for Letter 12); titled, the
   leaf replaces every level below the work (pin: reference.test ›
   referenceLabel: the line range dots onto a numeral run) */
export interface Locator { range: string; folio?: FolioRange | null; facing?: string }
interface LabelCtx { date: string; tag: string | null; root: string; books: boolean; locates: boolean; journal: Journal }
function labelParts(c: LabelCtx): Piece[] {
  /* (pin: reference.test › referenceLabel by book, chapter, and paragraph) */
  const parts = referenceParts(c.date, c.tag, c.journal, refersByBookChapterParagraph(c.date, c.tag, c.journal));
  /* (pin: reference.test › referenceLabel under parts in roman) */
  const work = workKeyOf(c.date, c.tag);
  if (!work || !c.journal.partsInRoman(work)) return parts;
  return parts.map((p, i) => (i > 0 && titledWork(p) ? { plain: p.t! } : p));
}
const titledWork = (p: Piece): boolean => p.t !== undefined && !p.translator;
const hasTitle = (parts: Piece[]): boolean => parts.some((p) => p.t !== undefined);
function fromLastTitle(parts: Piece[]): Piece[] {
  let at = -1;
  parts.forEach((p, i) => { if (p.t !== undefined) at = i; });
  return at >= 0 ? parts.slice(at) : parts;
}
function numberedDeepest(parts: Piece[], c: LabelCtx): string | undefined {
  const deepest = parts[parts.length - 1];
  if (deepest?.n !== undefined && romanWorkKey(c.date, c.tag, c.journal)) deepest.n = romanKey(deepest.n);
  return deepest?.n ?? deepest?.division;
}
const wordedChapterRange = (deepest: Piece | undefined, range: string): boolean =>
  deepest?.division !== undefined && /^chapter\b/.test(deepest.plain!) && /^paras? /.test(range);
function placeRange(parts: Piece[], range: string): void {
  const deepest = parts[parts.length - 1];
  /* a worded range, "prose, para 4", stands after the chapter as a field of its own (pin: reference.test › referenceLabel: a worded range) */
  if (wordedChapterRange(deepest, range)) deepest.plain += " (" + range + ")";
  else if (/^[a-z]/i.test(range)) parts.push({ plain: range });
  else if (deepest?.division !== undefined) deepest.plain += "." + range;
  else if (deepest?.n !== undefined) deepest.n += "." + range;
  else parts.push({ n: range });
}
function placeFolio(parts: Piece[], folio: FolioRange, books: boolean, numbered: string | undefined): Piece[] {
  if (books && numbered !== undefined) return parts;
  const out = books ? parts.slice(0, 1) : parts;
  out.push({ plain: folioLabel(folio.from, folio.to) });
  return out;
}
function located(parts: Piece[], at: Locator, c: LabelCtx, numbered: string | undefined): Piece[] {
  if (!c.locates) return parts;
  if (at.range) { placeRange(parts, at.range); return parts; }
  return at.folio ? placeFolio(parts, at.folio, c.books, numbered) : parts;
}
/* the first field is a person (roman), a title (italic), or nothing; a root
   that names no author still names itself where no title stands below it
   (pin: reference.test › referenceLabel: a root whose page says no author) */
function withFirst(parts: Piece[], c: LabelCtx): Piece[] {
  const unnamed = c.books && c.journal.noAuthor(entryKey(c.date, c.root));
  const first = unnamed ? "" : referenceAuthor(c.date, c.root);
  if (first) parts.unshift(c.books ? { plain: first } : { t: first });
  else if (unnamed && !hasTitle(parts)) parts.unshift({ t: c.journal.heading(entryKey(c.date, c.root)) || c.root });
  return parts;
}
function pieceText(p: Piece, plainTitles: boolean): string {
  if (p.t !== undefined) return plainTitles ? p.t : "*" + p.t + "*";
  if (p.plain !== undefined) return p.plain;
  return p.n + (p.after ? ": *" + p.after + "*" : "");
}
const numberAfterTitle = (prev: Piece, p: Piece): boolean => p.n !== undefined && prev.t !== undefined;
/* (pin: reference.test › referenceLabel under scripture) */
function joinParts(parts: Piece[], plainTitles: boolean): string {
  const sep = (i: number): string => (i === 0 ? "" : plainTitles && numberAfterTitle(parts[i - 1], parts[i]) ? " " : ", ");
  return parts.map((p, i) => sep(i) + pieceText(p, plainTitles)).join("");
}
const labelCtx = (date: string, tag: string | null, journal: Journal): LabelCtx =>
  ({ date, tag, root: (tag || "").split("/")[0], books: titlesRoots(date), locates: !!nsOf(date)?.refersWithLocator, journal });
function framed(parts: Piece[], c: LabelCtx): Piece[] {
  if (isDayKey(c.date)) parts.unshift({ plain: dateLabel(c.date) });
  return c.books && c.journal.fromLastTitle(entryKey(c.date, c.root)) ? fromLastTitle(parts) : parts;
}
function translatorNote(c: LabelCtx, translator: string, facing: string, numbered: string | undefined): string {
  const division = numbered !== undefined ? numbered + "." : "";
  return " (" + translator + (facing && c.locates ? ", " + division + facing : "") + ")";
}
export function referenceLabel(date: string, tag: string | null, at: Locator, journal: Journal): string {
  const c = labelCtx(date, tag, journal);
  const pieces = labelParts(c);
  /* read before the last title drops the work that names it (pin: reference.test › referenceLabel: a work headed as given with a translation) */
  const translator = pieces.find((p) => p.translator)?.translator;
  /* a page whose heading names no translation is the translator's own, so
     its right column's lines are the ones referred to (pin: reference.test ›
     referenceLabel: a work headed as given with a translation) */
  const facing = at.facing ?? "";
  const range = !translator && facing ? facing : at.range;
  const parts = framed(pieces, c);
  const numbered = numberedDeepest(parts, c);
  const label = joinParts(withFirst(located(parts, { ...at, range }, c, numbered), c), c.books && journal.scripture(entryKey(date, c.root)));
  return translator ? label + translatorNote(c, translator, facing, numbered) : label;
}
export function mdLabel(text: string, fallback: string): string {
  /* a bracket closing one opened here stays, the link reads past it, 16.[379]; any
     other would end the link (pin: reference.test › mdLabel keeps a bracket) */
  let open = 0;
  const keep = (c: string): string => {
    if (c === "[") { open++; return c; }
    if (c !== "]" || !open) return " ";
    open--;
    return c;
  };
  const kept = (text || "").replace(/[[\]\n]/g, keep);
  return kept.replace(/\s+/g, " ").trim() || fallback;
}
