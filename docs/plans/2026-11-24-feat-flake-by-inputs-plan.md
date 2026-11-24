# A flake defined by its inputs (U20)

Asked 2026-11-24 14:55: "do 1, then 2" (the ways the flake stats could
cut flakes; 1 is this).

## Decisions

1. Each verdict play's ledger line carries every run's input fingerprint
   (the one the stamp reads, first 16 hex), a run not replayed included.
2. A run is a flake where the same inputs, played whole on any tree, read
   more than one way: its result and the sections it read otherwise. The
   plays before a commit count; a play of some sections does not.
3. The rate over committed whole plays stays beside it.
4. A failed whole play prints a request to replay it unchanged before any
   edit, not through heliumThrottle, which the ledger never sees. A
   request, not an automatic replay: a reading changed on purpose would
   cost a second play each time.

## Record

- 15:39 Built: `readTwoWays` in `tools/heliumLedger.ts` (tested),
  `inputs` on each line, `heliumRate.ts` prints "same inputs played
  again: n runs, k read more than one way" and each such run's ways. The
  first line with fingerprints: verify's play at 15:39 (all four ok).
