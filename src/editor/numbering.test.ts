// The unit walk, re-asked of the document: what is a line, what is
// apparatus, what a note, a gap, a prose pair or a declared row counts for.
// The cases are ../writer/src/js/numbering.test.mjs's (2026-09-07), minus the
// DOM marking they also pinned — here the marking is a decoration.
import { test, expect } from "vitest";
import { parseMarkdown } from "../model/parse.ts";
import { schema } from "../model/schema.ts";
import { lineUnits, blocksOf, whollyIn, drawsInk, paintsLines } from "./numbering.ts";

const doc = parseMarkdown;
const kinds = (md: string, interval = 0): string =>
  lineUnits(doc(md), interval).map((u) => u.kind + (u.line ? ":" + u.line : "")).join(" ");

test("prose is unnumbered, a verse block's rows are its lines from 1", () => {
  const d = doc("intro\n\n::: verse\na\nb\nc\n:::\n\nafter");
  const u = lineUnits(d, 0);
  expect(u.map((x) => x.kind + ":" + x.line)).toEqual(["line:1", "line:2", "line:3"]);
  expect(u.map((x) => d.nodeAt(x.pos))).toEqual(u.map((x) => x.node));
  expect(d.nodeAt(u[0].blockPos)!.type.name).toBe("verse");
});

test("each block counts from 1, and a stanza gap emits nothing", () => {
  expect(kinds("::: verse\na\nb\n:::\n\n::: verse\nc\n\nd\n:::")).toBe("line:1 line:2 line:1 line:2");
});

test("apparatus inside the fence is a unit but not a line", () => {
  expect(kinds("::: verse\n*Enter Orsino*\n**DUKE**\nIf music be the food of love\n:::")).toBe("stage speaker line:1");
  expect(kinds("::: verse\nplain *with* emphasis\n:::")).toBe("line:1");
});

test("a ⟨line⟩ row is a line whatever it is set in", () => {
  expect(kinds("::: verse\n*Exit*\n⟨line⟩*Flower o’ the broom,*\n⟨line⟩*Take away love, and our earth is a tomb!*\n**PIPPA**\n⟨line⟩**shouted**\n:::"))
    .toBe("stage line:1 line:2 speaker line:3");
  expect(kinds("::: verse\n⟨line⟩*a* | *b*\n:::")).toBe("line:1");
  /* a declared row drawing nothing is still no unit */
  expect(kinds("::: verse\n⟨line⟩\n:::")).toBe("");
});

test("a paired row is one unit whichever column; a note row takes no number", () => {
  expect(kinds("::: verse\na | b\n::: note\nfoot\n:::\nc | d\n:::")).toBe("line:1 line:2");
});

test("a prose block numbers its PAIRED rows as sentences, full-width rows not at all", () => {
  expect(kinds("::: prose\nHeading\nfirst | its translation\nsecond | second's\n:::")).toBe("sentence:1 sentence:2");
  expect(kinds("::: prose\n*all italic* | *tout en italique*\n:::")).toBe("sentence:1");
});

test("a block starting at a number counts its rows from it, by position", () => {
  expect(kinds("::: verse 2\na\nb\n:::\n\n::: verse\nc\n:::")).toBe("line:2 line:3 line:1");
  expect(kinds("::: verse 3\n**DUKE**\na\n\n*Exit*\n::: note\nn\n:::\nb\n:::")).toBe("speaker line:3 stage line:4");
  expect(kinds("::: prose 4\nHeading\na | b\nc | d\n:::")).toBe("sentence:4 sentence:5");
  expect(lineUnits(doc("::: verse 2\na\nb\nc\nd\ne\n:::"), 5).map((x) => x.shown)).toEqual([false, false, false, true, false]);
});

test("`shown` follows the interval for lines only", () => {
  const u = lineUnits(doc("::: verse\na\nb\nc\nd\n:::\n\n::: prose\ns | t\nu | v\n:::"), 2);
  expect(u.map((x) => x.shown)).toEqual([false, true, false, true, false, false]);
  expect(lineUnits(doc("::: verse\na\nb\n:::"), 0).map((x) => x.shown)).toEqual([false, false]);
});

test("only a top-level block is walked", () => {
  expect(kinds("::: note\n::: verse\na\n:::\n:::")).toBe("");
  expect(kinds("> ::: verse\n> a\n> :::")).toBe("");
  expect(kinds("::: card-red\n::: verse\na\n:::\n:::")).toBe("");
});

test("blocksOf: lines grouped by block, a block registering on its first NUMBERED line", () => {
  const groups = blocksOf(lineUnits(doc("::: verse\n*Exeunt*\n:::\n\n::: verse\na\nb\n:::\n\n::: verse\nc\n:::"), 0));
  expect(groups.map((g) => g.map((u) => u.line))).toEqual([[1, 2], [1]]);
  expect(blocksOf(lineUnits(doc("::: verse 2\na\n:::\n\n::: verse\nb\n:::"), 0)).map((b) => b[0].line)).toEqual([2, 1]);
});

test("whollyIn and drawsInk", () => {
  const row = (md: string) => doc("::: verse\n" + md + "\n:::").firstChild!.firstChild!;
  const em = schema.marks.em, strong = schema.marks.strong;
  expect(whollyIn(row("*Exeunt*"), em)).toBe(true);
  expect(whollyIn(row("*Exeunt* all"), em)).toBe(false);
  expect(whollyIn(row("*Exeunt* "), em)).toBe(true);
  expect(whollyIn(row("*![a](x.webp)*"), em)).toBe(true);
  expect(whollyIn(row("**A** | **B**"), strong)).toBe(true);
  expect(whollyIn(row("*a* | plain"), em)).toBe(false);
  expect(whollyIn(row("*a* |"), em)).toBe(true);
  expect(whollyIn(row("⟨8⟩*a*"), em)).toBe(true);
  expect(drawsInk(row("x"))).toBe(true);
  expect(drawsInk(row("![a](x.webp)"))).toBe(true);
  expect(drawsInk(row("⟨8⟩"))).toBe(false);
  expect(drawsInk(row(" |"))).toBe(false);
});

test("paintsLines: a top-level verse block, and nothing else", () => {
  expect(paintsLines(doc("::: verse\na\n:::"))).toBe(true);
  expect(paintsLines(doc("::: note\n::: verse\na\n:::\n:::"))).toBe(false);
  expect(paintsLines(doc("::: prose\na | b\n:::"))).toBe(false);
  expect(paintsLines(doc("text"))).toBe(false);
});
