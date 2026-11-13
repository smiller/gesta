# The open entry's save, one module

## Why

Candidate 5 of the first `/improve-codebase-architecture` run
(2026-11-12): the save lived in `startSession`, three variables and six
functions over a 533-line module with no test file; three of its races
were marked "Unpinned", no Helium step able to hold them open.

## Decided (the reader, 2026-11-13, by grilling)

1. `src/store/entrySave.ts`, no DOM: the debounce, a rename's suspension,
   an entry deleted elsewhere, and the decision whether to write.
2. Given a reading of the screen (key and text, or none), the entry
   layer's `entryMd`, `setEntry` and `storeReadFailed`, and two
   outcomes; hands back `edited`, `now`, `flush`, `suspend`, `opened`,
   `deleted` and `unsaved`.
3. Tested under Vitest's fake timers; the three save races become tests
   and their comments pins.
4. session.ts keeps the window's leave events, the deleted entry's
   notices, `refresh`, and the "saved" display time; `Session`'s
   `saveNow`, `flushSave` and `suspendSaves` pass through. No behaviour
   change.

## Record

- Built as decided, two details set in the building: the write's outcome
  is `wrote(landed)`, not `saved()`, since session.ts redraws the masthead
  after a write that failed too; `deleted()` takes no arguments, reading
  the screen as the notice did.
- entrySave.test.ts (nine tests) failed on the missing module first.
  session.ts 533 → 508 lines (MEASURED, `wc -l`); the three changed files
  at Code Health 10.
