# Before the journal loads, one module

## Why

Candidate 7 of the first `/improve-codebase-architecture` run, sharpened
by the scan of 1caedb3..45f036b: the load's three states read in many
places, the act refusal in lifecycle.ts, three refusals of session.ts's
own that read `warmed` alone, and the slow-load pin moved to a module of
its own only to clear a duplication threshold.

## Decided (the reader, 2026-11-13, by grilling)

1. src/ui/journalLoad.ts: `loadState` (loading, failed, in),
   `refuseCold` moved from lifecycle.ts, and the pins (`start`, `landed`)
   with loadPatience.ts folded in and the failed-read pin out of main.ts.
2. ⌃⌘., ⌃⌘R and the entry link refuse through `refuseCold`.
3. Panels keep their own empty lines and read the state; the waits too.

## Record

- Built as decided; loadPatience.ts and its test deleted, lifecycle.test's
  loading test moved. The slow-load pin keeps its straight apostrophe
  (the apostrophes are a question of their own).
- Decision 2 changes nothing a reader sees: after a failed read the pin
  "the store could not be read — reload" outranks what an act says, and
  ⌃⌘. left it showing (MEASURED, headless, IndexedDB's reads made to
  throw). The scan's "still loading forever" was the words under the pin.
- tools/claudeLayout.test.ts caught its first module: journalLoad.ts,
  missing from CLAUDE.md's layout until named.
