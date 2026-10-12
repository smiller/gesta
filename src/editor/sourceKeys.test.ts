import { describe, it, expect } from "vitest";
import { sourceTab, sourceTyped } from "./sourceKeys.ts";

describe("sourceTab", () => {
  it("a collapsed Tab inserts two spaces; Shift-Tab takes up to two back, or is left alone", () => {
    expect(sourceTab("ab", 1, 1, false)).toEqual({ value: "a  b", start: 3, end: 3 });
    expect(sourceTab("a   b", 4, 4, true)).toEqual({ value: "a b", start: 2, end: 2 });
    expect(sourceTab("a b", 2, 2, true)).toEqual({ value: "ab", start: 1, end: 1 });
    expect(sourceTab("ab", 1, 1, true)).toBeNull();
  });
  it("a selection shifts every line it touches, stays selected, and an end at a line start leaves that line", () => {
    const v = "one\ntwo\nthree\nfour";
    expect(sourceTab(v, 5, 9, false)).toEqual({ value: "one\n  two\n  three\nfour", start: 4, end: 17 });
    expect(sourceTab(v, 5, 8, false)).toEqual({ value: "one\n  two\nthree\nfour", start: 4, end: 9 });
    expect(sourceTab("  one\n two\nthree", 0, 16, true)).toEqual({ value: "one\ntwo\nthree", start: 0, end: 13 });
  });
  it("an empty line gains nothing, and a selection that moved nothing says why", () => {
    expect(sourceTab("a\n\nb", 0, 4, false)).toEqual({ value: "  a\n\n  b", start: 0, end: 8 });
    expect(sourceTab("\n\n", 0, 2, false)).toEqual({ refuse: "nothing to indent — those lines are empty" });
    expect(sourceTab("a\nb", 0, 3, true)).toEqual({ refuse: "no spaces to remove" });
  });
});

describe("sourceTyped", () => {
  /* the text with the character just typed at the caret's left */
  const typedIn = (before: string, after = ""): string => {
    const value = before + after, r = sourceTyped(value, before.length);
    return r ? value.slice(0, r.from) + r.text + value.slice(r.to) : value;
  };
  it("a -- between spaces becomes a dash, and straight quotes curl, as in the rendered view", () => {
    expect(typedIn("a -- ")).toBe("a — ");
    expect(typedIn("x \"")).toBe("x “");
    expect(typedIn("x “b\"")).toBe("x “b”");
    expect(typedIn("it'")).toBe("it’");
    expect(typedIn("\n'")).toBe("\n‘");
    expect(typedIn("x ”\"")).toBe("x \"");
  });
  it("code is left alone: a fenced block, and an inline code span", () => {
    expect(typedIn("```\nx \"")).toBe("```\nx \"");
    expect(typedIn("see `a -- ")).toBe("see `a -- ");
    expect(typedIn("```\ncode\n```\nx \"")).toBe("```\ncode\n```\nx “");
  });
  it("a link's address and title, and a bare address, are left alone; prose after a closed link curls", () => {
    expect(typedIn("[x](#page/O'")).toBe("[x](#page/O'");
    expect(typedIn("[a](http://x \"")).toBe("[a](http://x \"");
    expect(typedIn("see https://x.org/a'")).toBe("see https://x.org/a'");
    expect(typedIn("see <https://x.org/a -- ")).toBe("see <https://x.org/a -- ");
    expect(typedIn("[x](#a) and \"")).toBe("[x](#a) and “");
  });
});
