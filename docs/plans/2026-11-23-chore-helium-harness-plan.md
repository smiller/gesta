# The Helium harness: a settled wait, the verdict in several windows, a mock harness, the flakes (S26, P19, S25, S6.1, S27)

Asked 2026-11-23: "Do S26, P19, S25, the flakes S6.1 and S27", in that
order; the flakes before P19 is finished if its parallel play makes them
fail too often to show a byte-identical run.

## Decisions

1. S26: the kit's `settled()` is one frame loop: the alert area flush
   under the masthead and the scroll and height the same over four
   frames. It replaces `still()` everywhere and `settledAlerts`; the
   layout readings (`place`, `margins`, `masthead`, `rowsClosed`,
   `listGaps`, `gridLayout`, `pill`, the entry's top's two) are taken
   through `laid(read)`.

2. P19: `SHARD=k/n` makes a driver play every n-th section from the
   k-th, in its own profile, and print its console lines by section; a
   pure merge (`tools/heliumShards.ts`) puts the windows' prints back as
   the one window's, byte for byte. Dealt in turn, so the merge needs
   only each block's place.
3. S6.1 and S27, the first guess: ProseMirror's focus handler sets a
   20 ms timer that writes the state's selection to the DOM when its
   observer has not yet seen the DOM's (prosemirror-view
   `handlers.focus`); a script's selection landing at about that moment
   is collapsed.

## Record

- 13:26, S26 started.
- 13:31, S26: "the entry's top" alone reads `below: 0` at all seven
  openings; the whole verdict playing, timed (P19's before).
- 13:36, S26: the whole verdict passes as approved (corner, order,
  bridge, reader ok), 283.84 s.
- 13:33, P19's merge written test-first, its driver wiring parked as a
  patch until S26 is committed.
