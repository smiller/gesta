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
3. S6.1 and S27: a script's range is placed on a settled page, once;
   the driver's trace keeps the editor's last six DOM writes, so the next
   collapse names its writer. S27's selection takes the same path
   (`selectBetween`), and its miss prints the same trace. Neither cause
   is found: both stay paused, each watching its failure.
5. S25: `tools/helium-mock.ts <spec>` over a spec in `tools/out/mocks/`
   (backup entries, states, options); a "now" column always first; the
   frame with every floating bar lifted and outlined, and the text at
   each bar's middle read by `elementFromPoint`, not a real click (a click
   would change the state the next frame shows); `tools/mockPage.ts`
   writes one page, images inline. The backup's pictures are not seeded.
4. "a clean switch" reads whether the refusal still stands, not which
   info stands in the corner.

## Record

- 13:26, S26 started.
- 13:31, S26: "the entry's top" alone reads `below: 0` at all seven
  openings; the whole verdict playing, timed (P19's before).
- 13:33, P19's merge written test-first, its driver wiring parked as a
  patch until S26 is committed.
- 13:36, S26: the whole verdict passes as approved (corner, order,
  bridge, reader ok), 283.84 s; committed 9786c1d.
- 13:37, P19 started.
- 13:39–13:46, P19: corner and order together, each in n windows, the
  build included (`WINDOWS=n node tools/helium-approve.ts corner
  order`), every run passing as approved: 1 window 267.68 s, 3 121.68 s,
  4 96.18 s, 5 82.46 s.
- 13:47–13:52, P19: 6 windows 99.60 s; 8 81.45 s, its order run reading
  "editing as the help says" otherwise once (16 browsers on ten cores);
  5 again 73.96 s and 76.12 s, passing. The default is 5 (`WINDOWS=1`
  for one window).
- 13:54, P19: the whole verdict in 5 windows, 91.80 s against 283.84 s;
  its order run read "after a click outside" at a line's start, not
  inside a line: the click at (500, 400) came before an open menu had
  moved the page over. `settled()` now holds the text's left edge too,
  and the two clicks aimed at a fixed point (launch's, the source view's
  low caret) take it first.
- 13:56–14:01, P19: three whole verdicts in 5 windows, 92.70, 92.63 and
  93.58 s, none passing: corner read "a clean switch" with "saved" in
  the corner, not "10 entries stored", in all three (a clock reading);
  the order run read "after a click outside" otherwise once, "refused
  fence" once, and S6.1's "the toolbar did not show" once (13:58,
  collapse by `setSelection` 1 ms after `addRange`). The flakes first.
- 14:02, S6.1: ProseMirror's 20 ms focus timer ruled out: a selection
  set 0 to 40 ms after a focus gain, 0 of 330 collapsed
  (`tools/out/probes/focusRace.ts`). The bookmarks section alone in 10
  windows at once, 0 of 40 failed. Its predecessor differs between the
  two failing orders ("bookmarks damaged", "reference paste").
- 14:06, S6.1: reproduced the mechanism: a range placed by script, then
  a non-style attribute written on a row before the editor reads it,
  20 of 20 collapsed; a style write, a class on the editor's root or a
  write outside it, 0 of 20 (`tools/out/probes/mutationRace.ts`). The
  app's own attribute writes in `src/editor/` land on the root or on
  node views that ignore them (READ); the writer here is not found.
- 14:09–14:14, three whole verdicts in 5 windows (95.87, 101.20, 95.62 s):
  corner differed only on "a clean switch", as made, in all three; no
  S6.1, S27 or click-outside failure in six runs; the order run read
  "a picture pasted at the entry's end" with `md: null` once: its wait
  on "saved" in the corner matched the first paste's. Both picture waits
  now wait on the stored text holding the picture (`storedWith`).
- 14:15–14:20, three whole verdicts in 5 windows (98.34, 94.52, 97.54
  s): corner differed only on "a clean switch" each time, order, bridge
  and reader ok. Approved. P19, S6.1 and S27 done: since the placement
  waits, 0 of 6 whole verdicts showed S6.1 or S27, against 1 of 3 before
  (the 13:56–14:01 plays); a small sample, the trace now naming the
  writer if it comes back.
- 14:23, P19, S6.1 and S27 committed a48abe2; S25 started.
- 14:24, S25: the demo spec (`tools/out/mocks/demo.ts`, the journal day
  2026-06-25 idle and with a word double-clicked, the format toolbar as
  it stands and moved 48 px down) plays in 14.5 s, four frames and two
  lifted ones. Every frame first showed a band above the masthead (277
  px; 148 with the bars lifted): a wheel of -100000 past the top. A
  probe of the same page with no wheel read the masthead at 0. Now a
  wheel of just the scroll.
- 14:25, S25 committed 8fba266. Nothing owed: the batch touched tools/ alone, no DOM seam, so no review and no architecture run.
- 14:31, S6.1 and S27 reopened (asked: "Does that mean we think we've
  fixed S6.1 and S27, even though we couldn't determine what caused the
  problem?"). They were not fixed: S6.1's writer was never found, S27
  never reproduced, and 0 of 6 against 1 of 3 is about 9% likely with no
  change at all. The second placement on a collapse is removed (it would
  have hidden a recurrence and its trace); S27's miss now carries the
  trace; both paused with watches. a48abe2's message overstates it ("3 of
  3 before" counts every flake, not these two). The progress replay now
  reopens a done item that is started again (`tools/progress/events.ts`).
- 14:35, the hook's verdict read "after warm" with `show: false`: whether the warm's info still shows is a clock reading the fresh start's length under load decides. The step logs its words and the pill alone; approved.
- 14:53, P20 and P21 added (asked: "Let's add 1 and 2 as P items and
  start with 1"), from the timings: a stamped verify 14 s; bridge 7.46 s
  and reader 10.92 s played after corner and order; the corner run's 5
  windows 47.6-69.3 s, fixed sleeps 26 s of 291 s, no wait run out.
- 14:53-14:58, P20: all four runs in one group. Three whole verdicts
  passing, 91.26, 85.94, 87.13 s, against 91.80-101.20 s before: about 8
  to 10 s saved, not the 18 s estimated, corner and order slower beside
  two more browsers.
- 15:00-15:05, P20, three more whole plays: one passed whole; the
  bridge's status read "" for "10 entries stored" twice, the reader's
  corner lost "6 entries stored" once, and the code block's copy button
  read mid-fade once. The first two read an info whose 3 s on screen
  the load outlasted; the "places" fix (`settled()` round the squeezed
  masthead) holds otherwise.
- 15:10, asked: "Don't we already have an interface for that for errors
  and warnings so we don't need to rely on what's on screen? Can we do
  that for info as well?", then "does it make sense that we're testing
  css hover values?". The ledger keeps each kind's last words as raised
  and which of info and success spoke last, published as `data-said`;
  `window.__said()` reads standing errors and warnings, then the last
  info or success said. The bridge's status and the reader's corners
  read it. The hover step waits for the copy button to show and no
  longer reads its label's opacity, a CSS transition. The other corner
  readings, 80-odd, read an alert raised by the gesture just before.
- 15:15-15:20, three whole plays after `data-said`: bridge and reader
  passed all three (2 of 3 failed before); 93.99, 87.33, 89.36 s. The
  order run read "column marks" otherwise once; its received copy was
  gone when the next play passed. The Stop hook's suite, run beside the
  plays, failed a 100 ms wall-clock bound (261.6 ms): F3. P20 done.
