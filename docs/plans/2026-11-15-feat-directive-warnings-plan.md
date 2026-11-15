# A directive Gesta does not read is told

## Why

A line in a bookshelf entry's `::: reference` block that no directive
reads (a typo, the retired "roman book and canto"), or a directive on a
page it is not read from, was ignored without a word. A refused `:::` line
was told only on the switch back from the source view, so a reader who
never edited the source never saw it either.

## Decisions (asked)

- Both told: "“…” is not a reference directive", "“…” is read on a work’s
  page" (or an author's). The bookshelf alone, where directives are read.
- The seven directives one table in conventions.ts, their words and level
  written once for the reading and the report.
- Pinned with the refused fences, in one note, when an entry is drawn:
  opened, and on the switch back. A redraw in the source view checks
  nothing until the switch back.
- The backup: 20 directive lines, all known and in place. 2 of 17,353
  entries warned on open (MEASURED): one a false refusal, a line opening in
  inline code (`` `::: note`s within… ``) read as a fence; a line opening in
  inline code now quotes one and refuses nothing. The other, `::: verse -3`
  in a journal day quoting fence syntax, is escaped by hand.
- Played in Helium: the section "told on open", the approved run's only
  change.

## The batch's review and scan (1cb88ee..3b7eab6)

Review 166,688 tokens, scan 131,426 (transcripts).

- The warning on open shared the corner's one pin slot: it could cover a
  standing "not saved" and leave nothing when released, and every redraw of
  the entry pinned it again. It no longer covers a pin standing, and a
  redraw of the entry on screen neither pins it again nor releases it
  (asked). Each pin already had its own id: the review was wrong there.
- The save layer: a refusal for another tab's change on a key deleted since
  is told nowhere, as the other failure was (an old test's assertion
  changed with it); a failure is recorded only for a key not deleted since;
  a key a landing retried in vain waits for the next retry asked for
  (asked). A retry already skips a key whose write landed first.
- The columns in a window narrower than paired prose's measure: the edge
  moves in by half the shortfall; the Helium section reads 900px too.
- The Helium kit: `jump`'s comment says what it does not wait for; the
  wait for saves at keys.ts:70 is `landed`; the selection watch's
  "unmoved" asked of the watch itself.
- Scan candidate 1 (the entry layer's queue out of its interface, one
  record a key) to grill next; 2 and 3 wait.
