# Readings see only what the act said: the app numbers what it says (U16)

Asked 2026-11-23: "We definitely shouldn't be checking for wording which
isn't even related to the actions in the test", after F5's readings showed
the launch's "10 entries stored" where an act said nothing.

## Decisions

1. The ledger numbers each thing said and publishes the last eight in
   `data-said-log`; a reading of what was said gives what was said since
   the step's previous log, oldest first, joined with " · ", "…" where
   more was said than kept.
2. What stands is the error only: a warning fades on the clock.
3. The checker refuses a reading or wait on live alerts outside the
   places their showing is the point.
4. (Asked after the first play) What the app says of its own accord stays
   out of the numbered log: the launch's count, the recovery "saved", the
   backups' and search index's lines, and every progress line. They are
   `background` in the alert table. A reading about such an event reads
   the state it leaves.
5. The bridge reads a fresh page each time; the reader marks after each
   look. A click that closes an alert marks once its "copied" has landed
   (`closeCorner`).

## Record

- 19:59 Started; 20:16 set aside for U17; 20:29 back.
- 20:41, written at the commit: the first play showed the background
  lines landing in every window ("11 entries stored · already here", a
  count of "saved" that differed between the runs), hence decision 4,
  test-first. The second showed a closing click's "copied" landing after
  the mark, and an import's progress steps counted as lost: hence
  `closeCorner`, and background left out of the count. The list step
  reads its warning before the code block's log moves the mark. The last
  play's diff: readings that carried an earlier step's words now read ""
  ("61, Enter", the go to toolbar's, "⌃⌘G stanza ii, line 3"); the
  reader's "6 entries stored" reads the bundle's own "6 entries"; the
  bridge's status reads ""; "after the click" waits for its "copied".
  Approved; verify passes with all four runs. F4 woke once on the way
  (the column marks drag), its print kept.
