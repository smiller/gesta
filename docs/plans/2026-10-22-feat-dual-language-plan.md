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
