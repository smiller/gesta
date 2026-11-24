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
   edit, not through heliumThrottle, which the ledger never sees.
5. (U20.1, asked "yes, build it") Where the order run reads otherwise
   beside corner, the verdict replays both itself, once, unchanged: a
   reading changed on purpose reads alike in both orders (07:47, 10:13
   today), a flake in one (11-23 22:33, 23:14; 14:02's order). Bridge,
   reader and a failed section have no second play and still only ask.
   The play that read otherwise fails the verdict, its replay passing or
   not.

## Record

- 15:39 Built: `readTwoWays` in `tools/heliumLedger.ts` (tested),
  `inputs` on each line, `heliumRate.ts` prints "same inputs played
  again: n runs, k read more than one way" and each such run's ways. The
  first line with fingerprints: verify's play at 15:39 (all four ok).
- 15:49 Built (U20.1): `replayed` in `tools/heliumVerdict.ts` (tested);
  the verdict's plays each carry their own record and ledger line.
  Played over a throwaway edit making the order run read "launch, menus,
  the corner, links" otherwise: the replay fired (65 s, corner not
  replayed), two ledger lines at the same inputs (15:48:09, 15:49:13,
  uncommitted), the rate "1 run, 0 read more than one way". Edit
  reverted.
