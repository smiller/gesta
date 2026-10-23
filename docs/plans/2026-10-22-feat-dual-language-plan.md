---
title: "feat: ::: dual-language — verse beside prose, each sentence level with its Latin"
type: feat
status: open
date: 2026-10-22
---

# feat: `::: dual-language` — verse beside prose, each sentence level with its Latin

## The ask (2026-10-22)

Ovid's *Metamorphoses* as a dual-language text: the Loeb's Latin (1916)
beside Miller's prose translation, read from two archive.org scans. Settled
over five static mockups of Book I opened in Helium
(`tools/out/ovid/book1/`, git-ignored, with the scripts that made them):
verse on the left keeping its line numbers, prose on the right; the pairs
the Latin's paragraphs; each English sentence starting level with the row
its Latin starts on; where the English runs long, the Latin waits; a
sentence starting part-way along a line splits the line (asked over a gap
before the whole line); notes at the pair's foot under their own column;
More's titles as `##` headings with a contents list of links. The sentence
starts were placed by reading (asked over a length rule).

## Decisions

1. **The fence is `::: dual-language N`** (the reader's name, asked over
   `::: facing`), one per pair, numbered from the line it opens at. `##`
   headings stand between fences.
2. **A row carries `Latin | English` only where a sentence starts**; a row
   with no English has no pipe. The English runs down beside the Latin to
   the next row with English. Where it runs long, the Latin waits: space
   before the next row with English, and at the fence's foot.
3. **Split lines are the `⟨…⟩` rows of 2026-10-20.** A pair opening
   part-way along a line begins with a `⟨…⟩` row, its set-in measured from
   the half above in the fence before.
4. **Notes are the nested `::: note` rows**, mark ¹ in a cell, "[1] …" in
   the note. A note stands under the column its mark is in.
5. **The contents list is ordinary links** finding each section's first
   row (`?h=` its whole first line, or the first half where split), asked
   over the fewest words that find it.
6. **A form of the verse block, not a new node**: `verse` carries
   `dual: true`, so numbering, split lines, notes, keys, references and
   paste carry over; the opener, the layout and the width differ.
7. **The English column is held to 30em**, the mockups' measure; the page
   is as wide as the Latin column, the gap and that.

## Record

- The model: `::: dual-language N` parses to `verse` with `dual: true`
  (`DUAL_OPEN` in grammar.ts, one of the row fences), draws as
  `div.verse.dual-language`, reads back by the second class, and writes
  back as it was typed; `::: dual-language 0` is refused as "0 is not a
  starting line". MEASURED: Book I written by the reading's generator
  (`tools/out/ovid/tools/md.py`) round-trips exactly — 42 fences, 360
  sentence rows, 7 notes, no fence refused.
- The layout: the English cell takes no height of its own (CSS), and a
  measuring pass (`src/editor/dualLanguage.ts`, the arithmetic pure)
  writes each row's wait as `margin-top`, the block's foot as the last
  row's `margin-bottom`; all waits off, every row read, all answers on,
  in one call. The note view now ignores its own `style`, as the row view
  does. A note whose mark is in an English cell is decorated `dl-english`
  and stands under the English.
- FAILURE, MEASURED in headless Helium: a waits pass rounding every
  overlap up wrote 28 one-pixel waits for sub-pixel overlaps, coming and
  going between runs (35 waits on the fixture, 7 real); an overlap under
  a pixel is now none.
- FAILURE, MEASURED: a note under the English stood 8px left of the
  column — its offset's `2.4em` resolved in the note's 0.8em type; the gap
  is now a registered length (`--dl-gap`) worked out at the block.
