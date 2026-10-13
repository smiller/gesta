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
  const scrap = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evit\n";
  expect(quotedRuns(scrap, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 3, 4]]);
});
test("quotedRuns: a run's first line may be the end of the passage's line before it, a half-line, or that line spelled otherwise; a line of one's own is not", () => {
  const half = "> Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaque nobilis\n";
  expect(quotedRuns(half, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const spelt = "> sunt quos curiculo pulverem Olimpicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaque nobilis\n";
  expect(quotedRuns(spelt, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const own = "and so I said\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaque nobilis\n";
  expect(quotedRuns(own, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[1, 2, 4, 5]]);
});
test("quotedRuns: opening lines are carried back one after another, a half-line spelled otherwise among them; a joined line whose second place is not the passage's is not", () => {
  const back = "> dulce decus meun\n> sunt quos curiculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaque nobilis\n";
  expect(quotedRuns(back, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 3, 2, 5]]);
  const splice = "> Maecenas … and so on in his words\n> evitata rotis palmaque nobilis\n> terrarum dominos evehit ad deos;\n";
  expect(quotedRuns(splice, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[1, 2, 5, 6]]);
});
test("referRuns: a run quoted inside a quotation keeps the outer quotation, the reference within it and its passage a level in", () => {
  const md = "> Horace put it so.\n>> sunt quos curriculo pulverem Olympicum\n>> collegisse iuvat metaque fervidis\n> So that is that.\n";
  const runs = quotedRuns(md, index);
  const out = referRuns(md, runs, (r) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: `> ::: verse ${r.from}\n> line\n> :::` }));
  expect(out).toBe("> Horace put it so.\n>\n> [Horace, *Odes*, 1.1.3-4](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n>\n> So that is that.\n");
});
test("quotedRuns, referRuns: a line joining two places with an ellipsis closes the run before it and opens the run after it, and gives way to both references", () => {
  const md = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis … certat tergeminis tollere honoribus;\n> illum, si proprio condidit horreo\n> quicquid de Libycis verritur areis.\n";
  const runs = quotedRuns(md, index);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5], [2, 4, 8, 10]]);
  const out = referRuns(md, runs, (r) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: "" }));
  expect(out).toBe("[Horace, *Odes*, 1.1.3-5](#u):\n\n> ::: verse 3\n> line\n> :::\n\n[Horace, *Odes*, 1.1.8-10](#u):\n\n> ::: verse 8\n> line\n> :::\n");
});
test("quotedRuns: a run at an entry's very end, its last line without a newline", () => {
  expect(quotedRuns("> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis", index).map((r) => [r.start, r.end])).toEqual([[0, 1]]);
});
test("quotedRuns, referRuns: a joined line's place that is not a run's is kept beside the reference as written, unless it cites the work; inside a quotation the two references share one quoted blank", () => {
  const mint = (r: { from: number; to: number }) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: "" });
  const own = ">> sunt quos curriculo pulverem Olympicum\n>> collegisse iuvat metaque fervidis\n>> evitata rotis palmaque nobilis. … 1 { *Odes*, 1.1.3ff }\n";
  expect(quotedRuns(own, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const other = own.replace("*Odes*", "*Carmina*");
  expect(referRuns(other, quotedRuns(other, index), mint)).toBe("> [Horace, *Odes*, 1.1.3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n>\n>> … 1 { *Carmina*, 1.1.3ff }\n");
  expect(referRuns(own, quotedRuns(own, index), mint)).toBe("> [Horace, *Odes*, 1.1.3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n");
  const lead = "> as he says … collegisse iuvat metaque fervidis\n> evitata rotis palmaque nobilis\n> terrarum dominos evehit ad deos;\n";
  expect(quotedRuns(lead, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 4, 6]]);
  expect(referRuns(lead, quotedRuns(lead, index), mint)).toBe("> as he says …\n\n[Horace, *Odes*, 1.1.4-6](#u):\n\n> ::: verse 4\n> line\n> :::\n");
  const md = "> So it goes.\n>> sunt quos curriculo pulverem Olympicum\n>> collegisse iuvat metaque fervidis\n>> evitata rotis … certat tergeminis tollere honoribus;\n>> illum, si proprio condidit horreo\n>> quicquid de Libycis verritur areis.\n";
  const out = referRuns(md, quotedRuns(md, index), (r) => ({ text: `[${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: "" }));
  expect(out).toBe("> So it goes.\n>\n> [3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n>\n> [8-10](#u):\n>\n>> ::: verse 8\n>> line\n>> :::\n");
});
test("referRuns: at the top level a quotation's own blank line is not a blank line, so the reference's passage stays apart from the quotation it stood in", () => {
  const md = "> Odes:\n> \n> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> \n> more notes\n";
  const out = referRuns(md, quotedRuns(md, index), (r) => ({ text: `[${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: "" }));
  expect(out).toBe("> Odes:\n> \n\n[3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n\n> \n> more notes\n");
});
