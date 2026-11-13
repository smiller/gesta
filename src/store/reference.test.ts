import { test, expect } from "vitest";
import {
  REFERENCE_DATED, REFERENCE_TOKEN, REFERENCE_DIVISION, referenceNumeral,
  referenceAbsorbs, elideRange, folioLabel, referenceAuthor, referenceLabel, mdLabel, type Journal,
  roman } from "./reference.ts";
import { NS_BOOK, NS_PAGE } from "./keys.ts";
import { journalOf, firstHeading } from "./headings.ts";


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
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", { range: "197-208", facing: "265-77" }, journal)).toBe("Ovid, *Metamorphoses*, 7.197-208 (Golding, 7.265-77)");
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", { range: "", facing: "265-66" }, journal)).toBe("Ovid, *Metamorphoses*, 7 (Golding, 7.265-66)");
  expect(referenceLabel(NS_BOOK.key, golding + "/Book 7", { range: "" }, journal)).toBe("Ovid, *Metamorphoses*, 7 (Golding)");
  expect(referenceLabel(NS_BOOK.key, golding, { range: "" }, journal)).toBe("Ovid, *Metamorphoses* (Golding)");
  expect(referenceLabel(NS_BOOK.key, "Ovid/Metamorphoses", { range: "" }, journal)).toBe("Ovid, *Metamorphoses*");
  // a page with no translation in its heading is the translator's own: its right column's lines are referred to
  expect(referenceLabel(NS_BOOK.key, "Milton, John/The Fifth Ode of Horace", { range: "2", facing: "4" }, journal)).toBe("Milton, *The Fifth Ode of Horace*, 4");
  // a title below the work that the label starts from keeps the translation's lines
  expect(referenceLabel(NS_BOOK.key, "Dante/Commedia (with Longfellow’s translation)/Inferno/7", { range: "121-6", facing: "130-5" }, journal)).toBe("Dante, *Inferno*, 7.121-6 (Longfellow, 7.130-5)");
});

test("referenceLabel: the corpus table, author then pieces", () => {
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", { range: "" }, journal)).toBe("Milton, *Paradise Lost*, 1");
  expect(referenceLabel(NS_BOOK.key, "Shakespeare, William/King John/3.1", { range: "" }, journal)).toBe("Shakespeare, *King John*, 3.1");
  expect(referenceLabel(NS_BOOK.key, "Rostand, Edmond/Cyrano de Bergerac/Acte 2/Scène 2", { range: "" }, journal)).toBe("Rostand, *Cyrano de Bergerac*, 2.2");
  expect(referenceLabel(NS_BOOK.key, "Boethius/Consolatio/Book 3/3m9", { range: "" }, journal)).toBe("Boethius, *De consolatione philosophiae*, 3m9");
  expect(referenceLabel(NS_BOOK.key, "Housman, A. E/Last Poems/25. The Oracles", { range: "" }, journal)).toBe("Housman, *Last Poems*, *25. The Oracles*");
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", { range: "" }, journal)).toBe("Blake, *Songs of Innocence*, *A Cradle Song*");
});

test("referenceLabel: the line range dots onto a numeral run and commas after a title; a leaf stands in only for a titled division", () => {
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", { range: "254-55" }, journal)).toBe("Milton, *Paradise Lost*, 1.254-55");
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", { range: "1-4" }, journal)).toBe("Blake, *Songs of Innocence*, *A Cradle Song*, 1-4");
  // a numbered division stands and the leaf drops (Screwtape)
  expect(referenceLabel(NS_BOOK.key, "Lewis, C. S/The Screwtape Letters/Letter 12", { range: "", folio: { from: "60", to: "62" } }, journal)).toBe("Lewis, *The Screwtape Letters*, 12");
  // a titled division drops, with any numbered level above it, and the leaf stands in
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", { range: "", folio: { from: "22", to: "25" } }, journal)).toBe("Blake, *Songs of Innocence*, pp. 22-25");
  // a line range wins over a leaf one
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", { range: "3", folio: { from: "9", to: "9" } }, journal)).toBe("Milton, *Paradise Lost*, 1.3");
});

test("referenceLabel: from the last title, a day, a page", () => {
  expect(referenceLabel(NS_BOOK.key, "Dante/Commedia/Inferno/7", { range: "121-6" }, journal)).toBe("Dante, *Inferno*, 7.121-6");
  // a day names itself by its date and refers to no locator
  expect(referenceLabel("2021-06-22", null, { range: "3-5" }, journal)).toBe("*Gesta*, 22 June 2021");
  expect(referenceLabel("2021-06-22", "Walk", { range: "" }, journal)).toBe("*Gesta*, 22 June 2021, *Walk*");
  // a page stands on its own name; a numbered sub-page shows its name after a colon
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/1", { range: "" }, journal)).toBe("*Sean's Books*, 1: *The Figure of Beatrice*");
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/2", { range: "" }, journal)).toBe("*Sean's Books*, 2: *Witchcraft*");
  expect(referenceLabel(NS_PAGE.key, "Notes", { range: "" }, journal)).toBe("*Notes*");
  expect(referenceLabel(NS_PAGE.key, "Notes", { range: "", folio: { from: "3", to: "4" } }, journal)).toBe("*Notes*");
});

