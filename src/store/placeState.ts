/* WHERE EACH ENTRY WAS LEFT (2026-09-28, the reader: back on Book I,
   Canto vi, the reading should stand at stanza 7, where it was left, and
   across reloads). One localStorage key, NS + "places": a list, the most
   recently left first, capped so it never grows past PLACES_CAP. A place
   is the text position at the top of the window in the rendered view —
   a pixel offset drifts with the window's width and with edits above —
   and the scroll offset for the source view. Parsing forgives anything: a
   damaged store is an empty one. A per-browser convenience, never in the
   text or a backup. */
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
export function withPlace(store: PlaceRecord[], key: string, place: Place): PlaceRecord[] {
  return [{ key, pos: place.pos, y: place.y }, ...store.filter((x) => x.key !== key)].slice(0, PLACES_CAP);
}
