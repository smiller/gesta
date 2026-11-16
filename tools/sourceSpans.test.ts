import { test, expect } from "vitest";
import { spansOf, only } from "./sourceSpans.ts";

const read = (src: string, file = "a.ts") => spansOf(file, src).map((s) => [s.kind, src.slice(s.at, s.to)]);

test("a module's comments and strings, each with its kind, its code skipped", () => {
  expect(read('// one\nsay("it\'s"); /* two */ const q = \'x\';')).toEqual([
    ["comment", "// one"], ["string", '"it\'s"'], ["comment", "/* two */"], ["string", "'x'"],
  ]);
});

test("a template's text is read between its substitutions, a string inside one is a string", () => {
  expect(read('const t = `a ${f("b")} c`;')).toEqual([["template", "a "], ["string", '"b"'], ["template", " c"]]);
});

test("a slash after return or an operator opens a regex, a span of its own, whose quotes and slashes are no string's or comment's", () => {
  expect(read("function f() { return /'[/*]/.test(s); }\nconst r = x / y; // z")).toEqual([["regex", "/'[/*]/"], ["comment", "// z"]]);
  expect(read("const r = a = /\"/g;")).toEqual([["regex", '/"/g']]);
});

test("a page's script, its style and its markup are read in place, each in its own way", () => {
  const page = '<script>const a = "s"; // c\n</script>\n<!-- m -->\n<style>/* k */ p { content: "q"; }</style>';
  expect(read(page, "A.svelte")).toEqual([["comment", "<!-- m -->"], ["string", '"s"'], ["comment", "// c"], ["comment", "/* k */"]]);
  expect(only(page, "script").length).toBe(page.length);
});
