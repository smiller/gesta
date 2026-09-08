import { describe, it, expect } from "vitest";
import { sourceTab } from "./sourceKeys.ts";

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
