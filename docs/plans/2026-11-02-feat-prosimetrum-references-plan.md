# feat: a prosimetrum's references — prose by paragraph, poems by line

REVIEW CYCLES: 0

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
