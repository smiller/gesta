# Reviews and the architecture run

When one is owed is in `CLAUDE.md` (REVIEWS, BY BATCH, and THE GATE): a
batch touching a DOM seam or closing a phase, after the accept. How each
is run:

- REVIEWS, BY BATCH: the free checkers first, then ONE `/code-review` at
  HIGH over a commit range, when a batch touches a DOM seam (main.ts,
  session.ts, editor.ts, paste.ts, renderedView.ts, sourceView.ts) or
  closes a phase, never per commit. Its findings land in one fix commit. A
  confirmation pass is offered at its measured price, runs only on the
  reader's word, and only when a finding changed behaviour. High, not
  medium, and no cheaper tier (record:
  docs/plans/2026-09-28-feat-contents-folds-plan.md). EVERY review's cost is recorded in its plan's record and reported:
  the last message of the run's `subagents/agent-*.jsonl` transcript,
  input + cache creation + cache read + output tokens, never estimated. A
  reviewer finding a MECHANICAL class (a literal, a name that does not
  resolve, a comment shape) owes a checker under `tools/`, not just a fix.
- THE ARCHITECTURE RUN, beside each batch's review, after the accept:
  `/improve-codebase-architecture` (Matt Pocock's, in `.claude/skills/`
  with `codebase-design`, `grilling` and `domain-modeling`, pinned at
  mattpocock/skills `7739eae`, never edited here), aimed at the batch's
  files. Not in the Stop hook: it is a judgement that always finds a
  candidate. A batch made only of an architecture run's own builds gets
  its review but no further architecture run: its files are the ones that
  run just read. A Strong candidate is grilled, then built test-first or
  set aside for now; a Worth-exploring one gets one decision: built now,
  kept on the W list (Worth exploring) with its files and the friction
  the run saw, or dismissed, to come up again if the code makes it
  stronger. An ADR in `docs/adr/`, which the skill reads, is written only
  when the reader asks that a candidate not be raised again. "It suggests
  nothing" means every candidate built, kept or set aside. Its cost is
  recorded like a review's.
- NOT YET — more prose checkers: one is added when its class first shows
  up in a review, with its self-test, its hit count measured before its
  rule is chosen.
