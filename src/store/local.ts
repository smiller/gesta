/* read and written inside try: a per-browser convenience lost is not a
   failure, and reaching localStorage itself throws where site data is
   blocked (pin: local.test › stored: a storage that throws) */
export function stored<T>(key: string, parse: (raw: string | null) => T, storage: () => Pick<Storage, "getItem" | "setItem"> = () => localStorage): { read(): T; write(next: (s: T) => T): void } {
  return {
    read: () => { try { return parse(storage().getItem(key)); } catch { return parse(null); } },
    write: (next) => { try { const s = storage(); s.setItem(key, JSON.stringify(next(parse(s.getItem(key))))); } catch { /* lost */ } },
  };
}
