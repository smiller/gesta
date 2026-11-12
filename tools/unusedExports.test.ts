import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { exportsOf, unusedExports } from "./unusedExports.ts";

test("exportsOf: every declared form and a bare export list, never a re-export or a comment's word", () => {
  expect(exportsOf(`export function a() {}\nexport async function b() {}\nexport const c = 1;\nexport let d = 2;\nexport class E {}\nexport type F = 1;\nexport interface G {}\nexport { h, i as j };\nconst h = 1;\n  export const notTop = 1;\n/* export const k */\nexport { x } from "./y.ts";`).sort()).toEqual(["E", "F", "G", "a", "b", "c", "d", "h", "j"].sort());
});
test("unusedExports: used by an import, by a namespace, by a re-export, in its own file; unused when nobody takes it or only a test does", () => {
  const files = {
    "src/a.ts": `export function imported() {}\nexport function viaNamespace() {}\nexport function reExported() {}\nexport function ownUse() {}\nexport const local = ownUse();\nexport function testOnly() {}\nexport function nobody() {}\nexport function sameNameElsewhere() {}\nexport function aliased() {}`,
    "src/b.ts": `import { imported, aliased as other } from "./a.ts";\nimport * as A from "./a.ts";\nA.viaNamespace(); imported(); other();\nexport { reExported } from "./a.ts";\nexport const sameNameElsewhere = 1; console.log(sameNameElsewhere);`,
    "src/c.ts": `import type { reExported } from "./b.ts";\nlet r: reExported;`,
    "src/a.test.ts": `import { testOnly } from "./a.ts";\ntestOnly();`,
  };
  expect(unusedExports(files).map((u) => u.file + " " + u.name + " " + u.how).sort()).toEqual([
    "src/a.ts local nowhere", "src/a.ts nobody nowhere", "src/a.ts sameNameElsewhere nowhere", "src/a.ts testOnly tests only",
  ].sort());
});
const SKIPPED = new Set(["out", "node_modules", "expected"]);
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (SKIPPED.has(name)) return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
// A driver hands its adapter to the steps as a parameter named A.
const HANDED_TO_THE_STEPS = 'import * as A from "./adapters/successor.ts";\n';
const ALLOWED: Record<string, string> = {
  "src/editor/folds.ts toggleFold": "the tests' way in by a section's key to the toggle a click makes by its position",
  "src/store/indexStore.ts memIndexKeeper": "the tests' memory fake",
  "src/store/store.ts memBackupStore": "the tests' memory fake",
  "src/store/io.ts setYieldWatch": "the tests' watch on the backup yielding",
  "tools/unusedExports.ts unusedExports": "a checker's rule, run by its own test",
  "tools/vocabulary.ts retiredWord": "a checker's rule, run by its own test",
};
test("nothing in src/ or tools/ is exported that nothing uses", () => {
  const paths = [...walk("src"), ...walk("tools")].filter((f) => /\.(ts|mjs|svelte)$/.test(f));
  const files = Object.fromEntries(paths.map((p) => [p, readFileSync(p, "utf8")]));
  const steps = "tools/helium-steps.ts";
  files[steps] = HANDED_TO_THE_STEPS + files[steps];
  const found = unusedExports(files).map((u) => u.file + " " + u.name);
  expect(found.filter((f) => !ALLOWED[f])).toEqual([]);
  expect(Object.keys(ALLOWED).filter((f) => !found.includes(f))).toEqual([]);
});
