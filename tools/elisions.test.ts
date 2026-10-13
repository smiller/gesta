import { test, expect } from "vitest";
import { elisions, respell } from "./elisions.ts";

const words = new Set(["horse", "hospital", "his", "is", "hold", "old", "the", "it", "hit", "and", "hand"]);
const run = (md: string) => respell(md, elisions(md, words).filter((e) => e.turn));

test("elisions: a clip that is no word of its own turns, quoted or not; a dropped h turns where the word without it is none", () => {
  expect(run("For ‘tis the crowne, and I ‘scaped not here\n")).toBe("For ’tis the crowne, and I ’scaped not here\n");
  expect(run("“Get the ‘orse to the ‘ospital,” he said.\n")).toBe("“Get the ’orse to the ’ospital,” he said.\n");
  expect(run("Were ‘t aught to me\n")).toBe("Were ’t aught to me\n");
});
test("elisions: a clip that is also a word turns only where no closing mark follows it in the paragraph", () => {
  expect(run("plain as the nose on ‘is face, and that\n")).toBe("plain as the nose on ’is face, and that\n");
  expect(run("in the popular phrase, ‘is killing me’.\n")).toBe("in the popular phrase, ‘is killing me’.\n");
  expect(run("a return to the ‘old tongue’, to a real one\n")).toBe("a return to the ‘old tongue’, to a real one\n");
  expect(run("Exceptin’ ‘is dirty supper things, ‘is letters\n")).toBe("Exceptin’ ’is dirty supper things, ’is letters\n");
  expect(run("‘is\n\nnext paragraph’s\n")).toBe("’is\n\nnext paragraph’s\n");
});
test("elisions: an opening quotation mark before any other word is left, and so is one after a letter or a full stop; one between letters turns", () => {
  expect(run("‘It was,’ he said. ‘The horse.\n")).toBe("‘It was,’ he said. ‘The horse.\n");
  expect(run("F.R.C.‘S., was announced\n")).toBe("F.R.C.‘S., was announced\n");
  expect(run("Oh, I‘m freezing; they‘ll try.\n")).toBe("Oh, I’m freezing; they’ll try.\n");
});
test("elisions: code is left", () => {
  expect(run("```\nfor ‘tis\n```\n")).toBe("```\nfor ‘tis\n```\n");
});
test("elisions: each found mark says its word and whether it turns", () => {
  expect(elisions("‘is killing me’ and ‘tis\n", words).map((e) => [e.word, e.turn])).toEqual([["is", false], ["tis", true]]);
});
test("elisions: a dropped h, and a clip that is Latin or French too, turn only unclosed; a letter then an apostrophe opens a quotation", () => {
  const latin = new Set([...words, "het", "et", "hisn"]);
  const go = (md: string) => respell(md, elisions(md, latin).filter((e) => e.turn));
  expect(go("‘Et nunc ad astra’, he wrote\n")).toBe("‘Et nunc ad astra’, he wrote\n");
  expect(go("‘ad astra’ and ‘ave atque vale’\n")).toBe("‘ad astra’ and ‘ave atque vale’\n");
  expect(go("‘Isn’t it?’ she said.\n")).toBe("‘Isn’t it?’ she said.\n");
  expect(go("‘D’you know,’ he said, ‘the e’?\n")).toBe("‘D’you know,’ he said, ‘the e’?\n");
  expect(go("“I ‘ad a ‘orse once.”\n")).toBe("“I ’ad a ’orse once.”\n");
});
test("elisions: a one-letter clip turns only unclosed, a letter opening a quotation as often", () => {
  expect(run("‘D sol re,’ one clef, two notes have I\n")).toBe("‘D sol re,’ one clef, two notes have I\n");
  expect(run("a forehead with one horn upon ‘t –\n")).toBe("a forehead with one horn upon ’t –\n");
});
test("elisions: a dialect's own clipped ending, ha’ or wiv’, closes nothing", () => {
  expect(run("I am glad on ‘t: then we shall ha’ means to vent\n")).toBe("I am glad on ’t: then we shall ha’ means to vent\n");
  expect(run("you’ll ‘ave ’im steppin’ aht ter meet me wiv’ a\n")).toBe("you’ll ’ave ’im steppin’ aht ter meet me wiv’ a\n");
});
