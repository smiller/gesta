import { describe, expect, it } from "vitest";
import { deeperHeadings, spanningEmphasis } from "./corpusRules.ts";

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

describe("spanningEmphasis", () => {
  it("drops the delimiters the old parser kept as text round a run that crosses a line", () => {
    expect(spanningEmphasis("Fête *All my love, Caia* .2021", [{ mark: "em", text: "All my love,\nCaia" }]))
      .toEqual({ text: "Fête All my love, Caia .2021", n: 1 });
    expect(spanningEmphasis("x __bold across__ y", [{ mark: "strong", text: "bold\nacross" }]))
      .toEqual({ text: "x bold across y", n: 1 });
  });

  it("takes a run's own delimiters only: a strong run never matches single stars", () => {
    expect(spanningEmphasis("*a b*", [{ mark: "strong", text: "a\nb" }])).toEqual({ text: "*a b*", n: 0 });
  });

  it("peels a run both strong and emphasised, in either order", () => {
    const runs = [{ mark: "em" as const, text: "a\nb" }, { mark: "strong" as const, text: "a\nb" }];
    expect(spanningEmphasis("***a b***", runs)).toEqual({ text: "a b", n: 2 });
    expect(spanningEmphasis("***a b***", [...runs].reverse())).toEqual({ text: "a b", n: 2 });
  });
});
