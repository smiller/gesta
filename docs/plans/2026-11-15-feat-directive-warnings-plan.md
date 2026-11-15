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
