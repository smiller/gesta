import { describe, it, expect } from "vitest";
import { searchIndex, indexOrder } from "./searchIndex.ts";

describe("indexOrder", () => {
  it("keyed namespaces first by name, then the days newest first with their tags after each", () => {
    const keys = ["2020-01-02", "2020-01-02/b", "2020-01-02/a", "2020-01-03", "page/Zed", "page/Books/2", "page/Books", "page/Books/10", "bookshelf/Dante", "2019-12-31/lone"];
    expect(indexOrder(keys)).toEqual(["page/Books", "page/Books/2", "page/Books/10", "page/Zed", "bookshelf/Dante", "2020-01-03", "2020-01-02", "2020-01-02/a", "2020-01-02/b", "2019-12-31/lone"]);
  });
});
describe("searchIndex", () => {
  it("rows over the non-blank entries, flattened once and reused until the text moves", () => {
    const cache: Record<string, string> = { "2020-01-01": "One", "2020-01-02": "Two", "page/P": "  ", "page/Q": "Cap İ" };
    let flattens = 0;
    const idx = searchIndex(cache, (md) => { flattens++; return md.trim(); });
    expect(idx.rows()).toEqual([
      { date: "page", tag: "Q", text: "Cap İ", lower: "cap i" },
      { date: "2020-01-02", tag: null, text: "Two", lower: "two" },
      { date: "2020-01-01", tag: null, text: "One", lower: "one" },
    ]);
    expect(flattens).toBe(3);
    idx.rows();
    expect(flattens).toBe(3);
    cache["2020-01-01"] = "One edited";
    expect(idx.rows()[2].text).toBe("One edited");
    expect(flattens).toBe(4);
    delete cache["2020-01-02"];
    expect(idx.rows().length).toBe(2);
  });
  it("the chunked build stops at its deadline and resumes, and rows() then hits the memo", () => {
    const cache: Record<string, string> = {};
    for (let i = 0; i < 10; i++) cache["2020-01-" + String(i + 10)] = "entry " + i;
    let clock = 0, flattens = 0;
    const idx = searchIndex(cache, (md) => { flattens++; clock += 1; return md; }, () => clock);
    expect(idx.complete).toBe(false);
    expect(idx.step(3)).toEqual({ done: 3, total: 10 });
    expect(idx.complete).toBe(false);
    expect(idx.step(100)).toEqual({ done: 10, total: 10 });
    expect(idx.complete).toBe(true);
    expect(flattens).toBe(10);
    idx.rows();
    expect(flattens).toBe(10);
  });
});
