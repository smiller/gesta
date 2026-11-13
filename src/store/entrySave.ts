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
export interface EntrySave {
  edited(): void;
  now(): Promise<boolean>;
  flush(): Promise<boolean>;
  suspend(): void;
  opened(): void;
  /* the entry on screen was deleted elsewhere: its text now is what it held */
  deleted(): void;
  unsaved(): boolean;
}

export function entrySave(p: SaveParts): EntrySave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  /* SUSPENDED while a rename moves the entry between keys: a debounce firing
     then wrote the screen's text back under the old key, and the entry stood under
     both; the next open lifts it (pin: entrySave.test › suspended for a
     rename) */
  let suspended = false;
  let deletedHere: OnScreen | null = null;
  const cancel = (): void => { if (timer) clearTimeout(timer); timer = null; };
  /* an empty document mints nothing (pin: entries left and renamed › an unknown page visited and left untouched) */
  function nothingToSave(s: OnScreen): boolean {
    const inStore = p.layer.entryMd(s.ekey);
    return s.md === inStore || (!s.md.trim() && !inStore);
  }
  function now(): Promise<boolean> {
    cancel();
    const s = p.screen();
    if (!s || p.layer.storeReadFailed) return Promise.resolve(false);
    if (deletedHere?.ekey === s.ekey) {
      if (s.md !== deletedHere.md) p.refused(s.md);
      return Promise.resolve(false);
    }
    if (nothingToSave(s)) return Promise.resolve(true);
    return p.layer.setEntry(s.ekey, s.md).then((landed) => { p.wrote(landed); return landed; });
  }
  return {
    now,
    edited: () => { if (suspended) return; cancel(); timer = setTimeout(() => { now(); }, SAVE_DEBOUNCE_MS); },
    flush: () => (timer ? now() : Promise.resolve(true)),
    suspend: () => { cancel(); suspended = true; },
    opened: () => { cancel(); suspended = false; deletedHere = null; },
    deleted: () => { deletedHere = p.screen(); },
    unsaved: () => {
      const s = p.screen();
      return !!timer || suspended || (!!s && s.md !== p.layer.entryMd(s.ekey));
    },
  };
}
