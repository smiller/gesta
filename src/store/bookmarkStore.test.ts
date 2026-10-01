import { describe, it, expect } from "vitest";
import { bookmarkStore } from "./bookmarkStore.ts";

const KEY = "gesta.v1.bookmarks";
const row = (key: string, alias = "") => ({ key, alias });
const SEED = [row("page/A"), row("page/B")];

function world(initial?: string) {
  const box: Record<string, string> = {};
  if (initial !== undefined) box[KEY] = initial;
  let full = false, blocked = false;
  const storage = () => {
    if (blocked) throw new Error("SecurityError");
    return {
      getItem: (k: string) => box[k] ?? null,
      setItem: (k: string, v: string) => { if (full) throw new Error("QuotaExceededError"); box[k] = v; },
    };
  };
  const pins: string[] = [], released: number[] = [];
  let gen = 0;
  const store = () => bookmarkStore({
    seed: SEED, storage,
    pin: (text) => { pins.push(text); return ++gen; },
    release: (g) => { released.push(g); },
  });
  return { box, store, pins, released, fill: (on: boolean) => { full = on; }, block: (on: boolean) => { blocked = on; } };
}

describe("the load and the seed", () => {
  it("an absent key seeds the two pages once; an emptied list, written as [], is never seeded again", () => {
    const w = world();
    const s = w.store();
    expect(s.list()).toEqual(SEED);
    expect(JSON.parse(w.box[KEY])).toEqual(["page/A", "page/B"]);
    expect(s.write([])).toBe(true);
    expect(w.box[KEY]).toBe("[]");
    expect(w.store().list()).toEqual([]);
    expect(w.box[KEY]).toBe("[]");
  });
  it("a storage that cannot be reached reads as unreadable, seeds nothing, and refuses a write with a pin", () => {
    const w = world();
    w.block(true);
    const s = w.store();
    expect(s.unreadable()).toBe(true);
    expect(s.list()).toEqual([]);
    expect(s.write([row("page/C")])).toBe(false);
    expect(w.pins).toEqual(["bookmarks not saved"]);
    w.block(false);
    expect(KEY in w.box).toBe(false);
  });
});

describe("the latch", () => {
  it("text this app would not have written: empty here, every write refused and pinned, the text left as it was", () => {
    const w = world("not json");
    const s = w.store();
    expect(s.unreadable()).toBe(true);
    expect(s.list()).toEqual([]);
    expect(s.write([row("page/C")])).toBe(false);
    expect(w.pins).toEqual(["bookmarks not saved"]);
    expect(w.box[KEY]).toBe("not json");
  });
  it("the open re-reads a damaged list: repaired by hand, its rows show and a write lands", () => {
    const w = world("not json");
    const s = w.store();
    w.box[KEY] = '["page/C"]';
    s.open(null);
    expect(s.unreadable()).toBe(false);
    expect(s.list()).toEqual([row("page/C")]);
    expect(s.write([row("page/C"), row("page/D")])).toBe(true);
    expect(JSON.parse(w.box[KEY])).toEqual(["page/C", "page/D"]);
  });
  it("the open over a list still damaged keeps the latch", () => {
    const w = world("not json");
    const s = w.store();
    s.open(["page/C"]);
    expect(s.unreadable()).toBe(true);
    expect(w.box[KEY]).toBe("not json");
    expect(w.pins).toEqual([]);
  });
});

describe("the open", () => {
  it("re-reads the list: a row another window added shows, and the next write keeps it", () => {
    const w = world('["page/C"]');
    const s = w.store();
    w.box[KEY] = '["page/C", "page/D"]';
    s.open(null);
    expect(s.list()).toEqual([row("page/C"), row("page/D")]);
    expect(s.write([...s.list(), row("page/E")])).toBe(true);
    expect(JSON.parse(w.box[KEY])).toEqual(["page/C", "page/D", "page/E"]);
  });
  it("a list damaged since it read clean latches at the open", () => {
    const w = world('["page/C"]');
    const s = w.store();
    w.box[KEY] = "not json";
    s.open(null);
    expect(s.unreadable()).toBe(true);
    expect(s.write([row("page/C")])).toBe(false);
    expect(w.box[KEY]).toBe("not json");
  });
});

describe("the write", () => {
  it("a failed write pins and leaves the list as it was; the next landed write releases that pin", () => {
    const w = world('["page/C"]');
    const s = w.store();
    w.fill(true);
    expect(s.write([row("page/C"), row("page/D")])).toBe(false);
    expect(w.pins).toEqual(["bookmarks not saved"]);
    expect(s.list()).toEqual([row("page/C")]);
    w.fill(false);
    expect(s.write([row("page/C"), row("page/D")])).toBe(true);
    expect(w.released).toEqual([1]);
    expect(s.list()).toEqual([row("page/C"), row("page/D")]);
  });
  it("a write is read back: the list is what the storage holds", () => {
    const w = world("[]");
    const s = w.store();
    s.write([row("page/C", "cc")]);
    expect(w.box[KEY]).toBe('[{"key":"page/C","alias":"cc"}]');
    expect(s.list()).toEqual([row("page/C", "cc")]);
  });
});

describe("the sweep at the open", () => {
  it("rows that lead nowhere are dropped and written, only once the keys are known", () => {
    const w = world('["2020-01-01", "page/Gone", "page/Here"]');
    const s = w.store();
    s.open(null);
    expect(s.list().length).toBe(3);
    s.open(["page/Here"]);
    expect(s.list()).toEqual([row("2020-01-01"), row("page/Here")]);
    expect(JSON.parse(w.box[KEY])).toEqual(["2020-01-01", "page/Here"]);
  });
  it("a sweep that drops nothing writes nothing", () => {
    const w = world('["page/Here"]');
    const s = w.store();
    w.fill(true);
    s.open(["page/Here"]);
    expect(w.pins).toEqual([]);
  });
});
