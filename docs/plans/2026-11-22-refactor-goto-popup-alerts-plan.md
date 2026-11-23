# The Go to popup's messages as alerts of their own (U10)

Asked 2026-11-22: "Let's add another U story for the line bar, and then
move on"; then yes to five questions, and "what does `goto.ts returns the
table's Said` mean?", answered.

## Decisions

1. Each message is an entry of its own in `ALERTS`, its `PHRASES` name its
   id; `unitAt` and `omitted` take an optional block part, `ofBlocks`
   stays the piece both use.
2. Kinds as before: a refusal a warning, a landing an info at 2500 ms.
3. Each entry's when written from its code path, read in docs/alerts.md.
4. goto.ts returns the table's `Said`; its own `Said` and the typed,
   absent and landing kinds go; tests name the alert's id.
5. The pass-through entries `gotoPopup` and `gotoPopupLanding` go.

## Record

- 25 entries moved from `PHRASES` into `ALERTS` (23 warnings, 2 infos);
  `notANumber` stays a piece too, a refused fence's reason using it.
- A message with no parameters is a plain string in the table, so
  `said("noStanzas")` takes none.
- goto.test reads words through `alertWords`; "typed" is a set of seven
  ids, and an "absent" number measured as `noUnit`.
- Helium: the verdict played and matched the approved run unchanged.
