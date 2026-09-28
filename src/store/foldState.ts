/* What a folding contents page remembers between visits (2026-09-28, the
   contents-folds plan): its open sections, by heading text, so coming back
   shows the page as it was left (where the reading stood is placeState.ts's,
   for every entry: the link it was left from, kept here first, retired). ONE localStorage key, NS + "folds", a JSON
   map from entry key to a page record — a per-browser convenience, never
   in the text or a backup. Parsing forgives anything:
   a damaged store is an empty one. */
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
