import { test, expect } from "vitest";
import {
  REFERENCE_DATED, REFERENCE_TOKEN, REFERENCE_DIVISION, referenceNumeral,
  referenceAbsorbs, elideRange, folioLabel, referenceAuthor, referenceLabel, mdLabel, type Journal,
  roman, romanKey, romanWorkKey,
} from "./reference.ts";
import { NS_BOOK, NS_PAGE } from "./keys.ts";
import { journalOf, firstHeading } from "./headings.ts";

const says = (word: "fromLastTitle" | "romanBookCanto" | "noAuthor" | "prosimetrum" | "byBookChapterParagraph" | "scripture" | "partsInRoman", md: string): boolean => journalOf({ "bookshelf/W": md })[word]("bookshelf/W");

test("referenceNumeral: a digit-led token or a division word is a numeral, everything else a title", () => {
  expect(referenceNumeral("19", true)).toBe("19");
  expect(referenceNumeral("2.1", true)).toBe("2.1");
  expect(referenceNumeral("3m9", true)).toBe("3m9");
  expect(referenceNumeral("Book 1", true)).toBe("1");
  expect(referenceNumeral("Letter 31", true)).toBe("31");
  expect(referenceNumeral("Scène 2", true)).toBe("2");
  expect(referenceNumeral("Fit 1. The Landing", true)).toBe("1");
  expect(referenceNumeral("Book 11 · Guido", true)).toBe("11");
  expect(referenceNumeral("Book 1", false)).toBe(null);
  expect(referenceNumeral("19", false)).toBe("19");
  expect(referenceNumeral("A Cradle Song", true)).toBe(null);
  expect(referenceNumeral("2023-11-12-the-shakespeare-code", true)).toBe(null);
  expect(referenceNumeral("25. The Oracles", true)).toBe(null);
  expect(referenceNumeral("29-2 The Shakespeare Code", true)).toBe(null);
  expect(referenceNumeral("2023-11-12", true)).toBe("2023-11-12");
  expect(REFERENCE_DATED.test("2023-11-12-x")).toBe(true);
  expect(REFERENCE_TOKEN.test("2.1")).toBe(true);
  expect(REFERENCE_DIVISION.test("Scène 2")).toBe(true);
});

test("referenceAbsorbs: a numeral spelling its parent's does not repeat it", () => {
  expect(referenceAbsorbs("3", "3m9")).toBe(true);
  expect(referenceAbsorbs("2", "2")).toBe(false);
  expect(referenceAbsorbs("1", "11m2")).toBe(false);
  expect(referenceAbsorbs("", "3m9")).toBe(false);
});

test("elideRange: Chicago 9.61's bands, the last one narrowed", () => {
  expect(elideRange(7, 7)).toBe("7");
  expect(elideRange(3, 10)).toBe("3-10");
  expect(elideRange(96, 101)).toBe("96-101");
  expect(elideRange(100, 104)).toBe("100-104");
  expect(elideRange(100, 199)).toBe("100-199");
  expect(elideRange(1000, 1001)).toBe("1000-1001");
  expect(elideRange(101, 108)).toBe("101-8");
  expect(elideRange(604, 606)).toBe("604-6");
  expect(elideRange(1104, 1105)).toBe("1104-5");
  expect(elideRange(254, 255)).toBe("254-55");
  expect(elideRange(254, 267)).toBe("254-67");
  expect(elideRange(151, 199)).toBe("151-99");
  expect(elideRange(249, 250)).toBe("249-50");
  expect(elideRange(1110, 1119)).toBe("1110-19");
  expect(elideRange(321, 328)).toBe("321-28");
  expect(elideRange(498, 532)).toBe("498-532");
  expect(elideRange(1087, 1136)).toBe("1087-1136");
  expect(elideRange(999, 1000)).toBe("999-1000");
  expect(elideRange(100, 101)).toBe("100-101");
  expect(elideRange(11564, 11615)).toBe("11564-11615");
});

test("folioLabel: arabic elides, roman and zero-padded never", () => {
  expect(folioLabel("8")).toBe("p. 8");
  expect(folioLabel("8", "8")).toBe("p. 8");
  expect(folioLabel("254", "255")).toBe("pp. 254-55");
  expect(folioLabel("xii", "xv")).toBe("pp. xii-xv");
  expect(folioLabel("022")).toBe("p. 022");
  expect(folioLabel("007", "009")).toBe("pp. 007-009");
});

