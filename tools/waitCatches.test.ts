import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const CALL = /\b(wait\w*|selectionMoved)\(/g, SWALLOW = /^\s*\.catch\(\(\)\s*=>\s*(?:\{\s*\}|undefined|null|false)\)/;
const QUOTES = new Set(['"', "'", "`"]), DEPTH: Record<string, number> = { "(": 1, ")": -1 };
function stringEnd(text: string, i: number): number {
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === "\\") j++;
    else if (text[j] === text[i]) return j;
  }
  return text.length;
}
/* where the call opened at `from` closes, its parentheses counted outside strings */
function closing(text: string, from: number): number {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (QUOTES.has(text[i])) { i = stringEnd(text, i); continue; }
    depth += DEPTH[text[i]] ?? 0;
    if (depth === 0) return i;
  }
  return text.length;
}
/* a wait whose failure a catch swallows, wherever its statement runs over lines */
function swallowedWaits(text: string): string[] {
  return [...text.matchAll(CALL)].filter((m) => SWALLOW.test(text.slice(closing(text, m.index + m[0].length - 1) + 1))).map((m) => text.slice(0, m.index).split("\n").length + ": " + m[1]);
}
/* each wait allowed to swallow its failure, with why: none yet */
const ALLOWED: Record<string, string> = {};
const files = ["tools/steps", "tools/adapters"].flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).map((f) => d + "/" + f));

test("a swallowed wait is found however its statement is laid out, and a wait that says why it failed is not", () => {
  expect(swallowedWaits('await A.waitEntry(page, "x", 5000).catch(() => {});')).toEqual(["1: waitEntry"]);
  expect(swallowedWaits("a;\nawait page.waitForFunction(() => {\n  return 1;\n}, null, { timeout: 5 })\n  .catch(() => undefined);")).toEqual(["2: waitForFunction"]);
  expect(swallowedWaits('await page.waitForSelector(s).catch(() => console.log("why"));')).toEqual([]);
  expect(swallowedWaits("await page.click(s).catch(() => {});")).toEqual([]);
});

test("no wait in the steps or their adapters swallows its failure: it goes through the wait module, which says so", () => {
  const found = files.flatMap((f) => swallowedWaits(readFileSync(f, "utf8")).map((s) => f + ":" + s)).filter((s) => !(s in ALLOWED));
  expect(found).toEqual([]);
});
