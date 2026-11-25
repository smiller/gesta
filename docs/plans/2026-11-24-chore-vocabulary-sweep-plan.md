# The retired-word checker, a sweep run at a rename (S28)

Asked 2026-11-24: "Can we tell whether the retired-vocab checker is useful
or is doing false positives?", then, of the refusals gathered, "#3, #9,
and #10 are definitely false positives. #6 we don't seem to have data
for", then (b).

## Decisions

1. The rules and their own tests stay; the tree-wide refusal leaves the
   suite, so `verify` and the pre-commit hook no longer run it.
2. `npm run vocabulary` (`tools/vocabularyRun.ts` over `retiredLines`)
   lists every line using a retired word, run whenever a word is retired.

## Record

- 20:45 The evidence (`tools/out/s28/refusals.md`, gathered from 22 session
  transcripts and the checker's 19 commits, 307,823 tokens): 11 refusal
  events, 7 a new rule's first sweep, 4 in later work. Of the 4, two false
  (#3 "cite", #10 "notice"), two without the lines printed; one sweep
  (#9) held three false among its renames. No confirmed case of an old
  word creeping back caught. At a rename it found what to rename (the view
  rename's ~253 lines). Built: `retiredLines`, `vocabularyRun.ts`, the
  CLAUDE.md clause.
