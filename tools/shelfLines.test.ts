import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex } from "./bookshelfQuotes.ts";
import { quotedRuns, referRuns } from "./shelfLines.ts";

const index = shelfIndex({
  "bookshelf/Horace": "# Horace\n\n- [Odes](#bookshelf/Horace/Odes)\n",
  "bookshelf/Horace/Odes": "# Odes\n\n- [1.1 Maecenas](#bookshelf/Horace/Odes/1.1)\n",
  "bookshelf/Horace/Odes/1.1": readFileSync(new URL("../fixtures/horace-odes-1.1.md", import.meta.url), "utf8"),
});

test("quotedRuns: consecutive lines that are the bookshelf's, quoted or bare, marks and spacing aside; code and a passage already referred are left", () => {
  const md = "Odes 1.1.3-4:\nsunt quos curriculo pulverem Olympicum | x\ncollegisse iuvat, metaque fervidis | y\n\n> certat tergeminis tollere honoribus;\n\n```\nevitata rotis palmaque nobilis\n```\n\n[Horace, *Odes*, 1.1.5](#bookshelf/Horace/Odes/1.1?h=x):\n\n> ::: verse 5\n> evitata rotis palmaque nobilis | The goal\n> :::\n";
  expect(quotedRuns(md, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[1, 2, 3, 4], [4, 4, 8, 8]]);
});
test("referRuns: a run after a short citation ending in a colon makes that line the reference's link; else the reference stands in its place", () => {
  const md = "Odes 1.1.3-4:\nsunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n\nAnd then\n> certat tergeminis tollere honoribus;\nhe said.\n";
  const runs = quotedRuns(md, index);
  const out = referRuns(md, runs, (r) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u${r.from}):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: `#u${r.from}`, passage: `> ::: verse ${r.from}\n> line\n> :::` }));
  expect(out).toBe("[Odes 1.1.3-4](#u3):\n\n> ::: verse 3\n> line\n> :::\n\nAnd then\n\n[Horace, *Odes*, 1.1.8-8](#u8):\n\n> ::: verse 8\n> line\n> :::\n\nhe said.\n");
});
test("quotedRuns: a run carries through a line spelled otherwise when the next goes on with the passage; a blank line ends it", () => {
  const md = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidiss ed\n> evitata rotis palmaque nobilis\n\n> certat tergeminis tollere honoribus;\n";
  expect(quotedRuns(md, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5], [4, 4, 8, 8]]);
});
test("quotedRuns: a run's last line spelled otherwise is carried when it is close to the passage's next line; a line unlike it is not", () => {
  const close = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaq nobilis\n";
  expect(quotedRuns(close, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const unlike = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> and here my own words follow on\n";
  expect(quotedRuns(unlike, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 3, 4]]);
});
test("quotedRuns: a line's closing <br/> is not its verse, and a stray blank line inside a quotation is carried when the passage goes on after it", () => {
  const md = "the lines,\n\n> sunt quos curriculo pulverem Olympicum  <br/>\n\ncollegisse iuvat metaque fervidis  <br/>\nevitata rotis palmaque nobilis\n\nterrarum dominos evehit ad deos;\n\nand more\n";
  expect(quotedRuns(md, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[2, 7, 3, 6]]);
});
test("quotedRuns: a run's last line that is the start of the passage's next line, a half-line, is carried; a fragment of a word or two is not", () => {
  const half = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis.\n";
  expect(quotedRuns(half, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const scrap = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata\n";
  expect(quotedRuns(scrap, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 3, 4]]);
});
