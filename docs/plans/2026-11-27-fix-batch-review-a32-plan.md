# fix: the batch review's findings, 32b7579..6e633fd (A32)

## Decisions

- The batch (U29.1 Stephanus passages; S33, U33, U34) touched main.ts and
  session.ts: one `/code-review high 32b7579..6e633fd`, nine findings.
- Fixed (each test-first):
  1. A note's passage label drew its number in the gutter: the passage rule
     (0,4,1) outweighed the note rule (0,3,2). The note rule is named again
     with the weight; Helium "passages" gains a note naming ⟨7a⟩.
  2. Unused pictures keyed by base name: two folders' `Introduction-img-1.webp`
     collide. Each row carries its store key, and the list is keyed by it.
  3. Two overlapping panel reads left the first list's picture URLs alive:
     a new list now lets the one it replaces go.
  4. A resume granted in its click asked queryPermission again, which could
     hang as before: a run after a resume, or after a folder is picked, goes
     straight on.
  5. A slow queryPermission answering granted after the wait was dropped: it
     now lifts the pause and runs.
  9. Decisions in the panel component (setup, resume, where the change link
     stands, the unused pictures' words) moved to backupsModel.ts with tests.
- Dismissed: 6 (an entry with passages and verse lines loses its Line box: no
  entry has both, and the reader chose the one passage box); 7 ("no page 6d
  here" on a page-numbered book: true, and plainer than the old refusal); 8
  (no change link while loading or after a failed load: the loading case was
  in the mock picked, and a failed load already says to reload).

## Record

- 14:43 the review ran; cost 117,317 tokens (input 2, cache creation 2,683,
  cache read 111,811, output 2,821), from the last message of its transcript.
- 14:5x fixes 1-5 and 9: each failing test first (two overlapping-read and
  twin tests first passed without the fault and were rewritten to hold the
  second read; the twin render cannot see a duplicate key server-side);
  backup.ts held at health 10 by naming the paused check; the corner diff
  (the note's gutter "none") read and approved; `npm run verify` green.
- 15:00 the architecture run (A32.1) walked the batch's files; cost 123,179
  tokens (input 2, cache creation 421, cache read 115,810, output 6,946),
  from the last message of its transcript. Five candidates, all built:
  1 the Stephanus number (5bb58da), 2 the panel follows the runner
  (2b5dd45), 4 trouble as a kind (dcdb54e), 3 the panel's lines (1156c91),
  5 pictures' one answer, fixing S35 (a70131f).
