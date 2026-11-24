# Helium readings read what was said, not the fading corner (F5)

Asked 2026-11-23: "Are we really failing tests based on whether the
success alert 'saved' appears or not? That seems very fragile." Then "do
all three": fix the grid step, sweep the class, add a checker.

## Decisions

1. A reading of what the page said reads `__said`: the error or warning
   standing, else what was said last of any kind, whether or not it still
   shows. The ledger records the kind said last (`said.last`) for it; it
   recorded only the newer of info and success, so a faded warning read
   as an older info.
2. A step about an error being resolved reads what stands
   (`R.standingText`), not what was said.
3. The corner is read only where its showing is the point: the screen
   line, which the verdict scrubs, and the launch section's fade checks
   under the page's own clock. `tools/saidReadings.test.ts` holds that,
   each allowed place with its count and reason.
4. The logged key stays "corner" where the reading's meaning is
   unchanged, so the verdict's diff shows only values.

## Record

- 19:35 F5 started. The grid step waited for "saved" and logged the
  corner; it now waits for no error to stand and logs what stands.
- 19:44, written at the commit (the steps between 19:35 and now): 21
  corner readings found by the rule on HEAD's files (17
  `__corner()` beyond the screen line, 4 `R.corner` beyond the launch's
  fade checks), all moved to `saidText` (`__said`). The first play read
  "10 entries stored" where the fade had left "", and "already here"
  faded to an older info: hence `said.last`, test-first in
  alertLedger.test.
- "A over the list repaired" read the resolved error as last said:
  it now reads what stands. The verdict differed in 12 readings, each a
  fade-dependent value turned to what was said or what stands; approved,
  the order, bridge and reader runs passing.
- The checker: 2 tests, failing with views.ts put back.