test("referenceAuthor: a book's surname off the key, Gesta for a day, nothing for a page", () => {
  expect(referenceAuthor(NS_BOOK.key, "Milton, John")).toBe("Milton");
  expect(referenceAuthor(NS_BOOK.key, "Virgil")).toBe("Virgil");
  expect(referenceAuthor("2021-06-22", "Walk")).toBe("Gesta");
  expect(referenceAuthor("2026-03-10", null)).toBe("Gesta");
  expect(referenceAuthor(NS_PAGE.key, "Sean's Books")).toBe("");
});

// the corpus cases, over a journal of headings
const journal: Journal = journalOf({
  "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost\n",
  "bookshelf/Milton, John/The Fifth Ode of Horace": "# The Fifth Ode of Horace",
  "bookshelf/Milton, John/Paradise Lost/Book 1": "# Book 1\n\n::: verse\nOf man's first\n:::",
  "bookshelf/Shakespeare, William/King John": "# King John",
  "bookshelf/Rostand, Edmond/Cyrano de Bergerac": "# Cyrano de Bergerac",
  "bookshelf/Boethius/Consolatio": "# De consolatione philosophiae",
  "bookshelf/Boethius/Consolatio/Book 3/3m9": "# Book 3, metre 9",
  "bookshelf/Housman, A. E/Last Poems": "# Last Poems",
  "bookshelf/Housman, A. E/Last Poems/25. The Oracles": "# 25. The Oracles",
  "bookshelf/Blake, William/Songs of Innocence/A Cradle Song": "# A Cradle Song",
  "bookshelf/Blake, William/Songs of Innocence": "# Songs of Innocence",
  "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::",
  "bookshelf/Dante/Commedia": "# Commedia",
  "bookshelf/Old English": "# Old English\n\n::: reference\nno author\n:::",
  "bookshelf/Old English/Beowulf": "# Beowulf",
  "bookshelf/Dante/Commedia/Inferno": "# Inferno",
  "bookshelf/Dante/Commedia (with Longfellow’s translation)": "# *Commedia* (with Longfellow’s translation)",
  "bookshelf/Dante/Commedia (with Longfellow’s translation)/Inferno": "# Inferno",
  "bookshelf/Lewis, C. S/The Screwtape Letters": "# The Screwtape Letters",
  "page/Sean's Books/1": "# The Figure of Beatrice\n\ntext",
  "page/Sean's Books/2": "# 2: Witchcraft\n",
  "page/Notes": "no heading here",
  "bookshelf/Ovid/Metamorphoses": "# Metamorphoses",
  "bookshelf/Ovid/Metamorphoses (with Golding’s translation)": "# *Metamorphoses* (with Golding’s translation)",
  "bookshelf/Ovid/Metamorphoses (with Golding’s translation)/Book 7": "# Book 7",
});

test("referenceLabel: a work headed as given with a translation refers to the title, and the translation's own lines after it", () => {
  const golding = "Ovid/Metamorphoses (with Golding’s translation)";
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", "197-208", null, journal, "265-77")).toBe("Ovid, *Metamorphoses*, 7.197-208 (Golding, 7.265-77)");
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", "", null, journal, "265-66")).toBe("Ovid, *Metamorphoses*, 7 (Golding, 7.265-66)");
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", "", null, journal)).toBe("Ovid, *Metamorphoses*, 7 (Golding)");
  expect(referenceLabel(NS_BOOK.key, golding, "", null, journal)).toBe("Ovid, *Metamorphoses* (Golding)");
  expect(referenceLabel(NS_BOOK.key, "Ovid/Metamorphoses", "", null, journal)).toBe("Ovid, *Metamorphoses*");
  // a page with no translation in its heading is the translator's own: its right column's lines are referred to
  expect(referenceLabel(NS_BOOK.key, "Milton, John/The Fifth Ode of Horace", "2", null, journal, "4")).toBe("Milton, *The Fifth Ode of Horace*, 4");
  // a title below the work that the label starts from keeps the translation's lines
  expect(referenceLabel(NS_BOOK.key, "Dante/Commedia (with Longfellow’s translation)/Inferno/7", "121-6", null, journal, "130-5")).toBe("Dante, *Inferno*, 7.121-6 (Longfellow, 7.130-5)");
});

