type Storage_ = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const browser = (): Storage_ => localStorage;
/* UNREADABLE is not EMPTY: undefined when the storage cannot be reached,
   null for a key it does not hold — a blocked read taken for an absent key
   would seed a first run's defaults over what a reader has
   (pin: local.test › readRaw: an absent key is null) */
export function readRaw(key: string, storage: () => Pick<Storage, "getItem"> = browser): string | null | undefined {
  try { return storage().getItem(key); } catch { return undefined; }
}
/* false when it could not be written: reaching localStorage throws where
   site data is blocked (pin: local.test › writeRaw: a value set) */
export function writeRaw(key: string, value: string | null, storage: () => Storage_ = browser): boolean {
  try { const s = storage(); if (value === null) s.removeItem(key); else s.setItem(key, value); return true; } catch { return false; }
}
/* a per-browser convenience lost is not a failure
   (pin: local.test › stored: a storage that throws) */
export function stored<T>(key: string, parse: (raw: string | null) => T, storage: () => Pick<Storage, "getItem" | "setItem"> = browser): { read(): T; write(next: (s: T) => T): void } {
  return {
    read: () => parse(readRaw(key, storage) ?? null),
    write: (next) => { const raw = readRaw(key, storage); if (raw !== undefined) writeRaw(key, JSON.stringify(next(parse(raw))), storage as () => Storage_); },
  };
}
