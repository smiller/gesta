/* Each domain store is spelled ONCE over whichever adapter it is handed, so
   the fake the suite runs is the same domain code as the store the app
   ships. The IndexedDB adapter is Dexie's, not hand-rolled: a cached handle,
   the reopen after a close, the blocked open and a versionchange from
   another tab were four measured failures of a hand-rolled one, and Dexie 4
   answers each (auto-open, a close on versionchange, a reopen on the next
   access). Names sit OUTSIDE page750.* (pin: store.test › the database names
   sit outside page750.*) */
import Dexie, { type Table } from "dexie";

/* THE ADAPTER CONTRACT, five calls every adapter answers identically:
   get(key)→record|null, put(record), del(key), all()→ascending-key records,
   and update(key, decide) — the read-decide-write primitive. `decide` runs
   SYNCHRONOUSLY on the record as stored and returns {put: record}, {del:
   true}, any other value to carry out as a verdict with nothing written, or
   null for a no-op — put and del are RESERVED names. `decide` is invoked
   exactly once, and one that THROWS rejects the update with its own error,
   nothing written. A record missing its key field is refused with a
   DataError, as keyPath semantics demand. The promise resolves only once the
   write has LANDED. Records cross the boundary as one-level copies, so a
   NESTED value rides as a shared reference — a wrapper that hands one out
   takes its own copy (pin: store.test › keyed store over) */
export interface Verdict<R> { put?: R; del?: boolean; [k: string]: unknown }
export type Decide<R> = (row: R | null) => Verdict<R> | null;
export interface KeyedStore<R extends object> {
  get(key: string): Promise<R | null>;
  put(record: R): Promise<void>;
  del(key: string): Promise<void>;
  all(): Promise<R[]>;
  keys(): Promise<string[]>;
  update(key: string, decide: Decide<R>): Promise<Verdict<R> | null>;
  clear(): Promise<void>;
}
export function memKeyedStore<R extends object>(keyField: keyof R & string): KeyedStore<R> {
  const rows: Record<string, R> = Object.create(null);
  /* one level, not deep: the suite's fake directory handles carry methods,
     which structured clone refuses (pin: store.test › records cross the
     boundary as copies, both directions) */
  function copyOf(rec: R | undefined | null): R | null {
    if (!rec) return null;
    return { ...rec };
  }
  /* refused as keyPath refuses it, so a malformed record cannot be green here
     and a DataError live (pin: store.test › a record without its key field is
     refused) */
  function keyOf(record: R): string {
    const k = record[keyField];
    if (k === undefined) {
      const e = new Error("record lacks its key field '" + keyField + "'");
      e.name = "DataError";
      throw e;
    }
    return String(k);
  }
  return {
    get: (key) => Promise.resolve(copyOf(rows[key])),
    put: (record) => {
      try { rows[keyOf(record)] = { ...record }; } catch (e) { return Promise.reject(e); }
      return Promise.resolve();
    },
    del: (key) => { delete rows[key]; return Promise.resolve(); },
    /* ascending-key order, as IndexedDB's getAll, so a warm test cannot pass
       here and order differently live (pin: store.test › all() is
       ascending-key copies) */
    all: () => Promise.resolve(Object.keys(rows).sort().map((k) => ({ ...rows[k] }))),
    keys: () => Promise.resolve(Object.keys(rows).sort()),
    update: (key, decide) => {
      let verdict: Verdict<R> | null;
      try {
        verdict = decide(copyOf(rows[key]));
        if (verdict && verdict.put) rows[keyOf(verdict.put)] = { ...verdict.put };
        else if (verdict && verdict.del) delete rows[key];
      } catch (e) { return Promise.reject(e); }
      return Promise.resolve(verdict);
    },
    clear: () => { for (const k of Object.keys(rows)) delete rows[k]; return Promise.resolve(); },
  };
}

/* `update` is one readwrite transaction holding the read and the write: the
   engine serializes overlapping readwrite transactions on a store, so a
   second tab's decide reads the winner's record. A decide's own throw aborts
   the transaction, nothing written (pin: store.test › a throwing decide
   becomes a rejection carrying the thrown error) */
export function dexieKeyedStore<R extends object>(dbName: string, storeName: string, keyField: keyof R & string): KeyedStore<R> {
  const db = new Dexie(dbName);
  db.version(1).stores({ [storeName]: keyField });
  const table: Table<R, string> = db.table(storeName);
  return {
    get: (key) => table.get(key).then((row) => row ?? null),
    put: (record) => table.put(record).then(() => {}),
    del: (key) => table.delete(key),
    all: () => table.toArray(),
    keys: () => table.toCollection().primaryKeys(),
    update: (key, decide) => db.transaction("rw", table, async () => {
      const verdict = decide((await table.get(key)) ?? null);
      if (verdict && verdict.put) await table.put(verdict.put);
      else if (verdict && verdict.del) await table.delete(key);
      return verdict;
    }),
    clear: () => table.clear(),
  };
}

