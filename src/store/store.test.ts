// The memory adapter, the wrappers and the entry ledger, ported 2026-09-07
// from ../writer/src/js/store.test.mjs; the stored text is markdown here.
// The adapter contract and the entry store run over BOTH adapters — the
// memory one and Dexie over fake-indexeddb — so the fake cannot be green
// where the shipped store is not.
import "fake-indexeddb/auto";
import { test, expect, describe } from "vitest";
import {
  baseLedger, staleWriteErr, isStale, memKeyedStore, dexieKeyedStore, entryStoreOver,
  memEntryStore, memBackupStore, memImageStore,
  ENTRY_DB, IMG_DB, BACKUP_DB,
  type KeyedStore, type EntryStore, type EntryRow,
} from "./store.ts";

interface Row { k: string; n?: number; x?: number }
const stale = (err: unknown) => { expect(isStale(err)).toBe(true); return true; };
/* a fresh database per store, so no test reads another's rows */
let dbs = 0;
const adapters: [string, <R extends object>(keyField: keyof R & string) => KeyedStore<R>][] = [
  ["mem", (keyField) => memKeyedStore(keyField)],
  ["dexie", (keyField) => dexieKeyedStore("test." + (++dbs), "rows", keyField)],
];
/* an entry store and the "other tab" beside it: over Dexie the other tab is
   a SECOND connection to the same database, as it is live */
interface Tabs { s: EntryStore; foreign(key: string, md: string): Promise<void> }
const entryStores: [string, () => Tabs][] = [
  ["mem", () => { const m = memEntryStore(); return { s: m, foreign: m.foreignSet }; }],
  ["dexie", () => {
    const name = "test.entries." + (++dbs);
    const other = dexieKeyedStore<EntryRow>(name, "entries", "key");
    return { s: entryStoreOver(dexieKeyedStore<EntryRow>(name, "entries", "key")),
             foreign: (key, md) => other.put({ key, md }) };
  }],
];

test("the database names sit outside page750.*", () => {
  for (const n of [ENTRY_DB, IMG_DB, BACKUP_DB]) expect(n.startsWith("page750")).toBe(false);
});

describe.each(adapters)("keyed store over %s", (_name, make) => {
test("records cross the boundary as copies, both directions", async () => {
  const s = make<Row>("k");
  const rec: Row = { k: "a", n: 1 };
  await s.put(rec);
  rec.n = 999;
  expect((await s.get("a"))!.n).toBe(1);
  const out = (await s.get("a"))!;
  out.n = 888;
  expect((await s.get("a"))!.n).toBe(1);
});

test("all() is ascending-key copies", async () => {
  const s = make<Row>("k");
  await s.put({ k: "b" });
  await s.put({ k: "a" });
  const rows = await s.all();
  expect(rows.map((r) => r.k)).toEqual(["a", "b"]);
  rows[0].x = 1;
  expect((await s.get("a"))!.x).toBe(undefined);
});

test("a rekeyed put lands under the record's own key, as keyPath files it", async () => {
  const s = make<Row>("k");
  await s.put({ k: "a", n: 1 });
  await s.update("a", () => ({ put: { k: "b", n: 2 } }));
  expect((await s.get("b"))!.n).toBe(2);
  expect((await s.get("a"))!.n).toBe(1);
});

test("a throwing decide becomes a rejection carrying the thrown error", async () => {
  const s = make<Row>("k");
  const boom = new Error("corrupt record");
  await expect(s.update("a", () => { throw boom; })).rejects.toBe(boom);
});

test("a record without its key field is refused, as keyPath refuses it", async () => {
  const s = make<Row>("k");
  await expect(s.put({ n: 1 } as unknown as Row)).rejects.toMatchObject({ name: "DataError" });
  expect(await s.get("undefined")).toBe(null);
  await s.put({ k: "a", n: 1 });
  await expect(s.update("a", () => ({ put: { n: 2 } as unknown as Row }))).rejects.toMatchObject({ name: "DataError" });
  expect((await s.get("a"))!.n).toBe(1);
});

test("update carries out put, del, and verdict-only decisions", async () => {
  const s = make<Row>("k");
  await s.put({ k: "a", n: 1 });
  let verdict = await s.update("a", (row) => ({ put: { k: "a", n: row!.n! + 1 } }));
  expect(verdict!.put!.n).toBe(2);
  expect((await s.get("a"))!.n).toBe(2);
  // decide's row is a copy: mutating it writes nothing
  await s.update("a", (row) => { row!.n = 777; return null; });
  expect((await s.get("a"))!.n).toBe(2);
  verdict = await s.update("a", () => ({ refuse: "no" }));
  expect(verdict!.refuse).toBe("no");
  expect((await s.get("a"))!.n).toBe(2);
  await s.update("a", () => ({ del: true }));
  expect(await s.get("a")).toBe(null);
  verdict = await s.update("a", (row) => ({ sawNull: row === null }));
  expect(verdict!.sawNull).toBe(true);
});
});

