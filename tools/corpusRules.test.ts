import { describe, expect, it } from "vitest";
import { deeperHeadings } from "./corpusRules.ts";

describe("deeperHeadings", () => {
  it("drops the marker the old parser kept as text before each heading this app made", () => {
    expect(deeperHeadings("Sickness. ### Meditation Variable", [{ level: 3, text: "Meditation" }]))
      .toEqual({ text: "Sickness. Meditation Variable", n: 1 });
  });

  it("matches the marker's depth, in document order, each heading once", () => {
    const cur = "#### A x ### A y ### B";
    expect(deeperHeadings(cur, [{ level: 4, text: "A" }, { level: 3, text: "B" }]))
      .toEqual({ text: "A x ### A y B", n: 2 });
  });

  it("leaves a marker no heading accounts for", () => {
    expect(deeperHeadings("a ### b", [])).toEqual({ text: "a ### b", n: 0 });
    expect(deeperHeadings("a ### b", [{ level: 3, text: "c" }])).toEqual({ text: "a ### b", n: 0 });
  });

  it("reads a heading's text collapsed, as the comparison does", () => {
    expect(deeperHeadings("x ### a b y", [{ level: 3, text: "a\n b" }])).toEqual({ text: "x a b y", n: 1 });
  });
});
