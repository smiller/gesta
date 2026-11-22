import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { retiredWord, retiredAlertSense } from "./vocabulary.ts";

test("retiredWord: the noun, the verb and an identifier built on either; never a word that only contains the letters", () => {
  for (const bad of ["a citation", "Citations", "it cites both", "cited by", "citing", "re-cited", "citesLocator", "citationAnchorHTML", "referenceCitation", "A CITATION", "const CITATION = 1", "CitationAnchor", "citeRange", "CITED_LINES", "cite_x", "type CitesLocator", "_citation", "uncited", "miscited"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["a reference", "excited", "solicited", "recite", "incite", "explicit", "elicited", "specificity", "felicitation"]) expect(retiredWord(good), good).toBe(false);
});

test("retiredWord: an alert's names before, flash, notice and whisper, in any form an identifier takes; never a word that only contains the letters", () => {
  for (const bad of ["a flash", "Flashes", "data-flashes", "--flash", "flashLog", "liveFlashes", "FlashEntry", "the notice", "Notices", "noticeLedger", "takeNotice", "EntryNotices", "tabNotice", "whisper", "WHISPER_MS", "n.whisper", "it whispers", "whispering", "flashed"]) expect(retiredWord(bad), bad).toBe(true);
  for (const good of ["an alert", "a reader noticed", "flashy", "unnoticeable", "whisk"]) expect(retiredWord(good), good).toBe(false);
});

test("retiredWord: a dated plan's path keeps its words, the rest of its line still read", () => {
  expect(retiredWord("  docs/plans/2026-11-22-feat-notices-apart-plan.md (U5 took about four")).toBe(false);
  expect(retiredWord("docs/plans/2026-11-22-feat-notices-apart-plan.md, a flash")).toBe(true);
});

test("retiredAlertSense: an alert's kind or its area by the names before; never the words for an act refused or a strip of images", () => {
  for (const bad of ['kind: "refusal"', "[\"failure\", \"info\"]", "'passing'", "top: var(--strip-top, 0px)"]) expect(retiredAlertSense(bad), bad).toBe(true);
  for (const good of ["a refusal", "the store refuses", "L.refusal(name, fp)", "stripSheets(cases)", "a strip of the day's counts", "failures.push(x)"]) expect(retiredAlertSense(good), good).toBe(false);
});

// Milton's own preface to Samson Agonistes uses the verb.
const QUOTES_A_BOOK = new Set(["one-offs/miltonSamsonRun.ts", "tools/vocabulary.ts", "tools/vocabulary.test.ts"]);
// The alert log carries a log kept under its kinds' names before.
const READS_KINDS_BEFORE = new Set(["src/ui/alertLog.ts", "src/ui/alertLog.test.ts"]);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "out" || name === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
test("the app, its tools, its one-off scripts, CLAUDE.md and the glossary say reference and alert: no retired word anywhere", () => {
  const files = [...walk("src"), ...walk("tools"), ...walk("one-offs"), "CLAUDE.md", "GLOSSARY.md", "index.html"].filter((f) => !QUOTES_A_BOOK.has(f) && /\.(ts|mjs|svelte|html|css|sh|txt|md)$/.test(f));
  const retired = (f: string) => (t: string): boolean => retiredWord(t) || (!READS_KINDS_BEFORE.has(f) && retiredAlertSense(t));
  const found = files.flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((t, i) => (retired(f)(t) ? [f + ":" + (i + 1)] : [])));
  expect(found).toEqual([]);
});
