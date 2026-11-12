/* a per-browser convenience, never in the text or a backup. Parsing
   forgives anything: a damaged store is an empty one (pin: foldState.test ›
   an absent, empty or damaged store reads as empty) */
export interface FoldPage { open: string[] }
export type FoldStore = Record<string, FoldPage>;

function readJson(raw: string | null): unknown {
  try { return JSON.parse(raw || "{}"); } catch { return null; }
}
const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const stringsIn = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);
export function parseFoldStore(raw: string | null): FoldStore {
  const out: FoldStore = Object.create(null);
  const data = readJson(raw);
  if (!isRecord(data)) return out;
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object") out[k] = { open: stringsIn((v as { open?: unknown }).open) };
  }
  return out;
}
export function foldPage(store: FoldStore, ekey: string): FoldPage {
  return store[ekey] || { open: [] };
}
export function withFoldPage(store: FoldStore, ekey: string, patch: Partial<FoldPage>): FoldStore {
  return { ...store, [ekey]: { ...foldPage(store, ekey), ...patch } };
}
export function movedFolds(store: FoldStore, moves: Record<string, string>): FoldStore {
  const out: FoldStore = Object.create(null);
  for (const [k, v] of Object.entries(store)) out[Object.hasOwn(moves, k) ? moves[k] : k] = v;
  return out;
}
