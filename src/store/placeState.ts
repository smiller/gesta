/* A place is the TEXT POSITION at the top of the window in the rendered
   view — a pixel offset drifts with the window's width and with edits above
   — and the scroll offset for the source view (pin: placeState.test › a
   place round-trips). Parsing forgives anything: a damaged store is an
   empty one (pin: placeState.test › an absent or damaged store reads as
   empty). A per-browser convenience, never in the text or a backup. */
export interface Place { pos: number; y: number }
export interface PlaceRecord extends Place { key: string }
export const PLACES_CAP = 300;

export function parsePlaces(raw: string | null): PlaceRecord[] {
  let data: unknown;
  try { data = JSON.parse(raw || "[]"); } catch { return []; }
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is PlaceRecord =>
    !!r && typeof r === "object" && typeof (r as PlaceRecord).key === "string" &&
    Number.isFinite((r as PlaceRecord).pos) && Number.isFinite((r as PlaceRecord).y))
    .map((r) => ({ key: r.key, pos: r.pos, y: r.y }));
}
export function placeOf(store: PlaceRecord[], key: string): Place | null {
  const r = store.find((x) => x.key === key);
  return r ? { pos: r.pos, y: r.y } : null;
}
export function movedPlace(store: PlaceRecord[], from: string, to: string | null): PlaceRecord[] {
  const r = store.find((x) => x.key === from);
  const rest = store.filter((x) => x.key !== from && x.key !== to);
  return r && to ? [{ key: to, pos: r.pos, y: r.y }, ...rest] : rest;
}
export function withPlace(store: PlaceRecord[], key: string, place: Place): PlaceRecord[] {
  return [{ key, pos: place.pos, y: place.y }, ...store.filter((x) => x.key !== key)].slice(0, PLACES_CAP);
}
/* as movedPlace: a record already under a new key goes, so the moved one wins
   (pin: placeState.test › movedPlaces: the moved record wins) */
export function movedPlaces(store: PlaceRecord[], moves: Record<string, string>): PlaceRecord[] {
  const targets = new Set(Object.values(moves));
  const out: PlaceRecord[] = [];
  for (const r of store) {
    if (Object.hasOwn(moves, r.key)) out.push({ key: moves[r.key], pos: r.pos, y: r.y });
    else if (!targets.has(r.key)) out.push(r);
  }
  return out;
}
