import { describe, it, expect } from "vitest";
import { searchIndex, indexOrder, fingerprint } from "./searchIndex.ts";
import { memIndexKeeper } from "./indexStore.ts";

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
  it("an entry whose flatten throws is indexed as its raw source, and the build carries on", () => {
    const cache: Record<string, string> = { "2020-01-01": "fine", "page/Bad": "::: grid\nbad\n:::" };
    const idx = searchIndex(cache, (md) => { if (md.includes("bad")) throw new Error("a grid holds only cards"); return md; });
    expect(idx.rows().map((r) => r.text)).toEqual(["::: grid\nbad\n:::", "fine"]);
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
describe("indexOrder over a journal-sized key set", () => {
  it("orders 13,600 keys in one pass, and rows() reuses the order while the key set stands", () => {
    const keys: string[] = [];
    for (let i = 0; i < 7600; i++) { const d = String(2000 + Math.floor(i / 336)) + "-" + String(1 + Math.floor((i % 336) / 28)).padStart(2, "0") + "-" + String(1 + (i % 28)).padStart(2, "0"); keys.push(d + (i % 3 ? "" : "/x" + i)); }
    for (let i = 0; i < 6000; i++) keys.push((i % 2 ? "page/P" : "bookshelf/B") + (i % 7) + "/" + i);
    const t0 = performance.now();
    const order = indexOrder(keys);
    const ms = performance.now() - t0;
    expect(order.length).toBe(keys.length);
    expect(ms).toBeLessThan(100);
    const cache: Record<string, string> = {};
    for (const k of keys) cache[k] = "t";
    const idx = searchIndex(cache, (md) => md);
    idx.rows();
    const t1 = performance.now();
    idx.rows();
    expect(performance.now() - t1).toBeLessThan(50);
  });
});

describe("the index kept between launches", () => {
  it("a fingerprint is the text's own: equal texts alike, a one-letter change and a reordering apart", () => {
    expect(fingerprint("In principio")).toBe(fingerprint("In principio"));
    expect(fingerprint("In principio")).not.toBe(fingerprint("In principiO"));
    expect(fingerprint("ab")).not.toBe(fingerprint("ba"));
  });
  it("an entry whose fingerprint is known takes its kept text unparsed; a changed or new one is parsed and reported made", () => {
    const cache: Record<string, string> = { "page/A": "alpha", "page/B": "beta changed", "page/C": "gamma" };
    let flattens = 0;
    const idx = searchIndex(cache, (md) => { flattens++; return md.toUpperCase(); });
    idx.know({ "page/A": { sig: fingerprint("alpha"), text: "KEPT ALPHA" }, "page/B": { sig: fingerprint("beta"), text: "OLD BETA" }, "page/Gone": { sig: "x", text: "gone" } });
    while (!idx.complete) idx.step(Infinity);
    expect(idx.rows().map((r) => r.text)).toEqual(["KEPT ALPHA", "BETA CHANGED", "GAMMA"]);
    expect(flattens).toBe(2);
    expect(idx.made()).toEqual([{ k: "page/B", sig: fingerprint("beta changed"), text: "BETA CHANGED" }, { k: "page/C", sig: fingerprint("gamma"), text: "GAMMA" }]);
    expect(idx.made()).toEqual([]);
    expect(idx.stale()).toEqual(["page/Gone"]);
    expect(idx.stale()).toEqual([]);
  });
  it("a kept text made by another parser is parsed again; an entry edited twice is kept once, as it now stands", () => {
    const cache: Record<string, string> = { "page/A": "alpha" };
    let flattens = 0;
    const idx = searchIndex(cache, (md) => { flattens++; return md.toUpperCase(); }, undefined, "parser-2");
    idx.know({ "page/A": { sig: "parser-1:" + fingerprint("alpha"), text: "OLD" } });
    while (!idx.complete) idx.step(Infinity);
    expect(idx.rows()[0].text).toBe("ALPHA");
    cache["page/A"] = "alpha one"; idx.rows();
    cache["page/A"] = "alpha two"; idx.rows();
    expect(idx.made()).toEqual([{ k: "page/A", sig: "parser-2:" + fingerprint("alpha two"), text: "ALPHA TWO" }]);
    expect(flattens).toBe(3);
  });
  it("the memory keeper keeps what is saved, and drops what is dropped", async () => {
    const keep = memIndexKeeper();
    await keep.save([{ k: "page/A", sig: "1", text: "a" }, { k: "page/B", sig: "2", text: "b" }]);
    await keep.drop(["page/B"]);
    expect(await keep.load()).toEqual({ "page/A": { sig: "1", text: "a" } });
  });
});