test("referenceLabel: a root whose page says no author is named in no reference; the root itself stands on its title", () => {
  expect(referenceLabel(NS_BOOK.key, "Old English/Beowulf", { range: "50-52" }, journal)).toBe("*Beowulf*, 50-52");
  expect(referenceLabel(NS_BOOK.key, "Old English/Beowulf", { range: "" }, journal)).toBe("*Beowulf*");
  expect(referenceLabel(NS_BOOK.key, "Old English", { range: "" }, journal)).toBe("*Old English*");
  expect(referenceLabel(NS_BOOK.key, "Old English", { range: "1-3" }, journal)).toBe("*Old English*, 1-3");
  expect(referenceLabel(NS_BOOK.key, "Old English", { range: "", folio: { from: "3", to: "3" } }, journal)).toBe("*Old English*, p. 3");
});

test("headings: the first level-one heading is the title; a ## is a section; the directive is top-level only", () => {
  expect(firstHeading("# Title\n\n## Section")).toBe("Title");
  expect(firstHeading("## Section only")).toBe("");
  expect(firstHeading("text\n\n# Later title")).toBe("Later title");
  expect(firstHeading("")).toBe("");
  const directives = (md: string): string => journalOf({ "bookshelf/W": md }).directives("bookshelf/W");
  expect(directives("# Dante\n\n::: reference\nfrom the last title\n:::")).toBe("from the last title");
  expect(directives("> ::: reference\n> from the last title\n> :::")).toBe("");
  expect(directives("# Dante")).toBe("");
});

test("mdLabel: no stray ] and no newline in a link text, and a fallback for none", () => {
  expect(mdLabel("a ] b\nc", "x")).toBe("a b c");
  expect(mdLabel("", "entry")).toBe("entry");
});

// the range comes in already stanza-shaped ("2.1", "2", "2–3")
const fq = journalOf({
  "bookshelf/Spenser, Edmund": "# Edmund Spenser",
  "bookshelf/Spenser, Edmund/The Faerie Queene": "# The Faerie Queene\n\n## Book I: The Legende of the Knight of the Red Crosse, or of Holinesse\n",
  "bookshelf/Spenser, Edmund/The Faerie Queene/1.1": "# Book I, Canto i",
  "bookshelf/Spenser, Edmund/The Faerie Queene/1.pr": "# Book I, Proem",
});
const FQ = "Spenser, Edmund/The Faerie Queene/";
test("roman: upper or lower case, subtractive", () => {
  expect([1, 4, 6, 7, 9, 12].map((n) => roman(n))).toEqual(["I", "IV", "VI", "VII", "IX", "XII"]);
  expect(roman(9, true)).toBe("ix");
});
test("referenceLabel of a canto: book and canto as keyed, the proem's pr, whole stanzas, a run across them", () => {
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", { range: "2.1" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.1.2.1");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", { range: "2" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.1.2");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", { range: "2–3" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.1.2–3");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", { range: "2.8–3.2" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.1.2.8–3.2");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.pr", { range: "1–4" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.pr.1–4");
  expect(referenceLabel(NS_BOOK.key, FQ + "1.1", { range: "" }, fq)).toBe("Spenser, *The Faerie Queene*, 1.1");
  expect(referenceLabel(NS_BOOK.key, FQ + "7.8", { range: "2.9" }, fq)).toBe("Spenser, *The Faerie Queene*, 7.8.2.9");
});

// The Vita Nuova: under the work's `prosimetrum` directive a reference names
// the part of the chapter it is in, comma-joined, never dotted.
const vn = journalOf({
  "bookshelf/Dante": "# Dante\n\n::: reference\nfrom the last title\n:::",
  "bookshelf/Dante/Vita Nuova": "# Vita Nuova\n\n::: reference\nprosimetrum\n:::",
  "bookshelf/Dante/Vita Nuova/3": "# Vita Nuova, 3",
});
test("referenceLabel: a worded range is comma-joined after the chapter, a numeral range still dots on", () => {
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", { range: "prose, para 4" }, vn)).toBe("Dante, *Vita Nuova*, 3, prose, para 4");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/8", { range: "verse 2.1-4" }, vn)).toBe("Dante, *Vita Nuova*, 8, verse 2.1-4");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", { range: "" }, vn)).toBe("Dante, *Vita Nuova*, 3");
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", { range: "4" }, vn)).toBe("Dante, *Vita Nuova*, 3.4");
});

