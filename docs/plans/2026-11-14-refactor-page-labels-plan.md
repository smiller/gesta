# A page label's grammar in one module

## Why

The architecture scan over 1d82979..bff8016: `src/store/pageLabels.ts`
re-exported seven names from `src/model/grammar.ts` and held one regex,
`PAGE_CHARS_RE`; three of the re-exported names nobody took through it.

## Decisions

- Folded: `PAGE_CHARS_RE` sits in grammar.ts beside the two alphabets it
  is built from; ⌃⌘G and the reference grammar import from grammar.ts;
  pageLabels.ts deleted.
- Its tests moved to `src/model/grammar.test.ts`, the two pins renamed.
- With the re-export gone the export checker found `PAGE_TOKEN` used by
  its test alone: the parser read ⟨8⟩ with its own `PAGE_AT`, so the test
  that writer and reader agreed pinned a regex nothing read. `PAGE_TOKEN`
  deleted; `PAGE_AT` moved beside `pageToken`, and the test now reads back
  what `pageToken` writes (asked: the brackets spelled once).
- `tools/unusedExports.ts` reads `export { … } from` as a use of the
  names at their source, so a re-export nobody imports through never
  fails. Left as it is: the one re-export left (`tools/helium-steps.ts`)
  has its names imported through it (MEASURED, grep); the checker is
  taught when a re-export next appears.
