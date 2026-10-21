/* Paradise Regained as Gutenberg's #58 gives it, the Harvard Classics' text,
   made four book pages under a contents page: a book one verse block, a gap
   where a verse paragraph begins */

export interface Line { text: string; opens: boolean }
export interface Numbered { n: number; at: number }

const BOOKS = ["THE FIRST BOOK", "THE SECOND BOOK", "THE THIRD BOOK", "THE FOURTH BOOK"];

/* each book's lines, a paragraph's first line by its indent, and the
   margin's numbers with the line each stands on */
export function gutenbergBooks(text: string): { books: Line[][]; numbered: Numbered[][] } {
  const clean = text.replace(/\r\n/g, "\n");
  const body = clean.slice(clean.indexOf("*** START"), clean.indexOf("*** END"));
  const starts = BOOKS.map((b) => body.lastIndexOf("\n" + b + "\n"));
  if (starts.some((s) => s < 0)) throw new Error("a book's heading not found");
  const books: Line[][] = [], numbered: Numbered[][] = [];
  starts.forEach((s, i) => {
    const lines: Line[] = [], nums: Numbered[] = [];
    for (const raw of body.slice(s + BOOKS[i].length + 2, starts[i + 1] ?? body.length).split("\n")) {
      if (!raw.trim()) continue;
      const m = /^(.*?\S)\s{3,}(\d+)$/.exec(raw);
      if (m) nums.push({ n: +m[2], at: lines.length + 1 });
      lines.push({ text: (m ? m[1] : raw).trim(), opens: /^ {2,}\S/.test(raw) });
    }
    books.push(lines);
    numbered.push(nums);
  });
  return { books, numbered };
}

const AUTHOR = "bookshelf/Milton, John";
const href = (path: string): string => "#" + path.split("/").map(encodeURIComponent).join("/");

/* the contents page carrying the note on the text, a page a book */
export function regainedEntries(books: Line[][], note: string): Record<string, string> {
  const entries: Record<string, string> = {};
  entries[`${AUTHOR}/Paradise Regained.md`] = `# Paradise Regained\n\n::: note\n${note}\n:::\n\n` + books.map((_, i) => `- [Book ${i + 1}](${href(`${AUTHOR}/Paradise Regained/Book ${i + 1}`)})`).join("\n");
  books.forEach((lines, i) => {
    entries[`${AUTHOR}/Paradise Regained/Book ${i + 1}.md`] = `# Book ${i + 1}\n\n::: verse\n` + lines.map((l, j) => (l.opens && j ? "\n" : "") + l.text).join("\n") + "\n:::";
  });
  return entries;
}
