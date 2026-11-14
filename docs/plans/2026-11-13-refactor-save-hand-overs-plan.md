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

## The confirmation pass (be0df65..1d82979)

`/code-review` at high, asked: 93,549 tokens (MEASURED, the transcript's
last message). Ten findings, all stand; fixed in one commit:

1. `moved()` compared the screen's text with the stored text as opened,
   and an entry stored in another form than the editor writes back never
   read as moved, so `refresh` left a deleted link or an import's text
   unrepainted. It now compares the store with what the save last opened
   or wrote, and counts edits instead of reading the screen.
2. Text typed during a hand-over into an entry deleted elsewhere was
   refused into a pin the next open lifted: lost. The ends now write past
   that refusal, as before 1d82979; decision 2 kept for ordinary saves.
3. A hand-over's ends wrote whatever the screen showed, another entry's
   text after a navigation mid-rename; they now write nothing then.
4. Session exposed the whole save; now `now`, `flush`, `handOver`.
5. `guarded` repeated the write's guards; one path now.
6. `Relocation.flushed` copied `hand.md`; `keepTyped` aliased
   `hand.keep()`; both gone.
7. A comment claimed open's first act cancels; reworded. A test titled
   "flushes, suspends" asserted the hand-over; retitled, its two pins
   re-pointed.