test("referenceLabel: the corpus table, author then pieces", () => {
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", "", null, journal)).toBe("Milton, *Paradise Lost*, 1");
  expect(referenceLabel(NS_BOOK.key, "Shakespeare, William/King John/3.1", "", null, journal)).toBe("Shakespeare, *King John*, 3.1");
  expect(referenceLabel(NS_BOOK.key, "Rostand, Edmond/Cyrano de Bergerac/Acte 2/Scène 2", "", null, journal)).toBe("Rostand, *Cyrano de Bergerac*, 2.2");
  expect(referenceLabel(NS_BOOK.key, "Boethius/Consolatio/Book 3/3m9", "", null, journal)).toBe("Boethius, *De consolatione philosophiae*, 3m9");
  expect(referenceLabel(NS_BOOK.key, "Housman, A. E/Last Poems/25. The Oracles", "", null, journal)).toBe("Housman, *Last Poems*, *25. The Oracles*");
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", "", null, journal)).toBe("Blake, *Songs of Innocence*, *A Cradle Song*");
});

test("referenceLabel: the line range dots onto a numeral run and commas after a title; a leaf stands in only for a titled division", () => {
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", "254-55", null, journal)).toBe("Milton, *Paradise Lost*, 1.254-55");
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", "1-4", null, journal)).toBe("Blake, *Songs of Innocence*, *A Cradle Song*, 1-4");
  // a numbered division stands and the leaf drops (Screwtape)
  expect(referenceLabel(NS_BOOK.key, "Lewis, C. S/The Screwtape Letters/Letter 12", "", { from: "60", to: "62" }, journal)).toBe("Lewis, *The Screwtape Letters*, 12");
  // a titled division drops, with any numbered level above it, and the leaf stands in
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", "", { from: "22", to: "25" }, journal)).toBe("Blake, *Songs of Innocence*, pp. 22-25");
  // a line range wins over a leaf one
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", "3", { from: "9", to: "9" }, journal)).toBe("Milton, *Paradise Lost*, 1.3");
});

test("referenceLabel: from the last title, a day, a page", () => {
  expect(referenceLabel(NS_BOOK.key, "Dante/Commedia/Inferno/7", "121-6", null, journal)).toBe("Dante, *Inferno*, 7.121-6");
  // a day names itself by its date and refers to no locator
  expect(referenceLabel("2021-06-22", null, "3-5", null, journal)).toBe("*Gesta*, 22 June 2021");
  expect(referenceLabel("2021-06-22", "Walk", "", null, journal)).toBe("*Gesta*, 22 June 2021, *Walk*");
  // a page stands on its own name; a numbered sub-page shows its name after a colon
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/1", "", null, journal)).toBe("*Sean's Books*, 1: *The Figure of Beatrice*");
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/2", "", null, journal)).toBe("*Sean's Books*, 2: *Witchcraft*");
  expect(referenceLabel(NS_PAGE.key, "Notes", "", null, journal)).toBe("*Notes*");
  expect(referenceLabel(NS_PAGE.key, "Notes", "", { from: "3", to: "4" }, journal)).toBe("*Notes*");
});

test("referenceLabel: a root whose page says no author is named in no reference; the root itself stands on its title", () => {
  expect(referenceLabel(NS_BOOK.key, "Old English/Beowulf", "50-52", null, journal)).toBe("*Beowulf*, 50-52");
  expect(referenceLabel(NS_BOOK.key, "Old English/Beowulf", "", null, journal)).toBe("*Beowulf*");
  expect(referenceLabel(NS_BOOK.key, "Old English", "", null, journal)).toBe("*Old English*");
  expect(referenceLabel(NS_BOOK.key, "Old English", "1-3", null, journal)).toBe("*Old English*, 1-3");
  expect(referenceLabel(NS_BOOK.key, "Old English", "", { from: "3", to: "3" }, journal)).toBe("*Old English*, p. 3");
  expect(says("noAuthor", "# Old English\n\n::: reference\nno author\n:::")).toBe(true);
  expect(says("noAuthor", "# W\n\n> ::: reference\n> no author\n> :::")).toBe(false);
  expect(says("noAuthor", "# Dante\n\n::: reference\nfrom the last title\n:::")).toBe(false);
  expect(says("noAuthor", "# W\n\n::: reference\nfrom the last title (no authority for the order)\n:::")).toBe(false);
  expect(says("noAuthor", "# W\n\n::: reference\nfrom the last title\nNo author\n:::")).toBe(true);
});

