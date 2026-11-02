# fix: a dual-language block in a note

## The report (2026-11-02)

Satire 1.10's eight bracketed lines stand, with their English, in a
`::: note` before the poem. The reader: "the formatting of them is really
unbalanced" (a screenshot).

## What was wrong (READ in the code, seen in headless Helium)

1. **The split.** A paired block in a note or card took `insetCol`: the
   column whose widest line is the shorter keeps it, the other takes the
   rest. The Latin kept its 254px, and the English ran the rest of the box,
   about 170 characters a line.
2. **The notes.** A dual-language block's Latin note is held to `--vb-col`
   and its English note set in by `--vb-col` plus `--dl-gap`. Those are the
   entry's column and gap, not the box's. Note [1] ran past the Latin, and
   note [2] started off the box's English.
3. **Scope.** In the backup, 1.10 is the only dual-language block inside a
   note or card (MEASURED). The plain verse blocks in `page/3x3`'s cards
   take `insetCol` as before.

## Ruled (2026-11-02, asked)

- Inside a note, a dual-language block's English starts at the page's
  English edge, so the box's columns stand over the poem's.
- Each note sits under its own column.
- Where that edge would wrap the Latin or leave the English under 16em, or
  the page has no dual-language block, the box is split in equal halves.

## Built

- `fit.ts`:
  - `insetDualCol` takes the page's English edge, less the row's gap,
    measured from the box's row;
  - otherwise halves, widened to the Latin's widest line up to two thirds;
  - the Latin rows with no English are measured too.
- `editor.css`: a dual-language block in a box sets `--vb-col` to its
  `--inset-col` and `--dl-gap` to the box's 1.6em. Its notes and its lines
  with no English stand in the box's columns.
- Tests:
  - `fit.test.ts`: "a dual-language block in a note: …", four tests;
  - the Helium step "a dual-language block in a note", over
    `fixtures/horace-satires-1.10.md` (the page's first 38 lines). Before
    the fix: englishEdge −158, notes "neither neither". After it:
    englishEdge 0, notes "Latin English", latinWrapped 0.
- One unrelated reading, "Tab held in a quote", read "at the end" once in a
  full run. It read the approved "inside a line" in three runs of its section
  and in the approving run. A flake, not approved.
- `npm run verify` passed.

REVIEW CYCLES: 0
