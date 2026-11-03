# feat: a prosimetrum's references — prose by paragraph, poems by line

REVIEW CYCLES: 1

## The ask (2026-11-02)

The Vita Nuova, Barbi's Italian beside Rossetti's English, a page per
chapter. Asked for its references:

- "Since this is a prosimetrum, like Boethius, we could do Vita Nuova, 3,
  verse 1-4 for lines 1-4 of the poem (metre), and Vita Nuova, 3, prose for
  the prose."
- "For prose refs, how about "Vita Nuova, 3, prose, para 4" -- because that
  makes it clear that it's a paragraph reference not a sentence reference."
- "Chapters with two poems: … Vita Nuova, 8, verse 1.1-4 (for first poem)
  or Vita Nuova, 8, verse 2.1-4 (for second poem). That's unambiguous."

## The rule

- A work whose contents page carries `::: reference` / `prosimetrum` /
  `:::` cites its chapters' parts apart. The work is the second level
  (author/work/chapter), as `roman book and canto` reads it.
- A selection in a top-level `::: prose` block: `prose, para N` or
  `prose, paras N-M`, the numbers its rows' (the fence's number onward, so a
  block of Barbi's paragraphs 13–15 opens `::: prose 13`).
- In a top-level `::: verse` block: `verse N-M`; where the page holds more
  than one top-level verse block, `verse K.N-M`, K its place among them.
- The worded range is a field of its own after the chapter, comma-joined:
  `Dante, *Vita Nuova*, 3, prose, para 4`. A numeral range still dots on.
- A work without the directive cites as before. MEASURED 2026-11-02: no
  page in the backup holds both a `::: prose` and a `::: verse` block, and
  no work page carries the directive yet.

## Done

- `src/store/headings.ts`: the directive read, a line of its own, top level.
- `src/store/reference.ts`: `Journal.prosimetrum`, `citesProsimetrum`, the
  worded range comma-joined in `referenceLabel`.
- `src/editor/reference.ts`: `prosimetrumRange`; the payload uses it under
  the directive.
- `src/ui/help.html`: the directive in the `::: prose` item.
- Tests: src/store/reference.test.ts (the directive; the worded range),
  src/editor/reference.test.ts (3, prose, para 8; paras 8-9; para 13;
  verse 1-2; 8, verse 1.1-2, verse 2.2; without the directive 3.8).
- `npm run verify` passes (MEASURED 2026-11-02).

## Sentences, the other column, the prose measure (asked 2026-11-02)

Looked at in Helium after the first build: a sentence selected in Vita Nuova
12 quoted its whole paragraph; "(a) shouldn't it highlight the relevant part
of the translation as well? (b) it should definitely not present as the
reference the whole paragraph both of text and translation", and the pasted
reference was wider than on its own page. Ruled: sentence rows, Barbi's
paragraphs as the block's breaks; the other column marked in prose and verse
pairs; the width from a mockup at four widths in Helium: "B." (24em).

- `prosimetrumRange` counts paragraphs: the fence's number, one more after
  each break that follows a pair. A sentence in 12.5 cites "12, prose, para 5"
  and quotes that sentence's row alone.
- `src/editor/pairMarks.ts`: a selection in one column of `::: prose` or
  plain `::: verse` pairs marks the other column of the rows it covers
  (`dl-covered`); a selection reaching both columns, or in a dual-language
  block, marks nothing.
- `fit.ts`: paired prose asks two 24em columns and a 2.4em gap plus its own
  box and any quotation's (`proseWidth`: 908px at 18px); alone it takes that
  (capped by the window), beside verse the wider of the two; `editor.css`
  holds each column to 24em however wide verse sets the entry.
- MEASURED 2026-11-02 at a 1512px window, before: 22.4em columns on
  Vita Nuova 12 (its ballata set the width), 34.5em on 12's prose-only
  neighbours and on a journal day; after: 24em on all three.
- Not changed: the paragraphs around a paired block widen with it, the rule
  verse already has (the help: "the prose around the block always has the
  width the block has").
- Tests: fit.test (two), reference.test (the paragraph count, the one-row
  quotation), pairMarks.test (five). `npm run verify` passes.

## Review cycle 1 (2026-11-03)

One `/code-review` at high over a28771c^..f197509 (this plan's two commits,
the dual-language sentence selection a28771c and the note layout ae8081b, all
accepted). 183,018 tokens (the run's own count). Ten findings: four
behaviour bugs checked in node by the reviewer (a sentence's Latin stopping
at a skipped line number; an end resting at an English cell's edge widening
the selection; a facing block's Latin marked though its reference leaves it
out; a cross-column drag quoting cells it neither selects nor marks), two
smaller (the quoted prose fence numbered by sentence under the directive; a
dual-language block's English never marked from a Latin selection), and four
cleanup (an inset's edge measured off a quoted citation; a stale CSS
comment; comments naming other modules' mechanism; two copies of the
marking plugin). Fixes wait on the rulings asked.

### Cycle 1's fixes (asked 2026-11-03: "Yes, go ahead with all of them")

1. `sentenceAt` runs a sentence's Latin on past a skipped line number and a
   stanza gap (Ovid 1.545: "qua nimium placui" now marked and quoted).
2. `sentenceRange` widens an end only where the selection holds words of its
   English cell (Ars Poetica: 1-3, not 1-6; 2-4, not 1-4).
3–4, 6, 10. `pairMarks.ts` rewritten as `coveredMarks`: the rows the
   selection's ends widen to (`sentenceRange`, then `wholeRows`, now exported),
   less the selection itself — so what is marked is what Ref quotes, a
   cross-column drag included; dual-language blocks included (a Latin
   selection marks its row's English), the duplicate plugin in
   dualLanguage.ts removed; a block numbered on both sides marks nothing.
5. `passageMd(…, paragraphs)`: under the directive a quoted prose fence opens
   at its paragraph (`::: prose 8`, the label's para 8).
7. `measureInsets` takes the page's English edge from a dual-language block
   outside any quotation.
8–9. The stale CSS comment merged into the rule's; the comments naming another
   module's mechanism reworded.
- Tests: reference.test (the edge, the skipped line, the fence number),
  pairMarks.test (rewritten, seven). `npm run verify` passes. One full run
  read "ArrowDown from a sentence above a note under the English" landing on
  the next sentence; the section alone twice, and the next full run, read the
  approved note (MEASURED 2026-11-03): a flake, not approved.