- FAILURE, MEASURED: a ⟨…⟩ row opening a fence (1.698, "Redeuntem colle
  Lycaeo") was not set in: it begins its block's count, so the split-line
  pass measured it as a line. In a dual-language block it is now the rest
  of the line the block before closes, carried across the fences between.
  Only the Latin cell of a pair is measured as the line.
- The width: a dual-language block's English counts at most 30em
  (`DUAL_MEASURE_EM`) towards the fitted width. MEASURED: at a 1280 or
  1400px window the fixture's page is 1090px, Latin 443px, English 542px
  (30em at 18px); at the steps' 1000px window the cap gives 936px and the
  English 25em.
- MEASURED in headless Helium (the `dual-language` section, the fixture
  `fixtures/ovid-metamorphoses-1.md`: 1.348–380, 525–600, 682–712): 64
  sentences, each level with its row and clear of the next; 23 split rows,
  all set in, the one opening the 698 fence too; note 1 (mark in the
  English) under the English, note 4 under the Latin; typed three lines
  longer, "Men call it Tempe" adds one wait (7 → 8) and every sentence
  still clears the next.

### Review cycle 1 (5b1463f, /code-review at high) — REVIEW CYCLES: 1

Cost 134,559 tokens (the transcript's last message: 2 input, 2,383 cache
creation, 129,276 cache read, 2,898 output). Ten findings, all real on a
read of the code; fixed in one commit:

1. The Latin column was measured from the pairs alone: a Latin-only row
   longer than every Latin cell wrapped. Latin-only rows now count, and
   past the cap a dual-language block keeps its Latin whole while the
   English gives way to 16em (`whole` in `fitWidth`, `DUAL_MIN_ENGLISH`).
   MEASURED at the steps' 1000px window: 36 Latin rows wrapped, now 0;
   the English 21em.
2. A wait written as `margin-top` replaced a note's own margin and
   collapsed with the margins beside it: a row now takes it as padding, a
   note as margin added to its own, read with the waits off.
3. The foot as the last row's `margin-bottom` collapsed through the block
   into the next fence's margin: it is padding on the last row; a block
   ending in a note needs none, the note waiting for the English.
4. A margin-note drawn in the margin took a wait: margin-notes are no
   rows of the pass.
5. A split half carried past a plain verse block or a heading: it is
   carried only into the block straight after.
6. The last row of every dual-language block was measured each pass: only
   where the next block opens with a ⟨…⟩ row.
7. Every block was remeasured on every keystroke: a block whose node and
   width are those of its last pass keeps its waits; a block's note
   columns are cached by its node.
8. ArrowDown on an English sentence's last line went to the next row's
   Latin, above the caret: it now goes to the sentence below, ArrowUp to
   the end of the one above. MEASURED in headless Helium: from "…by its
   roar." ArrowDown lands in "Here is the home…", ArrowUp back in
   "Through this the River Peneus…".
9. A passage quoted from a dual-language block quoted as one: made a
   plain `::: verse` fence (the pairs keep their sentences). Undone after
   cycle 1, below.
10. Three comments broke the standard (provenance, two unpinned): fixed.

The steps' readings gained what the review found them blind to: a
sentence clear of a note and of the rule over the next pair, measured
from where a waited row's text starts; Latin rows wrapped.

### After cycle 1: a rest that fills its row

- FAILURE, MEASURED in headless Helium on Book 6 as imported: the rest
  "magnum, quodcumque paravi;" set in 206px in a 450px Latin column wrapped
  ("paravi;" on a second line), its text 244px in the 244px left. A rest
  was set in a pixel short of filling its row (`contIndents`); Book 6's
  wrapped Latin rows 1 → 0. Replaced in cycle 2 by its cause, below.

### After cycle 1: a quotation stays dual-language (2026-10-23, asked)

- Finding 9's fix was a choice made without asking: a quotation of
  dual-language rows became a plain `::: verse` fence. Asked, the reader
  ruled the quotation `::: dual-language N`, each quoted row keeping its
  sentence. A plain pair is as tall as its English, so two Latin lines
  beside a long sentence stood apart by its height; the dual-language
  layout keeps the Latin together and leaves the room at the foot.
- MEASURED in headless Helium (the step "⌃⌘R across a long sentence,
  pasted", 1.533–534 into a fresh page at a 1000px window): the quotation
  pastes as `::: dual-language 533`; the two Latin lines one line apart;
  the English 8 lines at 470px beside 380px of Latin, level with its row
  and inside the quotation's box. Before the fit's settle (500ms) the
  English stood 41 lines in 106px, the unfitted column: a paste waits for
  the settle as a plain verse quotation does.

### Review cycle 2 (5b1463f..618f4f7, /code-review at high) — REVIEW CYCLES: 2

Cost 118,883 tokens (the transcript's last message: 2 input, 2,958 cache
creation, 113,158 cache read, 2,765 output). Eleven findings, the ten most
severe reported, all real on a read of the code; fixed in one commit:

1. The English's 288px floor was held back even where its widest sentence
   needs less: a quotation of short sentences wrapped its Latin at 319px
   with 200px to spare. The English is held back to the lesser.
2. A block whose node and width stood was skipped though the entry's
   split had moved its English column: the column's width is in the key.
3. A margin-note drawn in the text, not the margin, was no row and the
   English ran over it: it waits as a note does.
4. ArrowDown from a block's last sentence fell to the next Latin row,
   above the caret; a note under the English was jumped over. The arrows
   now go down the English column: a sentence, a note under the English,
   then the next dual-language block's first sentence (up, its last).
   MEASURED in headless Helium: from "…remained." ArrowDown lands at the
   start of "But even now in this new form…", ArrowUp back at the end of
   "…remained."; from "…o’erwhelmed.”" at the start of note 1.
5. A grow pass could narrow the dual-language column mid-keystroke: it
   only widens, as the plain split does.
6. One dual-language block let an over-wide line in any paired block
   take more than two thirds: the cap holds for dual-language too.
7. The cache's width was read after the writes, a layout per block: it is
   read once, before them.
8. The 1px slack covered a rounding: `room` was the whole-pixel
   `clientWidth` and the indent rounded to the nearest pixel. The room is
   now read to the fraction and the indent rounded down, the slack gone.
   MEASURED at 1400px over all fifteen books: every sentence level and
   clear, 0 Latin rows wrapped, every rest set in (Book 6 included);
   Samson's rests move by a pixel at most.
9. The paste step's wait swallowed its timeout: its reading carries
   `fitted`, and it waits out the fit's settle (500ms, the app's clock).
10. A duplicated condition in `measure` and a hand-built offsets array:
    merged, and the caret's stops rebuilt over `forEach`.

The step `caretCell` reads the caret's place in its cell (start, end,
inside) and names a note; the page-wide cursor reading crosses the
columns and read the end of "…remained." as a line's start.