test("memEntryStore: foreignSet hands back the adapter's promise", async () => {
  const s = memEntryStore();
  const p = s.foreignSet("k", "theirs");
  expect(typeof p.then).toBe("function");
  await p;
  expect((await s.get("k"))!.md).toBe("theirs");
});

test("staleWriteErr is a marked refusal carrying both texts", () => {
  const err = staleWriteErr("winner", "loser");
  expect(err.stale).toBe(true);
  expect(err.stored).toBe("winner");
  expect(err.refused).toBe("loser");
  expect(err).toBeInstanceOf(Error);
  expect(isStale(err)).toBe(true);
  expect(isStale(new Error("quota"))).toBe(false);
});

test("baseLedger: saw is first-wins, wrote overwrites, forget clears", () => {
  const b = baseLedger();
  b.saw("k", "first");
  b.saw("k", "second");
  expect(b.base("k")).toBe("first");
  b.wrote("k", "third");
  expect(b.base("k")).toBe("third");
  b.forget("k");
  expect(b.base("k")).toBe(null);
});

test("baseLedger: unseen is null before sawAll, empty-string after", () => {
  const b = baseLedger();
  expect(b.base("never")).toBe(null);
  b.sawAll();
  expect(b.base("never")).toBe("");
});

describe.each(entryStores)("entry store over %s", (_name, open) => {
test("a write with no base lands unjudged", async () => {
  const { s, foreign } = open();
  await s.set("2026-01-01", "a");
  expect(await s.get("2026-01-01")).toEqual({ key: "2026-01-01", md: "a" });
});

test("a write on a moved base is refused, not landed", async () => {
  const { s, foreign } = open();
  await s.set("k", "mine");
  await foreign("k", "theirs");
  await expect(s.set("k", "mine edited")).rejects.toMatchObject({ stale: true, stored: "theirs", refused: "mine edited" });
  expect((await s.get("k"))!.md).toBe("theirs");
});

test("get on a missing key bases it, so a foreign fill refuses", async () => {
  const { s, foreign } = open();
  expect(await s.get("k")).toBe(null);
  await foreign("k", "theirs");
  await expect(s.set("k", "mine")).rejects.toSatisfy(stale);
});

test("all() bases every key, known-absent included", async () => {
  const { s, foreign } = open();
  await s.all();
  await foreign("k", "theirs");
  await expect(s.set("k", "mine")).rejects.toSatisfy(stale);
});

test("del is judged like a write", async () => {
  const { s, foreign } = open();
  await s.set("k", "mine");
  await foreign("k", "theirs");
  await expect(s.del("k")).rejects.toMatchObject({ stale: true, stored: "theirs", refused: "" });
  expect((await s.get("k"))!.md).toBe("theirs");
});

test("del forgets the base, and a re-set lands", async () => {
  const { s, foreign } = open();
  await s.set("k", "mine");
  await s.del("k");
  expect(await s.get("k")).toBe(null);
  await s.set("k", "again");
  expect((await s.get("k"))!.md).toBe("again");
});

test("a landed write moves the base, so the same handle continues", async () => {
  const { s, foreign } = open();
  await s.get("k");
  await s.set("k", "one");
  await s.set("k", "two");
  expect((await s.get("k"))!.md).toBe("two");
});

test("all() is ascending-key fresh copies", async () => {
  const { s, foreign } = open();
  await s.set("b", "2");
  await s.set("a", "1");
  const rows = await s.all();
  expect(rows.map((r) => r.key)).toEqual(["a", "b"]);
  rows[0].md = "mutated";
  expect((await s.get("a"))!.md).toBe("1");
});
});

test("memImageStore: keyed rows, null on a miss", async () => {
  const s = memImageStore();
  expect(await s.get("h1")).toBe(null);
  await s.set("h1", "data:x");
  expect(await s.get("h1")).toEqual({ id: "h1", data: "data:x" });
});

const dir = (name: string) => ({ name }) as unknown as FileSystemDirectoryHandle;

test("memBackupStore: repointing the handle drops manifest and archives", async () => {
  const s = memBackupStore();
  expect(await s.get()).toBe(null);
  await s.set(dir("dir"));
  await s.setManifest({ "a.md": 1 });
  await s.setArchives({ journal: "sig" });
  expect(await s.getManifest()).toEqual({ "a.md": 1 });
  expect(await s.getArchives()).toEqual({ journal: "sig" });
  await s.set(dir("other"));
  expect(await s.getManifest()).toBe(null);
  expect(await s.getArchives()).toBe(null);
});

test("memBackupStore: a slot with no record to ride on is dropped", async () => {
  const s = memBackupStore();
  await s.setManifest({ "a.md": 1 });
  expect(await s.getManifest()).toBe(null);
});

test("memBackupStore: reads hand out copies, not the stored object", async () => {
  const s = memBackupStore();
  await s.set(dir("dir"));
  await s.setManifest({ "a.md": 1 });
  const m = (await s.getManifest())!;
  m["a.md"] = 999;
  expect(await s.getManifest()).toEqual({ "a.md": 1 });
});
