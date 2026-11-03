import Dexie, { type Table } from "dexie";

export interface KeptRow { k: string; sig: string; text: string }
export type Known = Record<string, { sig: string; text: string }>;
/* the search index's texts between launches, written in bulk: a record a
   write was 17,000 transactions */
export interface IndexKeeper {
  load(): Promise<Known>;
  save(rows: KeptRow[]): Promise<void>;
  drop(keys: string[]): Promise<void>;
}
const toKnown = (rows: KeptRow[]): Known => {
  const out: Known = Object.create(null);
  for (const r of rows) out[r.k] = { sig: r.sig, text: r.text };
  return out;
};
export function memIndexKeeper(): IndexKeeper {
  const rows = new Map<string, KeptRow>();
  return {
    load: () => Promise.resolve({ ...toKnown([...rows.values()]) }),
    save: (more) => { for (const r of more) rows.set(r.k, r); return Promise.resolve(); },
    drop: (keys) => { for (const k of keys) rows.delete(k); return Promise.resolve(); },
  };
}
export function dexieIndexKeeper(dbName: string): IndexKeeper {
  const db = new Dexie(dbName);
  db.version(1).stores({ texts: "k" });
  const table: Table<KeptRow, string> = db.table("texts");
  return {
    load: () => table.toArray().then(toKnown),
    save: (rows) => (rows.length ? table.bulkPut(rows).then(() => {}) : Promise.resolve()),
    drop: (keys) => (keys.length ? table.bulkDelete(keys) : Promise.resolve()),
  };
}