## A skipped line number (2026-10-23, asked)

The Loeb leaves out lines but keeps their numbers (Book 1 has no 546, Book 4
no 768, Book 8 fifteen), and a fence numbers its rows one after another, so
every line after such a gap in its fence read one low (six low after Book
8's 603–608). Asked: a row `⟨skipped line number⟩` (the reader's words, over
`⟨omitted⟩` and `⟨skipped⟩`) stands for the line; nothing is drawn (asked
over a faint marker); ⌃⌘G for its number lands on the line after the gap
and says "line N is omitted in this edition" (asked over refusing).

- The model: a leaf row `skip`, never selectable, drawn as `div.vskip`
  (display none), in verse only. The numbering walk counts it as a unit
  marked `skip` (from review cycle 1, below). A quotation across one keeps
  it, so its lines keep their numbers; Backspace or Delete beside one move
  the caret over it, so it is never taken out unseen.
- MEASURED in headless Helium (the fixture's 546, the steps "a skipped line
  number" and "⌃⌘G for a skipped line"): *qua nimium placui* reads 547, the
  row above it not displayed; ⌃⌘G 546 marks 547 and the corner reads "line
  546 is omitted in this edition".
- FAILURE, caught by its test: `skips?.push({ line: ++line, … })` skipped
  the count whenever no list was asked for — optional chaining leaves the
  arguments unevaluated.

### Skipped line number: review cycle 1 (ba1caba..216317d, /code-review at high) — REVIEW CYCLES: 1

Cost 122,692 tokens (the transcript's last message: 2 input, 2,271 cache
creation, 117,644 cache read, 2,775 output). Ten findings, all real on a
read of the code (three the reviewer measured in scratch tests); fixed in
one commit:

1. A passage starting on the line after a skip was numbered one low
   (`::: verse 546` under a link reading 547): the skip was handed out on
   a side list, and `countAt` never saw it.
2. A stanza's quotation drew a skip as an empty quoted line, a stanza gap
   that was never there: it is left out.
3. The schema let a skip into a prose block, which wrote it back as text:
   it stands in verse only.
4. Backspace and Delete beside a skip only moved the caret: two lines with
   skips between them now join, the skips kept after the joined line.
5. Enter's way out of a block was missed when skips trailed the last line:
   skips after a row are no rows of its.
6. A skipped line in several blocks lost the block's ordinal: it is said,
   as every landing says it where there are several blocks. In the Ovid
   page this reads "line 546 is omitted in this edition — verse block 2 of
   8".
7. A row whose own text read as a token (⟨skipped line number⟩, ⟨…⟩,
   ⟨line⟩ at its head) became one on reload: it is written after a
   backslash and read back as text. MEASURED over the corpus: the same 64
   entries differ on the round trip before and after.
8. Altitude: the skip is a unit of the one walk (`skip: true`, numbered,
   never shown), the side list gone; Go to, the line numbers and the split
   lines leave it out.
9. Two comments stated another module's CSS or carried no pin: fixed.
10. CLAUDE.md's layout gained the skip's node view.
