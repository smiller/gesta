# One word for the band at the top: masthead (U7)

Asked 2026-11-22: "I am really looking forward to adding 'header' to the
glossary"; then, discussed: "Yes, keep masthead and go that way."

## Decisions

1. Masthead, not header: "header" is a table's first row and sits one
   letter from an entry's heading; the code already says masthead.
2. Its four rows (Go to, Search, Line numbering, Replace) are masthead
   rows. `LineBar` and `ReplaceBar` keep their names.
3. GLOSSARY.md defines Masthead and Masthead row.
4. A word check refuses the band's senses of "header"; the table's, a zip
   member's, a step section's and a progress detail's stay.

## Record

- The check's hit count before its rule (`tools/out/headerHits.ts`): 46,
  38 the band, 8 other senses, each allowed by its phrase in
  `tools/vocabulary.ts` (`headerForMasthead`).
- The 38 changed in 13 files: comments, two test titles and their pins,
  `underHeader` in tools/steps/alerts.ts, 11 help lines, CLAUDE.md.
- `src/ui/Search.svelte:99` named another module once it said "the
  masthead's"; it now states the measured 2px gap.
- MEASURED, `dist/index.html`: no "the header" in the band's sense left.
