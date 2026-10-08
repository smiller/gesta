import { describe, expect, it } from "vitest";
import { matches, nearest, replaceAt, replaceEvery, countLabel, holds } from "./replace.ts";

describe("matches", () => {
  it("every place the characters stand, exactly, case counting", () => {
    expect(matches("a*-*b *-* c", "*-*")).toEqual([1, 6]);
    expect(matches("Milton milton", "milton")).toEqual([7]);
  });
  it("never overlapping: the next search starts after the match", () => {
    expect(matches("aaaa", "aa")).toEqual([0, 2]);
  });
  it("nothing for an empty query", () => {
    expect(matches("abc", "")).toEqual([]);
  });
});

describe("nearest", () => {
  it("the first match at or after a position, wrapping to the first", () => {
    expect(nearest([1, 6, 9], 0)).toBe(0);
    expect(nearest([1, 6, 9], 6)).toBe(1);
    expect(nearest([1, 6, 9], 7)).toBe(2);
    expect(nearest([1, 6, 9], 10)).toBe(0);
  });
  it("-1 when there is none", () => {
    expect(nearest([], 3)).toBe(-1);
  });
});

describe("replaceAt", () => {
  it("one match replaced, the caret after the replacement", () => {
    expect(replaceAt("a*-*b *-* c", 1, "*-*", "-")).toEqual({ text: "a-b *-* c", caret: 2 });
  });
});

describe("replaceEvery", () => {
  it("every match replaced, a kept place moved by the replacements before it", () => {
    expect(replaceEvery("a*-*b *-* c *-*", "*-*", "-", 6)).toEqual({ text: "a-b - c -", n: 3, caret: 4 });
  });
  it("a replacement holding the query is not replaced again", () => {
    expect(replaceEvery("x a x", "a", "aa", 0)).toEqual({ text: "x aa x", n: 1, caret: 0 });
  });
  it("none to replace leaves the text as it was", () => {
    expect(replaceEvery("abc", "z", "y", 1)).toEqual({ text: "abc", n: 0, caret: 1 });
  });
});

describe("countLabel", () => {
  it("nothing typed, none, the current of all, or a count after the text moved", () => {
    expect(countLabel("", 0, -1)).toBe("");
    expect(countLabel("*-*", 0, -1)).toBe("none");
    expect(countLabel("*-*", 7, 1)).toBe("2 of 7");
    expect(countLabel("*-*", 7, -1)).toBe("7 found");
  });
});

describe("holds", () => {
  it("whether the text still has the find at a match's offset: a keystroke not yet recounted moves it", () => {
    expect(holds("a*-*b", 1, "*-*")).toBe(true);
    expect(holds("xa*-*b", 1, "*-*")).toBe(false);
    expect(holds("a*-", 1, "*-*")).toBe(false);
  });
});
