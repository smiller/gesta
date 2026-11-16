import { foldsContents } from "./contents.ts";
import { entryKey, isDayKey, NS_COMMONPLACE } from "./keys.ts";

export type FoldKind = "contents" | "sections";
export function foldKind(keys: string[], date: string, tag: string | null): FoldKind | null {
  if (foldsContents(keys, date, tag)) return "contents";
  return isDayKey(date) || date === NS_COMMONPLACE.key ? "sections" : null;
}

/* each entry's sections held otherwise than its kind starts them: a
   per-browser convenience, never in the text or a backup */
export type FoldStore = Record<string, { flipped: string[] }>;
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const stringsIn = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
function readJson(raw: string | null): unknown {
  try { return JSON.parse(raw || "{}"); } catch { return null; }
}
/* forgives anything, a damaged store an empty one; a record from before
   one list served both kinds holds `open` (contents) or `closed`
   (sections), most often both with one empty, read as the one that holds
   sections: the empty `open` taken first lost every day's closed sections
   (pin: foldMemory.test › a record from before, open sections or closed
   ones) (pin: foldMemory.test › a record written with both lists) */
export function parseFoldStore(raw: string | null): FoldStore {
  const out: FoldStore = Object.create(null);
  const data = readJson(raw);
  if (!isRecord(data)) return out;
  for (const [k, v] of Object.entries(data)) if (isRecord(v)) out[k] = { flipped: v.flipped !== undefined ? stringsIn(v.flipped) : [...stringsIn(v.open), ...stringsIn(v.closed)] };
  return out;
}
type Stored = { read(): FoldStore; write(next: (s: FoldStore) => FoldStore): void };

export interface FoldStart { kind: FoldKind | null; flipped: string[] }
export interface FoldMemory {
  startOf(date: string, tag: string | null): FoldStart;
  record(ekey: string, flipped: string[]): void;
  move(moves: Record<string, string>): void;
  drop(keys: string[]): void;
}
export function foldMemory(store: Stored, keys: () => string[]): FoldMemory {
  return {
    startOf(date, tag) {
      const kind = foldKind(keys(), date, tag);
      return { kind, flipped: kind ? store.read()[entryKey(date, tag)]?.flipped ?? [] : [] };
    },
    record: (ekey, flipped) => store.write((s) => ({ ...s, [ekey]: { flipped } })),
    move: (moves) => store.write((s) => {
      const out: FoldStore = Object.create(null);
      for (const [k, v] of Object.entries(s)) out[Object.hasOwn(moves, k) ? moves[k] : k] = v;
      return out;
    }),
    drop: (gone) => store.write((s) => {
      const out: FoldStore = Object.create(null);
      for (const [k, v] of Object.entries(s)) if (!gone.includes(k)) out[k] = v;
      return out;
    }),
  };
}
