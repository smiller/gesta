// The entry layer's contract, ported 2026-09-07 from
// ../writer/src/js/entries.test.mjs — the post-cutover cases, over the
// memory store and recording notices.
import { test, expect } from "vitest";
import { memEntryStore, staleWriteErr, type EntryStore, type MemEntryStore } from "./store.ts";
import { entryLayer, type EntryNotices } from "./entries.ts";

interface Calls { landed: string[]; removed: string[]; stuck: unknown[][]; stuckIdle: unknown[][] }
function fresh(over?: (s: MemEntryStore) => EntryStore) {
  const mem = memEntryStore();
  const calls: Calls = { landed: [], removed: [], stuck: [], stuckIdle: [] };
  const notices: EntryNotices = {
    landed: (k) => calls.landed.push(k),
    removed: (k) => calls.removed.push(k),
    stuck: (...a) => calls.stuck.push(a),
    stuckIdle: (...a) => calls.stuckIdle.push(a),
  };
  const layer = entryLayer(over ? over(mem) : mem, notices);
  return { layer, mem, calls };
}

test("entryMd is cache-only: empty on a miss, the cache's text on a hit", async () => {
  const { layer } = fresh();
  expect(layer.entryMd("2026-01-01")).toBe("");
  await layer.setEntry("2026-01-01", "a");
  expect(layer.entryMd("2026-01-01")).toBe("a");
});

test("setEntry writes the cache synchronously and the store durably", async () => {
  const { layer, mem, calls } = fresh();
  const p = layer.setEntry("2026-01-01", "a");
  expect(layer.cache["2026-01-01"]).toBe("a");
  await p;
  expect((await mem.get("2026-01-01"))!.md).toBe("a");
  expect(calls.landed).toEqual(["2026-01-01"]);
});

test("removeEntry clears the cache, bumps the counter, and clears every debt", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("2026-01-01", "a");
  const seqBefore = layer.saveSeq["2026-01-01"] || 0;
  await layer.removeEntry("2026-01-01");
  expect(layer.saveSeq["2026-01-01"]).toBe(seqBefore + 1);
  expect("2026-01-01" in layer.cache).toBe(false);
  expect(calls.removed).toEqual(["2026-01-01"]);
  expect(await mem.get("2026-01-01")).toBe(null);
});

test("persistEntry serializes one key's ops, and one failure doesn't wedge the chain", async () => {
  const { layer } = fresh();
  const order: string[] = [];
  let releaseFirst!: () => void;
  const first = new Promise<void>((r) => { releaseFirst = r; });
  layer.persistEntry("k", () => first.then(() => { order.push("first"); throw new Error("boom"); }));
  const second = layer.persistEntry("k", () => { order.push("second"); return Promise.resolve(); });
  releaseFirst();
  await second;
  expect(order).toEqual(["first", "second"]);
});

test("persistEntry rejection sticks keyed and releases nothing; only a landing releases", async () => {
  const { layer, calls } = fresh();
  await layer.persistEntry("k", () => Promise.reject(new Error("idb blocked")));
  expect(calls.stuck.length).toBe(1);
  expect(calls.stuck[0][0]).toBe("not saved");
  expect(calls.stuck[0][2]).toBe("k");
  expect(calls.landed).toEqual([]);
  await layer.persistEntry("k", () => Promise.resolve());
  expect(calls.landed).toEqual(["k"]);
});

test("a stale write restores the cache and offers the refused text for copying", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "mine");
  await mem.foreignSet("k", "theirs");
  await layer.setEntry("k", "mine edited");
  expect(layer.cache.k).toBe("theirs");
  const stick = calls.stuck[calls.stuck.length - 1];
  expect(stick[0]).toMatch(/not saved — changed in another tab/);
  expect(stick[3]).toBe("mine edited");
});

test("a stale delete restores the cache and reports as not deleted", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "mine");
  await mem.foreignSet("k", "theirs");
  await layer.removeEntry("k");
  expect(layer.cache.k).toBe("theirs");
  expect(calls.stuck[calls.stuck.length - 1][0]).toMatch(/not deleted — changed in another tab/);
});