export const IMG_DB = "gesta.images";
export const IMG_STORE = "images";
/* a picture is its BYTES under the path its entry's markdown names it by —
   `page/Trip Log/Trip Log-img-1.webp` — so the ref in the text stays as
   written (pin: importFiles.test › a picture the import files is found where
   the entry looks) */
export interface ImageRow { id: string; bytes: Uint8Array }
export interface ImageStore {
  get(id: string): Promise<ImageRow | null>;
  set(id: string, bytes: Uint8Array): Promise<void>;
  clear(): Promise<void>;
}
export function imageStoreOver(store: KeyedStore<ImageRow>): ImageStore {
  return {
    get: (id) => store.get(id),
    set: (id, bytes) => store.put({ id, bytes }),
    clear: () => store.clear(),
  };
}
export function idbImageStore(): ImageStore { return imageStoreOver(dexieKeyedStore<ImageRow>(IMG_DB, IMG_STORE, "id")); }
export function memImageStore(): ImageStore { return imageStoreOver(memKeyedStore<ImageRow>("id")); }

export const ENTRY_DB = "gesta.entries";
export const ENTRY_STORE = "entries";
/* the stored text is MARKDOWN: export is then a file write, and the corpus
   round trip is the storage format */
export interface EntryRow { key: string; md: string }
/* THE REFUSAL A STALE TAB GETS: without it, an entry standing at 21,144
   characters was replaced by a 6,920-character copy from another tab and
   edited forward from it all day. MARKED rather than left to its message: a
   quota or a dead handle is worth retrying, and this one is not — only a
   reload clears it (pin: store.test › staleWriteErr is a marked refusal
   carrying both texts) */
export interface StaleWriteError extends Error { stale: true; stored: string; refused: string }
export function staleWriteErr(stored: string, refused: string): StaleWriteError {
  const err = new Error("entry changed in another tab") as StaleWriteError;
  err.stale = true;
  err.stored = stored;
  err.refused = refused;
  return err;
}
export function isStale(err: unknown): err is StaleWriteError {
  return !!err && typeof err === "object" && (err as StaleWriteError).stale === true;
}
/* WHAT ONE HANDLE HAS SEEN, and so what a write from it may land on. One
   ledger per store object, one per tab, the unit the refusal is about.
   `unseen` is the base a key with no entry gets: "" once the whole store has
   been read (an absent key is then KNOWN absent), null before one (nothing
   to judge by, and writes go through unjudged). FIRST-WINS: the base has to
   be the text the cache holds, since the screen was built from the cache
   and the next write is rebuilt from the screen — seeded last-wins, a warm
   and a prime read racing a foreign write leave the cache on the old text
   and the base on the new, and a write built on the old one lands. Sharing
   the cache's strings also holds the memory flat (pin: store.test ›
   baseLedger: saw is first-wins) */
