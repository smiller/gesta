# A journal day or a commonplace folds under its ## headings

## Why

A long day or commonplace has no way to set a section aside, as a work's
contents does. The backup: 1864 of 7768 days and 6 of 98 commonplaces have
a `##` heading (MEASURED).

## Decisions (asked)

- Any journal day or commonplace with a `##` folds.
- Its sections start open; what is remembered is the closed ones.
- A closed one shows its word count; it may need no label at all.

## Record

- 28a345f: a fold kind (contents, sections, none) in contents.ts, a closed
  list in foldState.ts, the plugin taking the kind; a change reported with
  the kind it has now, after the Helium verdict caught a contents page
  drawn before the warm remembering nothing. A Helium section on a day and
  a commonplace. Hand-checked on 7 January 2025 and Verdour; accepted.

## The batch's review (a7f41e5..9d213f2: S6, S7, S5)

`/code-review` at high: 163,463 tokens (MEASURED: the last usage line of
subagents/agent-a809d5715d729099a.jsonl, input 2 + cache creation 2,557 +
cache read 157,994 + output 2,910). Ten findings:

1. The measuring passes read a closed section's blocks: kept, a skip of
   `.folded` in fit.ts and margins.ts; the failure not reproduced, the
   prose's English at 521–522 px open, closed, revisited and alone, with
   the skip or without (MEASURED, Helium).
2. A deleted entry's fold record outlived it: the delete drops it.
3. Every keystroke counted every section's words: counted only for a
   closed section, when drawn.
4. The directive one-off left unreported a line the old reader took: see
   the directive names record, refused.
5. The Helium selection record captured a stack on every call: only on the
   call that empties a selection, `isCollapsed` for the length.
6. A past day's redraw named today's artifact to republish to: it says so
   instead; page.ts's main draws through `drawn`.
7. Two comments spoke of the plugin's behaviour: the decision moved to it.
8. Three labels missed by the page renames: renamed.
9. A second pluraliser beside `counted`: `counted` used.
10. A dead "contents" fallback and two hand-written inversions: the kind
    required, one `flipped` both ways.
