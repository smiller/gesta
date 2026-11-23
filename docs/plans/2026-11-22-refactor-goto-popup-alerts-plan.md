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
- Asked, after reading the whens: "make both say 'no paragraph numbers
  here'". A paragraph asked for on a page with no `::: prose` block said
  "no numbered paragraphs here", a word from `nothingNumbered`'s "no
  paragraph numbers here"; it raises `nothingNumbered` now, and
  `noNumberedParagraphs` is gone.
- The batch review (A15), `/code-review high a52e7e3..HEAD` over U7, U9,
  U12 and U10: 153,810 tokens (its transcript's last message). Seven
  findings, fixed (asked: "Go"):
  1. U9's `.page > :first-child` lost the cascade to a verse's, prose's,
     note's, card's and grid's own margins: MEASURED 22px under a verse
     block, 17px under a grid; `#editor` gives it the weight, read 0 now.
  2. A first line's format bar covered the alert area (MEASURED 107–146px,
     the area ending at 148px). Mocked three ways
     (https://claude.ai/artifact/E3fDta8h8k4TgxSWpt2tdo): (a) the bar under
     the selection was picked, built, and the verdict showed its cost, a
     click under a top selection landing on the bar (keys › Tab in a code
     block); then (c), asked: "If we're bringing up the formatting popup
     and it would otherwise impinge on the alert area, can we move the
     text down", mocked and picked: the text moves down by what the bar
     lacks, only when a gesture settles, and back when the bar hides.
  3. Twelve whens name "or a link to a line" where a link reaches them.
  4. CLAUDE.md names goto.ts's `popup`.
  5. A comment in gotoPopupActs.ts saying which messages are infos went.
  6. `popupByOldName` bounded by letter case, not `\b`, which would have
     missed `lineBarActs`.
  7. goto.test asserts each case's measured id; the hand-kept set went.
- Found while fixing: the alert area follows a shrinking masthead a frame
  late, so "the entry's top" waits for it (an entry opening on a grid read
  −27 after a verse entry's Line numbering row); the format bar left
  standing after a navigation is S23.
