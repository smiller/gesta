import { test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

test("every module under src/ is named in the layout", () => {
  const claude = readFileSync("docs/LAYOUT.md", "utf8");
  const modules = walk("src").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));
  expect(modules.length).toBeGreaterThan(0);
  expect(modules.filter((f) => !claude.includes(f.split("/").pop()!))).toEqual([]);
});
