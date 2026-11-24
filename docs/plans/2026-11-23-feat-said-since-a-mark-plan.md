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
- 21:05 A24, the batch review, `/code-review high d80134b..7980170`:
  149,370 tokens (the transcript's last message). Five findings, fixed:
  - "saved" was said whenever a save owner resolved, a failed entry
    deleted or the layer cleared included. It now comes from the layer's
    landing path alone (`settled(ekey, true)`), tested first in
    entries.test; the ledger's owner is plain again. Changes U17's
    decision 2 to "when the owed saves land".
  - The clean switch's refusal reads the standing error again, which
    what was said since the mark could not show.
  - The bridge waits on the save itself (`installWriteWatcher`, shared
    with the corner driver) and prints whether the wait ran out.
  - `said.last`, which nothing read, goes.
  - The chord table's comment keeps why every masthead row has a chord.
  The verdict differed only in the bridge's `saveWait`; approved.
- 21:31 A24.1, the architecture run over d80134b..886f8ad's 37 files:
  its walk 140,429 tokens (the transcript's last message). Five
  candidates: 1 one module for what was said since the mark, its window
  node-tested (Strong); 2 the ledger keeps one record of what was said
  (Strong, a deletion); 3 the save's landing: watcher and wait in one
  place (Worth exploring); 4 one launcher for the headless Helium tools
  (Worth exploring); 5 the editor's chords spelled from the chord table
  (Speculative).
- 21:36 Asked: 1 and 2 explored now, 3 and 4 after (A24.1.1-4); 5
  dropped, to come up again if the code makes it stronger.
- 21:40 A24.1.2 (grilled, asked yes): the ledger's second record goes
  (`said`, `saidAlerts`, `data-said`), with `__alerts` and `IDLE_TEXT`;
  the info place starts empty, the routine set naming "saved" and
  "copied" by id. The verdict played whole and passed unchanged.
- 21:50 A24.1.1 (grilled, asked yes): `tools/adapters/said.ts` owns what
  was said since a mark: the window a pure function (`saidSince`,
  node-tested: an empty window, since the mark, the "…" overflow),
  carried into the page by `inPage`; the kit's `log` and `closeCorner`
  the only marks; `saidAfterGesture` reads from its own start without
  moving the step's window; one wait (`waitForSaid`) for eleven; the
  page's `__said`/`__mark` globals and the two `R.` readings go; composite
  readings keep their key's place and fill it from the module. The
  checker allows the said log only in its owners. The verdict played
  whole and passed unchanged, but for two line readings that wrote ""
  for null, kept as null. F6 opened: the order run once read the search
  result step with no hit, a section this does not touch.
