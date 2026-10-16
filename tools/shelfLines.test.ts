import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { shelfIndex, referenceOf } from "./bookshelfQuotes.ts";
import { quotedRuns, referRuns, wordDiff } from "./shelfLines.ts";

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
  const other = "> ORSINO THE DUKE\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(other, play).map((r) => [r.start, r.end, r.speaker !== undefined])).toEqual([[0, 2, true]]);
  const outside = "PORTIA\n> That strain again! it had a dying fall:\n> O, it came o’er my ear like the sweet sound,\n";
  expect(quotedRuns(outside, play).map((r) => [r.start, r.end])).toEqual([[1, 2]]);
});
