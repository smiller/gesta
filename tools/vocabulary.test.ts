import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { retiredWord, retiredName } from "./vocabulary.ts";

test("retiredWord: the noun, the verb and an identifier built on either; never a word that only contains the letters", () => {
  for (const bad of ["a citation", "Citations", "it cites both", "cited by", "citing", "re-cited", "citesLocator", "citationAnchorHTML", "referenceCitation", "A CITATION", "const CITATION = 1", "CitationAnchor", "citeRange", "CITED_LINES", "cite_x", "type CitesLocator", "_citation", "uncited", "miscited"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["a reference", "excited", "solicited", "recite", "incite", "explicit", "elicited", "specificity", "felicitation"]) expect(retiredWord(good), good).toBe(false);
});

// Milton's own preface to Samson Agonistes uses the verb.
const QUOTES_A_BOOK = new Set(["one-offs/miltonSamsonRun.ts", "tools/vocabulary.ts", "tools/vocabulary.test.ts"]);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
test("the app, its tools, its one-off scripts, CLAUDE.md and the glossary say reference: no retired word anywhere", () => {
  const files = [...walk("src"), ...walk("tools"), ...walk("one-offs"), "CLAUDE.md", "GLOSSARY.md", "index.html"].filter((f) => !QUOTES_A_BOOK.has(f) && /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
  const found = files.flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retiredWord(t) ? [f + ":" + (i + 1)] : [])));
  expect(found).toEqual([]);
});

test("retiredName: the app named by its age, current or old, in any case; never the words apart or a quotation of them", () => {
  for (const bad of ["the current app's run", "The Current App", "THE CURRENT APP", "the CURRENT app's parser", "the old app's databases"]) expect(retiredName(bad), bad).toBe(true);
  for (const good of ["the `../writer` version", "the current application state", "an old approach", "an app", 'kept "the current app" as written', "quoted (“the old app keeps no place”)"]) expect(retiredName(good), good).toBe(false);
});
test("the app, its tools, its one-off scripts, CLAUDE.md, the glossary and the plans name the ../writer version as that, never by its age; the conversion plan alone calls it the current app", () => {
  const conversion = "2026-09-07-feat-successor-app-prosemirror-svelte-plan.md";
  const plans = walk("docs/plans");
  const files = [...walk("src"), ...walk("tools"), ...walk("one-offs"), "CLAUDE.md", "GLOSSARY.md"].filter((f) => !QUOTES_A_BOOK.has(f) && /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
  const found = files.flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retiredName(t) ? [f + ":" + (i + 1)] : [])));
  const age = (f: string): "old" | "either" => (f.endsWith(conversion) ? "old" : "either");
  const inPlans = plans.filter((f) => f.endsWith(".md")).flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retiredName(t, age(f)) ? [f + ":" + (i + 1)] : [])));
  expect([...found, ...inPlans]).toEqual([]);
});
