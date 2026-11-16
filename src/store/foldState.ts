/* a per-browser convenience, never in the text or a backup. Parsing
   forgives anything: a damaged store is an empty one (pin: foldState.test ›
   an absent, empty or damaged store reads as empty) */
import type { FoldKind } from "./contents.ts";

export interface FoldPage { open: string[]; closed: string[] }
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
    if (v && typeof v === "object") out[k] = { open: stringsIn((v as { open?: unknown }).open), closed: stringsIn((v as { closed?: unknown }).closed) };
  }
  return out;
}
export function foldPage(store: FoldStore, ekey: string): FoldPage {
  return store[ekey] || { open: [], closed: [] };
}
export function withFoldPage(store: FoldStore, ekey: string, patch: Partial<FoldPage>): FoldStore {
  return { ...store, [ekey]: { ...foldPage(store, ekey), ...patch } };
}
export function movedFolds(store: FoldStore, moves: Record<string, string>): FoldStore {
  const out: FoldStore = Object.create(null);
  for (const [k, v] of Object.entries(store)) out[Object.hasOwn(moves, k) ? moves[k] : k] = v;
  return out;
}
/* the sections an entry holds otherwise than its kind starts them */
export const remembered = (page: FoldPage, kind: FoldKind): string[] => (kind === "contents" ? page.open : page.closed);
export const remembering = (kind: FoldKind, keys: string[]): Partial<FoldPage> => (kind === "contents" ? { open: keys } : { closed: keys });
