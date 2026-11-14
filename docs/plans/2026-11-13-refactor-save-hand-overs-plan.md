# The save's hand-overs between entries

## Why

The architecture scan of 1caedb3..45f036b, its candidates 1 and 2: a
rename's suspension moved into the save as a flag only, its two ends
written by hand in lifecycle.ts (four writes past the save's guards, the
flush-check-suspend twice); session.ts's flush-then-go order pinned to
tests that could not see it; and, from the review, `refresh` able to
repaint over keystrokes typed while its flush wrote.

## Decided (the reader, 2026-11-13, by grilling)

1. The save owns the hand-over, the leaves and `refresh`'s question;
   Session's three pass-throughs go, callers hold `session.save`.
2. Text typed during a rename or move goes through the guarded write:
   refused for an entry deleted elsewhere, "saved" when it lands.
3. `refresh` repaints only when the store moved since the save last wrote
   or opened the entry, and nothing was typed since.
4. `handOver(ekey)` → `land(key, rewrite)` | `keep()`; `leave(then)`; the
   drop-leave stays the landing's open.
5. lifecycle.test runs on the real save.

## Record

- Built as decided. `opened` now takes the entry's key and stored text,
  the base `moved()` compares with; `suspend()` is gone, the hand-over
  its only way in.
- entrySave.test 13 tests, five new, each failing first on the missing
  act. lifecycle.test's fake session carries the real save, its acts
  logged; four assertions changed, `["flush", "suspend"]` to
  `["hand over"]`.
- entrySave.ts fell to 9.09 on two complex conditionals; split into
  `guarded` and `same`, back to 10. The approved run unchanged.
