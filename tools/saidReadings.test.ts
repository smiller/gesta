import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* A HELIUM READING OF WHAT THE PAGE SAID GOES THROUGH ONE OWNER, WHAT WAS
   SAID SINCE THE STEP'S MARK: an info, a success or a warning
   leaves the corner on the clock, so a reading of the live alerts reads
   the run's load (21 such readings before this rule; one read "grid"
   otherwise in an order run), and what was said before the mark is an
   earlier step's. Live alerts are read only where their showing is the
   point, each place with its count and reason; the said log and its mark
   only in their OWNERS. */
type Reads = { corner: number; fade: number; live: number; said: number };
const ALLOWED: Record<string, Reads & { why: string }> = {
  "adapters/app.ts": { corner: 1, fade: 0, live: 2, said: 0, why: "the screen line, whose corner the verdict scrubs; and an error standing, read twice, which no clock removes" },
  "steps/launch.ts": { corner: 0, fade: 6, live: 0, said: 0, why: "the launch's fade and pill, read under the page's own clock" },
  "steps/alerts.ts": { corner: 0, fade: 0, live: 1, said: 0, why: "where each standing alert is drawn, in a section about the alerts' layout" },
  "steps/references.ts": { corner: 0, fade: 0, live: 1, said: 0, why: "a wait for no error to stand" },
  "steps/kit.ts": { corner: 0, fade: 0, live: 2, said: 0, why: "a wait for the info and success alerts to be gone before a point is measured, their height moving the text, and what stood when it ran out" },
};
const count = (text: string, re: RegExp): number => text.match(re)?.length ?? 0;
const readingsOf = (text: string): Reads => ({ corner: count(text, /__corner\(\)/g), fade: count(text, /\bR\.corner\(/g), live: count(text, /dataset\.alerts\b|__published\("alerts"\)/g), said: count(text, /dataset\.saidLog\b|__published\("saidLog"\)|__saidMark\b/g) });
const OWNERS = new Set(["inPage.ts", "said.ts"]);
const filesUnder = (dir: string): string[] => readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !OWNERS.has(f));

describe("a Helium reading of what was said", () => {
  it("counts the live alerts read through the corner, its fade and the published attribute, and the said log or its mark read directly; a reading through the module is none of them", () => {
    expect(readingsOf("a(window.__corner()); b(await R.corner(page)); c(document.documentElement.dataset.alerts); d(dataset.saidLog); e(window.__saidMark); f(await said(page))")).toEqual({ corner: 1, fade: 1, live: 1, said: 2 });
  });
  it("reads live alerts only where their showing is the point, and the said log only in its owners", () => {
    const found = ["steps", "adapters"].flatMap((d) => filesUnder(join("tools", d)).map((f) => [d + "/" + f, readingsOf(readFileSync(join("tools", d, f), "utf8"))] as const))
      .filter(([, n]) => n.corner + n.fade + n.live + n.said > 0);
    expect(Object.fromEntries(found)).toEqual(Object.fromEntries(Object.entries(ALLOWED).map(([f, { why: _why, ...n }]) => [f, n])));
  });
});
