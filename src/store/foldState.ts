/* a per-browser convenience, never in the text or a backup. Parsing
   forgives anything: a damaged store is an empty one (pin: foldState.test ›
   an absent, empty or damaged store reads as empty) */
export interface FoldPage { open: string[] }
export type FoldStore = Record<string, FoldPage>;

export function parseFoldStore(raw: string | null): FoldStore {
  const out: FoldStore = Object.create(null);
  let data: unknown;
  try { data = JSON.parse(raw || "{}"); } catch { return out; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const rec = v as { open?: unknown };
    out[k] = { open: Array.isArray(rec.open) ? rec.open.filter((x): x is string => typeof x === "string") : [] };
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
  for (const [k, v] of Object.entries(store)) out[k in moves ? moves[k] : k] = v;
  return out;
}
