import { test, expect } from "vitest";
import { joinQuotes } from "./quoteJoins.ts";

const run = (md: string, apart: string[] = []) => joinQuotes(md, apart).text;

test("quoteJoins: quotes a blank line apart become one quotation; one with unquoted text between stays apart", () => {
  const md = "> Excess of sorrow laughs.  Excess of joy weeps.\n\n(*myne* discussions of things turning into their opposites.)\n\n" +
    "> The apple tree never asks the beech how he shall grow,\n> nor the lion the horse, how he shall take his prey.\n\n> OPPOSITION IS TRUE FRIENDSHIP.\n\n" +
    "> A devil to an angel: I tell you no virtue can exist without breaking these ten commandments.  Jesus was all virtue, and acted from impulse, not from rules.\n";
  expect(run(md)).toBe("> Excess of sorrow laughs.  Excess of joy weeps.\n\n(*myne* discussions of things turning into their opposites.)\n\n" +
    "> The apple tree never asks the beech how he shall grow,\n> nor the lion the horse, how he shall take his prey.\n> \n> OPPOSITION IS TRUE FRIENDSHIP.\n> \n" +
    "> A devil to an angel: I tell you no virtue can exist without breaking these ten commandments.  Jesus was all virtue, and acted from impulse, not from rules.\n");
});
test("quoteJoins: the joining line is quoted as deep as the shallower side", () => {
  expect(run(">> inner line 1\n\n>> inner line 2\n")).toBe(">> inner line 1\n>> \n>> inner line 2\n");
  expect(run(">> inner line 1\n\n> back to outer line\n")).toBe(">> inner line 1\n> \n> back to outer line\n");
  expect(run("> outer line\n\n>> inner line\n")).toBe("> outer line\n> \n>> inner line\n");
  expect(run("> > spaced\n\n> > nesting\n")).toBe("> > spaced\n>> \n> > nesting\n");
});
test("quoteJoins: a line of spaces is a blank line", () => {
  expect(run("> a\n   \n> b\n")).toBe("> a\n> \n> b\n");
});
test("quoteJoins: code is left", () => {
  expect(run("```\n> a\n\n> b\n```\n")).toBe("```\n> a\n\n> b\n```\n");
  expect(run("~~~\n> a\n\n> b\n~~~\n\n> c\n\n> d\n")).toBe("~~~\n> a\n\n> b\n~~~\n\n> c\n> \n> d\n");
});
test("quoteJoins: a gap whose quoted line above is listed apart stays apart", () => {
  const md = "> «Dans le fond des forêts votre image me suit.»\n> – Racine\n\n> There is a panther stalks me down:\n\n> One day I’ll have my death of him;\n";
  expect(run(md, ["– Racine"])).toBe("> «Dans le fond des forêts votre image me suit.»\n> – Racine\n\n> There is a panther stalks me down:\n> \n> One day I’ll have my death of him;\n");
});
test("quoteJoins: each join says the lines either side and the depth it was given", () => {
  expect(joinQuotes(">> a\n\n> b\n\nc\n\n> d\n", []).joins).toEqual([{ line: 0, above: ">> a", below: "> b", depth: 1 }]);
});
