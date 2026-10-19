import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex, referenceOf } from "./bookshelfQuotes.ts";
import { quotedRuns, referRuns, wordDiff, quotedPassages, sameQuoted, carried, citedAs, withinQuotation } from "./shelfLines.ts";

const index = shelfIndex({
  "bookshelf/Horace": "# Horace\n\n- [Odes](#bookshelf/Horace/Odes)\n",
  "bookshelf/Horace/Odes": "# Odes\n\n- [1.1 Maecenas](#bookshelf/Horace/Odes/1.1)\n",
  "bookshelf/Horace/Odes/1.1": readFileSync(new URL("../fixtures/horace-odes-1.1.md", import.meta.url), "utf8"),
});

test("quotedRuns: consecutive lines that are the bookshelf's, quoted or bare, marks and spacing aside; code and a passage already referred are left", () => {
  const md = "Odes 1.1.3-4:\nsunt quos curriculo pulverem Olympicum | x\ncollegisse iuvat, metaque fervidis | y\n\n> certat tergeminis tollere honoribus;\n\n```\nevitata rotis palmaque nobilis\n```\n\n[Horace, *Odes*, 1.1.5](#bookshelf/Horace/Odes/1.1?h=x):\n\n> ::: verse 5\n> evitata rotis palmaque nobilis | The goal\n> :::\n";
  expect(quotedRuns(md, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[1, 2, 3, 4], [4, 4, 8, 8]]);
});
test("quotedRuns: a quotation under a link to the bookshelf written as the page's full address is a reference already", () => {
  const md = "[Horace, *Odes*, 1.1.3-4](file:///Users/someone/gesta/dist/index.html#bookshelf/Horace/Odes/1.1?h=x):\n\n> ::: verse 3\n> sunt quos curriculo pulverem Olympicum | x\n> collegisse iuvat metaque fervidis | y\n> :::\n";
  expect(quotedRuns(md, index)).toEqual([]);
});
test("referRuns: a run after a short citation ending in a colon takes that line's place with the reference; else the reference stands in the run's place", () => {
  const md = "Odes 1.1.3-4:\nsunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n\nAnd then\n> certat tergeminis tollere honoribus;\nhe said.\n";
  const runs = quotedRuns(md, index);
  const out = referRuns(md, runs, (r) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u${r.from}):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: `#u${r.from}`, passage: `> ::: verse ${r.from}\n> line\n> :::` }));
  expect(out).toBe("[Horace, *Odes*, 1.1.3-4](#u3):\n\n> ::: verse 3\n> line\n> :::\n\nAnd then\n\n[Horace, *Odes*, 1.1.8-8](#u8):\n\n> ::: verse 8\n> line\n> :::\n\nhe said.\n");
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
test("quotedRuns: a run opening or closing on a half-line, however it was carried, carries how many of its line's letters it quotes, for the reference to start and end where it does; a whole line carries none", () => {
  const halves = "> Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis.\n";
  expect(quotedRuns(halves, index).map((r) => [r.head, r.tail])).toEqual([[9, 12]]);
  const close = "> quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaque\n";
  expect(quotedRuns(close, index).map((r) => [r.from, r.to, r.head, r.tail])).toEqual([[3, 5, 30, 20]]);
  const spelt = "> metaque fervidiss\n> evitata rotis palmaque nobilis\n> terrarum dominos evehit ad deos;\n";
  expect(quotedRuns(spelt, index).map((r) => [r.from, r.head])).toEqual([[4, "metaquefervidis".length]]);
  const whole = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n";
  expect(quotedRuns(whole, index).map((r) => [r.head, r.tail])).toEqual([[undefined, undefined]]);
  const joined = "> sunt quos curriculo pulverem … palmaque nobilis\n> terrarum dominos evehit ad deos;\n> hunc, si mobilium turba Quiritium\n";
  expect(quotedRuns(joined, index).map((r) => [r.from, r.head])).toEqual([[5, 15]]);
});
test("quotedRuns: a first or last line spelled otherwise, a letter or two short of its line, is the whole line, not a half", () => {
  const md = "> sunt quos curiculo pulverem Olympicum\n> collegisse iuvat metaque fervidis\n> evitata rotis palmaq nobilis\n";
  expect(quotedRuns(md, index).map((r) => [r.from, r.to, r.head, r.tail])).toEqual([[3, 5, undefined, undefined]]);
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
test("quotedRuns, referRuns: a joined line's place that is not a run's is kept beside the reference as written, unless it cites the work or is a book's or scene's number; inside a quotation the two references share one quoted blank", () => {
  const mint = (r: { from: number; to: number }) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: "" });
  const own = ">> sunt quos curriculo pulverem Olympicum\n>> collegisse iuvat metaque fervidis\n>> evitata rotis palmaque nobilis. … 1 { *Odes*, 1.1.3ff }\n";
  expect(quotedRuns(own, index).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  const other = own.replace("*Odes*", "*Carmina*");
  expect(referRuns(other, quotedRuns(other, index), mint)).toBe("> [Horace, *Odes*, 1.1.3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n>\n>> … 1 { *Carmina*, 1.1.3ff }\n");
  expect(referRuns(own, quotedRuns(own, index), mint)).toBe("> [Horace, *Odes*, 1.1.3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n");
  for (const place of ["(I,i)", "[1.1]", "I.i", "(1.1)"]) {
    const scene = own.replace("1 { *Odes*, 1.1.3ff }", place);
    expect(referRuns(scene, quotedRuns(scene, index), mint)).toBe("> [Horace, *Odes*, 1.1.3-5](#u):\n>\n>> ::: verse 3\n>> line\n>> :::\n");
  }
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

const play = shelfIndex({ "bookshelf/Shakespeare, William/Twelfth Night/1.1": readFileSync(new URL("../fixtures/twelfth-night-1.1.md", import.meta.url), "utf8") });
const spans = (md: string) => quotedRuns(md, play).map((r) => [r.start, r.end, r.from, r.to]);
test("quotedRuns: a quotation opening on a speaker's name starts on the speaker's row, numbered from the speech's first line, never the scene's first row", () => {
  const md = "> DUKE ORSINO\n> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n";
  const runs = quotedRuns(md, play);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 1, 2]]);
  const m = referenceOf(play, runs[0]) as { passage: string };
  expect(m.passage).toBe("> ::: verse\n> **DUKE ORSINO**\n> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n> :::");
});
test("quotedRuns: runs of one scene in one quotation, nothing of the scene left out between them and nothing else between them but blank lines, speakers' names and its own short lines, are one run", () => {
  const blank = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> \n> Will you go hunt, my lord?\n> \n> What, Curio?\n> \n> The hart.\n> \n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(blank)).toEqual([[0, 10, 14, 20]]);
  const named = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n\n> CURIO\n> Will you go hunt, my lord?\n\n> ORSINO\n> What, Curio?\n\n> CURIO\n> The hart.\n\n> ORSINO\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(named)).toEqual([[0, 14, 14, 20]]);
  const two = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> Will you go hunt, my lord? What, Curio? The hart.\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(two)).toEqual([[0, 4, 14, 20]]);
  const staged = shelfIndex({ "bookshelf/Somebody/A Play/1.1": "# 1.1\n\n::: verse\n**A**\nThe first speech of the play is spoken here\nAnd carries on a while before it stops\n**B**\nThe second speech begins upon its cue\n*Enter SOMEONE*\n**C**\nAnd ends the scene with nothing more to say\nAnd there the play is done for all of us\n:::\n" });
  const early = "> A\n> The first speech of the play is spoken here\n> And carries on a while before it stops\n> [Enter SOMEONE]\n> B\n> The second speech begins upon its cue\n> C\n> And ends the scene with nothing more to say\n> And there the play is done for all of us\n";
  expect(quotedRuns(early, staged).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 8, 1, 5]]);
});
test("quotedRuns: lines of one's own wording standing for the lines left out between two runs, as many as they and each close in its letters, join them", () => {
  const worded = "> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n> The hunger may sicken, and so die.\n> That tune again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n> That breathes upon a bank of violets,\n";
  expect(spans(worded)).toEqual([[0, 5, 1, 6]]);
  const fewer = "> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n> The hunger may sicken, and so die.\n> O, it came o’er my ear like the sweet sound,\n> That breathes upon a bank of violets,\n";
  expect(quotedRuns(fewer, play).length).toBe(2);
});
test("quotedRuns: runs with words of one's own between them, a comment or a translation, an ellipsis, a quotation ended between them, lines of the scene left out, or two verse blocks of it, stay apart", () => {
  const said = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n\nAnd then he goes on:\n\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(said)).toEqual([[0, 1, 14, 15], [5, 6, 19, 20]]);
  const tongue = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> Ar sí i hendu yénië Olivia minya\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(tongue)).toEqual([[0, 1, 14, 15], [3, 4, 19, 20]]);
  const two = shelfIndex({ "bookshelf/Somebody/A Play/1.1": "# 1.1\n\n::: verse\nThe first speech of the play is spoken here\nAnd carries on a while before it stops\n**BENVOLIO**\nThe second speech begins upon its cue\nAnd ends the scene with nothing more to say\n:::\n" });
  const remark = "> The first speech of the play is spoken here\n> And carries on a while before it stops\n\n> So Benvolio answers him in kind\n\n> The second speech begins upon its cue\n> And ends the scene with nothing more to say\n";
  expect(quotedRuns(remark, two).length).toBe(2);
  const ended = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n\n…\n\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(ended)).toEqual([[0, 1, 14, 15], [5, 6, 19, 20]]);
  const elided = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> …\n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(elided)).toEqual([[0, 1, 14, 15], [3, 4, 19, 20]]);
  const skipped = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> \n> Why, so I do, the noblest that I have:\n> O, when mine eyes did see Olivia first,\n";
  expect(spans(skipped)).toEqual([[0, 1, 14, 15], [3, 4, 19, 20]]);
  const blocks = shelfIndex({ "bookshelf/Somebody/A Play/1.1": "# 1.1\n\n::: verse\nThe first speech of the play is spoken here\nAnd carries on a while before it stops\n:::\n\n*Enter SOMEONE*\n\n::: verse\nThe second speech begins upon its cue\nAnd ends the scene with nothing more to say\n:::\n" });
  const across = "> The first speech of the play is spoken here\n> And carries on a while before it stops\n> \n> The second speech begins upon its cue\n> And ends the scene with nothing more to say\n";
  expect(quotedRuns(across, blocks).length).toBe(2);
});
test("wordDiff: the words quoted against the passage's, marks, case and the spaces and dashes between words aside; a word or two spelled otherwise is spelling, any other change wording", () => {
  expect(wordDiff("Is this a dagger, which I see", "Is this a dagger which I see")).toEqual({ kind: "same", ops: [["=", "Is"], ["=", "this"], ["=", "a"], ["=", "dagger"], ["=", "which"], ["=", "I"], ["=", "see"]] });
  expect(wordDiff("That tears all round the wind", "That tears shall drown the wind")).toEqual({ kind: "wording", ops: [["=", "That"], ["=", "tears"], ["-", "all"], ["-", "round"], ["+", "shall"], ["+", "drown"], ["=", "the"], ["=", "wind"]] });
  expect(wordDiff("Heav’n and Earth", "Heaven and Earth").kind).toBe("spelling");
  expect(wordDiff("and Earth", "Heaven and Earth").kind).toBe("wording");
  expect(wordDiff("Will be my knell.—Go, play", "Will be my knell. Go, play").kind).toBe("same");
  expect(wordDiff("let us to ’t, pell-mell", "let us to’t, pell mell").kind).toBe("same");
  expect(wordDiff("stand a-tiptoe whem this day", "stand a tip-toe when this day").kind).toBe("spelling");
});
test("quotedRuns: a quotation broken into lines otherwise than the passage is followed word by word, to where its words and the passage's part, whole lines of it", () => {
  const prose = shelfIndex({ "bookshelf/Somebody/A Play/1.1": "# 1.1\n\n::: verse\nThe first speech of the play is spoken here\nThen the liars and swearers are fools,\nfor there are liars and swearers enow to beat\nthe honest men and hang up them.\nAnd so the scene goes on to other matters\n:::\n" });
  const md = "> The first speech of the play is spoken here\n> Then the liars and swearers are fools, for there are\n> liars and swearers enow to beat the honest men and hang\n\nMy own words.\n";
  const runs = quotedRuns(md, prose);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to, r.tail])).toEqual([[0, 2, 1, 4, "thehonestmenandhang".length]]);
  expect((referenceOf(prose, runs[0]) as { passage: string }).passage).toBe("> ::: verse\n> The first speech of the play is spoken here\n> Then the liars and swearers are fools,\n> for there are liars and swearers enow to beat\n> the honest men and hang\n> :::");
  const back = "> fools, for there are\n> liars and swearers enow to beat\n> the honest men and hang up them.\n> And so the scene goes on to other matters\n";
  expect(quotedRuns(back, prose).map((r) => [r.start, r.end, r.from, r.to, r.head])).toEqual([[0, 3, 2, 5, "fools".length]]);
  const own = "> The first speech of the play is spoken here\n> Then the liars and swearers are fools, for there are\n> liars and swearers enow, said I, to beat them all\n";
  expect(quotedRuns(own, prose).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 1, 3]]);
});
test("quotedRuns, referenceOf: a speaker's name opening a quotation taken from inside the speech goes inside the reference, the speaker's row heading its passage; a quotation opening a speech takes its speaker's row unnamed", () => {
  const md = "> DUKE ORSINO\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  const runs = quotedRuns(md, play);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 4, 5]]);
  expect((referenceOf(play, runs[0]) as { passage: string }).passage).toBe("> ::: verse 4\n> **DUKE ORSINO**\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n> :::");
  const colon = "> DUKE ORSINO:  The appetite may sicken, and so die.\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  const said = quotedRuns(colon, play);
  expect(said.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 3, 5]]);
  expect((referenceOf(play, said[0]) as { passage: string }).passage.split("\n").slice(0, 3)).toEqual(["> ::: verse 3", "> **DUKE ORSINO**", "> The appetite may sicken, and so die."]);
  const spaced = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> CURIO   Will you go hunt, my lord?\n> DUKE ORSINO   What, Curio?\n";
  expect(quotedRuns(spaced, play).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 3, 14, 17]]);
  const apart = "> DUKE ORSINO\n>\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(apart, play).map((r) => [r.start, r.end, r.speaker !== undefined])).toEqual([[0, 3, true]]);
  const speeches = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n\n> CURIO\n> Will you go hunt, my lord?\n\n> DUKE ORSINO\n> What, Curio?\n\nMy own words.\n";
  expect(quotedRuns(speeches, play).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 7, 14, 17]]);
  const verse = "> DUKE ORSINO\n> Stealing and giving odour! Enough; no more:\n> ’Tis not so sweet now as it was before.\n";
  expect(quotedRuns(verse, play).map((r) => [r.start, r.end, r.speaker !== undefined])).toEqual([[0, 2, true]]);
  const directed = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n> [ *Music.* ]\n> CURIO\n> Will you go hunt, my lord?\n";
  expect(quotedRuns(directed, play).map((r) => [r.start, r.end, r.to])).toEqual([[0, 4, 16]]);
  const unnamed = "> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n";
  expect((referenceOf(play, quotedRuns(unnamed, play)[0]) as { passage: string }).passage.split("\n").slice(0, 3)).toEqual(["> ::: verse", "> **DUKE ORSINO**", "> If music be the food of love, play on;"]);
  const remark = "Furor poetica.\nIf music be the food of love, play on;\nGive me excess of it, that, surfeiting,\n";
  expect(quotedRuns(remark, play).map((r) => [r.start, r.end])).toEqual([[1, 2]]);
  const titled = "Duke Orsino\nThat strain again! it had a dying fall:\nO, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(titled, play).map((r) => [r.start, r.end, r.speaker !== undefined])).toEqual([[0, 2, true]]);
  const renamed = "> Even in a minute: so full of shapes is fancy\n> That it alone is high fantastical.\n\n> THE CURIO\n>> Will you go hunt, my lord?\n";
  expect(quotedRuns(renamed, play).map((r) => [r.start, r.end, r.to])).toEqual([[0, 4, 16]]);
  const other = "> ORSINO THE DUKE\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(other, play).map((r) => [r.start, r.end, r.speaker !== undefined])).toEqual([[0, 2, true]]);
  const outside = "PORTIA\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(outside, play).map((r) => [r.start, r.end])).toEqual([[1, 2]]);
});
test("referRuns: a citation with numbers, giving the lines or only the book or scene, gives way to the reference whole, in the standard form; a line with no numbers is no citation", () => {
  const mint = (r: { from: number; to: number }) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: `> ::: verse ${r.from}\n> line\n> :::` });
  const verse = "sunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n";
  const at = (head: string) => referRuns(head + "\n" + verse, quotedRuns(head + "\n" + verse, index), mint);
  expect(at("Odes 1.1.3-4:")).toBe("[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("Odes, I. i:")).toBe("[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("ODES (I.i):")).toBe("[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("Horace, [Odes 1.1, 3-4](file:///reader/odes/1.1.html#hl=3-4):")).toBe("[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("Odes 1.1.3-4 (to Maecenas):")).toBe("[Horace, *Odes*, 1.1.3-4](#u) (to Maecenas):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("cemenna nún, yasse atamána nás:")).toBe("cemenna nún, yasse atamána nás:\n\n[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
});
test("referRuns: a link above a verse fence whose lines a run is, the fence unquoted, is one reference, its passage quoted", () => {
  const mint = (r: { from: number; to: number }) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: `> ::: verse ${r.from}\n> line\n> :::` });
  const md = "So:\n\n[Horace, *Odes*, 1.1.3-4](#bookshelf/Horace/Odes/1.1?h=x):\n\n::: verse 3\nsunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n:::\n\nAnd so.\n";
  expect(referRuns(md, quotedRuns(md, index), mint)).toBe("So:\n\n[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n\nAnd so.\n");
});
test("withinQuotation: a line of the book in another tongue takes the quotation's translation and the book's neighbouring lines' pieces; another writer's line leaves it, the quotation whole", () => {
  const at = (md: string) => { const w = withinQuotation(md, index, carried(md, index, quotedRuns(md, index))); return { runs: w.runs.map((r) => [r.start, r.end, r.from, r.to]), left: w.left.length }; };
  const line = "> sunt quos curriculo pulverem Olympicum\n";
  expect(at(line + "> There are those whom the Olympic dust delights\n\nAnd so.\n")).toEqual({ runs: [[0, 1, 3, 3]], left: 0 });
  expect(at(line + "> hoc est in summis gloria summa viris.\n\nAnd so.\n")).toEqual({ runs: [], left: 1 });
  expect(at("> decus meum\n" + line + "\nAnd so.\n")).toEqual({ runs: [[0, 1, 2, 3]], left: 0 });
  expect(at("> meum\n" + line + "\n> There are those whom the Olympic dust delights\n\nAnd so.\n")).toEqual({ runs: [[0, 3, 2, 3]], left: 0 });
  expect(at(line + "\n> There are those whom the Olympic dust delights\n\nAnd so.\n")).toEqual({ runs: [[0, 0, 3, 3]], left: 0 });
  expect(at("> 3:\n" + line + "\nAnd so.\n")).toEqual({ runs: [[1, 1, 3, 3]], left: 0 });
  expect(at("> A card\n>\n> 3:\n" + line + "\nAnd so.\n")).toEqual({ runs: [], left: 1 });
  expect(at(line + "> Some there are whom the dust delights\n>\n> collegisse iuvat\n> to gather in the course\n\nAnd so.\n")).toEqual({ runs: [[0, 4, 3, 4]], left: 0 });
  expect(at(line + "\n> And this is what I make of it, the whole of it.\n> More.\n")).toEqual({ runs: [[0, 0, 3, 3]], left: 0 });
});
test("referRuns: a long citation inside a quotation, perhaps another writer's, keeps its words, the reference under it; one of one's own outside a quotation takes the link in its place", () => {
  const mint = (r: { from: number; to: number }) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: "#u", passage: `> ::: verse ${r.from}\n> line\n> :::` });
  const verse = "sunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n";
  const at = (head: string) => referRuns(head + "\n" + verse, quotedRuns(head + "\n" + verse, index), mint);
  expect(at("> The line is drawn from Horace, *Odes* 1.1.3-4, near the opening:")).toBe("> The line is drawn from Horace, *Odes* 1.1.3-4, near the opening:\n\n[Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
  expect(at("The line I keep coming back to is Horace, *Odes* 1.1.3-4:")).toBe("The line I keep coming back to is [Horace, *Odes*, 1.1.3-4](#u):\n\n> ::: verse 3\n> line\n> :::\n");
});
test("citedAs: a citation's own words kept around the link, its author, work and numbers the link's; the link alone where no words are left; a line naming only the work its citation", () => {
  const head = "[Spenser, *The Faerie Queene*, 1.7.40](#u):", key = "bookshelf/Spenser, Edmund/The Faerie Queene/1.7";
  expect(citedAs("FQ I.vii.40 (Arthur to Una):", head, key)).toBe("[Spenser, *The Faerie Queene*, 1.7.40](#u) (Arthur to Una):");
  expect(citedAs("I think *Faerie Queene* 1.7.40:", head, key)).toBe("I think [Spenser, *The Faerie Queene*, 1.7.40](#u):");
  expect(citedAs("1.7.40, of the squire:", head, key)).toBe("[Spenser, *The Faerie Queene*, 1.7.40](#u), of the squire:");
  expect(citedAs("Arthur to Una, book 1, canto 7:", head, key)).toBe("Arthur to Una, [Spenser, *The Faerie Queene*, 1.7.40](#u):");
  expect(citedAs("1.13pm: Spenser, Faerie Queene I.vii.40:", head, key)).toBe("1.13pm: [Spenser, *The Faerie Queene*, 1.7.40](#u):");
  expect(citedAs("an appeal (40-41):", head, key)).toBe("an appeal [Spenser, *The Faerie Queene*, 1.7.40](#u):");
  for (const bare of ["[I.vii.40:", "10.07 ~ *FQ* I.vii.40:", "(Spenser, FQ, I.vii.40:", "Spenser, *The Faerie Queene*:"]) expect(citedAs(bare, head, key)).toBe(head);
  expect(citedAs("Arthur to Una:", head, key)).toBe(null);
  expect(citedAs("Æneid VI. 125-9:", "[Virgil, *Aeneid*, 6.125-29](#u):", "bookshelf/Virgil/Aeneid/6")).toBe("[Virgil, *Aeneid*, 6.125-29](#u):");
  expect(citedAs("Boethius 3pr3, q.v. *Paradiso* 1.127-35:", "[Boethius, *De consolatione philosophiae*, 3pr3.1](#u):", "bookshelf/Boethius/De consolatione philosophiae/3pr3")).toBe("[Boethius, *De consolatione philosophiae*, 3pr3.1](#u), q.v. *Paradiso* 1.127-35:");
  expect(citedAs("6: The Italian reads:", head, key)).toBe(null);
  expect(citedAs("Mr Bennet to Elizabeth, volume 3, chapter 15:", "[Austen, *Pride and Prejudice*, 3.15](#u):", "bookshelf/Austen, Jane/Pride and Prejudice/3.15")).toBe("Mr Bennet to Elizabeth, [Austen, *Pride and Prejudice*, 3.15](#u):");
  expect(citedAs("Jane Austen, *Pride and Prejudice*, p. 250:", "[Austen, *Pride and Prejudice*, 3.4](#u):", "bookshelf/Austen, Jane/Pride and Prejudice/3.4")).toBe("[Austen, *Pride and Prejudice*, 3.4](#u):");
  expect(citedAs("From Bernardus Silvestris’ *Commentary*, book 6, p. 35:", "[Virgil, *Aeneid*, 6.1](#u):", "bookshelf/Virgil/Aeneid/6")).toBe(null);
  expect(citedAs("Boethius, *De Consolatione Philosophiae*, II prose 4:", "[Boethius, *De consolatione philosophiae*, 2pr4.18](#u):", "bookshelf/Boethius/Consolatio/2pr4")).toBe("[Boethius, *De consolatione philosophiae*, 2pr4.18](#u):");
  expect(citedAs("Or the disdain of the messenger who opens the gates at 88-90 and goes:", head, key)).toBe(null);
  expect(citedAs("But, if you insist, what you must do first is find the golden bough, and 145-8:", "[Virgil, *Aeneid*, 6.145-48](#u):", "bookshelf/Virgil/Aeneid/6")).toBe("But, if you insist, what you must do first is find the golden bough, and [Virgil, *Aeneid*, 6.145-48](#u):");
  expect(citedAs("And now, what you must do first, if you insist, is find the bough, 6:", "[Virgil, *Aeneid*, 6.145-48](#u):", "bookshelf/Virgil/Aeneid/6")).toBe(null);
  expect(citedAs("[[ Alcuin, *O mea cella*:", "[Alcuin, *O mea cella*, 31](#u):", "bookshelf/Alcuin/O mea cella")).toBe("[Alcuin, *O mea cella*, 31](#u):");
});
test("quotedRuns: a run's last line split otherwise into words than the passage, To do ’t against To do’t, is still followed: letters, not words", () => {
  const prose = shelfIndex({ "bookshelf/Somebody/A Play/4.4": "# 4.4\n\n::: verse\nI do not know\nWhy yet I live to say ‘This thing’s to do;’\nSith I have cause and will and strength and means\nTo do’t. Examples gross as earth exhort me:\n:::\n" });
  const md = "> I do not know\n> Why yet I live to say “This thing’s to do”,\n> Sith I have cause, and will, and strength, and means\n> To do ’t.\n\nAnd so.\n";
  expect(quotedRuns(md, prose).map((r) => [r.start, r.end, r.to, r.tail])).toEqual([[0, 3, 4, "todot".length]]);
});
test("quotedRuns: an attribution closing the quotation that names the work, the link's own citation, goes with it; a line of one's own naming the work stays", () => {
  const md = "> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n> \\- Orsino, *Twelfth Night* 1.1\n\nAnd so.\n";
  expect(quotedRuns(md, play).map((r) => [r.start, r.end])).toEqual([[0, 2]]);
  const own = "> If music be the food of love, play on;\n> Give me excess of it, that, surfeiting,\n> and Twelfth Night was the first play I saw\n";
  expect(quotedRuns(own, play).map((r) => [r.start, r.end])).toEqual([[0, 1]]);
});