test("headings: the first level-one heading is the title; a ## is a section; the directive is top-level only", () => {
  expect(firstHeading("# Title\n\n## Section")).toBe("Title");
  expect(firstHeading("## Section only")).toBe("");
  expect(firstHeading("text\n\n# Later title")).toBe("Later title");
  expect(firstHeading("")).toBe("");
  expect(says("fromLastTitle", "# Dante\n\n::: reference\nfrom the last title\n:::")).toBe(true);
  expect(says("fromLastTitle", "> ::: reference\n> from the last title\n> :::")).toBe(false);
  expect(says("fromLastTitle", "# Dante")).toBe(false);
});

test("mdLabel: no ] and no newline in a link text", () => {
  expect(mdLabel("a ] b\nc", "x")).toBe("a b c");
  expect(mdLabel("", "entry")).toBe("entry");
});

// The Faerie Queene's reference: a directive on the WORK's page, `roman book
// and canto`, respells the key's numerals — the book upper-case Roman, the
// canto lower-case, the proem's `pr` kept; the line range comes in already
// stanza-shaped ("2.1", "2", "2–3").
const fq = journalOf({
  "bookshelf/Spenser, Edmund": "# Edmund Spenser",
  "bookshelf/Spenser, Edmund/The Faerie Queene": "# The Faerie Queene\n\n::: reference\nroman book and canto\n:::\n\n## Book I: The Legende of the Knight of the Red Crosse, or of Holinesse\n",
  "bookshelf/Spenser, Edmund/The Faerie Queene/1.1": "# Book I, Canto i",
  "bookshelf/Spenser, Edmund/The Faerie Queene/1.pr": "# Book I, Proem",
  "bookshelf/Spenser, Edmund/Amoretti": "# Amoretti",
  "bookshelf/Spenser, Edmund/Amoretti/1": "# Sonnet 1",
});
const FQ = "Spenser, Edmund/The Faerie Queene/";
test("roman: upper case for a book, lower for a canto, subtractive", () => {
  expect([1, 4, 6, 7, 9, 12].map((n) => roman(n))).toEqual(["I", "IV", "VI", "VII", "IX", "XII"]);
  expect(roman(9, true)).toBe("ix");
  expect(romanKey("1.1")).toBe("I.i");
  expect(romanKey("1.pr")).toBe("I.pr");
  expect(romanKey("7.8")).toBe("VII.viii");
  expect(romanKey("4.12")).toBe("IV.xii");
  expect(romanKey("Book 1")).toBe("Book 1");   /* not a digit-led key: as it stands */
});
test("the directive is read off the work's page, top level only", () => {
  expect(says("romanBookCanto", "# W\n\n::: reference\nroman book and canto\n:::")).toBe(true);
  expect(says("romanBookCanto", "# W\n\n::: reference\nfrom the last title\n:::")).toBe(false);
  expect(says("romanBookCanto", "# W\n\n> ::: reference\n> roman book and canto\n> :::")).toBe(false);
  expect(says("romanBookCanto", "no directive")).toBe(false);
  expect(fq.romanBookCanto("bookshelf/Spenser, Edmund/The Faerie Queene")).toBe(true);
  expect(fq.romanBookCanto("bookshelf/Spenser, Edmund/Amoretti")).toBe(false);
  expect(romanWorkKey(NS_BOOK.key, FQ + "1.1", fq)).toBe("bookshelf/Spenser, Edmund/The Faerie Queene");
  expect(romanWorkKey(NS_BOOK.key, "Spenser, Edmund/Amoretti/1", fq)).toBe(null);
  expect(romanWorkKey(NS_PAGE.key, "Notes", fq)).toBe(null);
});
test("referenceLabel under the directive: I.i.2.1, the proem, whole stanzas, a run across them", () => {
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", "2.1", null, fq)).toBe("Spenser, *The Faerie Queene*, I.i.2.1");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", "2", null, fq)).toBe("Spenser, *The Faerie Queene*, I.i.2");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", "2–3", null, fq)).toBe("Spenser, *The Faerie Queene*, I.i.2–3");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", "2.8–3.2", null, fq)).toBe("Spenser, *The Faerie Queene*, I.i.2.8–3.2");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.pr", "1–4", null, fq)).toBe("Spenser, *The Faerie Queene*, I.pr.1–4");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", "", null, fq)).toBe("Spenser, *The Faerie Queene*, I.i");
  expect(referenceLabel(NS_BOOK.key, FQ + "7.8", "2.9", null, fq)).toBe("Spenser, *The Faerie Queene*, VII.viii.2.9");
  /* a work without the directive refers as every book does */
  expect(referenceLabel(NS_BOOK.key, "Spenser, Edmund/Amoretti/1", "3", null, fq)).toBe("Spenser, *Amoretti*, 1.3");
});

