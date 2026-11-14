import { describe, it, expect } from "vitest";
import { linkRuns, rewriteLinks, retargetLinks, relabelLinks } from "./links.ts";
import { parseMarkdown } from "../model/parse.ts";

describe("linkRuns", () => {
  it("one run per link, adjacent marks merged, text across emphasis kept", () => {
    const runs = linkRuns(parseMarkdown("See [the *essay*](#commonplace/B/E) and [x](https://x.org/).\n\n[again](#commonplace/B/E)"));
    expect(runs.map((r) => [r.href, r.text])).toEqual([["#commonplace/B/E", "the essay"], ["https://x.org/", "x"], ["#commonplace/B/E", "again"]]);
  });
});
describe("retargetLinks", () => {
  it("an address that names a place in the entry moves with it, or goes with it, keeping what it names", () => {
    const md = "[a](#bookshelf/A/One?line=7) and [b](#bookshelf/A/One?h=x) and [c](#bookshelf/A/Oneself?line=7).";
    expect(retargetLinks(md, { href: "#bookshelf/A/One", label: "One" }, { href: "#bookshelf/A/Two", label: "Two" }))
      .toBe("[a](#bookshelf/A/Two?line=7) and [b](#bookshelf/A/Two?h=x) and [c](#bookshelf/A/Oneself?line=7).");
    expect(retargetLinks(md, { href: "#bookshelf/A/One", label: "One" }, null)).toBe(" and  and [c](#bookshelf/A/Oneself?line=7).");
  });
  it("moves the href and a bare-name label; keeps a hand-written label; leaves other links alone", () => {
    const md = "Notes: [Ideas](#2026-09-07/Ideas) and [my thoughts](#2026-09-07/Ideas), [other](#2026-09-07/Other).";
    expect(retargetLinks(md, { href: "#2026-09-07/Ideas", label: "Ideas" }, { href: "#2026-09-07/Plans", label: "Plans" }))
      .toBe("Notes: [Plans](#2026-09-07/Plans) and [my thoughts](#2026-09-07/Plans), [other](#2026-09-07/Other).");
  });
  it("drops the links of a deleted entry, and an emptied paragraph with them; null when nothing pointed there", () => {
    const md = "Before.\n\n[Ideas](#2026-09-07/Ideas)\n\nAfter [Ideas](#2026-09-07/Ideas) here.";
    expect(retargetLinks(md, { href: "#2026-09-07/Ideas", label: "Ideas" }, null)).toBe("Before.\n\nAfter  here.");
    expect(retargetLinks(md, { href: "#nowhere", label: "x" }, null)).toBeNull();
  });
  it("a sub-entry's link is retargeted by its full hash", () => {
    expect(retargetLinks("- [1](#commonplace/Book/1)\n- [2](#commonplace/Book/2)", { href: "#commonplace/Book/1", label: "1" }, { href: "#commonplace/Book/One", label: "One" })).toBe("- [One](#commonplace/Book/One)\n- [2](#commonplace/Book/2)");
  });
});
describe("retargetLinks, a label's own marks", () => {
  it("keeps the marks inside a hand-written label when only the href moves", () => {
    expect(retargetLinks("See [the *Ideas* page](#2026-09-06/Ideas) and [**bold** and *it*](#2026-09-06/Ideas).", { href: "#2026-09-06/Ideas", label: "Ideas" }, { href: "#2026-09-06/Plans", label: "Plans" }))
      .toBe("See [the *Ideas* page](#2026-09-06/Plans) and [**bold** and *it*](#2026-09-06/Plans).");
  });
});
describe("relabelLinks", () => {
  it("relabels a minted label to the new heading, leaves a hand-written one, returns to the bare name when the heading goes", () => {
    const href = "#commonplace/Book/1";
    expect(relabelLinks("[1](#commonplace/Book/1) and [read this](#commonplace/Book/1)", href, "1", { was: "", now: "The Essay" })).toBe("[The Essay](#commonplace/Book/1) and [read this](#commonplace/Book/1)");
    expect(relabelLinks("[The Essay](#commonplace/Book/1)", href, "1", { was: "The Essay", now: "A New Title" })).toBe("[A New Title](#commonplace/Book/1)");
    expect(relabelLinks("[A New Title](#commonplace/Book/1)", href, "1", { was: "A New Title", now: "" })).toBe("[1](#commonplace/Book/1)");
    expect(relabelLinks("[1](#commonplace/Book/1)", href, "1", { was: "same", now: "same" })).toBeNull();
    expect(relabelLinks("[Title: a] b](#commonplace/Book/1)", href, "1", { was: "", now: "Title: a] b" })).toBeNull();
  });
});
describe("rewriteLinks", () => {
  it("returns null for an unparseable text, and keeps the surrounding markdown byte for byte", () => {
    expect(rewriteLinks("::: verse 1x\nno\n:::", () => ({ href: "#x" }))).toBeNull();
    const md = "# Title\n\n> quoted [a](#a) text\n\n::: verse\nline | [b](#b)\n:::\n";
    expect(rewriteLinks(md, (r) => ({ href: r.href + "2" }))).toBe("# Title\n\n> quoted [a](#a2) text\n\n::: verse\nline | [b](#b2)\n:::");
  });
});