// De Doctrina Christiana: all prose, so under `by book, chapter, and paragraph` a reference names
// the book, the chapter and the paragraph, and no part of a chapter.
const ddc = journalOf({
  "bookshelf/Augustine/De Doctrina Christiana": "# De Doctrina Christiana\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/Augustine/De Doctrina Christiana/Preface": "# Preface",
});
test("referenceLabel by book, chapter, and paragraph: the book named as a book, the chapter and its paragraph after it, a titled part and the paragraph alone", () => {
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Book 2", { range: "chapter 40 (para 60)" }, ddc)).toBe("Augustine, *De Doctrina Christiana*, book 2, chapter 40 (para 60)");
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Book 2", { range: "" }, ddc)).toBe("Augustine, *De Doctrina Christiana*, book 2");
  expect(referenceLabel(NS_BOOK.key, "Augustine/De Doctrina Christiana/Preface", { range: "paras 1-2" }, ddc)).toBe("Augustine, *De Doctrina Christiana*, *Preface*, paras 1-2");
});

const works = journalOf({
  "bookshelf/A/W": "# W\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/A/Y (with Shaw’s translation)": "# Y (with Shaw’s translation)\n\n::: reference\nby book, chapter, and paragraph\n:::",
  "bookshelf/Pius 2/W": "# W\n\n::: reference\nby book, chapter, and paragraph\n:::",
});
test("referenceLabel by book, chapter, and paragraph over other pages: the division's own word, a title in the key left out, the author never taken for it", () => {
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2. The Art of Signs", { range: "chapter 4 (para 6)" }, works)).toBe("A, *W*, book 2, chapter 4 (para 6)");
  expect(referenceLabel(NS_BOOK.key, "Pius 2/W/Book 2", { range: "chapter 1 (para 1)" }, works)).toBe("Pius 2, *W*, book 2, chapter 1 (para 1)");
  expect(referenceLabel(NS_BOOK.key, "A/W/2", { range: "chapter 40 (para 60)" }, works)).toBe("A, *W*, book 2, chapter 40 (para 60)");
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2/Chapter 40", { range: "para 60" }, works)).toBe("A, *W*, book 2, chapter 40 (para 60)");
});
test("referenceLabel by book, chapter, and paragraph: a numbered book stands and the leaf drops; a translator's locator keeps its book", () => {
  expect(referenceLabel(NS_BOOK.key, "A/W/Book 2", { range: "", folio: { from: "14", to: "14" } }, works)).toBe("A, *W*, book 2");
  expect(referenceLabel(NS_BOOK.key, "A/Y (with Shaw’s translation)/Book 2", { range: "5", facing: "7" }, works)).toBe("A, *Y*, book 2.5 (Shaw, 2.7)");
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
test("referenceLabel under scripture: KJV, Genesis 1.3; a range; a chapter; a book; a book whose name opens with a number", () => {
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", { range: "3" }, bible)).toBe("KJV, Genesis 1.3");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", { range: "3-5" }, bible)).toBe("KJV, Genesis 1.3-5");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis/1", { range: "" }, bible)).toBe("KJV, Genesis 1");
  expect(referenceLabel(NS_BOOK.key, "KJV/Genesis", { range: "" }, bible)).toBe("KJV, Genesis");
  expect(referenceLabel(NS_BOOK.key, "KJV/1 Samuel/17", { range: "49" }, bible)).toBe("KJV, 1 Samuel 17.49");
  expect(referenceLabel(NS_BOOK.key, "Douay-Rheims/Psalms/22", { range: "1" }, bible)).toBe("Douay-Rheims, Psalms 22.1");
  /* a root without the directive refers as every book does */
  expect(referenceLabel(NS_BOOK.key, "Dante/Vita Nuova/3", { range: "" }, vn)).toBe("Dante, *Vita Nuova*, 3");
});

// Chaucer: under the work's `parts in roman` directive a tale is named in
// roman after the work's italic title.
const ct = journalOf({
  "bookshelf/Chaucer, Geoffrey/Canterbury Tales": "# Canterbury Tales\n\n::: reference\nparts in roman\n:::",
  "bookshelf/Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale": "# The Knight’s Tale",
  "bookshelf/Chaucer, Geoffrey/Troilus and Criseyde": "# Troilus and Criseyde",
});
test("referenceLabel under parts in roman: Chaucer, *Canterbury Tales*, The Knight's Tale, 859-62; a work without it as before", () => {
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale", { range: "859-62" }, ct)).toBe("Chaucer, *Canterbury Tales*, The Knight’s Tale, 859-62");
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Canterbury Tales/The Knight's Tale", { range: "" }, ct)).toBe("Chaucer, *Canterbury Tales*, The Knight’s Tale");
  expect(referenceLabel(NS_BOOK.key, "Chaucer, Geoffrey/Troilus and Criseyde/1", { range: "1-7" }, ct)).toBe("Chaucer, *Troilus and Criseyde*, 1.1-7");
});

test("mdLabel keeps a bracket that closes one opened in the label, and drops a bracket that would end the link", () => {
  expect(mdLabel("Silius, *Punica*, 16.[379]", "x")).toBe("Silius, *Punica*, 16.[379]");
  expect(mdLabel("371-[379]", "x")).toBe("371-[379]");
  expect(mdLabel("a]b", "x")).toBe("a b");
  expect(mdLabel("[a]] b", "x")).toBe("[a] b");
});
