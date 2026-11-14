import type { EntryLayer } from "./entries.ts";

export const SAVE_DEBOUNCE_MS = 500;

export interface OnScreen { ekey: string; md: string }
export interface SaveParts {
  screen(): OnScreen | null;
  layer: Pick<EntryLayer, "entryMd" | "setEntry" | "storeReadFailed">;
  wrote(landed: boolean): void;
  /* text typed into an entry deleted elsewhere, which no write will keep */
  refused(md: string): void;
}
/* a rename or move under way: the stored text when it began, and its two
   ends for what was typed since */
export interface HandOver {
  md: string;
  land(key: string, rewrite: (md: string) => string): Promise<boolean>;
  keep(): Promise<boolean>;
}
export interface EntrySave {
  edited(): void;
  now(): Promise<boolean>;
  flush(): Promise<boolean>;
  leave(then: () => void): Promise<void>;
  /* null when the entry is no longer the one on screen once the save has landed */
  handOver(ekey: string): Promise<HandOver | null>;
  opened(ekey: string, stored: string): void;
  /* the entry on screen was deleted elsewhere: its text now is what it held */
  deleted(): void;
  unsaved(): boolean;
  /* the store changed under the entry since the last open or write, and nothing was typed since */
  moved(): boolean;
}

export function entrySave(p: SaveParts): EntrySave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  /* SUSPENDED while a rename moves the entry between keys: a debounce firing
     then wrote the screen's text back under the old key, and the entry stood
     under both; the next open lifts it (pin: entrySave.test › a hand-over
     waits for the save) */
  let suspended = false;
  let deletedHere: OnScreen | null = null;
  /* the stored text as last opened or written, and how many edits it holds:
     compared with the screen's text instead, an entry stored in another form
     than the editor writes back never read as moved (pin: entrySave.test ›
     the store moved is told from the stored text alone) */
  let base: OnScreen | null = null;
  let edits = 0, written = 0;
  const cancel = (): void => { if (timer) clearTimeout(timer); timer = null; };
  /* an empty document mints nothing (pin: entries left and renamed › an unknown page visited and left untouched) */
  function nothingToSave(s: OnScreen): boolean {
    const inStore = p.layer.entryMd(s.ekey);
    return s.md === inStore || (!s.md.trim() && !inStore);
  }
  function put(key: string, md: string): Promise<boolean> {
    if (p.layer.storeReadFailed) return Promise.resolve(false);
    const at = edits;
    return p.layer.setEntry(key, md).then((landed) => {
      if (landed && key === base?.ekey) { base = { ekey: key, md }; written = at; }
      p.wrote(landed);
      return landed;
    });
  }
  /* typed into an entry deleted elsewhere: handed back, never written */
  function refusedHere(s: OnScreen): boolean {
    if (deletedHere?.ekey !== s.ekey) return false;
    if (s.md !== deletedHere.md) p.refused(s.md);
    return true;
  }
  function now(): Promise<boolean> {
    cancel();
    const s = p.screen();
    if (!s || refusedHere(s)) return Promise.resolve(false);
    if (!p.layer.storeReadFailed && nothingToSave(s)) return Promise.resolve(true);
    return put(s.ekey, s.md);
  }
  const flush = (): Promise<boolean> => (timer ? now() : Promise.resolve(true));
  /* the ends write past the deleted-elsewhere refusal: refused there, the
     typed text was lost (pin: entrySave.test › text typed during a rename of
     an entry deleted elsewhere) */
  function handOver(ekey: string): Promise<HandOver | null> {
    return flush().then(() => {
      if (p.screen()?.ekey !== ekey) return null;
      cancel();
      suspended = true;
      const md = p.layer.entryMd(ekey);
      const typed = (): string | null => { const s = p.screen(); return s?.ekey === ekey && s.md !== md ? s.md : null; };
      const end = (key: string, rewrite: (t: string) => string): Promise<boolean> => { const t = typed(); return t === null ? Promise.resolve(true) : put(key, rewrite(t)); };
      return { md, land: end, keep: () => end(ekey, (t) => t) };
    });
  }
  const typedSince = (): boolean => !!timer || suspended || edits !== written;
  const onBase = (s: OnScreen | null): s is OnScreen => !!s && base?.ekey === s.ekey;
  function moved(): boolean {
    if (typedSince()) return false;
    const s = p.screen();
    return onBase(s) && p.layer.entryMd(s.ekey) !== base?.md;
  }
  return {
    now,
    flush,
    handOver,
    moved,
    edited: () => { edits++; if (suspended) return; cancel(); timer = setTimeout(() => { now(); }, SAVE_DEBOUNCE_MS); },
    leave: (then) => flush().then(() => then()),
    opened: (ekey, stored) => { cancel(); suspended = false; deletedHere = null; base = { ekey, md: stored }; written = edits; },
    deleted: () => { deletedHere = p.screen(); },
    unsaved: () => {
      if (timer || suspended) return true;
      const s = p.screen();
      return !!s && s.md !== p.layer.entryMd(s.ekey);
    },
  };
}