test("a stale restore is guarded by the counter: a removal in between wins", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "mine");
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  // the write is refused as stale after the removal has retired the entry
  const p = layer.persistEntry("k", () => gate.then(() => { throw staleWriteErr("theirs", "mine edited"); }));
  const removed = layer.removeEntry("k");   // bumps the counter, clears the cache
  release();
  await Promise.all([p, removed]);
  expect("k" in layer.cache).toBe(false);   // the stale arm did not land "theirs" again
  expect(await mem.get("k")).toBe(null);
  expect(calls.stuck[0][0]).toMatch(/changed in another tab/);
});

test("a plain rejected delete reports unkeyed and idle-deferred, never into the ledger", async () => {
  const { layer, calls } = fresh((mem) => ({ ...mem, del: () => Promise.reject(new Error("blocked")) }));
  await layer.setEntry("k", "a");
  await layer.removeEntry("k");
  expect(calls.stuckIdle.length).toBe(1);
  expect(calls.stuckIdle[0][0]).toMatch(/couldn't delete/);
  expect(calls.stuck.length).toBe(0);
});

test("warm seeds the cache from the store, additively", async () => {
  const { layer, mem } = fresh();
  await mem.foreignSet("2026-01-01", "a");
  await mem.foreignSet("2026-01-02", "b");
  layer.cache["2026-01-02"] = "typed already";
  await layer.warm();
  expect(layer.warmed).toBe(true);
  expect(layer.cache["2026-01-01"]).toBe("a");
  expect(layer.cache["2026-01-02"]).toBe("typed already");
});

test("warm: a read failure leaves the cache empty and holds the real error; the next warm clears it", async () => {
  let fail = true;
  const { layer, mem } = fresh((mem) => ({ ...mem, all: () => fail ? Promise.reject(new Error("blocked")) : mem.all() }));
  await mem.foreignSet("2026-01-01", "a");
  await layer.warm();
  expect(layer.storeReadFailed).toBe(true);
  expect(layer.storeReadError).toBeInstanceOf(Error);
  expect(layer.warmed).toBe(false);
  expect(Object.keys(layer.cache)).toEqual([]);
  fail = false;
  await layer.warm();
  expect(layer.storeReadFailed).toBe(false);
  expect(layer.storeReadError).toBe(null);
  expect(layer.warmed).toBe(true);
  expect(layer.cache["2026-01-01"]).toBe("a");
});

test("a warm's read bases every key, so a foreign write after it is refused", async () => {
  const { layer, mem, calls } = fresh();
  await layer.warm();
  await mem.foreignSet("k", "theirs");
  await layer.setEntry("k", "mine");
  expect(layer.cache.k).toBe("theirs");
  expect(calls.stuck[0][0]).toMatch(/changed in another tab/);
});

test("primeEntry seeds one row and says so; an absent or blank row seeds nothing", async () => {
  const { layer, mem } = fresh();
  await mem.foreignSet("2026-01-01", "a");
  await mem.foreignSet("2026-01-02", "");
  expect(await layer.primeEntry("2026-01-01")).toBe(true);
  expect(layer.cache["2026-01-01"]).toBe("a");
  expect(await layer.primeEntry("2026-01-02")).toBe(false);
  expect("2026-01-02" in layer.cache).toBe(false);
  expect(await layer.primeEntry("2026-01-03")).toBe(false);
  expect("2026-01-03" in layer.cache).toBe(false);
});

test("primeEntry leaves a warm cache alone with no I/O at all", async () => {
  let reads = 0;
  const { layer } = fresh((mem) => ({ ...mem, get: (k) => { reads++; return mem.get(k); } }));
  layer.cache["2026-01-01"] = "warm";
  expect(await layer.primeEntry("2026-01-01")).toBe(false);
  expect(reads).toBe(0);
  expect(layer.cache["2026-01-01"]).toBe("warm");
});

test("primeEntry loses the race to warm: the warm value stays, and the caller hears false", async () => {
  const { layer, mem } = fresh();
  await mem.foreignSet("2026-01-01", "stale row");
  const p = layer.primeEntry("2026-01-01");
  layer.cache["2026-01-01"] = "warm won";
  expect(await p).toBe(false);
  expect(layer.cache["2026-01-01"]).toBe("warm won");
});
