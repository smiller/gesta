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
  /* `edit` answers null when it changes nothing */
  rewriteEntry(ekey: string, edit: (md: string) => string | null): Promise<Rewrite>;
  persistEntry(ekey: string, op: () => Promise<unknown> | void, isDel?: boolean): Promise<boolean>;
  clear(): Promise<void>;
  primeEntry(ekey: string): Promise<boolean>;
  warm(): Promise<void>;
  /* the store's keys, read without touching the cache: what other tabs wrote is included */
  storedKeys(): Promise<string[]>;
  /* another tab landed a write under ekey: its row read into the cache and
     the base, where `accept` takes it; resolves whether the cache moved */
  takeNotice(ekey: string, accept?: (md: string | null) => boolean): Promise<boolean>;
  readonly warmed: boolean;
  readonly storeReadFailed: boolean;
  readonly storeReadError: unknown;
}
export type Rewrite = "landed" | "unchanged" | "failed";
export interface LayerOptions {
  /* a landed write or delete, told to the other tabs */
  announce?(ekey: string): void;
}
/* an op's answer that nothing landed: the row was already gone */
const GONE = Symbol("gone");
export function entryLayer(store: EntryStore, notices: EntryNotices, opts: LayerOptions = {}): EntryLayer {
  const cache: Record<string, string> = Object.create(null);
  const saveSeq: Record<string, number> = Object.create(null);
  const writeSeq: Record<string, number> = Object.create(null);
  /* keys whose last write here did not land: the text lives only in the
     cache, or in a stale refusal's notice, and another tab's notice for
     the key is skipped until a write lands
     (pin: entries.test › a notice is skipped for a key whose own write has not landed)
     (pin: entries.test › a save refused as stale makes the key owed) */
  const unlanded = new Set<string>();
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
    writeSeq[ekey] = (writeSeq[ekey] || 0) + 1;
    cache[ekey] = md;
    return persistEntry(ekey, () => store.set(ekey, md));
  }
  /* a stale refusal is answered ONCE by redoing the edit over the stored
     text, rebased on it: the edit is this tab's own, so the other tab's text
     is kept, where a plain retry would write over it (pin: entries.test ›
     rewriteEntry refused as stale is redone ONCE). A second refusal is a
     plain stale write's. A key whose own last write did not land is left,
     or the rewrite's landing would answer `landed` for that write (pin:
     entries.test › rewriteEntry leaves a key whose own save was refused).
     A row gone from the store is taken as a delete, with no landing told
     (pin: entries.test › rewriteEntry refused over a row deleted elsewhere) */
  function rewriteEntry(ekey: string, edit: (md: string) => string | null): Promise<Rewrite> {
    const run = (): Promise<Rewrite> => {
      if (unlanded.has(ekey)) return Promise.resolve("failed");
      const first = edit(entryMd(ekey));
      if (first === null) return Promise.resolve("unchanged");
      const seqAt = saveSeq[ekey], writeAt = (writeSeq[ekey] || 0) + 1;
      writeSeq[ekey] = writeAt;
      cache[ekey] = first;
      let unchanged = false;
      const op = (): Promise<unknown> => store.set(ekey, first).catch((err: unknown): unknown => {
        if (!isStale(err)) throw err;
        const ours = saveSeq[ekey] === seqAt && writeSeq[ekey] === writeAt;
        if (err.absent) {
          unchanged = true;
          store.rebase(ekey, null);
          if (ours) { saveSeq[ekey] = (saveSeq[ekey] || 0) + 1; delete cache[ekey]; unlanded.delete(ekey); notices.removed(ekey); }
          return GONE;
        }
        store.rebase(ekey, err.stored);
        const again = edit(err.stored);
        if (ours) cache[ekey] = again ?? err.stored;
        if (again === null) { unchanged = true; return; }
        return store.set(ekey, again);
      });
      return persistEntry(ekey, op).then((ok) => !ok ? "failed" : unchanged ? "unchanged" : "landed");
    };
    return (chain[ekey] || Promise.resolve()).then(run, run);
  }
  function removeEntry(ekey: string): Promise<boolean> {
    saveSeq[ekey] = (saveSeq[ekey] || 0) + 1;
    delete cache[ekey];
    unlanded.delete(ekey);
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
      (v) => { if (v === GONE) return true; unlanded.delete(ekey); notices.landed(ekey); opts.announce?.(ekey); return true; },
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
          if (!isDel) unlanded.add(ekey);
          if (isDel) notices.stuck("not deleted — changed in another tab, reload", err, ekey);
          else notices.stuck("not saved — changed in another tab, copy your text then reload", err, ekey, err.refused);
        }
        else if (isDel) notices.stuckIdle("couldn't delete — reload", err);
        else { unlanded.add(ekey); notices.stuck("not saved", err, ekey); }
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
  /* read after the key's queued ops; dropped when this tab wrote or
     removed the key while the read was out, its own write being the newer
     (pin: entries.test › a notice waits for the key's queued ops). Before
     the warm a notice waits for it, and a warm that failed answers false
     (pin: entries.test › a notice before the warm)
     (pin: entries.test › a notice when the warm could not read the store).
     A delete taken clears the key's debts, as removeEntry does */
  let warmLanded: () => void = () => {};
  const afterWarm = new Promise<void>((r) => { warmLanded = r; });
  function takeNotice(ekey: string, accept: (md: string | null) => boolean = () => true): Promise<boolean> {
    if (!warmed) return storeReadFailed ? Promise.resolve(false) : afterWarm.then(() => warmed ? takeNotice(ekey, accept) : false);
    const seqAt = saveSeq[ekey], writeAt = writeSeq[ekey];
    const read = (): Promise<boolean> => store.peek(ekey).then((row) => {
      if (saveSeq[ekey] !== seqAt || writeSeq[ekey] !== writeAt || unlanded.has(ekey)) return false;
      const md = row ? row.md : null, held = ekey in cache ? cache[ekey] : null;
      if (md === held) return false;
      if (!accept(md)) return false;
      store.rebase(ekey, md);
      if (md !== null) { cache[ekey] = md; return true; }
      saveSeq[ekey] = (saveSeq[ekey] || 0) + 1;
      delete cache[ekey];
      notices.removed(ekey);
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
    }).then(() => { warmed = !storeReadFailed; warmLanded(); });
  }
  return {
    cache, saveSeq, entryMd, setEntry, removeEntry, rewriteEntry, persistEntry, primeEntry, warm, clear,
    storedKeys: () => store.keys(), takeNotice,
    get warmed() { return warmed; },
    get storeReadFailed() { return storeReadFailed; },
    get storeReadError() { return storeReadError; },
  };
}
