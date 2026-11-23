import { describe, it, expect } from "vitest";
import { dealt, merged, shardTrailer } from "./heliumShards.ts";

const block = (name: string, ...lines: string[]) => ["== " + name, ...lines].map((l) => l + "\n").join("");

describe("the verdict's sections in several windows", () => {
  it("deals the sections in turn, window k taking every n-th from the k-th", () => {
    expect(dealt(["a", "b", "c", "d", "e"], [0, 2])).toEqual(["a", "c", "e"]);
    expect(dealt(["a", "b", "c", "d", "e"], [1, 2])).toEqual(["b", "d"]);
  });
  it("merges the windows' runs into the one window's, the console lines in the sections' order", () => {
    const one = block("a", "a1") + block("b", "b1") + block("c", "c1") + "console: error: in a\nerror: in c\n";
    const w0 = block("a", "a1") + block("c", "c1") + shardTrailer([["error: in a"], ["error: in c"]]);
    const w1 = block("b", "b1") + shardTrailer([[]]);
    expect(merged([w0, w1])).toBe(one);
  });
  it("says nothing printed in the console when no window's page printed", () => {
    expect(merged([block("a") + shardTrailer([[]]), block("b") + shardTrailer([[]])])).toBe(block("a") + block("b") + "console: (nothing)\n");
  });
  it("keeps the sections of a window cut short before its console lines", () => {
    const w0 = block("a", "a1"), w1 = block("b") + shardTrailer([[]]);
    expect(merged([w0, w1])).toBe(block("a", "a1") + block("b") + "console: (nothing)\n");
  });
});
