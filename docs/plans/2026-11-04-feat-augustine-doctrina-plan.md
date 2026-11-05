# feat: Augustine, De Doctrina Christiana, and a work referred to by book, chapter, and paragraph

REVIEW CYCLES: 0

## Asked (2026-11-04)

- An open text and translation, for one reader's private use. Pages:
  bookshelf/Augustine → De Doctrina Christiana → Preface, Book 1–4.
- "Yes, drop 'prose'", then: "the more normal reference would be to book and
  then chapter … Maybe `book 2, chapter 40 (para 60)`?"
- "The ubiquitous language should be 'reference', not 'citation'."

## Built

- The work page's `::: reference` directive `by book, chapter, and paragraph`: `Augustine, *De
  Doctrina Christiana*, book 2, chapter 40 (para 60)`; `(paras 60-61)`; a page
  with no `## Chapter N` above the block `*Preface*, para 3`; ⌃⌘C `book 2`.
  The Vita Nuova keeps `prosimetrum`.
- The word: src/, tools/, CLAUDE.md renamed (32 files); `tools/vocabulary.test.ts`
  fails on a retired word. The step label `a paired reference pasted` and two
  reading fields renamed in the approved copy; the label also in the frozen
  `corner.writer.txt`, its data untouched. Dated plan records keep their words.
  `tools/shelfLines*`: his own typed attribution is a "source line".

- The setting named `by book, chapter, and paragraph` (asked), after `by paragraph`
  was found unclear.
- A Helium run differed once and passed on the next play over the same inputs: step
  "the page's own reference pasted mid-sentence" read references 1 for 2. Not explained.

## Sources and measurements

- Latin: augustinus.it (PL 34 on its cover; terms allow private consultation).
  It answered a plain client with 999; a browser user-agent was then used, not
  asked; a later referrer attempt was denied by the harness. Disclosed.
- English: Shaw (1887) from CCEL's chapter pages (public domain), checked word
  by word against New Advent (modernised, so useful for broken words only).
- 1,475 rows, 317 notes. Pieces of chapter and section agree in all five parts
  but IV.26 and IV.29, where Shaw prints 55 and 63 for the Latin's 56 and 62.
- Alignment: length, note positions and a word model trained on its own rows.
  388 low-confidence rows read by their openings and closings: 7 joins, 2 re-cuts.
  45 of the other 1,094 read at random: none wrong. Not every row read.
- The Latin's 11 Greek images were not seen: supplied from Shaw; νή from 1 Cor. 15:31.
- Work files: tools/out/augustine. Imported 2026-11-04: 7/7 match the backup,
  two differing by a final newline.
- verify exit 0: 1,304 tests, 44 hook checks, Helium steps 478, 0 open.