// Old English verse, a root of its own with no author, its half-lines cited;
// Hávamál in stanza fences.
const north = shelfIndex({
  "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::\n\n::: verse 377\nÐonne sægdon þæt  sæliþende,\nþa ðe gifsceattas  Geata fyredon\nþyder to þance,  þæt he þrittiges\nmanna mægencræft  on his mundgripe\nheaþorof hæbbe.  Hine halig God\n:::",
  "bookshelf/Havamal": "# Hávamál\n\n::: reference\nno author\n:::\n\n::: stanza 76\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nen orðstírr | but the renown\ndeyr aldregi | for the one who gets good fame\nhveim er sér góðan getr | dies never.\n:::",
});
test("quotedRuns: the letters matched without their accents and with ð and þ one letter, so a quotation in another edition's marks is the passage", () => {
  const md = "> Ðonne sægdon þæt      sælíþende\n> þá ðe gifsceattas      Géata fyredon\n> þyder tó þance      þæt hé þrítiges\n> manna mægencræft      on his mundgripe\n> heaþoróf hæbbe\n";
  const runs = quotedRuns(md, north);
  expect(runs.map((r) => [r.key, r.start, r.end, r.from, r.to])).toEqual([["bookshelf/Beowulf", 0, 4, 377, 381]]);
  const m = referenceOf(north, runs[0]);
  expect("text" in m && m.text.split("\n")[0]).toMatch(/^\[\*Beowulf\*, 377-81a\]/);
});
test("shelfIndex: a work in stanza fences is indexed, and a stanza quoted is a reference by stanza", () => {
  const md = "> Deyr fe\n> deyja frændr\n> deyr sjalfr it sama\n> en orðstírr\n> deyr aldregi\n> hveim er sér góðan getr\n";
  const runs = quotedRuns(md, north);
  expect(runs.map((r) => [r.key, r.start, r.end])).toEqual([["bookshelf/Havamal", 0, 5]]);
  const m = referenceOf(north, runs[0]);
  expect("text" in m && m.text.split("\n")[0]).toMatch(/^\[\*Hávamál\*, 76\]/);
});
test("quotedRuns: the lines placed by their likeness count toward a run's letters, so three lines with one short line exact are a run", () => {
  const bwf = shelfIndex({ "bookshelf/Beowulf": "# Beowulf\n\n::: reference\nno author\nOld English verse\n:::\n\n::: verse 1316\nGang ða æfter flore  fyrdwyrðe man\nmid his handscole  (healwudu dynede),\nþæt he þone wisan  wordum nægde\nfrean Ingwina,  frægn gif him wære\næfter neodlaðu  niht getæse.\nHroðgar maþelode,  helm Scyldinga:\n:::" });
  const md = "Also Bwf’s [1318-20]\n\n> þæt he ðone wisan  wordum nægde\n> frean Ingwine,  frægn gif him wære\n> æfter neodlaðum  niht gelæse.\n";
  expect(quotedRuns(md, bwf).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[2, 4, 1318, 1320]]);
  // a line too short to be a quotation on its own is still none
  expect(quotedRuns("> þæt he ðone wisan  wordum nægde\n", bwf)).toEqual([]);
});
test("referenceOf: Old English verse beside its translation, quoted from a second half-line and to a first, is cited and quoted by its halves", () => {
  const sf = shelfIndex({ "bookshelf/Seafarer": "# The Seafarer\n\n::: reference\nno author\nOld English verse\n:::\n\n::: verse 80\ndream mid dugeþum.  Dagas sind gewitene, | joy with the Hosts. The days are gone\nealle onmedlan  eorþan rices; | of all the glory of the kingdoms of the earth;\nnearon nu cyningas  ne caseras | there are not now kings, nor Cæsars,\nne goldgiefan  swylce iu wæron, | nor givers of gold as once there were,\n:::" });
  const md = "> Dagas sind gewitene\n> ealle onmedlan  eorþan rices;\n> nearon nu cyningas  ne caseras\n> ne goldgiefan\n";
  const runs = quotedRuns(md, sf);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 3, 80, 83]]);
  const m = referenceOf(sf, runs[0]);
  expect("text" in m && m.text.split("\n")[0]).toMatch(/^\[\*The Seafarer\*, 80b-83a\]/);
  expect("passage" in m && m.passage.split("\n")[1]).toBe("> Dagas sind gewitene, | joy with the Hosts. The days are gone");
  expect("passage" in m && m.passage.split("\n")[4]).toBe("> ne goldgiefan | nor givers of gold as once there were,");
});
test("wordDiff: an accent, or ð for þ, is a change of spelling a reader sees", () => {
  expect(wordDiff("þá ðe gifsceattas", "þa þe gifsceattas").ops).toEqual([["-", "þá"], ["-", "ðe"], ["+", "þa"], ["+", "þe"], ["=", "gifsceattas"]]);
  expect(wordDiff("þá ðe gifsceattas", "þa þe gifsceattas").kind).toBe("spelling");
});
test("referRuns: a short citation ending in a colon a blank line above the run is the run's citation all the same", () => {
  const md = "Odes 1.1.3-4:\n\nsunt quos curriculo pulverem Olympicum\ncollegisse iuvat metaque fervidis\n\nOdes 1.1:\n\n> certat tergeminis tollere honoribus;\n";
  const runs = quotedRuns(md, index);
  const out = referRuns(md, runs, (r) => ({ text: `[Horace, *Odes*, 1.1.${r.from}-${r.to}](#u${r.from}):\n\n> ::: verse ${r.from}\n> line\n> :::`, url: `#u${r.from}`, passage: `> ::: verse ${r.from}\n> line\n> :::` }));
  expect(out).toBe("[Horace, *Odes*, 1.1.3-4](#u3):\n\n> ::: verse 3\n> line\n> :::\n\n[Horace, *Odes*, 1.1.8-8](#u8):\n\n> ::: verse 8\n> line\n> :::\n");
});
test("quotedRuns: stanzas quoted one after another, a blank line between, are one run, a reference across them", () => {
  const hav = shelfIndex({ "bookshelf/Havamal": "# Hávamál\n\n::: reference\nno author\n:::\n\n::: stanza 76\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nen orðstírr | but the renown\ndeyr aldregi | for the one who gets good fame\nhveim er sér góðan getr | dies never.\n:::\n\n::: stanza 77\nDeyr fé | Cattle die,\ndeyja frændr | kinsmen die,\ndeyr sjálfr it sama | the self dies likewise;\nek veit einn | I know one thing\nat aldri deyr | that never dies:\ndómr um dauðan hvern | the repute of each of the dead.\n:::\n\n::: stanza 78\nFullar grindr | Full folds\n:::" });
  const md = "> Deyr fé\n> deyja frændr\n> deyr sjálfr it sama\n> en orðstírr\n> deyr aldregi\n> hveim er sér góðan getr\n\n> Deyr fé\n> deyja frændr\n> deyr sjálfr it sama\n> ek veit einn\n> at aldri deyr\n> dómr um dauðan hvern\n";
  const runs = quotedRuns(md, hav);
  expect(runs.map((r) => [r.start, r.end])).toEqual([[0, 12]]);
  const m = referenceOf(hav, runs[0]);
  expect("text" in m && m.text.split("\n")[0]).toMatch(/^\[\*Hávamál\*, 76–77\]/);
});

