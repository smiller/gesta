import { type EntryStore, isStale } from "./store.ts";

export interface EntryNotices {
  /* a durable landing under ekey: release any pin owed under it */
  landed(ekey: string): void;
  /* the entry is gone: clear every debt under it — the body's AND the
     derived index's — or a failed-then-deleted entry's stale key would
     block every future release forever (pin: entries.test › removeEntry
     clears the cache, bumps the counter, and clears every debt) */
  removed(ekey: string): void;
  /* a write that did not land, keyed so a later landing releases it;
     `rescue` is the refused text, offered for copying */
  stuck(text: string, err: unknown, ekey: string, rescue?: string): void;
  /* a delete that failed for a reason other than staleness: UNKEYED, since
     the removed key can never land a future write, and deferred past any
     busy pin — the entry resurrects from the store next launch (pin:
     entries.test › a plain rejected delete reports unkeyed and idle-deferred) */
  stuckIdle(text: string, err: unknown): void;
}
export interface EntryLayer {
  /* complete once `warmed`: everything written out is enumerated from it */
  cache: Record<string, string>;
  /* per key, bumped by removal: a save caught in an async gap commits only
     while still the latest issued (pin: entries.test › a stale restore is
     guarded by the counter) */
  saveSeq: Record<string, number>;
  entryMd(ekey: string): string;
  /* resolves whether the write LANDED, never rejects: the notices carry the
     failure, but a tally needs the answer */
  setEntry(ekey: string, md: string): Promise<boolean>;
  removeEntry(ekey: string): Promise<boolean>;
  persistEntry(ekey: string, op: () => Promise<unknown> | void, isDel?: boolean): Promise<boolean>;
  clear(): Promise<void>;
  primeEntry(ekey: string): Promise<boolean>;
  /* the cache's copy of one entry made the store's; resolves whether it moved */
  refreshEntry(ekey: string): Promise<boolean>;
  warm(): Promise<void>;
  /* the store's keys, read without touching the cache: what other tabs wrote is included */
  storedKeys(): Promise<string[]>;
  readonly warmed: boolean;
  readonly storeReadFailed: boolean;
  readonly storeReadError: unknown;
}
export function entryLayer(store: EntryStore, notices: EntryNotices): EntryLayer {
  const cache: Record<string, string> = Object.create(null);
  const saveSeq: Record<string, number> = Object.create(null);
  const chain: Record<string, Promise<unknown>> = Object.create(null);
  /* false until the warm has filled the cache: a backup run before it would
     export a blank journal over the mirror */
  let warmed = false;
  /* set when the warm cannot read the store (blocked IndexedDB, a second tab
     on a newer version): the cache is left EMPTY rather than blanked, and the
     REAL error kept (pin: entries.test › warm: a read failure leaves the
     cache empty and holds the real error) */
  let storeReadFailed = false;
  let storeReadError: unknown = null;

  function entryMd(ekey: string): string { return cache[ekey] || ""; }
  function setEntry(ekey: string, md: string): Promise<boolean> {
    cache[ekey] = md;
    return persistEntry(ekey, () => store.set(ekey, md));
  }
  function removeEntry(ekey: string): Promise<boolean> {
    saveSeq[ekey] = (saveSeq[ekey] || 0) + 1;
    delete cache[ekey];
    notices.removed(ekey);
    return persistEntry(ekey, () => store.del(ekey), true);
  }
  /* serialize the async store writes for one key: two quick saves of one
     entry could otherwise land stale-last and lose the edit (the cache,
     written synchronously, is already last-wins). Both arms advance the
     tail so one failure does not wedge the key (pin: entries.test ›
    persistEntry serializes one key's ops). The returned promise is
     SEALED — every caller discards it, so a rejected op would otherwise
     float unhandled. The store is the only durable copy, so a failed write
     is real data loss: stick it, keyed; a success is the durable landing
     and releases the pin. */
  function persistEntry(ekey: string, op: () => Promise<unknown> | void, isDel = false): Promise<boolean> {
    const seqAt = saveSeq[ekey];
    const tail = (chain[ekey] || Promise.resolve()).then(op, op);
    chain[ekey] = tail;
    return tail.then(
      () => { notices.landed(ekey); return true; },
      (err: unknown) => {
        /* PUT THE CACHE BACK: a refused write left there would go out over the
           backup folder at the next run (pin: entries.test › a stale write
           restores the cache). Guarded by the counter — a delete mutates the
           cache synchronously and queues its own op, and an unguarded restore
           would land the row again after the entry was retired. A REFUSED DELETE
           restores it too: its row survives in the store (pin: entries.test › a
           stale delete restores the cache) */
        if (isStale(err)) {
          if (saveSeq[ekey] === seqAt) cache[ekey] = err.stored;
          if (isDel) notices.stuck("not deleted — changed in another tab, reload", err, ekey);
          else notices.stuck("not saved — changed in another tab, copy your text then reload", err, ekey, err.refused);
        }
        else if (isDel) notices.stuckIdle("couldn't delete — reload", err);
        else notices.stuck("not saved", err, ekey);
        return false;
      },
    );
  }
  function clear(): Promise<void> {
    for (const k of Object.keys(cache)) delete cache[k];
    return store.clear();
  }
  /* one row into the cache. Additive and idempotent: a key already held is
     left untouched, so the seed and the warm cannot disagree. Resolves true
     only when THIS call seeded the key (pin: entries.test › primeEntry loses
     the race to warm). Read after the key's queued ops, and refused when a
     removal came between: a delete in flight read back its own row
     (pin: entries.test › primeEntry waits for the key's pending ops) */
  function primeEntry(ekey: string): Promise<boolean> {
    if (ekey in cache) return Promise.resolve(false);
    const seqAt = saveSeq[ekey];
    const read = (): Promise<boolean> => store.get(ekey).then((row) => {
      if (!row || !row.md || (ekey in cache) || saveSeq[ekey] !== seqAt) return false;
      cache[ekey] = row.md;
      return true;
    });
    return (chain[ekey] || Promise.resolve()).then(read, read);
  }
  /* after the key's queued ops, and refused when a removal came between, as
     primeEntry (pin: entries.test › refreshEntry waits for the key's pending ops) */
  function refreshEntry(ekey: string): Promise<boolean> {
    const seqAt = saveSeq[ekey];
    const read = (): Promise<boolean> => store.reread(ekey).then((row) => {
      if (saveSeq[ekey] !== seqAt) return false;
      /* an empty row is a registration, kept
         (pin: entries.test › refreshEntry keeps an empty row) */
      if (row) {
        if (ekey in cache && cache[ekey] === row.md) return false;
        cache[ekey] = row.md;
        return true;
      }
      if (!(ekey in cache)) return false;
      delete cache[ekey];
      return true;
    });
    return (chain[ekey] || Promise.resolve()).then(read, read);
  }
  function warm(): Promise<void> {
    storeReadFailed = false;
    storeReadError = null;
    return store.all().then((rows) => {
      for (const r of rows) if (!(r.key in cache)) cache[r.key] = r.md;
    }, (err: unknown) => {
      storeReadFailed = true;
      storeReadError = err;
    }).then(() => { warmed = !storeReadFailed; });
  }
  return {
    cache, saveSeq, entryMd, setEntry, removeEntry, persistEntry, primeEntry, refreshEntry, warm, clear,
    storedKeys: () => store.keys(),
    get warmed() { return warmed; },
    get storeReadFailed() { return storeReadFailed; },
    get storeReadError() { return storeReadError; },
  };
}
