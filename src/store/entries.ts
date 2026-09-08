/* The entry layer over the entry store: the synchronous cache, the one
   read/write/delete path, the per-key write chain and the warm. Ported
   2026-09-07 from ../writer/src/js/entries.mjs, POST-CUTOVER HALF ONLY: the
   successor has no localStorage era, so the dual-write, the cutover, the
   reclaim and the flag are not carried — the store is authoritative from the
   first write. The names that module reached for as bare globals (the
   store, the save-failure notices, the save counter) are handed in here. */
import { type EntryStore, isStale } from "./store.ts";

/* what the layer tells the chrome. Keyed notices stick until the key lands
   again; an entry removed owes nothing, body or index. */
export interface EntryNotices {
  /* a durable landing under ekey: release any pin owed under it */
  landed(ekey: string): void;
  /* the entry is gone: clear every debt under it — the body's AND the
     derived index's — or a failed-then-deleted entry's stale key would
     block every future release forever */
  removed(ekey: string): void;
  /* a write that did not land, keyed so a later landing releases it;
     `rescue` is the refused text, offered for copying */
  stuck(text: string, err: unknown, ekey: string, rescue?: string): void;
  /* a delete that failed for a reason other than staleness: UNKEYED, since
     the removed key can never land a future write, and deferred past any
     busy pin — the entry resurrects from the store next launch */
  stuckIdle(text: string, err: unknown): void;
}
export interface EntryLayer {
  /* the synchronous source of truth fronting the store; the export and the
     backup enumerate it, so it must be complete once `warmed` */
  cache: Record<string, string>;
  /* per key, bumped by removal: a save caught in an async gap commits only
     while still the latest issued */
  saveSeq: Record<string, number>;
  entryMd(ekey: string): string;
  /* resolves whether the write LANDED: the notices carry the failure, and
     the promise never rejects, but a tally (the import's) needs the answer */
  setEntry(ekey: string, md: string): Promise<boolean>;
  removeEntry(ekey: string): Promise<boolean>;
  persistEntry(ekey: string, op: () => Promise<unknown> | void, isDel?: boolean): Promise<boolean>;
  /* every entry gone, cache and store — the import's clean slate */
  clear(): Promise<void>;
  primeEntry(ekey: string): Promise<boolean>;
  warm(): Promise<void>;
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
     on a newer version): the journal is unreadable this launch and the cache
     is left EMPTY rather than blanked; init surfaces it with the REAL error */
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
     tail so one failure does not wedge the key. The returned promise is
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
        /* PUT THE CACHE BACK: the mirror and the export are written from
           the cache, so a refused write left there goes out over the backup
           folder at the next run. Guarded by the counter — a delete mutates
           the cache synchronously and queues its own op, and an unguarded
           restore would land the row again after the entry was retired. A
           REFUSED DELETE restores it too: its row survives in the store. */
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
  /* seed the cache with ONE entry from its store row, ahead of the warm.
     Additive and idempotent: a key already held is left untouched, so the
     seed and the warm cannot disagree. Resolves true only when THIS call
     seeded the key; a store hiccup rejects. */
  function primeEntry(ekey: string): Promise<boolean> {
    if (ekey in cache) return Promise.resolve(false);
    return store.get(ekey).then((row) => {
      if (!row || !row.md || (ekey in cache)) return false;
      cache[ekey] = row.md;
      return true;
    });
  }
  /* load the store into the cache before the first reads need it. A read
     failure leaves the cache as it was and flags the launch. */
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
    cache, saveSeq, entryMd, setEntry, removeEntry, persistEntry, primeEntry, warm, clear,
    get warmed() { return warmed; },
    get storeReadFailed() { return storeReadFailed; },
    get storeReadError() { return storeReadError; },
  };
}
