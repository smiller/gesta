import type { Surface, Viewport, PlacePort } from "./surface.ts";
import { parsePlaces, placeOf, withPlace, movedPlace, movedPlaces, type Place } from "../store/placeState.ts";
import { stored } from "../store/local.ts";
import { NS } from "../store/keys.ts";

/* ARRIVING at an entry — a link, a walk, a pick, Back or Forward, a
   reload — returns to where it was last left, or the top on a first visit;
   one with a highlight owed goes to the top and holds nothing; KEEP (a
   refresh, a rename) moves nothing
   (pin: places › Back again) (pin: entries left and renamed › a long entry renamed, scrolled)
   (pin: placeKeeper.test › an arrival holds its stored place) */
export type Arrival = "arrive" | "owed" | "keep";
export type PageEvent = "hand" | "scroll" | "resize" | "leave";
export interface Page {
  on(event: PageEvent, fn: () => void): void;
  anchoring(on: boolean): void;
}
export type PlaceSurface = Pick<Surface, "source" | "placeAt" | "topAt" | "lineStart" | "reveal" | "scrollToPos" | "end" | "placeCaret">;
export interface PlaceKeeperOptions {
  surface(): PlaceSurface | null;
  window: Viewport;
  page: Page;
  storage?: () => Pick<Storage, "getItem" | "setItem">;
}
export interface PlaceKeeper extends PlacePort {
  /* `show` mounts the entry's view: the entry left is recorded before it */
  open(ekey: string, how: Arrival, show: () => void): void;
  reapply(): void;
  /* to null: deleted */
  move(from: string, to: string | null): void;
  moveAll(moves: Record<string, string>): void;
}

export function placeKeeper(opts: PlaceKeeperOptions): PlaceKeeper {
  const { window: win, page } = opts;
  const places = stored(NS + "places", parsePlaces, opts.storage);
  let key = "";
  /* a place the same as the last one written is not written: every scroll
     pause rewrote the whole list
     (pin: placeKeeper.test › skips a write the same as the last) */
  let lastWritten: (Place & { key: string }) | null = null;
  const write = (k: string, place: Place): void => {
    if (lastWritten && lastWritten.key === k && lastWritten.pos === place.pos && lastWritten.y === place.y) return;
    places.write((s) => withPlace(s, k, place));
    lastWritten = { key: k, ...place };
  };
  /* a rename carries the place to the new key, a delete drops it: a new
     entry under a deleted one's name opened where the deleted one was left
     (pin: entries left and renamed › deleted scrolled: its place dropped)
     (pin: placeKeeper.test › a rename carries the place) */
  function move(from: string, to: string | null): void {
    places.write((s) => movedPlace(s, from, to));
    lastWritten = null;
  }
  function moveAll(moves: Record<string, string>): void {
    places.write((s) => movedPlaces(s, moves));
    lastWritten = null;
  }
  /* the restored place is HELD, and set again on every resize, until a
     reader moves: a hand, or any scroll landing where this code did not put
     the window, a find among them. Read back from the scroll instead, the place drifted
     up with every picture above it. While held, the browser's scroll
     anchoring is OFF: a masthead shrinking after the restore let anchoring
     move the window 27px (pin: places › 400px grown above the held place)
     (pin: places › a held place, then a scroll no hand made) (pin: places ›
     a held place, the masthead shrinking under it) (pin: places › a forced
     entry left scrolled, returned to) (pin: placeKeeper.test › is set again on every resize)
     (pin: placeKeeper.test › survives a scroll landing 1px) */
  let held: { ekey: string; place: Place } | null = null;
  const setHeld = (h: typeof held): void => { held = h; page.anchoring(!h); };
  const release = (): void => { if (held) setHeld(null); };
  let placedY = 0;
  function record(): void {
    if (held && held.ekey === key) return;   /* the store holds it: it was restored from there (pin: places › Back again) */
    const s = opts.surface();
    if (!s) return;
    if (s.source) { write(key, { pos: -1, y: win.y() }); return; }
    const at = s.placeAt(win.under());
    write(key, { pos: at ?? 0, y: win.y() });
  }
  /* a position inside a closed section opens it: a hidden block has no box
     (pin: places › back to a place in a closed section) */
  function apply(p: Place): void {
    const s = opts.surface();
    /* left at the top, back at the top: the text position under the
       masthead lies below the page's top padding (pin: places › Horace followed) */
    if (!s || s.source || p.pos < 0 || p.y <= 0) win.scrollTo(Math.max(0, p.y));
    else {
      const pos = Math.min(p.pos, s.end());
      s.reveal(pos);
      try { s.scrollToPos(pos, win.under()); } catch { win.scrollTo(p.y); }
    }
    placedY = win.y();
  }
  const reapply = (): void => { if (held && held.ekey === key) apply(held.place); };
  let timer: ReturnType<typeof setTimeout> | null = null;
  page.on("hand", release);
  page.on("resize", reapply);
  page.on("scroll", () => {
    if (held && Math.abs(win.y() - placedY) > 1) release();
    if (timer) clearTimeout(timer);
    timer = setTimeout(record, 400);
  });
  page.on("leave", record);
  /* recorded BEFORE the next view is shown: shown first, a forced source
     view released, the source view's place read as a rendered one with no view
     and was lost (pin: places › a forced entry left scrolled, returned to)
     (pin: placeKeeper.test › records the entry left) */
  function open(ekey: string, how: Arrival, show: () => void): void {
    record();
    key = ekey;
    if (held && held.ekey !== ekey) setHeld(null);
    show();
    if (how === "keep") return;
    const p = how === "owed" ? null : placeOf(places.read(), ekey);
    setHeld(p ? { ekey, place: p } : null);
    if (p) apply(p); else win.scrollTo(0);
    caretAt(p);
  }
  /* an arrival gives the caret, never scrolling: a view mounted fresh had
     none, and a page could not be typed into until clicked. At a place
     held it is the start of the line at the top of the window, so the
     first key typed does not jump the window back to the start; any
     position on that line is taken back to its start
     (pin: placeKeeper.test › goes to the place held)
     (pin: placeKeeper.test › goes to the start of the held place's line, or of the line under the masthead) */
  function caretAt(p: Place | null): void {
    const s = opts.surface();
    if (!s) return;
    if (!p || p.y <= 0) { s.placeCaret(0, false); return; }
    /* in the source view the top line is taken as it stands: it starts a
       line on screen already
       (pin: places › typed at the place in a long paragraph's source) */
    if (s.source) { s.placeCaret(s.topAt(win.under()) ?? 0, false); return; }
    const pos = p.pos >= 0 ? Math.min(p.pos, s.end()) : s.topAt(win.under());
    s.placeCaret(pos === null ? 0 : s.lineStart(pos), false);
  }
  /* HELD like an arrival's place, and remembered: a closed section opens,
     and a page that grows above it — pictures, the fitted measure — sets it
     again (pin: the switch carries the text › ⌃⌘M back, then 400px grown above)
     (pin: places › a closed section's text switched to). The offset
     remembered is the one after the place is set, never below 1, and the
     hold keeps the same object, so a resize sets that offset again
     (pin: the switch carries the text › the switch's place remembered)
     (pin: placeKeeper.test › holds the position, applies it) */
  function carry(pos: number): void {
    const place = { pos, y: 1 };
    setHeld({ ekey: key, place });
    apply(place);
    place.y = Math.max(1, win.y());
    write(key, place);
  }
  return { open, reapply, move, moveAll, carry, release };
}
