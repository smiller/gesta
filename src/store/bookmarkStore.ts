import { type Bookmark, parseBookmarks, serializeBookmarks, reachableBookmarks } from "./bookmarks.ts";
import { readRaw } from "./local.ts";
import { NS } from "./keys.ts";

export interface BookmarkStoreOptions {
  /* written once, when the key is absent */
  seed: Bookmark[];
  /* a failure's notice: returns the generation `release` takes back */
  pin(text: string, err: unknown): number;
  release(gen: number): void;
  storage?: () => Pick<Storage, "getItem" | "setItem">;
  /* the keys in the entry store every window shares */
  storedKeys(): Promise<string[]>;
}
export interface BookmarkStore {
  list(): Bookmark[];
  unreadable(): boolean;
  write(list: Bookmark[]): boolean;
  /* null keys: the journal not yet warm; resolves whether the sweep wrote */
  open(keys: (() => string[]) | null): Promise<boolean>;
}

/* ONE localStorage key, device-local: an accepted loss, the list being small
   and re-made in a minute */
export function bookmarkStore(opts: BookmarkStoreOptions): BookmarkStore {
  const KEY = NS + "bookmarks";
  const storage = opts.storage || (() => localStorage);
  let list: Bookmark[] = [];
  /* THE LATCH: empty here, unreadable text there that could still be
     recovered by hand, so every write is refused until a read comes back
     clean (pin: bookmarkStore.test › text this app would not have written)
     (pin: bookmarkStore.test › the open re-reads a damaged list) */
  let unreadable = false;
  let failGen = 0;
  const load = (): void => {
    const raw = readRaw(KEY, storage);
    const read = raw === undefined ? null : parseBookmarks(raw);
    unreadable = read === null;
    list = read || [];
  };
  const save = (next: Bookmark[]): Error | null => {
    if (unreadable) return new Error("bookmarks unreadable");
    try { storage().setItem(KEY, JSON.stringify(serializeBookmarks(next))); } catch (e) { return (e as Error) || new Error("setItem failed"); }
    load();
    return null;
  };
  const write = (next: Bookmark[]): boolean => {
    const err = save(next);
    if (err) { failGen = opts.pin("bookmarks not saved", err); return false; }
    opts.release(failGen);
    failGen = 0;
    return true;
  };
  load();
  if (readRaw(KEY, storage) === null) save(opts.seed);
  return {
    list: () => list,
    unreadable: () => unreadable,
    write,
    async open(keys) {
      /* another window may have written the key since: a write from the
         list read before would drop its rows
         (pin: bookmarkStore.test › re-reads the list) */
      load();
      /* an absence and a deletion read the same before the warm, and only
         a deletion should cost rows
         (pin: bookmarkStore.test › rows that lead nowhere are dropped) */
      if (!keys || reachableBookmarks(list, keys()).length === list.length) return false;
      /* this window's keys miss an entry another window made since it
         warmed: a row is dropped only when the shared store lacks it too,
         and kept when the store cannot be read
         (pin: bookmarkStore.test › a row this window has not loaded but the shared store holds is kept)
         (pin: bookmarkStore.test › a shared store that cannot be read drops nothing) */
      let stored: string[];
      try { stored = await opts.storedKeys(); } catch { return false; }
      /* the keys asked again: a page made and bookmarked during the read
         (pin: bookmarkStore.test › the drop is judged on the list and the keys as they stand) */
      const live = reachableBookmarks(list, keys().concat(stored));
      return live.length !== list.length && write(live);
    },
  };
}
