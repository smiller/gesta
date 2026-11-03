import Dexie, { type Table } from "dexie";

export interface KeptRow { k: string; sig: string; text: string }
export type Known = Record<string, { sig: string; text: string }>;
/* texts kept by key between launches, written in bulk: a record a write
   was 17,000 transactions */
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
/* rows a page: one read or write of the whole library held the page for a
   long task; between pages the page paints */
const PAGE = 500;
const pause = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
export function dexieIndexKeeper(dbName: string): IndexKeeper {
  const db = new Dexie(dbName);
  db.version(1).stores({ texts: "k" });
  const table: Table<KeptRow, string> = db.table("texts");
  return {
    load: async () => {
      const out: Known = Object.create(null);
      let last: string | null = null;
      for (;;) {
        const rows: KeptRow[] = await (last == null ? table.orderBy("k") : table.where("k").above(last)).limit(PAGE).toArray();
        for (const r of rows) out[r.k] = { sig: r.sig, text: r.text };
        if (rows.length < PAGE) return out;
        last = rows[rows.length - 1].k;
        await pause();
      }
    },
    save: async (rows) => { for (let i = 0; i < rows.length; i += PAGE) { await table.bulkPut(rows.slice(i, i + PAGE)); await pause(); } },
    drop: async (keys) => { for (let i = 0; i < keys.length; i += PAGE) { await table.bulkDelete(keys.slice(i, i + PAGE)); await pause(); } },
  };
}
