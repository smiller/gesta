import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? (/(^|\/)out$/.test(p) ? [] : walk(p)) : [p]; });
/* a file of tools/ or one-offs/ named in the text, its output and another repository's aside */
const NAMED = /(?<![\w-])(?<![\w-]\/)(?:tools|one-offs)\/(?!out\/)[\w./-]*\w\.(?:ts|mjs|sh|json|txt)\b/g;
/* a test's paths are its data */
const TEST = /\.test\.ts$|hooks-test\.sh$/;

test("every tools/ and one-offs/ file the code, the scripts, the hooks and CLAUDE.md name is there", () => {
  const texts = [...walk("src"), ...walk("tools"), ...walk("one-offs")].filter((f) => /\.(ts|mjs|sh|svelte)$/.test(f) && !TEST.test(f))
    .concat("CLAUDE.md", "package.json", ".claude/settings.json", ...walk("hooks").filter((f) => !TEST.test(f)));
  const missing = texts.flatMap((f) => [...readFileSync(f, "utf8").matchAll(NAMED)].map((m) => m[0]).filter((p) => !existsSync(p)).map((p) => f + ": " + p));
  expect([...new Set(missing)]).toEqual([]);
});
