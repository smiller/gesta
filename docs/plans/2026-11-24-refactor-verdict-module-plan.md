# The verdict as a deep module over adapters (A28.1.1)

Asked 2026-11-24: "Let's explore 1, with the ledger defect" (A28.1's
candidate 1, Strong; the run cost 132,289 tokens), then "yes" to the six
decisions below.

## Decisions

1. The stamp's import walk skips a whole type-only import or export:
   Node strips it, the file it names is never loaded. Its own commit.
2. `tools/heliumVerdict.ts` grows into the verdict; `ledger()` is
   `runFiles()`, "ledger" being the play log's word.
3. The verdict owns what was asked and its options, preparing, playing a
   group, judging, the replay, each play's record and every line printed;
   `helium-approve.ts` keeps argv, the build, the fingerprint's inputs and
   `--approve`.
4. Its seam: a player (play, clear its windows), a fingerprint, the run
   files (the failed-run keep and the diff among them), the tree, a
   record sink, the wake, a printer; and a clock for a play's seconds.
5. Its first tests are A28's three bugs and four behaviours beside them.
6. The print stays byte for byte.

## Record

- 18:22 The walk reached 46 files, now 43, without `tools/heliumLedger.ts`;
  `src/store/fsa.ts` left the expected set (every import of it a type; its
  code reaches a run through the build) (1872d37).
- 18:31 Built: `verdict(ask, ports)` with the seven tests through it;
  `helium-approve.ts` 190 lines to 112. The throwaway order edit printed
  the same 11 lines as at 18:08 under the old script, times scrubbed, and
  replayed corner and order both (18:29:38, marked replay); verify green.
