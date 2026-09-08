/* WHERE THE VIEW TOGGLE PUTS YOU BACK, pure. Ported 2026-09-07 from
   13b-the-view-switch-and-its-carets.js. The two views are different
   documents — the source differs from the rendered text by every syntax
   character — so a held position cannot survive the flip. What survives
   is a COUNT: how many flat characters precede the caret, held per view
   on the way out with the flat TEXT beside it as the staleness test, and
   handed back on the way in. A count, not an index: a caret parked at a
   paragraph's end shares an index with the next paragraph's first
   character and must not be handed back a paragraph down. THE ONE
   APPROXIMATE THING is the alignment between the views: markdown only
   ADDS characters to what you can read, so the rendered stream is a
   subsequence of the source stream, and one greedy walk aligns them in
   either direction. A hold is exact; the map is the fallback, and a
   MOVED caret retires the other view's hold, or a reader who moved on in
   one view arrives back where the other's older hold pointed. */
import { type Flat, lastMapped } from "../model/flatten.ts";

export interface Hold { at: number; text: string; tail: boolean; seen: boolean }
/* the count of flat characters before a position of the view's own
   (a document position, or a raw index into the source text) */
export function countBefore(flat: Flat, pos: number): number {
  for (let i = 0; i < flat.pos.length; i++) {
    const p = flat.pos[i];
    if (p == null) continue;
    if (p === pos) return i;
    if (p > pos) return lastMapped(flat, i) + 1;
  }
  return lastMapped(flat, flat.pos.length) + 1;
}
/* the position a count lands on: BEFORE the counted character, or —
   where the map has no position for it — after the last one that does,
   which lands a caret at a paragraph's end inside that paragraph rather
   than at the top of the next; null past everything */
export function positionAt(flat: Flat, at: number): number | null {
  const p = flat.pos[at];
  if (p != null) return p;
  const i = lastMapped(flat, at);
  return i >= 0 ? flat.pos[i]! + 1 : null;
}
/* the count in the other view's stream. Coming to the rendered side the
   extra characters simply never advance the count. Going to the source,
   everything the source has and the rendered does not sits between the
   boundary after the last match and the caret's own character, and which
   side the reader belongs on depends on the run: a picture's marker or a
   table's divider are separate TOKENS and the caret goes after them; a
   link's `[` or bold's `**` is glued to the word and the caret belongs
   before it, or typing corrupts markup. Crossing WHITESPACE tells the two
   apart. The probe is several characters, since a run can CONTAIN the
   one the caret sits on. Past the last rendered character the rest is
   source-only, and belongs behind a reader who was below it all. */
export function crossViewOffset(from: string, to: string, at: number, toSource: boolean, pastTail: boolean): number {
  const sub = toSource ? from : to, sup = toSource ? to : from;
  let i = 0, j = 0;
  while (j < sup.length && (toSource ? i < at : j < at)) {
    if (sub.charAt(i) === sup.charAt(j)) i++;
    j++;
  }
  if (!toSource) return i;
  if (at >= sub.length) return pastTail ? sup.length : j;
  const probe = sub.substr(at, 4);
  let after = sup.indexOf(probe, j);
  if (after < 0) {
    after = j;
    while (after < sup.length && sup.charAt(after) !== sub.charAt(at)) after++;
  }
  return /\s/.test(sup.slice(j, after)) ? after : j;
}
/* the count to land on in a view being entered: the hold when it still
   describes this text, else the place the view just left was held at,
   carried across; null with nothing to go on */
/* THE VISIBILITY BIT IS THE LEAVING VIEW'S, whichever count is used: an
   exact hold remembers where this view's caret WAS, but whether the
   reader was looking at the caret is a fact about the view just left,
   written on every toggle — MEASURED 2026-09-07, a reader scrolled to
   the bottom was pulled back to the top by a hold whose own bit was
   older than the scroll. */
export function arrivingCount(held: Hold | null, left: Hold | null, text: string, toSource: boolean): { at: number; tail: boolean; seen: boolean } | null {
  if (held && held.text === text) return { at: held.at, tail: held.tail, seen: left ? left.seen : held.seen };
  if (left) return { at: crossViewOffset(left.text, text, left.at, toSource, left.tail), tail: left.tail, seen: left.seen };
  return null;
}
