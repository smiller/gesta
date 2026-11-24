import { describe, it, expect } from "vitest";
import { saidSince } from "./said.ts";

const log = (n: number, texts: string[]) => ({ n, recent: texts.map((text, i) => ({ n: n - texts.length + 1 + i, text })) });

describe("what was said since the mark", () => {
  it("is nothing where nothing was said after it", () => {
    expect(saidSince(log(3, ["a", "b", "c"]), 3)).toBe("");
    expect(saidSince({ n: 0, recent: [] }, 0)).toBe("");
  });
  it("is each thing said after the mark, oldest first, joined", () => {
    expect(saidSince(log(3, ["a", "b", "c"]), 1)).toBe("b · c");
  });
  it("opens with … where more was said after the mark than the page keeps", () => {
    expect(saidSince(log(10, ["c", "d", "e", "f", "g", "h", "i", "j"]), 0)).toBe("… c · d · e · f · g · h · i · j");
    expect(saidSince(log(10, ["c", "d", "e", "f", "g", "h", "i", "j"]), 2)).toBe("c · d · e · f · g · h · i · j");
  });
});