const novel = shelfIndex({
  "bookshelf/Austen, Jane": "# Jane Austen\n\n- [Pride and Prejudice](#bookshelf/Austen%2C%20Jane/Pride%20and%20Prejudice)\n",
  "bookshelf/Austen, Jane/Pride and Prejudice": "# Pride and Prejudice\n\n- [Volume 1, Chapter 9](#bookshelf/Austen%2C%20Jane/Pride%20and%20Prejudice/1.9)\n",
  "bookshelf/Austen, Jane/Pride and Prejudice/1.9": "# Volume 1, Chapter 9\n\n“I wonder who first discovered the efficacy of poetry in driving away love!” said Darcy.\n\n“I have been used to consider poetry as the food of love,” said Elizabeth.\n\nMrs. Bennet looked round the room with a very satisfied air.\n",
});
const AUSTEN = ["bookshelf/Austen, Jane"];
test("quotedPassages: quoted paragraphs a blank line apart that are one passage of a prose book are one run, the reference the passage's", () => {
  const md = "Darcy and Elizabeth:\n\n> “I wonder who first discovered the efficacy of poetry in driving away love!” said Darcy.\n\n> “I have been used to consider poetry as the food of love,” said Elizabeth.\n\nAnd so on.\n";
  const found = quotedPassages(md, novel, AUSTEN, []);
  expect(found.map(({ run }) => [run.start, run.end, run.key, run.prose])).toEqual([[2, 4, "bookshelf/Austen, Jane/Pride and Prejudice/1.9", true]]);
  expect(found[0].ref.url.startsWith("#bookshelf/Austen%2C%20Jane/Pride%20and%20Prejudice/1.9?h=")).toBe(true);
  expect(found[0].ref.passage).toContain("food of love");
});
test("quotedPassages: a paragraph of one's own among the quoted ones leaves the book's alone; a quotation not the book's, one already under a link to the bookshelf, one a verse run took and one in code are left", () => {
  const own = "> “I wonder who first discovered the efficacy of poetry in driving away love!” said Darcy.\n\n> Which is what I have always thought about the matter myself.\n";
  expect(quotedPassages(own, novel, AUSTEN, []).map(({ run }) => [run.start, run.end])).toEqual([[0, 0]]);
  expect(quotedPassages("> Nothing of the novel is in these words at all, none.\n", novel, AUSTEN, [])).toEqual([]);
  const linked = "[Austen, *Pride and Prejudice*, 1.9](#bookshelf/Austen%2C%20Jane/Pride%20and%20Prejudice/1.9?h=x):\n\n> “I have been used to consider poetry as the food of love,” said Elizabeth.\n";
  expect(quotedPassages(linked, novel, AUSTEN, [])).toEqual([]);
  const taken = "> “I have been used to consider poetry as the food of love,” said Elizabeth.\n";
  expect(quotedPassages(taken, novel, AUSTEN, [{ start: 0, end: 0, key: "k", first: 0, last: 0, from: 1, to: 1 }])).toEqual([]);
  expect(quotedPassages("```\n> “I have been used to consider poetry as the food of love,” said Elizabeth.\n```\n", novel, AUSTEN, [])).toEqual([]);
});
test("referRuns: before a prose passage, a short citation with a number gives way to the reference whole", () => {
  const md = "Volume 1, chapter 9:\n\n> “I have been used to consider poetry as the food of love,” said Elizabeth.\n";
  const { run, ref } = quotedPassages(md, novel, AUSTEN, [])[0];
  expect(referRuns(md, [run], () => ref)).toBe(ref.text + "\n");
});
test("quotedPassages: quoted paragraphs join one by one while nothing of the book is left out between them; a paragraph left out parts them there", () => {
  const book = shelfIndex({
    "bookshelf/Austen, Jane": "# Jane Austen\n",
    "bookshelf/Austen, Jane/Pride and Prejudice/1.9": "# Volume 1, Chapter 9\n\nThe first paragraph of the chapter is this one here.\n\nThe second paragraph of the chapter follows it there.\n\nThe third paragraph of the chapter is never quoted by anyone.\n\nThe fourth paragraph of the chapter closes it at last.\n",
  });
  const md = "> The first paragraph of the chapter is this one here.\n\n> The second paragraph of the chapter follows it there.\n\n> The fourth paragraph of the chapter closes it at last.\n";
  expect(quotedPassages(md, book, AUSTEN, []).map(({ run }) => [run.start, run.end])).toEqual([[0, 2], [4, 4]]);
});
test("sameQuoted: couplets each beside its translation, one after another in the passage, are one reference across them", () => {
  const md = "> sunt quos curriculo pulverem Olympicum\n> collegisse iuvat, metaque fervidis\n\n> Some like the dust\n> and the turning post\n\n> evitata rotis palmaque nobilis\n> terrarum dominos evehit ad deos;\n\n> grazed by the wheels\n> lifts them to the gods\n";
  const runs = quotedRuns(md, index);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 3, 4], [6, 7, 5, 6]]);
  const all = [...runs, { ...runs[0], start: 3, end: 4 }, { ...runs[1], start: 9, end: 10 }].sort((a, b) => a.start - b.start);
  const out = sameQuoted(md, all, (r) => (referenceOf(index, r) as { passage: string }).passage, index);
  expect(out.map(({ run, as }) => [run.start, run.end, as.from, as.to])).toEqual([[0, 10, 3, 6]]);
});
test("sameQuoted: a quotation and its translation a blank line apart are one reference, the passage that holds the other's", () => {
  const md = "> La gloria di colui che tutto move\n\n> The glory of Him who moves all things\n\nAnd then.\n\n> La gloria di colui che tutto move\n";
  const run = (start: number, end: number) => ({ start, end, key: "k", first: 0, last: 0, from: 1, to: 1 });
  const joined = (md: string, runs: ReturnType<typeof run>[], passage: (r: ReturnType<typeof run>) => string) => sameQuoted(md, runs, passage).map(({ run, as }) => [run.start, run.end, as.start]);
  expect(joined(md, [run(0, 0), run(2, 2), run(6, 6)], () => "> ::: verse\n> La gloria | The glory\n> :::")).toEqual([[0, 2, 0], [6, 6, 6]]);
  expect(joined(md, [run(0, 0), run(2, 2)], (r) => r.start ? "> other" : "> one")).toEqual([[0, 0, 0], [2, 2, 2]]);
  const thrice = "> one\n\n> two\n\n> three\n";
  const part = new Map([[0, "> a | b\n> c | d"], [2, "> a | b"], [4, "> e | f\n> a | b\n> c | d"]]);
  expect(joined(thrice, [run(0, 0), run(2, 2)], (r) => part.get(r.start)!)).toEqual([[0, 2, 0]]);
  expect(joined(thrice, [run(2, 2), run(4, 4)], (r) => part.get(r.start)!)).toEqual([[2, 4, 4]]);
});
test("quotedPassages: a quotation as short as a verse run too common to count, a phrase in anyone's mouth, is no reference", () => {
  const book = shelfIndex({
    "bookshelf/Austen, Jane": "# Jane Austen\n",
    "bookshelf/Austen, Jane/Pride and Prejudice/3.17": "# Volume 3, Chapter 17\n\n“My dearest love,” said she, “you must not think so ill of yourself.”\n",
  });
  expect(quotedPassages("> My dearest love,\n", book, AUSTEN, [])).toEqual([]);
  expect(quotedPassages("> “My dearest love,” said she, “you must not think so ill of yourself.”\n", book, AUSTEN, []).length).toBe(1);
});
test("carried: a run is carried over the lines beside it in its quotation that are its block's earlier or later lines, spelled otherwise, an elision passed over; a line of one's own stops it", () => {
  const md = "> Maecenas atavis edite regibs,\n> o et presidium et dulce decus meum: ...\n> terrarum dominos evehit ad deos;\n> hunc, si mobilium turba Quiritium\n> – Horace, my favourite\n";
  const runs = quotedRuns(md, index);
  expect(runs.map((r) => [r.start, r.end, r.from, r.to])).toEqual([[2, 3, 6, 7]]);
  expect(carried(md, index, runs).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 3, 1, 7]]);
  const own = "> My own line that is nothing of Horace\n> terrarum dominos evehit ad deos;\n> hunc, si mobilium turba Quiritium\n";
  expect(carried(own, index, quotedRuns(own, index)).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[1, 2, 6, 7]]);
});
test("carried: the line beside a run that is its block's very next line in another edition's words, or that line with one's own note after it, is carried", () => {
  const md = "> hunc, si mobilium turba Quiritium\n> certant trigeminis tolli honores\n";
  expect(carried(md, index, [{ start: 0, end: 0, key: "bookshelf/Horace/Odes/1.1", first: 6, last: 6, from: 7, to: 7 }]).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 1, 7, 8]]);
  const far = "> hunc, si mobilium turba Quiritium\n> quicquid ex Libyae verrunt areis.\n";
  expect(carried(far, index, [{ start: 0, end: 0, key: "bookshelf/Horace/Odes/1.1", first: 6, last: 6, from: 7, to: 7 }]).map((r) => [r.start, r.end])).toEqual([[0, 0]]);
  const noted = "> terrarum dominos evehit ad deos;\n> hunc, si mobilium turba Quiritium\n> certat tergeminis tollere honoribus; (*Odes*, i.1.6-8)\n";
  expect(carried(noted, index, quotedRuns(noted, index)).map((r) => [r.start, r.end, r.from, r.to])).toEqual([[0, 2, 6, 8]]);
});
test("quotedRuns: an attribution closing the quotation that names any part the work is filed under goes with it", () => {
  const dante = shelfIndex({ "bookshelf/Dante/Commedia/Paradiso/20": "# Canto 20\n\n::: verse\nQuando colui che tutto ’l mondo alluma\nde l’emisperio nostro sì discende,\nche ’l giorno d’ogne parte si consuma,\n:::\n" });
  const md = "> Quando colui che tutto ’l mondo alluma\n> de l’emisperio nostro sì discende,\n> – *Paradiso* 20.1-2.\n";
  expect(quotedRuns(md, dante).map((r) => [r.start, r.end])).toEqual([[0, 2]]);
  const poem = shelfIndex({ "bookshelf/Somebody/A Poem": "# A Poem\n\n::: verse\nThe first line of the poem is spoken here\nAnd carries on a while before it stops\n:::\n" });
  const named = "> The first line of the poem is spoken here\n> And carries on a while before it stops\n> – *A Poem*, 1-2\n";
  expect(quotedRuns(named, poem).map((r) => [r.start, r.end])).toEqual([[0, 2]]);
});
test("citedAs: a short word inside the work's name goes with the name when a word of it stands before", () => {
  const head = "[Rostand, *Cyrano de Bergerac*, 5.2.14-16](#u):", key = "bookshelf/Rostand, Edmond/Cyrano de Bergerac/5.2";
  expect(citedAs("Remember Mom saying it?  Roxane, in Cyrano de Bergerac V, ii:", head, key)).toBe("Remember Mom saying it?  Roxane, in [Rostand, *Cyrano de Bergerac*, 5.2.14-16](#u):");
  expect(citedAs("Roxane says de Bergerac V, ii:", head, key)).toBe("Roxane says de [Rostand, *Cyrano de Bergerac*, 5.2.14-16](#u):");
});
