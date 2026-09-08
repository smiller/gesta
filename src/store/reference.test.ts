// The citation grammar, ported 2026-09-07 from ../writer/src/js/reference.test.mjs,
// and the label over a journal of headings — the corpus cases the current
// app's referenceParts documents.
import { test, expect } from "vitest";
import {
  REFERENCE_DATED, REFERENCE_TOKEN, REFERENCE_DIVISION, referenceNumeral,
  referenceAbsorbs, elideRange, folioLabel, referenceAuthor, referenceLabel, mdLabel, type Journal,
} from "./reference.ts";
import { NS_BOOK, NS_PAGE } from "./keys.ts";
import { journalOf, firstHeading, directsFromLastTitle } from "./headings.ts";

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

// the corpus cases referenceParts documents, over a journal of headings
const journal: Journal = journalOf({
  "bookshelf/Milton, John/Paradise Lost": "# Paradise Lost\n",
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
  "bookshelf/Dante/Commedia/Inferno": "# Inferno",
  "bookshelf/Lewis, C. S/The Screwtape Letters": "# The Screwtape Letters",
  "page/Sean's Books/1": "# The Figure of Beatrice\n\ntext",
  "page/Sean's Books/2": "# 2: Witchcraft\n",
  "page/Notes": "no heading here",
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
  // a numbered division stands and the leaf drops (Screwtape, 2026-08-16)
  expect(referenceLabel(NS_BOOK.key, "Lewis, C. S/The Screwtape Letters/Letter 12", "", { from: "60", to: "62" }, journal)).toBe("Lewis, *The Screwtape Letters*, 12");
  // a titled division drops, with any numbered level above it, and the leaf stands in
  expect(referenceLabel(NS_BOOK.key, "Blake, William/Songs of Innocence/A Cradle Song", "", { from: "22", to: "25" }, journal)).toBe("Blake, *Songs of Innocence*, pp. 22-25");
  // a line range wins over a leaf one
  expect(referenceLabel(NS_BOOK.key, "Milton, John/Paradise Lost/Book 1", "3", { from: "9", to: "9" }, journal)).toBe("Milton, *Paradise Lost*, 1.3");
});

test("referenceLabel: from the last title, a day, a page", () => {
  expect(referenceLabel(NS_BOOK.key, "Dante/Commedia/Inferno/7", "121-6", null, journal)).toBe("Dante, *Inferno*, 7.121-6");
  // a day names itself by its date and cites no locator
  expect(referenceLabel("2021-06-22", null, "3-5", null, journal)).toBe("*Gesta*, 22 June 2021");
  expect(referenceLabel("2021-06-22", "Walk", "", null, journal)).toBe("*Gesta*, 22 June 2021, *Walk*");
  // a page stands on its own name; a numbered sub-page shows its name after a colon
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/1", "", null, journal)).toBe("*Sean's Books*, 1: *The Figure of Beatrice*");
  expect(referenceLabel(NS_PAGE.key, "Sean's Books/2", "", null, journal)).toBe("*Sean's Books*, 2: *Witchcraft*");
  expect(referenceLabel(NS_PAGE.key, "Notes", "", null, journal)).toBe("*Notes*");
  expect(referenceLabel(NS_PAGE.key, "Notes", "", { from: "3", to: "4" }, journal)).toBe("*Notes*");
});

test("headings: the first level-one heading is the title; a ## is a section; the directive is top-level only", () => {
  expect(firstHeading("# Title\n\n## Section")).toBe("Title");
  expect(firstHeading("## Section only")).toBe("");
  expect(firstHeading("text\n\n# Later title")).toBe("Later title");
  expect(firstHeading("")).toBe("");
  expect(directsFromLastTitle("# Dante\n\n::: reference\nfrom the last title\n:::")).toBe(true);
  expect(directsFromLastTitle("> ::: reference\n> from the last title\n> :::")).toBe(false);
  expect(directsFromLastTitle("# Dante")).toBe(false);
});

test("mdLabel: no ] and no newline in a link text", () => {
  expect(mdLabel("a ] b\nc", "x")).toBe("a b c");
  expect(mdLabel("", "entry")).toBe("entry");
});
