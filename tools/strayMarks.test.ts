import { test, expect } from "vitest";
import { strayMarks } from "./strayMarks.ts";
import { respellMarks } from "./quoteMarks.ts";

const run = (md: string) => respellMarks(md, strayMarks(md)).out;
const kinds = (md: string) => strayMarks(md).map((f) => f.kind);

test("strayMarks: an opening double mark after a word, before a space, punctuation or the line's end, is a closing one turned", () => {
  expect(run("They boil a stone! *Neblaretai! Rattei!*“\n")).toBe("They boil a stone! *Neblaretai! Rattei!*”\n");
  expect(run("“O soul,“ said one, “still in\n")).toBe("“O soul,” said one, “still in\n");
  expect(run("> Rochester.“\n")).toBe("> Rochester.”\n");
  expect(kinds("“*Who?*“\n")).toEqual(["dClosing"]);
});
test("strayMarks: a closing double mark after a space, a dash or the line's start, before a word or italics, is an opening one turned", () => {
  expect(run("And she said: ”You can blow your nose\n")).toBe("And she said: “You can blow your nose\n");
  expect(run("”*I* think it’s going to rain,” said\n")).toBe("“*I* think it’s going to rain,” said\n");
  expect(run("*Seventh Friend.* —”*erecta sint spe:*“\n")).toBe("*Seventh Friend.* —“*erecta sint spe:*”\n");
  expect(run("“It all began,” he said, ”when we discovered\n")).toBe("“It all began,” he said, “when we discovered\n");
  const closing = "> *Unless with penitential pain —”*\n";
  expect(run(closing)).toBe(closing);
});
test("strayMarks: a closing double mark after a dash and a space, before a small letter, is an elision's apostrophe", () => {
  expect(run("the term you come — ”e was as good as gold\n")).toBe("the term you come — ’e was as good as gold\n");
  expect(kinds("It’s blood — ”eart’s blood, sir.’\n")).toEqual(["elision"]);
});
test("strayMarks: a word between a closing and an opening double mark, run into the next word, is quoted the right way round and spaced", () => {
  expect(run("had a ”comedy“member.  And\n")).toBe("had a “comedy” member.  And\n");
  expect(run("happens to be ”a good risk,“as they call it.\n")).toBe("happens to be “a good risk,” as they call it.\n");
});
test("strayMarks: a closing double mark set after punctuation and a space closes up, at the line's end or before a small letter", () => {
  expect(run("“I was just fishing to be sure you were glad to see me.  ”\n")).toBe("“I was just fishing to be sure you were glad to see me.”\n");
  expect(run("the age of action—“True! ” quoth I—\n")).toBe("the age of action—“True!” quoth I—\n");
  expect(run("stones crying out to me: ‘Die, die!’ ”  This is\n")).toBe("stones crying out to me: ‘Die, die!’”  This is\n");
  expect(run("[the Ox is oppression.’ ”]\n")).toBe("[the Ox is oppression.’”]\n");
  expect(run("than is useful to you.’ ” After which\n")).toBe("than is useful to you.’” After which\n");
  expect(run("‘I go speaking of your friend.’ ”\u00a0 The phrase\n")).toBe("‘I go speaking of your friend.’”\u00a0 The phrase\n");
});
test("strayMarks: a pair of spaced closing double marks around words on one line quotes them, closed up", () => {
  expect(run("whose major premise is in the form ” All A is B ” can be recast\n")).toBe("whose major premise is in the form “All A is B” can be recast\n");
  expect(kinds("in the form ” All A is B ” can\n")).toEqual(["dOpening", "dSpacedClose"]);
});
test("strayMarks: an opening double mark set apart from an opening single one closes up", () => {
  expect(run("up to the words: “ ‘One law for the Lion and the Ox is oppression.’ ”]\n")).toBe("up to the words: “‘One law for the Lion and the Ox is oppression.’”]\n");
});
test("strayMarks: a ditto mark opening a quoted line before a number is a bullet", () => {
  expect(run("> Jan. 7 G\n> ” 14 O?\n> ” 21 A\n> Feb. 5 G\n")).toBe("> Jan. 7 G\n> • 14 O?\n> • 21 A\n> Feb. 5 G\n");
  expect(kinds("> ” 14 O?\n")).toEqual(["ditto"]);
});
test("strayMarks: a spaced double mark between two times is a timetable's dash, a train that does not stop", () => {
  expect(run("> Castle Kennedy 11.42 ” 4.12\n> New Luce 12.7 p.m. ” 4.33\n")).toBe("> Castle Kennedy 11.42 — 4.12\n> New Luce 12.7 p.m. — 4.33\n");
  expect(kinds("> Glenwhilly 12.19 ” 4.45\n")).toEqual(["noStop"]);
});
test("strayMarks: a spaced double mark before anything else is left for a hand", () => {
  expect(kinds("Bother! Too long. ” ... was handicapped\n")).toEqual(["left"]);
});
test("strayMarks: a single mark run onto punctuation before italics is an opening one, spaced as the entry spaces its sentences", () => {
  expect(run("“Greece, I should think,” Marta said.’*Ancient* Greece.’\n")).toBe("“Greece, I should think,” Marta said. ‘*Ancient* Greece.’\n");
  expect(run("I say!  Tell her.  The boy.’*Wash*out.’\n")).toBe("I say!  Tell her.  The boy.  ‘*Wash*out.’\n");
  expect(run("TAILOR [reads]:’*With a trunk sleeve:*’\n")).toBe("TAILOR [reads]: ‘*With a trunk sleeve:*’\n");
  expect(run("*Cry: ‘St. George,’ ‘A Talbot.’*\n")).toBe("*Cry: ‘St. George,’ ‘A Talbot.’*\n");
});
test("strayMarks: a single mark run onto a comma before a spaced dash opens the resumed speech", () => {
  expect(run("“I have asked you,” he said,’ — even when we are alone — to speak\n")).toBe("“I have asked you,” he said, ‘— even when we are alone — to speak\n");
  const closing = "‘Oh, dear!’  I said.  ‘My husband comes in for his supper at nine,’ — he goes down\n";
  expect(run(closing)).toBe(closing);
});
test("strayMarks: a spaced single mark after a plural, before a small letter, is its possessive; Italian's e ’ is left", () => {
  expect(run("Augustus ’ stepson Tiberius\n")).toBe("Augustus’ stepson Tiberius\n");
  expect(run("Afranius ’ toga’s the style\n")).toBe("Afranius’ toga’s the style\n");
  const it = "nomar le donne antiche e ’ cavalieri, tra ’ miei, che ’ suoi nemici\n";
  expect(run(it)).toBe(it);
});
test("strayMarks: code is left", () => {
  const md = "```\nsaid.’*Ancient* and ”comedy“member\n```\n";
  expect(run(md)).toBe(md);
});
