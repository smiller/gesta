# A verse block numbered on both sides (2026-10-23)

For Ovid's *Metamorphoses* with Golding's translation (1567), a page apart
from the Loeb text with Miller's prose (2026-10-22-feat-dual-language-plan.md).
The reader's aim: the Tempest's borrowing from Golding (7.265–277, Medea's
speech) read beside its Latin.

## Asked (2026-10-23)

- Layout BY SENTENCE, from two mockups (by passage / by sentence): each of
  Golding's lines that opens a sentence or a clause (the line before ends in
  . ; : ? or !) stands level with the Latin line where that Latin starts;
  the shorter side waits. Latin lines are never split; a sentence opening
  part-way along a Golding line rides along with it.
- Golding AS PRINTED (Rouse 1904, the 1567 text), not modernised; "yͤ" as
  "the", "&" kept, Rouse's triplet braces dropped; ligatures spelled out
  (Phoebus, Euboea, Laelaps), diaereses on names dropped, as on the Miller
  page; Golding's side notes kept, as margin-notes; where the scans read a
  comma against a full stop, the comma.
- The Epistle and the Preface as pages of their own.
- THE SYNTAX, the paired verse form with a second number:

  ```
  ::: verse 179 244
  Tres aberant noctes, ut cornua tota coirent | Before the Moone should circlewise close both hir hornes in one
  | So softly as you would have thought they still a sleepe had bene.
  vivaque saxa sua convulsaque robora terra
  :::
  ```

  The second number is the right column's first line. In such a block a row
  whose left cell is empty is the right column's alone and takes no left
  number; a row with no pipe is the left column's alone. The right
  column's numbers are drawn on the right at the same interval.
- A PLAIN `::: verse` IS UNCHANGED, in a card or anywhere (the reader: "this
  feels like something that shouldn't change behaviour within cards"): the
  rule above holds only where the fence carries two numbers. MEASURED: the
  one entry with text after a bare `|`, 3x3 (18 rows, a card's two poems
  side by side), would otherwise have counted differently under ⌃⌘R.
- THE REFERENCE: `Ovid, *Metamorphoses*, 7.197-208 (Golding, 7.265-77)` —
  the work's heading `*Metamorphoses* (with Golding’s translation)` gives
  the title and the translator's name.
- ⌃⌘G GOES BY THE RIGHT COLUMN'S NUMBERS on a page of such blocks (the
  reader: "the main focus here is the Golding translation, not the Latin
  text").

## Defaults stated, not asked

- The page `bookshelf/Ovid/Metamorphoses (with Golding’s translation)`, its
  books, *The Epistle* and *The Preface* below it; the link on Ovid's page
  the reader's to add (an import never overwrites an existing page).
- The Latin, its notes and the headings as on the Miller page.
- An entry link with no lines: `Ovid, *Metamorphoses*, 7 (Golding)`.

## The text (tools/out/ovid/golding, git-ignored)

Rouse 1904 from two archive.org scans (shakespearesovid00oviduoft,
cu31924026559777) read against each other, Perseus (perseus-eng4) a third
witness for words only. Book 7 pilot: 1123 lines, every tenth checked
against Rouse's printed number; 273 disputes, 194 settled from the page.
Perseus splits two of Rouse's lines in Book 7, so its numbers run up to 2
ahead (MEASURED); Rouse's are used.

The rulings on the text (2026-10-23): a ligature on what is a plain e or o
in the Latin name gives the classical form (39 places: Aeneas, Peneus,
Ceyx, Onetor, Learchus, Emathian … and, by the same rule, Nestor, Mareotis,
Phlegra, Egerias, Eous, Eetions); Golding's 25 side notes in the books a
`::: note` at the foot of the passage, `[Golding’s side note at 8.400:
*Castor & Pollux.*]` (a margin-note inside a block numbered on both sides
stood in the text and parted both columns, MEASURED at 1100 and 1400px);
the Epistle's 15 stay margin-notes, the page one column. All 15 books
aligned, ≈4,130 sentences placed; every page round-trips through the app
and its numbers match the Loeb's and Rouse's, 0 lines different (MEASURED).
Import folder gesta-ovid-golding, 18 pages.

## Review

1ba56e7 accepted 2026-10-23. `/code-review high e9a3408..1ba56e7`: 148,780
tokens (the transcript's last message), ten findings, all fixed in one
commit:

1. A selection from one two-number block into the next was not refused:
   the two-blocks test read the left column alone. Both columns now.
2. A copy opening at the end of a pair's right cell copied an empty pair,
   numbering both columns one low. A pair's row ends with its last cell.
3. The right column numbered speakers, directions and a split line's rest.
   It counts as the left does.
4. One two-number block switched ⌃⌘G to the right column for the whole
   page, leaving a plain block unreachable. Each block is asked by its own
   column (a default, stated).
5. A dual-language block or a stanza carrying `facing` (pasted HTML) was
   written `::: dual-language 5 9` and read back a paragraph. Only a plain
   verse block writes or reads a second number.
6. A refused two-number fence was told "is not a starting line". It is
   told verse alone takes a second number, or which number is wrong.
7. The translator was read after a "from the last title" root dropped the
   work that names it. Read first.
8. The right range was walked on every ⌃⌘R; now only on a page with a
   two-number block.
9. The line numbers walked the right column on every change; now only on
   such a page.
10. The stamp of both numbers was written twice, and the opener read by two
    regexes: one `fenceAt`, one `fenceNumbers`.

REVIEW CYCLES: 1
