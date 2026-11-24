# Hunt F8, throttled (U21)

Asked 2026-11-24 14:55: "do 1, then 2" (2 is this).

## Record

- 16:12 ORDER=reverse heliumThrottle: 3 plays at 4x, 3 at 8x; no new-tab
  run-out. At 8x "replace" failed in all three (R.setSource's 1,500-line
  page.fill past 30 s), "places" read stayed:false once.
- 16:20 The corner at 6x (2 plays) and 8x (2): no new-tab run-out;
  "replace" as at 8x in all four.
- 16:24 tools/out/u21/tabs.ts, a click calling window.open(…, "_blank",
  "noopener") timed to the context's page event: a fresh browser's first
  https: tab 0.4-2.5 s, a file: tab under 90 ms, over 26 browsers idle,
  under 30 CPU spinners, with example.org answered by route, and beside
  a real 5-window play (slowest 2,466 ms). A renderer started for a new
  site, not the network, and never near the step's 5 s: F8 was a hang of
  its window (inferred). F8 left on its watch; the verdict now replays it
  (U20.1).
- 16:25 The replace section 14.8 s at 1x, 43.7 s at 4x (STEPS=replace
  TIMING=1, no fixed wait, no wait run out): the app's work, not a clock.
  Its fill at 1x is S29.
