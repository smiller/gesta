import { describe, it, expect } from "vitest";
import { linkRuns, rewriteLinks, retargetLinks, relabelLinks } from "./links.ts";
import { parseMarkdown } from "../model/parse.ts";

describe("linkRuns", () => {
  it("one run per link, adjacent marks merged, text across emphasis kept", () => {
    const runs = linkRuns(parseMarkdown("See [the *essay*](#page/B/E) and [x](https://x.org/).\n\n[again](#page/B/E)"));
    expect(runs.map((r) => [r.href, r.text])).toEqual([["#page/B/E", "the essay"], ["https://x.org/", "x"], ["#page/B/E", "again"]]);
  });
});
describe("retargetLinks", () => {
  it("moves the href and a bare-name label; keeps a hand-written label; leaves other links alone", () => {
    const md = "Notes: [Ideas](#2026-09-07/Ideas) and [my thoughts](#2026-09-07/Ideas), [other](#2026-09-07/Other).";
    expect(retargetLinks(md, "#2026-09-07/Ideas", "#2026-09-07/Plans", "Ideas", "Plans"))
      .toBe("Notes: [Plans](#2026-09-07/Plans) and [my thoughts](#2026-09-07/Plans), [other](#2026-09-07/Other).");
  });
  it("drops the links of a deleted entry, and an emptied paragraph with them; null when nothing pointed there", () => {
    const md = "Before.\n\n[Ideas](#2026-09-07/Ideas)\n\nAfter [Ideas](#2026-09-07/Ideas) here.";
    expect(retargetLinks(md, "#2026-09-07/Ideas", null, "Ideas", null)).toBe("Before.\n\nAfter  here.");
    expect(retargetLinks(md, "#nowhere", null, "x", null)).toBeNull();
  });
  it("a sub-page's link is retargeted by its full hash", () => {
    expect(retargetLinks("- [1](#page/Book/1)\n- [2](#page/Book/2)", "#page/Book/1", "#page/Book/One", "1", "One")).toBe("- [One](#page/Book/One)\n- [2](#page/Book/2)");
  });
});
describe("relabelLinks", () => {
  it("relabels a minted label to the new heading, leaves a hand-written one, returns to the bare name when the heading goes", () => {
    const href = "#page/Book/1";
    expect(relabelLinks("[1](#page/Book/1) and [read this](#page/Book/1)", href, "1", "", "The Essay")).toBe("[The Essay](#page/Book/1) and [read this](#page/Book/1)");
    expect(relabelLinks("[The Essay](#page/Book/1)", href, "1", "The Essay", "A New Title")).toBe("[A New Title](#page/Book/1)");
    expect(relabelLinks("[A New Title](#page/Book/1)", href, "1", "A New Title", "")).toBe("[1](#page/Book/1)");
    expect(relabelLinks("[1](#page/Book/1)", href, "1", "same", "same")).toBeNull();
    expect(relabelLinks("[Title: a] b](#page/Book/1)", href, "1", "", "Title: a] b")).toBeNull();
  });
});
describe("rewriteLinks", () => {
  it("returns null for an unparseable text, and keeps the surrounding markdown byte for byte", () => {
    expect(rewriteLinks("::: verse 1x\nno\n:::", () => ({ href: "#x" }))).toBeNull();
    const md = "# Title\n\n> quoted [a](#a) text\n\n::: verse\nline | [b](#b)\n:::\n";
    expect(rewriteLinks(md, (r) => ({ href: r.href + "2" }))).toBe("# Title\n\n> quoted [a](#a2) text\n\n::: verse\nline | [b](#b2)\n:::");
  });
});
