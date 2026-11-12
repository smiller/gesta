import { test, expect } from "vitest";
import { changedFiles, inScope, refusals, scoreOf, findingLines, cacheKey } from "./codeHealth.ts";

test("inScope: a TypeScript file under src/, its tests included, and a TypeScript or module script under tools/; not a component, a declaration, a tool's output or another directory", () => {
  expect(["src/a.ts", "src/x/b.test.ts", "src/ui/notices.svelte.ts", "tools/a.ts", "tools/a.test.ts", "tools/helium-steps.mjs", "tools/adapters/successor.mjs"].every(inScope)).toBe(true);
  expect(["src/ui/Search.svelte", "src/env.d.ts", "index.html", "src/a.tsx", "src/a.mjs", "tools/hooks-test.sh", "tools/out/x.ts", "tools/out/y.mjs", "hooks/a.ts", "docs/a.ts"].some(inScope)).toBe(false);
});

test("changedFiles: a modified, a new or an untracked file is measured against HEAD's copy of the same name, a renamed one against its old name, a deleted one not at all", () => {
  const status = "M\tsrc/a.ts\nA\tsrc/new.ts\nD\tsrc/gone.ts\nR096\tsrc/old.ts\tsrc/moved.ts\nM\tdocs/t.ts\nC100\tsrc/c.ts\tsrc/copy.ts\n";
  expect(changedFiles(status, ["src/untracked.test.ts", "src/Card.svelte"])).toEqual([
    { path: "src/a.ts", was: "src/a.ts" },
    { path: "src/new.ts", was: null },
    { path: "src/moved.ts", was: "src/old.ts" },
    { path: "src/copy.ts", was: null },
    { path: "src/untracked.test.ts", was: null },
  ]);
});

test("refusals: a score below HEAD's is refused, and so is a new file below 10; an equal or higher score passes", () => {
  const rows = [
    { path: "src/same.ts", before: 7.5, after: 7.5, findings: [] },
    { path: "src/up.ts", before: 7.5, after: 8.1, findings: [] },
    { path: "src/down.ts", before: 10, after: 9.68, findings: ["Complex Method · f · cc = 9"] },
    { path: "src/newGood.ts", before: null, after: 10, findings: [] },
    { path: "src/newBad.ts", before: null, after: 9.5, findings: ["Bumpy Road Ahead · g · bumps = 2"] },
  ];
  expect(refusals(rows).map((r) => r.path)).toEqual(["src/down.ts", "src/newBad.ts"]);
});

test("scoreOf: the CLI's score, and no scorable code reads as 10", () => {
  expect(scoreOf({ score: 8.09 })).toBe(8.09);
  expect(scoreOf({ score: null })).toBe(10);
  expect(scoreOf({})).toBe(10);
});

test("findingLines: one line per smell per function, the file-wide smells without a function", () => {
  const review = [
    { category: "Complex Method", functions: [{ title: "fenceBody", details: "cc = 16", "start-line": 131 }, { title: "opensFence", details: "cc = 9", "start-line": 103 }] },
    { category: "Primitive Obsession" },
  ];
  expect(findingLines(review)).toEqual([
    "Complex Method · fenceBody (line 131) · cc = 16",
    "Complex Method · opensFence (line 103) · cc = 9",
    "Primitive Obsession",
  ]);
});

test("cacheKey: changes with the text, the path, the rules and the CLI's version", () => {
  const base = cacheKey("text", "src/a.ts", "rules", "cs 1.0.58");
  expect(new Set([base, cacheKey("text2", "src/a.ts", "rules", "cs 1.0.58"), cacheKey("text", "src/b.ts", "rules", "cs 1.0.58"),
    cacheKey("text", "src/a.ts", "rules2", "cs 1.0.58"), cacheKey("text", "src/a.ts", "rules", "cs 1.0.59")]).size).toBe(5);
  expect(cacheKey("text", "src/a.ts", "rules", "cs 1.0.58")).toBe(base);
});
