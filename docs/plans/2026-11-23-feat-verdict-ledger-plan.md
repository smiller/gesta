# A ledger of every verdict play (U18)

Asked 2026-11-23: "you've been running test runs for weeks and months. To
say 'I can't tell just from this session' -- well, then, how can you keep
records so that you're able to verify that across sessions", then "yes to
all three".

## Decisions

1. The verdict appends one line per play to `docs/helium-runs/<day>.jsonl`,
   committed like the progress log: the time, HEAD, whether src/ or tools/
   had uncommitted changes, the window count, each run's result, the
   sections read otherwise, the save run-outs, the duration, the load.
2. Only a play of a committed tree is flake evidence: on an uncommitted
   tree a section read otherwise may be the change in hand.
3. A summary prints the rate per range and per section; the session start
   reports it against the last reading.
4. The ten plays measured tonight (five at 5 windows, five at 3) are its
   first lines.

## Record

- 22:30 The ten plays started before the build, so the ledger does not
  change the code they play; the build waits for them.
- 23:07 The measure: 1 window 0 of 5 plays read a section otherwise
  (286-288 s), 3 windows 0 of 5 (121-123 s), 5 windows 1 of 5 (86-90 s;
  F6, the search result's 5 s wait, in the order run).
- 23:17 Built: `tools/heliumLedger.ts` (a play's line from the verdict's
  own print; the rate counting only whole plays of a committed tree,
  every run played; both tested), run by the verdict as a child as the
  wake is, a line only when a run played; `tools/heliumRate.ts` prints
  the rate per day, window count and section. The fifteen plays are the
  ledger's first lines; verify's own plays since follow, uncommitted.
  F6 woke again in verify's first play (23:14, order run, 5 windows).
