import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { retiredWord } from "./vocabulary.ts";

test("retiredWord: the noun, the verb and an identifier built on either; never a word that only contains the letters", () => {
  for (const bad of ["a citation", "Citations", "it cites both", "cited by", "citing", "re-cited", "citesLocator", "citationAnchorHTML", "referenceCitation", "A CITATION", "const CITATION = 1"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["a reference", "excited", "solicited", "recite", "incite", "explicit", "elicited", "specificity", "felicitation"]) expect(retiredWord(good), good).toBe(false);
});

// Milton's own preface to Samson Agonistes uses the verb.
const QUOTES_A_BOOK = new Set(["tools/miltonSamsonRun.ts", "tools/vocabulary.ts", "tools/vocabulary.test.ts"]);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
test("the app, its tools and CLAUDE.md say reference: no retired word anywhere", () => {
  const files = [...walk("src"), ...walk("tools"), "CLAUDE.md", "index.html"].filter((f) => !QUOTES_A_BOOK.has(f) && /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
  const found = files.flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retiredWord(t) ? [f + ":" + (i + 1)] : [])));
  expect(found).toEqual([]);
});
