import { test, expect } from "vitest";
import { memEntryStore, staleWriteErr, type EntryStore, type MemEntryStore } from "./store.ts";
import { entryLayer, type EntryNotices } from "./entries.ts";

interface Calls { landed: string[]; removed: string[]; stuck: unknown[][]; stuckIdle: unknown[][]; announced: string[]; onLanded: string[] }
function fresh(over?: (s: MemEntryStore) => EntryStore) {
  const mem = memEntryStore();
  const calls: Calls = { landed: [], removed: [], stuck: [], stuckIdle: [], announced: [], onLanded: [] };
  const notices: EntryNotices = {
    landed: (k) => calls.landed.push(k),
    removed: (k) => calls.removed.push(k),
    stuck: (...a) => calls.stuck.push(a),
    stuckIdle: (...a) => calls.stuckIdle.push(a),
  };
  const layer = entryLayer(over ? over(mem) : mem, notices, { announce: (k) => calls.announced.push(k), onLanded: (k) => calls.onLanded.push(k) });
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
  expect(await layer.persistEntry("k", () => Promise.reject(new Error("idb blocked")))).toBe(false);
  expect(calls.stuck.length).toBe(1);
  expect(calls.stuck[0][0]).toBe("not saved");
  expect(calls.stuck[0][2]).toBe("k");
  expect(calls.landed).toEqual([]);
  expect(await layer.persistEntry("k", () => Promise.resolve())).toBe(true);
  expect(calls.landed).toEqual(["k"]);
});

test("clear empties the cache and the store", async () => {
  const { layer, mem } = fresh();
  await layer.setEntry("k", "a");
  await layer.clear();
  expect(Object.keys(layer.cache)).toEqual([]);
  expect(await mem.all()).toEqual([]);
  expect(await layer.setEntry("k", "b")).toBe(true);
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

test("storedKeys reads the store's keys, the cache untouched", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await mem.foreignSet("page/Elsewhere", "theirs");
  expect(await layer.storedKeys()).toEqual(["page/Elsewhere"]);
  expect("page/Elsewhere" in layer.cache).toBe(false);
});

test("primeEntry waits for the key's pending ops: an entry removed here is not read back while its delete is in flight", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await layer.setEntry("page/Gone", "old text");
  const removed = layer.removeEntry("page/Gone");
  expect(await layer.primeEntry("page/Gone")).toBe(false);
  await removed;
  expect("page/Gone" in layer.cache).toBe(false);
  expect(await mem.get("page/Gone")).toBe(null);
});

test("a landed write and a landed delete are announced to the other tabs; a refused one is not", async () => {
  const { layer, mem, calls } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "a");
  await layer.removeEntry("page/A");
  await mem.foreignSet("page/B", "theirs");
  await layer.setEntry("page/B", "mine");
  expect(calls.announced).toEqual(["page/A", "page/A"]);
});

test("a landed write and a landed delete are told to onLanded, which arms the folder backup; a refused one is not", async () => {
  const { layer, mem, calls } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "a");
  await layer.removeEntry("page/A");
  await mem.foreignSet("page/B", "theirs");
  await layer.setEntry("page/B", "mine");
  expect(calls.onLanded).toEqual(["page/A", "page/A"]);
});

test("a notice takes the stored row into the cache and the base: a save after it lands", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "mine");
  await mem.foreignSet("page/A", "theirs");
  expect(await layer.takeNotice("page/A")).toBe(true);
  expect(layer.cache["page/A"]).toBe("theirs");
  expect(await layer.setEntry("page/A", "theirs, then mine")).toBe(true);
  await mem.foreignSet("page/New", "made there");
  expect(await layer.takeNotice("page/New")).toBe(true);
  expect(layer.cache["page/New"]).toBe("made there");
});

test("a notice of a delete takes the key out of the cache; an empty row stays, a registration", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await layer.setEntry("page/Gone", "old");
  await layer.setEntry("2026-09-06/Ideas", "");
  await mem.del("page/Gone");
  expect(await layer.takeNotice("page/Gone")).toBe(true);
  expect("page/Gone" in layer.cache).toBe(false);
  expect(await layer.takeNotice("2026-09-06/Ideas")).toBe(false);
  expect("2026-09-06/Ideas" in layer.cache).toBe(true);
});

test("a notice is skipped for a key whose own write has not landed: its text is the only copy", async () => {
  let fail = true;
  const { layer, mem } = fresh((m) => ({ ...m, set: (k, md) => fail ? Promise.reject(new Error("QuotaExceededError")) : m.set(k, md) }));
  await layer.warm();
  await layer.setEntry("page/A", "unsaved");
  await mem.foreignSet("page/A", "theirs");
  expect(await layer.takeNotice("page/A")).toBe(false);
  expect(layer.cache["page/A"]).toBe("unsaved");
  fail = false;
});

test("a notice waits for the key's queued ops, and is skipped when this tab wrote or removed the key meanwhile", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "one");
  await mem.foreignSet("page/A", "theirs");
  const taken = layer.takeNotice("page/A");
  layer.setEntry("page/A", "mine, newer");
  expect(await taken).toBe(false);
  expect(layer.cache["page/A"]).toBe("mine, newer");
  await layer.setEntry("page/B", "b");
  const removed = layer.removeEntry("page/B");
  expect(await layer.takeNotice("page/B")).toBe(false);
  await removed;
  expect("page/B" in layer.cache).toBe(false);
});

