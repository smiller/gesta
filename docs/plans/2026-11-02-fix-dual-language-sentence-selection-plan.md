# fix: a selection in a dual-language sentence's English

## The report (2026-11-02)

The reader selected the English of *Ars Poetica* 6–9 ("Believe me, dear
Pisos … to a single shape.") and saw Latin 7–8 selected beside it
("persimilem … uni"). What he wanted was 6–9, "credite, Pisones …
reddatur formae."

## What was wrong (MEASURED, headless Helium)

1. **The drag.** A sentence's English cell had `height: 0`, its text
   overflowing beside the Latin rows below it. A drag from "Believe" to the
   end of "shape." put its focus in row 8's Latin after "caput uni". So the
   selection was the English plus Latin rows 7–8, in document order. The
   hit test at the drag's end found the English text
   (`caretPositionFromPoint`, offset 190), but the drag's extension did
   not.
2. **Ref.** With the English alone selected, Ref cited 6 and quoted
   Latin line 6 alone: the sentence belongs to row 6 in the markdown.

## Ruled (2026-11-02, asked)

- A drag in the English selects the English.
- A selection with an end in a sentence's English takes in the Latin the
  sentence stands beside: from its own row to the last row before the next
  sentence or a note. Ref and ⌃⌘R cite and quote it: *Ars Poetica* 6–9.
- That Latin is highlighted as selected while the selection stands.
- The label is "6-9", not "6-9a". Half-line labels are for Old English
  verse alone, as *Beowulf* 50b-52.

## Built

- `editor.css`: the English cell keeps its own height, set at the row's top
  (`align-self: start`), and gives the row none of it through
  `margin-bottom: -100000px`.
  - Without `align-self` the cell stretched over the margin and moved the
    whole row down 100,000px.
  - Row 6 stays 27.9px high beside its 83.7px sentence (MEASURED).
- `dualLanguage.ts`:
  - `sentenceRange` widens a selection's ends that are in English;
  - `sentenceLatin` gives the Latin taken in, a range per row;
  - a plugin draws that range as `dl-covered`.
- `reference.ts`: `referencePayload` widens through `sentenceRange` before
  `wordEdges`.
- Tests:
  - `reference.test.ts`: "a selection in a sentence's English takes the
    Latin", and "sentenceLatin";
  - the Helium steps "a drag over one sentence's English" and "⌃⌘R on one
    sentence's English", on Ovid 1.569–73. Played on the build before the
    fix, the drag ended in the Latin, "…fatigat:", 418 characters. After
    it, it selects the 251-character sentence, marks its five Latin rows,
    and ⌃⌘R cites 1.569-73.
- Every other dual-language reading is unchanged against the approved run.
- `npm run verify` passed.

REVIEW CYCLES: 1