// The Vita Nuova: under the work's `prosimetrum` directive a reference names
// the part of the chapter it is in, comma-joined, never dotted.
const vn = journalOf({
  "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::",
  "bookshelf/Dante/Vita Nuova": "# Vita Nuova\n\n::: reference\nprosimetrum\n:::",
  "bookshelf/Dante/Vita Nuova/3": "# Vita Nuova, 3",
});
test("the prosimetrum directive is read off the work's page, a line of its own, top level only", () => {
  expect(says("prosimetrum", "# W\n\n::: reference\nprosimetrum\n:::")).toBe(true);
  expect(says("prosimetrum", "# W\n\n> ::: reference\n> prosimetrum\n> :::")).toBe(false);
  expect(says("prosimetrum", "# W\n\n::: reference\nnot a prosimetrum here\n:::")).toBe(false);
  expect(vn.prosimetrum("bookshelf/Dante/Vita Nuova")).toBe(true);
  expect(vn.prosimetrum("bookshelf/Dante/Commedia")).toBe(false);
});
test("referenceLabel: a worded range is comma-joined after the chapter, a numeral range still dots on", () => {
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", "prose, para 4", null, vn)).toBe("Dante, *Vita Nuova*, 3, prose, para 4");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/8", "verse 2.1-4", null, vn)).toBe("Dante, *Vita Nuova*, 8, verse 2.1-4");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", "", null, vn)).toBe("Dante, *Vita Nuova*, 3");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", "4", null, vn)).toBe("Dante, *Vita Nuova*, 3.4");
});

// De Doctrina Christiana: all prose, so under `by book, chapter, and paragraph` a reference names
// the book, the chapter and the paragraph, and no part of a chapter.
const ddc = journalOf({
  "bookshelf/Augustine/De Doctrina Christiana": "# De Doctrina Christiana\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/Augustine/De Doctrina Christiana/Preface": "# Preface",
});
test("the by book, chapter, and paragraph directive is read off the work's page, a line of its own, top level only", () => {
  expect(says("byBookChapterParagraph", "# W\n\n::: reference\nby book, chapter, and paragraph\n:::")).toBe(true);
  expect(says("byBookChapterParagraph", "# W\n\n> ::: reference\n> by book, chapter, and paragraph\n> :::")).toBe(false);
  expect(says("byBookChapterParagraph", "# W\n\n::: reference\nnot by book, chapter, and paragraph here\n:::")).toBe(false);
  expect(ddc.byBookChapterParagraph("bookshelf/Augustine/De Doctrina Christiana")).toBe(true);
  expect(ddc.byBookChapterParagraph("bookshelf/Dante/Vita Nuova")).toBe(false);
  expect(vn.byBookChapterParagraph("bookshelf/Dante/Vita Nuova")).toBe(false);
});
test("referenceLabel by book, chapter, and paragraph: the book named as a book, the chapter and its paragraph after it, a titled part and the paragraph alone", () => {
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Book 2", "chapter 40 (para 60)", null, ddc)).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 60)");
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Book 2", "", null, ddc)).toBe("Augustine, *De Doctrina Christiana*, book 2");
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Preface", "paras 1-2", null, ddc)).toBe("Augustine, *De Doctrina Christiana*, *Preface*, paras 1-2");
});

