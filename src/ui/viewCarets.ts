/* The two views are different
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
   one view arrives back where the other's older hold pointed (pin:
   viewCarets.test › an exact hold wins while the text matches) */
import { type Flat, lastMapped } from "../model/flatten.ts";

export interface Hold { at: number; text: string; tail: boolean; seen: boolean }
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
   side a reader belongs on depends on the run: a picture's marker or a
   table's divider are separate TOKENS and the caret goes after them; a
   link's `[` or bold's `**` is glued to the word and the caret belongs
   before it, or typing corrupts markup. Crossing WHITESPACE tells the two
   apart. The probe is several characters, since a run can CONTAIN the
   one the caret sits on (pin: viewCarets.test › to the source, glued syntax
   stays ahead of the caret). Past the last rendered character the rest is
   source-only, and belongs behind a reader who was below it all (pin:
   viewCarets.test › past the last rendered character) */
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
/* THE VISIBILITY BIT IS THE LEAVING VIEW'S, whichever count is used: an
   exact hold remembers where this view's caret WAS, but whether a reader
   was looking at the caret is a fact about the view just left, written on
   every toggle — MEASURED, a reader scrolled to the bottom was pulled back
   to the top by a hold whose own bit was older than the scroll (pin: source
   view › ⌃⌘M back, still scrolled away) */
export function arrivingCount(held: Hold | null, left: Hold | null, text: string, toSource: boolean): { at: number; tail: boolean; seen: boolean } | null {
  if (held && held.text === text) return { at: held.at, tail: held.tail, seen: left ? left.seen : held.seen };
  if (left) return { at: crossViewOffset(left.text, text, left.at, toSource, left.tail), tail: left.tail, seen: left.seen };
  return null;
}
/* one view's count across its own text changed under it: the edit is
   taken as the one region between the common head and the common tail,
   so a count before it stays, one after it moves by its length, and one
   inside it goes to its start */
export function carriedCount(before: string, after: string, at: number): number {
  let head = 0;
  while (head < before.length && head < after.length && before[head] === after[head]) head++;
  let tail = 0;
  while (tail < before.length - head && tail < after.length - head && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
  if (at <= head) return at;
  if (at >= before.length - tail) return at + after.length - before.length;
  return head;
}