test("a notice the caller declines leaves the cache and the base: a save after it is refused", async () => {
  const { layer, mem } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "mine");
  await mem.foreignSet("page/A", "theirs");
  let offered: string | null | undefined;
  expect(await layer.takeNotice("page/A", (md) => { offered = md; return false; })).toBe(false);
  expect(offered).toBe("theirs");
  expect(layer.cache["page/A"]).toBe("mine");
  expect(await layer.setEntry("page/A", "mine, edited")).toBe(false);
});

test("a notice before the warm is taken once the warm lands", async () => {
  const { layer, mem } = fresh();
  const taken = layer.takeNotice("page/A");
  await mem.foreignSet("page/A", "theirs");
  await layer.warm();
  expect(await taken).toBe(false);
  expect(layer.cache["page/A"]).toBe("theirs");
});

test("a save refused as stale makes the key owed: another tab's notice is skipped and its debts kept, the refused text living in the pin", async () => {
  const { layer, mem, calls } = fresh();
  await layer.warm();
  await layer.setEntry("page/A", "mine");
  await mem.foreignSet("page/A", "theirs");
  expect(await layer.setEntry("page/A", "mine, edited")).toBe(false);
  await mem.foreignSet("page/A", "theirs again");
  expect(await layer.takeNotice("page/A")).toBe(false);
  expect(calls.removed).toEqual([]);
});

test("a notice when the warm could not read the store resolves false, not never", async () => {
  const { layer } = fresh((m) => ({ ...m, all: () => Promise.reject(new Error("blocked")) }));
  const taken = layer.takeNotice("page/A");
  await layer.warm();
  expect(await taken).toBe(false);
});

const retarget = (md: string): string | null => md.includes("#old") ? md.replace(/#old/g, "#new") : null;
test("rewriteEntry lands an edit over the cache's text, and writes nothing when the edit changes nothing", async () => {
  const { layer, mem } = fresh();
  await layer.setEntry("k", "a [x](#old)");
  expect(await layer.rewriteEntry("k", retarget)).toBe("landed");
  expect((await mem.get("k"))!.md).toBe("a [x](#new)");
  expect(await layer.rewriteEntry("k", retarget)).toBe("unchanged");
});

test("rewriteEntry refused as stale is redone ONCE over the stored text, with no notice stuck", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "a [x](#old)");
  await mem.foreignSet("k", "theirs [x](#old)");
  expect(await layer.rewriteEntry("k", retarget)).toBe("landed");
  expect(layer.cache.k).toBe("theirs [x](#new)");
  expect((await mem.get("k"))!.md).toBe("theirs [x](#new)");
  expect(calls.stuck).toEqual([]);
  expect(await layer.rewriteEntry("k", retarget)).toBe("unchanged");
});

test("rewriteEntry over a stored text the edit leaves alone is unchanged, the cache on the stored text", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "a [x](#old)");
  await mem.foreignSet("k", "theirs, the link gone");
  expect(await layer.rewriteEntry("k", retarget)).toBe("unchanged");
  expect(layer.cache.k).toBe("theirs, the link gone");
  expect(calls.stuck).toEqual([]);
  await layer.setEntry("k", "mine after");
  expect((await mem.get("k"))!.md).toBe("mine after");
});

test("rewriteEntry refused twice, or failing outright, answers failed and says so", async () => {
  let n = 0;
  const twice = fresh((mem) => ({ ...mem, set: async (k, md) => { await mem.foreignSet(k, "theirs " + ++n + " [x](#old)"); return mem.set(k, md); } }));
  await twice.mem.foreignSet("k", "a [x](#old)");
  await twice.layer.warm();
  expect(await twice.layer.rewriteEntry("k", retarget)).toBe("failed");
  expect(twice.layer.cache.k).toBe("theirs 2 [x](#old)");
  expect(twice.calls.stuck[0][0]).toMatch(/not saved — changed in another tab/);
  const broken = fresh((mem) => ({ ...mem, set: () => Promise.reject(new Error("quota")) }));
  await broken.mem.foreignSet("k", "a [x](#old)");
  await broken.layer.warm();
  expect(await broken.layer.rewriteEntry("k", retarget)).toBe("failed");
});

test("rewriteEntry leaves a key whose own save was refused, its rescue pin standing", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "mine");
  await mem.foreignSet("k", "theirs [x](#old)");
  await layer.setEntry("k", "mine edited");
  const landed = calls.landed.length;
  expect(await layer.rewriteEntry("k", retarget)).toBe("failed");
  expect((await mem.get("k"))!.md).toBe("theirs [x](#old)");
  expect(calls.landed.length).toBe(landed);
});

test("rewriteEntry refused over a row deleted elsewhere drops the key from the cache, as a delete taken does", async () => {
  const { layer, mem, calls } = fresh();
  await layer.setEntry("k", "a [x](#old)");
  await mem.foreignDel("k");
  expect(await layer.rewriteEntry("k", retarget)).toBe("unchanged");
  expect("k" in layer.cache).toBe(false);
  expect(calls.removed).toContain("k");
  expect(await mem.get("k")).toBeNull();
  expect(calls.landed.filter((k) => k === "k").length).toBe(1);
  expect(calls.announced.filter((k) => k === "k").length).toBe(1);
});