const works = journalOf({
  "bookshelf/A/W": "# W\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/A/Y (with Shaw’s translation)": "# Y (with Shaw’s translation)\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/Pius 2/W": "# W\n\n::: reference\nby book, chapter, and paragraph\n:::",
});
test("referenceLabel by book, chapter, and paragraph over other pages: the division's own word, a title in the key left out, the author never taken for it", () => {
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2. The Art of Signs", "chapter 4 (para 6)", null, works)).toBe("A, *W*, book 2, chapter 4 (para 6)");
  expect(referenceLabel(NS_BOOK.key, "Pius 2/W/Book 2", "chapter 1 (para 1)", null, works)).toBe("Pius 2, *W*, book 2, chapter 1 (para 1)");
  expect(referenceLabel(NS_BOOK.key, "A/W/2", "chapter 40 (para 60)", null, works)).toBe("A, *W*, book 2, chapter 40 (para 60)");
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2/Chapter 40", "para 60", null, works)).toBe("A, *W*, book 2, chapter 40 (para 60)");
});
test("referenceLabel by book, chapter, and paragraph: a numbered book stands and the leaf drops; a translator's locator keeps its book", () => {
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2", "", { from: "14", to: "14" }, works)).toBe("A, *W*, book 2");
  expect(referenceLabel(NS_BOOK.key, "A/Y (with Shaw’s translation)/Book 2", "5", null, works, "7")).toBe("A, *Y*, book 2.5 (Shaw, 2.7)");
});

// Scripture: under the root's `scripture` directive a book is named plainly
// and its chapter and verse follow a space, as a Bible is referred to.
const bible = journalOf({
  "bookshelf/KJV": "# KJV\n\n::: reference\nscripture\n:::",
  "bookshelf/KJV/Genesis": "# Genesis",
  "bookshelf/KJV/1 Samuel": "# 1 Samuel",
  "bookshelf/Douay-Rheims": "# Douay-Rheims\n\n::: reference\nscripture\n:::",
  "bookshelf/Douay-Rheims/Psalms": "# Psalms",
});
test("the scripture directive is read off the root's page, a line of its own", () => {
  expect(says("scripture", "# KJV\n\n::: reference\nscripture\n:::")).toBe(true);
  expect(says("scripture", "# KJV\n\n::: reference\nnot scripture here\n:::")).toBe(false);
  expect(bible.scripture("bookshelf/KJV")).toBe(true);
  expect(bible.scripture("bookshelf/Dante")).toBe(false);
});
test("referenceLabel under scripture: KJV, Genesis 1.3; a range; a chapter; a book; a book whose name opens with a number", () => {
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", "3", null, bible)).toBe("KJV, Genesis 1.3");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", "3-5", null, bible)).toBe("KJV, Genesis 1.3-5");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", "", null, bible)).toBe("KJV, Genesis 1");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis", "", null, bible)).toBe("KJV, Genesis");
  expect(referenceLabel(NS_BOOK.key, "KJV/1 Samuel/17", "49", null, bible)).toBe("KJV, 1 Samuel 17.49");
  expect(referenceLabel(NS_BOOK.key, "Douay-Rheims/Psalms/22", "1", null, bible)).toBe("Douay-Rheims, Psalms 22.1");
  /* a root without the directive refers as every book does */
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", "", null, vn)).toBe("Dante, *Vita Nuova*, 3");
});

// Chaucer: under the work's `parts in roman` directive a tale is named in
// roman after the work's italic title.
const ct = journalOf({
  "bookshelf/Chaucer, Geoffrey/Canterbury Tales": "# Canterbury Tales\n\n::: reference\nparts in roman\n:::",
  "bookshelf/Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale": "# The Knight’s Tale",
  "bookshelf/Chaucer, Geoffrey/Troilus and Criseyde": "# Troilus and Criseyde",
});
test("the parts-in-roman directive is read off the work's page, a line of its own", () => {
  expect(says("partsInRoman", "# W\n\n::: reference\nparts in roman\n:::")).toBe(true);
  expect(says("partsInRoman", "# W\n\n::: reference\nnot parts in roman here\n:::")).toBe(false);
  expect(ct.partsInRoman("bookshelf/Chaucer, Geoffrey/Canterbury Tales")).toBe(true);
});
test("referenceLabel under parts in roman: Chaucer, *Canterbury Tales*, The Knight's Tale, 859-62; a work without it as before", () => {
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale", "859-62", null, ct)).toBe("Chaucer, *Canterbury Tales*, The Knight’s Tale, 859-62");
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale", "", null, ct)).toBe("Chaucer, *Canterbury Tales*, The Knight’s Tale");
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Troilus and Criseyde/1", "1-7", null, ct)).toBe("Chaucer, *Troilus and Criseyde*, 1.1-7");
});
