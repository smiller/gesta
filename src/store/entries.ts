import { type EntryStore, isStale, type StaleWriteError } from "./store.ts";

export interface EntryAlerts {
  /* a durable landing under ekey: release any pin owed under it */
  landed(ekey: string): void;
  /* the entry is gone: clear every debt under it — the body's AND the
     derived index's — or a failed-then-deleted entry's stale key would
     block every future release forever (pin: entries.test › removeEntry
     clears the cache, the store, and every debt the key owed) */
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
  entryMd(ekey: string): string;
  /* resolves whether the write LANDED, never rejects: the alerts carry the
     failure, but a tally needs the answer */
  setEntry(ekey: string, md: string): Promise<boolean>;
  /* why the key's last write did not land; nothing once one lands */
  writeError(ekey: string): unknown;
  /* the key's last write here did not land, and writing it again could:
     not one refused for another tab's change, which a reload alone clears
     (pin: entries.test › a write refused for another tab's change owes nothing) */
  owes(ekey: string): boolean;
  /* each key owed written again, once (pin: entries.test › the keys owed are written again) */
  retryOwed(): Promise<void>;
  removeEntry(ekey: string): Promise<boolean>;
  /* `edit` answers null when it changes nothing */
  rewriteEntry(ekey: string, edit: (md: string) => string | null): Promise<Rewrite>;
  clear(): Promise<void>;
  primeEntry(ekey: string): Promise<boolean>;
  warm(): Promise<void>;
  /* the store's keys, read without touching the cache: what other tabs wrote is included */
  storedKeys(): Promise<string[]>;
  /* another tab landed a write under ekey: its row read into the cache and
     the base, where `accept` takes it; resolves whether the cache moved */
  takeTabWrite(ekey: string, accept?: (md: string | null) => boolean): Promise<boolean>;
  readonly warmed: boolean;
  readonly storeReadFailed: boolean;
  readonly storeReadError: unknown;
}
export type Rewrite = "landed" | "unchanged" | "failed";
export interface LayerOptions {
  /* a landed write or delete, told to the other tabs */
  announce?(ekey: string): void;
  /* the same landing, for what follows any write: the folder backup */
  onLanded?(ekey: string): void;
}
/* an op's answer that nothing landed: the row was already gone */
const GONE = Symbol("gone");
const rewriteOutcome = (ok: boolean, unchanged: boolean): Rewrite => (!ok ? "failed" : unchanged ? "unchanged" : "landed");
interface RewriteTry { ekey: string; edit: (md: string) => string | null; seqAt: number | undefined; writeAt: number; unchanged: boolean }
export function entryLayer(store: EntryStore, alerts: EntryAlerts, opts: LayerOptions = {}): EntryLayer {
  const cache: Record<string, string> = Object.create(null);
  /* per key, bumped by removal: a save caught in an async gap commits only
     while still the latest issued (pin: entries.test › a stale restore is
     guarded by the counter) */
  const saveSeq: Record<string, number> = Object.create(null);
  const writeSeq: Record<string, number> = Object.create(null);
  /* each key's last failure here, and whether a save is what failed: then
     the text lives only in the cache, or in a stale refusal's error, and
     another tab's write for the key is skipped until a write lands
     (pin: entries.test › a write from another tab is skipped for a key whose own write has not landed)
     (pin: entries.test › a save refused as stale makes the key owed) */
  const debts = new Map<string, { err: unknown; save: boolean }>();
  const unlanded = (ekey: string): boolean => !!debts.get(ekey)?.save;
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
  function rowGone(w: RewriteTry, ours: boolean): typeof GONE {
    w.unchanged = true;
    store.rebase(w.ekey, null);
    if (ours) forgetRow(w.ekey);
    return GONE;
  }
  function staleRewrite(w: RewriteTry, err: unknown): unknown {
    if (!isStale(err)) throw err;
    const ours = saveSeq[w.ekey] === w.seqAt && writeSeq[w.ekey] === w.writeAt;
    if (err.absent) return rowGone(w, ours);
    store.rebase(w.ekey, err.stored);
    const again = w.edit(err.stored);
    if (ours) cache[w.ekey] = again ?? err.stored;
    if (again === null) { w.unchanged = true; return; }
    return store.set(w.ekey, again);
  }
  function rewriteEntry(ekey: string, edit: (md: string) => string | null): Promise<Rewrite> {
    const run = (): Promise<Rewrite> => {
      if (unlanded(ekey)) return Promise.resolve("failed");
      const first = edit(entryMd(ekey));
      if (first === null) return Promise.resolve("unchanged");
      const w: RewriteTry = { ekey, edit, seqAt: saveSeq[ekey], writeAt: (writeSeq[ekey] || 0) + 1, unchanged: false };
      writeSeq[ekey] = w.writeAt;
      cache[ekey] = first;
      const op = (): Promise<unknown> => store.set(ekey, first).catch((err: unknown) => staleRewrite(w, err));
      return persistEntry(ekey, op).then((ok) => rewriteOutcome(ok, w.unchanged));
    };
    return (chain[ekey] || Promise.resolve()).then(run, run);
  }
  function forgetRow(ekey: string): void {
    saveSeq[ekey] = (saveSeq[ekey] || 0) + 1;
    delete cache[ekey];
    debts.delete(ekey);
    alerts.removed(ekey);
  }
  function removeEntry(ekey: string): Promise<boolean> {
    forgetRow(ekey);
    return persistEntry(ekey, () => store.del(ekey), true);
  }
  /* serialize the async store writes for one key: two quick saves of one
     entry could otherwise land stale-last and lose the edit (the cache,
     written synchronously, is already last-wins). Both arms advance the
     tail so one failure does not wedge the key (pin: entries.test ›
    one key's writes run in order). The returned promise is
     SEALED — every caller discards it, so a rejected op would otherwise
     float unhandled. The store is the only durable copy, so a failed write
     is real data loss: stick it, keyed; a success is the durable landing
     and releases the pin. */
  function landed(ekey: string, v: unknown): boolean {
    if (v === GONE) return true;
    debts.delete(ekey);
    alerts.landed(ekey);
    opts.announce?.(ekey);
    opts.onLanded?.(ekey);
    /* a landing says the store takes writes again */
    if (debts.size) void retried(true);
    return true;
  }
  const owes = (ekey: string): boolean => unlanded(ekey) && !isStale(debts.get(ekey)?.err);
  const retrying = new Set<string>();
  /* a key a landing retried in vain waits for the next retry asked for: on
     every landing, a store too full for it was written again and again
     while smaller entries saved (pin: entries.test › a key a landing
     retried that failed again) */
  const held = new Set<string>();
  const due = (k: string): boolean => owes(k) && !retrying.has(k) && !held.has(k);
  function retried(onLanding: boolean): Promise<void> {
    if (!onLanding) held.clear();
    const keys = [...debts.keys()].filter(due);
    for (const k of keys) retrying.add(k);
    /* asked again at its turn in the key's queue: a delete queued ahead of
       it stands (pin: entries.test › a retry whose key is deleted) */
    const again = (k: string): Promise<boolean> => persistEntry(k, () => (k in cache && owes(k) ? store.set(k, cache[k]) : Promise.resolve(GONE)));
    const settle = (k: string) => (landedNow: boolean): void => { retrying.delete(k); if (onLanding && !landedNow) held.add(k); };
    return Promise.all(keys.map((k) => again(k).then(settle(k)))).then(() => {});
  }
  const retryOwed = (): Promise<void> => retried(false);
  /* PUT THE CACHE BACK: a refused write left there would go out over the
     backup folder at the next run (pin: entries.test › a stale write
     restores the cache). Guarded by the counter — a delete mutates the
     cache synchronously and queues its own op, and an unguarded restore
     would land the row again after the entry was retired. A REFUSED DELETE
     restores it too: its row survives in the store (pin: entries.test › a
     stale delete restores the cache) */
  function staleRefusal(ekey: string, err: StaleWriteError, seqAt: number | undefined, isDel: boolean): void {
    if (saveSeq[ekey] !== seqAt) return;
    cache[ekey] = err.stored;
    if (isDel) { alerts.stuck("not deleted — changed in another tab, reload", err, ekey); return; }
    alerts.stuck("not saved — changed in another tab, copy your text then reload", err, ekey, err.refused);
  }
  function refused(ekey: string, err: unknown, seqAt: number | undefined, isDel: boolean): boolean {
    if (saveSeq[ekey] === seqAt) debts.set(ekey, { err, save: !isDel || unlanded(ekey) });
    if (isStale(err)) staleRefusal(ekey, err, seqAt, isDel);
    else if (isDel) alerts.stuckIdle("couldn’t delete — reload", err);
    /* a key deleted since owes nothing and is told nothing: retried, it
       wrote the deleted entry back (pin: entries.test › a retry whose key is
       deleted), and its pin waited on a landing that never comes (pin:
       entries.test › a save that fails after its entry was deleted) */
    else if (saveSeq[ekey] === seqAt) alerts.stuck("not saved", err, ekey);
    return false;
  }
  function persistEntry(ekey: string, op: () => Promise<unknown> | void, isDel = false): Promise<boolean> {
    const seqAt = saveSeq[ekey];
    const tail = (chain[ekey] || Promise.resolve()).then(op, op);
    chain[ekey] = tail;
    return tail.then((v) => landed(ekey, v), (err: unknown) => refused(ekey, err, seqAt, isDel));
  }
  function clear(): Promise<void> {
    for (const k of Object.keys(cache)) delete cache[k];
    debts.clear();
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
      if (!row?.md) return false;
      if (ekey in cache || saveSeq[ekey] !== seqAt) return false;
      cache[ekey] = row.md;
      return true;
    });
    return (chain[ekey] || Promise.resolve()).then(read, read);
  }
  /* read after the key's queued ops; dropped when this tab wrote or
     removed the key while the read was out, its own write being the newer
     (pin: entries.test › a write from another tab waits for the key's queued ops). Before
     the warm a write from another tab waits for it, and a warm that failed answers false
     (pin: entries.test › a write from another tab before the warm)
     (pin: entries.test › a write from another tab when the warm could not read the store).
     A delete taken clears the key's debts, as removeEntry does */
  let warmLanded: () => void = () => {};
  const afterWarm = new Promise<void>((r) => { warmLanded = r; });
  function takeTabWrite(ekey: string, accept: (md: string | null) => boolean = () => true): Promise<boolean> {
    if (!warmed) return storeReadFailed ? Promise.resolve(false) : afterWarm.then(() => warmed ? takeTabWrite(ekey, accept) : false);
    const seqAt = saveSeq[ekey], writeAt = writeSeq[ekey];
    const moved = (): boolean => saveSeq[ekey] !== seqAt || writeSeq[ekey] !== writeAt || unlanded(ekey);
    const read = (): Promise<boolean> => store.peek(ekey).then((row) => {
      if (moved()) return false;
      const md = row ? row.md : null, held = ekey in cache ? cache[ekey] : null;
      if (md === held || !accept(md)) return false;
      return tabWriteTaken(ekey, md);
    });
    return (chain[ekey] || Promise.resolve()).then(read, read);
  }
  function tabWriteTaken(ekey: string, md: string | null): true {
    store.rebase(ekey, md);
    if (md !== null) cache[ekey] = md;
    else forgetRow(ekey);
    return true;
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
    cache, entryMd, setEntry, writeError: (ekey: string) => debts.get(ekey)?.err, owes, retryOwed, removeEntry, rewriteEntry, primeEntry, warm, clear,
    storedKeys: () => store.keys(), takeTabWrite,
    get warmed() { return warmed; },
    get storeReadFailed() { return storeReadFailed; },
    get storeReadError() { return storeReadError; },
  };
}
