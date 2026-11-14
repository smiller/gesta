import { test, expect } from "vitest";
import { conventionsOf, type Conventions } from "./conventions.ts";
import { journalOf } from "./headings.ts";
import { NS_BOOK, NS_COMMONPLACE } from "./keys.ts";
import help from "../ui/help.html?raw";

const NONE: Conventions = { lastTitle: false, noAuthor: false, scripture: false, partsInRoman: false, prosimetrum: false, byBookChapterAndParagraph: false, oldEnglishVerse: false };
const block = (...lines: string[]): string => "# W\n\n::: reference\n" + lines.join("\n") + "\n:::\n";
const under = (root: string, work: string, tag = "A/W/1"): Conventions =>
  conventionsOf(NS_BOOK.key, tag, journalOf({ "bookshelf/A": root, "bookshelf/A/W": work }));

test("a root's directives hold for the root and every entry under it", () => {
  const root = block("scripture", "no author", "from the last title");
  const said = { ...NONE, scripture: true, noAuthor: true, lastTitle: true };
  for (const tag of ["A", "A/W", "A/W/1", "A/W/1/2"]) expect(conventionsOf(NS_BOOK.key, tag, journalOf({ "bookshelf/A": root }))).toEqual(said);
});
test("a work's directives hold for the entries below it, not for the work's own page or its author's", () => {
  const work = block("prosimetrum", "by book, chapter, and paragraph", "parts in roman");
  const said = { ...NONE, prosimetrum: true, byBookChapterAndParagraph: true, partsInRoman: true };
  expect(under("# A", work)).toEqual(said);
  expect(under("# A", work, "A/W/1/2")).toEqual(said);
  expect(under("# A", work, "A/W")).toEqual(NONE);
  expect(under("# A", work, "A")).toEqual(NONE);
});
test("Old English verse holds from the page that says it down, its own page included", () => {
  expect(under(block("Old English verse"), "# W", "A").oldEnglishVerse).toBe(true);
  expect(under(block("Old English verse"), "# W").oldEnglishVerse).toBe(true);
  expect(under("# A", block("Old English verse"), "A/W").oldEnglishVerse).toBe(true);
  expect(under("# A", block("Old English verse"), "A/W/1").oldEnglishVerse).toBe(true);
  expect(under("# A", block("Old English verse"), "A").oldEnglishVerse).toBe(false);
});
test("a directive on the wrong level is not read: a work's on the root, a root's on the work", () => {
  expect(under(block("prosimetrum", "by book, chapter, and paragraph", "parts in roman"), "# W")).toEqual(NONE);
  expect(under("# A", block("scripture", "no author", "from the last title"))).toEqual(NONE);
});
test("nothing is read outside the namespaces that title their roots", () => {
  const all = block("scripture", "no author", "from the last title", "Old English verse");
  expect(conventionsOf(NS_COMMONPLACE.key, "A/W/1", journalOf({ "commonplace/A": all }))).toEqual(NONE);
  expect(conventionsOf("2026-09-22", null, journalOf({ "2026-09-22": all }))).toEqual(NONE);
  expect(conventionsOf(NS_BOOK.key, null, journalOf({ bookshelf: all }))).toEqual(NONE);
});
test("a directive is a line of its own in a top-level reference block; from the last title anywhere in one", () => {
  const root = (md: string): Conventions => conventionsOf(NS_BOOK.key, "A/W/1", journalOf({ "bookshelf/A": md }));
  const work = (md: string): Conventions => under("# A", md);
  expect(root(block("not scripture here")).scripture).toBe(false);
  expect(root("# KJV\n\n> ::: reference\n> scripture\n> :::\n").scripture).toBe(false);
  expect(root("scripture").scripture).toBe(false);
  expect(root(block("from the last title (no authority for the order)")).noAuthor).toBe(false);
  expect(root(block("from the last title", "No author")).noAuthor).toBe(true);
  expect(root(block("from the last title (no authority for the order)")).lastTitle).toBe(true);
  expect(root("> ::: reference\n> from the last title\n> :::\n").lastTitle).toBe(false);
  expect(work(block("not a prosimetrum here")).prosimetrum).toBe(false);
  expect(work(block("not by book, chapter, and paragraph here")).byBookChapterAndParagraph).toBe(false);
  expect(work(block("not parts in roman here")).partsInRoman).toBe(false);
  expect(work("# W\n\n> ::: reference\n> prosimetrum\n> :::\n").prosimetrum).toBe(false);
  expect(work(block("OLD ENGLISH VERSE")).oldEnglishVerse).toBe(true);
});
test("every directive the help sets in a reference block turns a convention on, on a root's page or a work's", () => {
  const named = [...help.matchAll(/<code>::: reference<\/code>, <code>([^<]+)<\/code>, <code>:::<\/code>/g)].map((m) => m[1]);
  expect(named.length).toBeGreaterThan(0);
  const read = (words: string): boolean => [under(block(words), "# W"), under("# A", block(words))].some((c) => Object.values(c).some(Boolean));
  expect(named.filter((words) => !read(words))).toEqual([]);
});
