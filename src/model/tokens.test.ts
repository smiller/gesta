import { test, expect } from "vitest";
import { tokenize } from "./tokens.ts";

const spans = (code: string, lang: string) => tokenize(code, lang).map((t) => t.cls + ":" + code.slice(t.from, t.to));
test("javascript: comments, strings, numbers and keywords, in one pass; an alias maps", () => {
  expect(spans('const x = "a" + 0x1f; // done', "js")).toEqual(["k:const", 's:"a"', "n:0x1f", "c:// done"]);
  expect(spans("/* block\n */ return 1.5e3", "javascript")).toEqual(["c:/* block\n */", "k:return", "n:1.5e3"]);
});
test("sql folds case; html marks tags and comments; a language the table lacks yields nothing", () => {
  expect(spans("SELECT id FROM t -- c", "sql")).toEqual(["k:SELECT", "k:FROM", "c:-- c"]);
  expect(spans('<div class="a"><!-- x --></div>', "html")).toEqual(['k:<div class="a">', "c:<!-- x -->", "k:</div>"]);
  expect(tokenize("anything", "brainfuck")).toEqual([]);
  expect(tokenize("plain words", "")).toEqual([]);
});
test("ruby and shell line comments; a word inside another is not a keyword", () => {
  expect(spans("def endless # note", "rb")).toEqual(["k:def", "c:# note"]);
  expect(spans("echo done", "sh")).toEqual(["k:echo", "k:done"]);
});
