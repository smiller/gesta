import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* A HELIUM READING OF WHAT THE PAGE SAID READS `__said`, NOT THE CORNER:
   an info, a success or a warning leaves the corner on the clock, so a
   reading of the corner's words reads the run's load (21 such readings
   before this rule; one read "grid" otherwise in an order run). The
   corner is read only where its showing is the point, each place with
   its count and reason. */
const ALLOWED: Record<string, { corner: number; fade: number; why: string }> = {
  "adapters/app.ts": { corner: 1, fade: 0, why: "the screen line, whose corner the verdict scrubs" },
  "steps/launch.ts": { corner: 0, fade: 5, why: "the launch's fade and pill, read under the page's own clock" },
};
const count = (text: string, re: RegExp): number => text.match(re)?.length ?? 0;
const readingsOf = (text: string): { corner: number; fade: number } => ({ corner: count(text, /__corner\(\)/g), fade: count(text, /\bR\.corner\(/g) });
const filesUnder = (dir: string): string[] => readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

describe("a Helium reading of what was said", () => {
  it("counts the corner's words read directly and through the corner's reading", () => {
    expect(readingsOf("a(window.__corner()); b(await R.corner(page)); c(window.__said())")).toEqual({ corner: 1, fade: 1 });
  });
  it("reads the corner only where its showing is the point", () => {
    const found = ["steps", "adapters"].flatMap((d) => filesUnder(join("tools", d)).map((f) => [d + "/" + f, readingsOf(readFileSync(join("tools", d, f), "utf8"))] as const))
      .filter(([, n]) => n.corner + n.fade > 0);
    expect(Object.fromEntries(found)).toEqual(Object.fromEntries(Object.entries(ALLOWED).map(([f, a]) => [f, { corner: a.corner, fade: a.fade }])));
  });
});
