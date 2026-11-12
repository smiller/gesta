import { test, expect } from "vitest";
import { gutenbergBooks, regainedEntries } from "./paradiseRegained.ts";
import { parseMarkdown } from "../src/model/parse.ts";
import { serializeMarkdown } from "../src/model/serialize.ts";

// Gutenberg's own layout, with its Windows line ends: the contents list names
// the books first, the margin numbers every tenth line, a paragraph indented
const TEXT = ["*** START OF THE PROJECT GUTENBERG EBOOK PARADISE REGAINED ***", "", " THE FIRST BOOK", " THE SECOND BOOK", " THE THIRD BOOK", " THE FOURTH BOOK", "", "THE FIRST BOOK", "",
  "I, who erewhile the happy Garden sung", "By one man’s disobedience lost, now sing", "    Thou Spirit, who led’st this glorious Eremite",
  "Against the spiritual foe, and brought’st him thence     10", "", "THE SECOND BOOK", "", "Meanwhile the new-baptized, who yet remained", "",
  "THE THIRD BOOK", "", "So spake the Son of God; and Satan stood", "", "THE FOURTH BOOK", "", "Perplexed and troubled at his bad success",
  "*** END OF THE PROJECT GUTENBERG EBOOK PARADISE REGAINED ***"].join("\r\n");

test("the four books from their headings after the contents, a paragraph's first line by its indent, the margin's numbers off the line and kept with the line they stand on", () => {
  const { books, numbered } = gutenbergBooks(TEXT);
  expect(books.map((b) => b.length)).toEqual([4, 1, 1, 1]);
  expect(books[0]).toEqual([
    { text: "I, who erewhile the happy Garden sung", opens: false },
    { text: "By one man’s disobedience lost, now sing", opens: false },
    { text: "Thou Spirit, who led’st this glorious Eremite", opens: true },
    { text: "Against the spiritual foe, and brought’st him thence", opens: false },
  ]);
  expect(numbered[0]).toEqual([{ n: 10, at: 4 }]);
  expect(() => gutenbergBooks("*** START\nTHE FIRST BOOK\n*** END")).toThrow("a book's heading not found");
});

test("a contents page carrying the note and a page a book, a gap where a paragraph begins, as stored", () => {
  const e = regainedEntries(gutenbergBooks(TEXT).books, "Text: x.");
  expect(e["bookshelf/Milton, John/Paradise Regained.md"]).toBe("# Paradise Regained\n\n::: note\nText: x.\n:::\n\n- [Book 1](#bookshelf/Milton%2C%20John/Paradise%20Regained/Book%201)\n- [Book 2](#bookshelf/Milton%2C%20John/Paradise%20Regained/Book%202)\n- [Book 3](#bookshelf/Milton%2C%20John/Paradise%20Regained/Book%203)\n- [Book 4](#bookshelf/Milton%2C%20John/Paradise%20Regained/Book%204)");
  expect(e["bookshelf/Milton, John/Paradise Regained/Book 1.md"]).toBe("# Book 1\n\n::: verse\nI, who erewhile the happy Garden sung\nBy one man’s disobedience lost, now sing\n\nThou Spirit, who led’st this glorious Eremite\nAgainst the spiritual foe, and brought’st him thence\n:::");
  for (const md of Object.values(e)) expect(serializeMarkdown(parseMarkdown(md))).toBe(md);
});
