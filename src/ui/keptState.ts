export interface KeptStores {
  places: { move(from: string, to: string | null): void; moveAll(moves: Record<string, string>): void };
  folds: { move(moves: Record<string, string>): void; drop(keys: string[]): void };
  bookmarks: { move(moves: Record<string, string>): void };
}
/* moved: the entry is now at the other key; merged: it joined an entry
   already there; gone: deleted */
export interface Relocation { moved?: Record<string, string>; merged?: Record<string, string>; gone?: string[] }
export interface KeptState { relocate(r: Relocation, open?: () => void): void }

const some = (m: Record<string, string>): boolean => Object.keys(m).length > 0;
/* the folds and bookmarks BEFORE the open, the places AFTER it (pin:
   keptState.test › a moved key takes its folds and bookmarks before the
   open); a gone key's bookmark is neither moved nor dropped (pin:
   keptState.test › a gone key's folds and place are dropped) */
export function keptState(s: KeptStores): KeptState {
  return {
    relocate({ moved = {}, merged = {}, gone = [] }, open) {
      const dropped = [...Object.keys(merged), ...gone];
      if (some(moved)) s.folds.move(moved);
      if (dropped.length) s.folds.drop(dropped);
      const marks = { ...moved, ...merged };
      if (some(marks)) s.bookmarks.move(marks);
      open?.();
      if (some(moved)) s.places.moveAll(moved);
      for (const k of dropped) s.places.move(k, null);
    },
  };
}