export interface BaseLedger {
  saw(key: string, text: string): void;
  sawAll(): void;
  wrote(key: string, text: string): void;
  forget(key: string): void;
  base(key: string): string | null;
}
export function baseLedger(): BaseLedger {
  const seen: Record<string, string> = Object.create(null);
  let unseen: string | null = null;
  return {
    saw: (key, text) => { if (!(key in seen)) seen[key] = text; },
    sawAll: () => { unseen = ""; },
    wrote: (key, text) => { seen[key] = text; },
    forget: (key) => { delete seen[key]; },
    base: (key) => (key in seen) ? seen[key] : unseen,
  };
}
export interface EntryStore {
  get(key: string): Promise<EntryRow | null>;
  set(key: string, md: string): Promise<void>;
  del(key: string): Promise<void>;
  all(): Promise<EntryRow[]>;
  keys(): Promise<string[]>;
  reread(key: string): Promise<EntryRow | null>;
  clear(): Promise<void>;
}
export function entryStoreOver(store: KeyedStore<EntryRow>): EntryStore {
  let bases = baseLedger();
  /* one spelling for a write and a delete, since both destroy what they land
     on. With NO base the read is skipped entirely (pin: store.test › a write
     with no base lands unjudged). The ledger
     is only touched after the verdict settles: a base recorded ahead of the
     store refuses every later write to that key for the session, turning one
     transient failure into a permanent notice blaming a tab that does not
     exist. TWO OBLIGATIONS ride on the caller: await get/all before writing
     (an unawaited read writes unjudged), and serialize same-key writes from
     ONE handle (two in flight and the second is refused as if foreign). */
  function judged(key: string, record: EntryRow | null): Promise<void> {
    const base = bases.base(key);
    if (base === null) return record ? store.put(record) : store.del(key);
    return store.update(key, (row) => {
      const stored = row ? row.md : "";
      if (stored !== base) return { refuse: staleWriteErr(stored, record ? record.md : "") };
      return record ? { put: record } : { del: true };
    }).then((verdict) => {
      if (verdict && verdict.refuse) throw verdict.refuse;
    });
  }
  return {
    get: (key) => store.get(key).then((row) => {
      bases.saw(key, row ? row.md : "");
      return row;
    }),
    set: (key, md) => judged(key, { key, md }).then(() => { bases.wrote(key, md); }),
    /* A DELETE IS JUDGED LIKE A WRITE, because it destroys more: a rename
       writes the entry under its new name and clears the old key, so an
       unguarded delete there drops text this tab never saw (pin: store.test ›
       del is judged like a write) */
    del: (key) => judged(key, null).then(() => { bases.forget(key); }),
    all: () => store.all().then((rows) => {
      for (const row of rows) bases.saw(row.key, row.md);
      bases.sawAll();
      return rows;
    }),
    /* the keys alone BASE NOTHING: a key another tab filled after the whole
       read stays based at "", so a blank write from here over it is still
       refused (pin: store.test › keys() bases nothing) */
    keys: () => store.keys(),
    /* get's first-wins kept the text this handle first saw; a reread
       replaces it, the caller's copy being replaced by the same text
       (pin: store.test › reread() takes the stored text as the new base) */
    reread: (key) => store.get(key).then((row) => {
      bases.wrote(key, row ? row.md : "");
      return row;
    }),
    /* a store emptied is KNOWN empty: every key based at "", or the old bases
       would refuse the first write after (pin: store.test › clear empties the
       store and the ledger) */
    clear: () => store.clear().then(() => { bases = baseLedger(); bases.sawAll(); }),
  };
}
export interface MemEntryStore extends EntryStore {
  /* a second tab's write: it lands in the rows without this handle seeing it */
  foreignSet(key: string, md: string): Promise<void>;
}
export function idbEntryStore(): EntryStore { return entryStoreOver(dexieKeyedStore<EntryRow>(ENTRY_DB, ENTRY_STORE, "key")); }
export function memEntryStore(): MemEntryStore {
  const adapter = memKeyedStore<EntryRow>("key");
  return { ...entryStoreOver(adapter), foreignSet: (key, md) => adapter.put({ key, md }) };
}

/* The folder handle carries no permission — every launch re-checks
   queryPermission — so this answers "which folder", never "may I write" */
export const BACKUP_DB = "gesta.backup";
export const BACKUP_STORE = "handle";
export const BACKUP_KEY = "dir";
export type Slot = Record<string, unknown>;
export interface BackupRow { k: string; handle: FileSystemDirectoryHandle; manifest?: Slot | null; archives?: Slot | null }
export interface BackupStore {
  get(): Promise<FileSystemDirectoryHandle | null>;
  set(handle: FileSystemDirectoryHandle | null): Promise<void>;
  getManifest(): Promise<Slot | null>;
  setManifest(m: Slot | null): Promise<void>;
  getArchives(): Promise<Slot | null>;
  setArchives(a: Slot | null): Promise<void>;
}
export function backupStoreOver(store: KeyedStore<BackupRow>): BackupStore {
  /* a copy, so an abandoned run cannot mutate the store through what it was
     handed (pin: store.test › memBackupStore: reads hand out copies) */
  function slot(field: "manifest" | "archives"): Promise<Slot | null> {
    return store.get(BACKUP_KEY).then((row) => {
      const v = row && row[field];
      return v ? { ...v } : null;
    });
  }
  /* the manifest and the archived-root signatures ride in the HANDLE'S OWN
     RECORD, so they need no clearing anywhere: each describes one folder, and
     a new folder writes this record fresh (pin: store.test › memBackupStore:
     repointing the handle drops manifest and archives). A slot with no record
     to ride on is dropped (pin: store.test › memBackupStore: a slot with no
     record to ride on is dropped) */
  function setSlot(field: "manifest" | "archives", v: Slot | null): Promise<void> {
    return store.update(BACKUP_KEY, (row) => {
      if (!row) return null;
      row[field] = v;
      return { put: row };
    }).then(() => {});
  }
  return {
    get: () => store.get(BACKUP_KEY).then((row) => row ? row.handle : null),
    set: (handle) => handle ? store.put({ k: BACKUP_KEY, handle }) : store.del(BACKUP_KEY),
    getManifest: () => slot("manifest"),
    setManifest: (m) => setSlot("manifest", m),
    getArchives: () => slot("archives"),
    setArchives: (a) => setSlot("archives", a),
  };
}
export function idbBackupStore(): BackupStore { return backupStoreOver(dexieKeyedStore<BackupRow>(BACKUP_DB, BACKUP_STORE, "k")); }
export function memBackupStore(): BackupStore { return backupStoreOver(memKeyedStore<BackupRow>("k")); }
