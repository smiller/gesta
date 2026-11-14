import { test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { straightInStrings, straightInMarkup } from "./apostrophes.ts";
import { only } from "./sourceSpans.ts";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test("the rule reads the strings of a module or a page's script, a template's text but not its substitutions, and a page's text, never comments or code", () => {
  expect(straightInStrings('/* it\'s */ say("couldn\'t move"); const q = "[title=\'x\']";')).toEqual(['"couldn\'t move"']);
  expect(straightInMarkup('<script>const a = "it\'s";</script><p>a book\'s parts</p>')).toEqual(["a book's parts"]);
  expect(straightInStrings(only('<script>say(`couldn\'t ${n}`);</script><p>x</p>', "script"))).toEqual(["couldn't "]);
});

test("what the app shows writes an apostrophe curled, as its typing does", () => {
  const files = walk("src").filter((f) => !f.endsWith(".test.ts"));
  const found = [
    ...files.filter((f) => f.endsWith(".ts")).flatMap((f) => straightInStrings(readFileSync(f, "utf8")).map((s) => f + " " + s)),
    ...files.filter((f) => /\.(svelte|html)$/.test(f)).flatMap((f) => straightInMarkup(readFileSync(f, "utf8")).map((s) => f + " " + s.slice(0, 60))),
    ...files.filter((f) => /\.(svelte|html)$/.test(f)).flatMap((f) => straightInStrings(only(readFileSync(f, "utf8"), "script")).map((s) => f + " " + s)),
  ];
  expect(found).toEqual([]);
});
