import { test, expect } from "vitest";
import { renamedDirectives } from "./directiveNames.ts";

test("each retired directive in a top-level reference block takes its new name, any case, the rest of the entry untouched", () => {
  const md = "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::\n\nno author\n\n::: verse\nHwæt\n:::";
  expect(renamedDirectives(md)).toEqual({
    md: "# Beowulf\n\n::: reference\nby title alone\nby half-line\n:::\n\nno author\n\n::: verse\nHwæt\n:::",
    renamed: [{ line: 4, was: "no author", now: "by title alone" }, { line: 5, was: "Old English verse", now: "by half-line" }],
  });
});

test("every retired name has its new one; a kept name, a new name and an unknown line are left", () => {
  const block = (...l: string[]): string => "::: reference\n" + l.join("\n") + "\n:::";
  expect(renamedDirectives(block("from the last title", "scripture", "parts in roman", "prosimetrum")).md)
    .toBe(block("by innermost title alone", "by chapter and verse", "part titles in roman", "prose by paragraph, verse by line"));
  const left = block("by book, chapter, and paragraph", "by title alone", "roman book and canto", "from the last title, as given");
  expect(renamedDirectives(left)).toEqual({ md: left, renamed: [] });
});

test("a reference block inside a quotation, or a line outside any block, is left", () => {
  const md = "> ::: reference\n> scripture\n> :::\n\nscripture";
  expect(renamedDirectives(md)).toEqual({ md, renamed: [] });
});
