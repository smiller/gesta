import { test, expect } from "vitest";
import { conventionsOf, directiveTrouble, type Conventions } from "./conventions.ts";
import { journalOf } from "./headings.ts";
import { NS_BOOK, NS_COMMONPLACE } from "./keys.ts";
import help from "../ui/help.html?raw";

const NONE: Conventions = { byInnermostTitleAlone: false, byTitleAlone: false, byChapterAndVerse: false, partTitlesInRoman: false, proseByParagraphVerseByLine: false, byBookChapterAndParagraph: false, byHalfLine: false };
const block = (...lines: string[]): string => "# W\n\n::: reference\n" + lines.join("\n") + "\n:::\n";
const under = (root: string, work: string, tag = "A/W/1"): Conventions =>
  conventionsOf(NS_BOOK.key, tag, journalOf({ "bookshelf/A": root, "bookshelf/A/W": work }));

test("a root's directives hold for the root and every entry under it", () => {
  const root = block("by chapter and verse", "by title alone", "by innermost title alone");
  const said = { ...NONE, byChapterAndVerse: true, byTitleAlone: true, byInnermostTitleAlone: true };
  for (const tag of ["A", "A/W", "A/W/1", "A/W/1/2"]) expect(conventionsOf(NS_BOOK.key, tag, journalOf({ "bookshelf/A": root }))).toEqual(said);
});
test("a work's directives hold for the entries below it, not for the work's own page or its author's", () => {
  const work = block("prose by paragraph, verse by line", "by book, chapter, and paragraph", "part titles in roman");
  const said = { ...NONE, proseByParagraphVerseByLine: true, byBookChapterAndParagraph: true, partTitlesInRoman: true };
  expect(under("# A", work)).toEqual(said);
  expect(under("# A", work, "A/W/1/2")).toEqual(said);
  expect(under("# A", work, "A/W")).toEqual(NONE);
  expect(under("# A", work, "A")).toEqual(NONE);
});
test("by half-line holds from the page that says it down, its own page included", () => {
  expect(under(block("by half-line"), "# W", "A").byHalfLine).toBe(true);
  expect(under(block("by half-line"), "# W").byHalfLine).toBe(true);
  expect(under("# A", block("by half-line"), "A/W").byHalfLine).toBe(true);
  expect(under("# A", block("by half-line"), "A/W/1").byHalfLine).toBe(true);
  expect(under("# A", block("by half-line"), "A").byHalfLine).toBe(false);
});
test("a directive on the wrong level is not read: a work's on the root, a root's on the work", () => {
  expect(under(block("prose by paragraph, verse by line", "by book, chapter, and paragraph", "part titles in roman"), "# W")).toEqual(NONE);
  expect(under("# A", block("by chapter and verse", "by title alone", "by innermost title alone"))).toEqual(NONE);
});
test("nothing is read outside the namespaces that title their roots", () => {
  const all = block("by chapter and verse", "by title alone", "by innermost title alone", "by half-line");
  expect(conventionsOf(NS_COMMONPLACE.key, "A/W/1", journalOf({ "commonplace/A": all }))).toEqual(NONE);
  expect(conventionsOf("2026-09-22", null, journalOf({ "2026-09-22": all }))).toEqual(NONE);
  expect(conventionsOf(NS_BOOK.key, null, journalOf({ bookshelf: all }))).toEqual(NONE);
});
test("a directive is the whole of its line in a top-level reference block, any case, nothing before or after it", () => {
  const root = (md: string): Conventions => conventionsOf(NS_BOOK.key, "A/W/1", journalOf({ "bookshelf/A": md }));
  const work = (md: string): Conventions => under("# A", md);
  expect(root(block("not by chapter and verse here")).byChapterAndVerse).toBe(false);
  expect(root("# KJV\n\n> ::: reference\n> by chapter and verse\n> :::\n").byChapterAndVerse).toBe(false);
  expect(root("by chapter and verse").byChapterAndVerse).toBe(false);
  expect(root(block("by innermost title alone, as his editors give it")).byInnermostTitleAlone).toBe(false);
  expect(root(block("by innermost title alone", "By Title Alone")).byTitleAlone).toBe(true);
  expect(root(block("  by innermost title alone  ")).byInnermostTitleAlone).toBe(true);
  expect(root("> ::: reference\n> by innermost title alone\n> :::\n").byInnermostTitleAlone).toBe(false);
  expect(work(block("not prose by paragraph, verse by line here")).proseByParagraphVerseByLine).toBe(false);
  expect(work(block("not by book, chapter, and paragraph here")).byBookChapterAndParagraph).toBe(false);
  expect(work(block("not part titles in roman here")).partTitlesInRoman).toBe(false);
  expect(work("# W\n\n> ::: reference\n> prose by paragraph, verse by line\n> :::\n").proseByParagraphVerseByLine).toBe(false);
  expect(work(block("BY HALF-LINE")).byHalfLine).toBe(true);
});
test("the retired names read nothing and are named as no directive", () => {
  const old = ["from the last title", "no author", "scripture", "parts in roman", "prosimetrum", "Old English verse"];
  expect(under(block(...old), block(...old))).toEqual(NONE);
  expect(directiveTrouble("bookshelf", "A/W", old)).toEqual(old.map((l) => "“" + l + "” is not a reference directive"));
});
test("every directive the help sets in a reference block turns a convention on, on a root's page or a work's", () => {
  const named = [...help.matchAll(/<code>::: reference<\/code>, <code>([^<]+)<\/code>, <code>:::<\/code>/g)].map((m) => m[1]);
  expect(named.length).toBeGreaterThan(0);
  const read = (words: string): boolean => [under(block(words), "# W"), under("# A", block(words))].some((c) => Object.values(c).some(Boolean));
  expect(named.filter((words) => !read(words))).toEqual([]);
});

test("a line no directive reads is named, and a directive on a page it is not read from says where it is read", () => {
  expect(directiveTrouble("bookshelf", "Chaucer, Geoffrey", ["roman book and canto", "part titles in roman", "by title alone", ""])).toEqual([
    "“roman book and canto” is not a reference directive",
    "“part titles in roman” is read on a work’s page",
  ]);
  expect(directiveTrouble("bookshelf", "Chaucer, Geoffrey/Canterbury Tales", ["part titles in roman", "by innermost title alone", "by half-line"])).toEqual([
    "“by innermost title alone” is read on an author’s page",
  ]);
  expect(directiveTrouble("bookshelf", "Beowulf", ["by title alone", "by half-line", "by innermost title alone"])).toEqual([]);
});

test("directives are read on the bookshelf alone: a reference block elsewhere is not checked", () => {
  expect(directiveTrouble("commonplace", "Books", ["anything at all"])).toEqual([]);
  expect(directiveTrouble("2026-09-06", null, ["anything at all"])).toEqual([]);
});
