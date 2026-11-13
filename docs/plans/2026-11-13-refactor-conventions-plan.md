# A work's reference conventions, one record

## Why

Candidate 4 of the first `/improve-codebase-architecture` run (2026-11-12):
the directives a work's `::: reference` block carries were each resolved to
their level (the root, the work, any level above) in five `refers…`
functions and `romanWorkKey`, and again by hand in four places in the
label (READ, store/reference.ts:108-136, 219, 260, 281, 299); three modules
outside it asked one directive at a time (lineBarActs.ts:62,
editor/reference.ts:184-193, mastheadModel.ts:47), and ⌃⌘G and ⌃⌘R meant
different things by "paragraphs" (lineBarActs.ts:62 against
editor/reference.ts:193).

## Measured before choosing (2026-11-13)

- The backup's pages carrying each directive (MEASURED, `grep -rliE
  "^\s*<directive>\s*$"` over bookshelf/): `scripture` KJV, Douay-Rheims;
  `no author` 6; `Old English verse` 5; `prosimetrum` Vita Nuova; `by book,
  chapter, and paragraph` De Doctrina Christiana; `parts in roman` 3 of
  Chaucer's; `from the last title` Dante, Doctor Who; `roman book and canto`
  none.
- The Faerie Queene's page carried `roman book and canto` in the archive's
  2026-09-29 zip and not in its 2026-10-19 one, the block the only change
  (MEASURED, `unzip -p` and `diff`); on 2026-10-18 the reader asked for its
  references in arabic ("Spenser references default ... to 2.7.5.8-9",
  docs/plans/2026-10-09-chore-old-app-inventory-plan.md).
- ⌃⌘G on Vita Nuova 7, seeded from the backup, played headless (MEASURED):
  the box labelled "Line"; the gutter draws the sonnet's 5, 10, 15, 20
  alone; 1, Enter, Enter lands "La donna co la…" (sentence 1 — block 1 of
  3), then the sonnet's line 1; 7, Enter lands the sonnet's line 7, then
  "Questo sonetto…" (sentence 7 — block 3 of 3), which ⌃⌘R calls "prose,
  para 7"; `::: prose 7` is Barbi's paragraph, read by ⌃⌘G as its first
  sentence's number.

## Decided (the reader, 2026-11-13, by grilling)

1. One record of every directive, each resolved to its level for an entry;
   every caller reads it.
2. No behaviour change. Vita Nuova's prose numbers (⌃⌘G by sentence from
   the fence's number, ⌃⌘R by paragraph) parked as their own question.
3. A new module, `src/store/conventions.ts`; the `refers…` functions move
   there.
4. The fields named by the directive's own words.
5. `Journal`'s per-directive readers become one `directives(ekey)`; the
   directives' regexes move to the new module.
6. goto.ts takes the whole record; its own `{ paragraphs, verses }` goes.
7. (Asked as `romanWorkKey` becoming a field; fell away with 10.)
8. `conventions.test.ts` tests the levels; reference.test.ts keeps its
   label tests.
9. GLOSSARY.md gains "reference directive".
10. `roman book and canto` retired first, as its own change.

## Record

### Step 1: `roman book and canto` retired

- Gone: `romanKey`, `cantoPart`, `romanWorkKey`, `Journal.romanBookCanto`
  and its regex, the masthead's and the label's respelling, the directive
  in the seeds (main.ts, tools/steps/kit.ts). `roman()` stays: the Stanza
  box reads `ii` through it (goto.ts:241).
- Tests: the Roman label and payload tests now read the key's numerals
  (1.1.2.1, 1.pr.1–4, 7.8.2.9); the payload test under the directive was
  folded into the plain stanza test, its gap passage and whole-canto
  assertions kept; the masthead's Roman test went, Milton's leaf test
  standing for a leaf as keyed; the top-level-only directive test reads
  `by book, chapter, and paragraph`; the reference-block tests and the
  editing step use that directive as their example text. The suite 1479
  tests (MEASURED, `npx vitest run`).
- The approved Helium run: four lines changed — the canto's crumb `1.1`,
  ⌃⌘R `1.1.2.1` and `1.1.1.3–2.1`, the reference block's example text;
  approved by the reader after reading the diff (643 lines). Order,
  bridge and reader ok (MEASURED, `npm run verify`).
- Code Health 10 on all 13 changed files (MEASURED, `npm run test:health`,
  after the CodeScene MCP fetched the CLI again: the OS update had emptied
  `~/Library/Caches/codehealth-mcp`).

### Step 2: the record

- `src/store/conventions.ts` (42 lines): `conventionsOf(date, tag,
  journal)` returns `Conventions`, seven booleans named by the directives'
  words, each read at its level (the root; the work, for the entries below
  it; the entry's own page or any above it, for `Old English verse`), in
  the namespaces that title their roots only. The seven regexes moved in
  from headings.ts.
- `Journal` is `heading` and `directives(ekey)`; journalOf hands out the
  memoised directive text. The five `refers…` functions and `workKeyOf`
  gone from store/reference.ts (289 → 255 lines, MEASURED `wc -l`); the
  label reads the record through its context, where it resolved four
  directives by hand.
- goto.ts takes the record (`byBookChapterAndParagraph`, `scripture`); its
  own `{ paragraphs, verses }` gone. lineBarActs.ts builds the record once
  per ask; a reference builds it twice, in editor/reference.ts and again in
  the label.
- One reading differs from before, in no entry: an entry with no tag under
  the bookshelf read its root-level directives off the namespace's own key,
  `bookshelf`, in the label but not in ⌃⌘G; the record reads none there.
  The backup holds no entry at that key (MEASURED, `ls` of
  gesta-backups/current: bookshelf/, journal/, page/ and no `.md`).
- Test-first: conventions.test.ts (six tests) failed on the missing module
  before it was written; the six directive tests in reference.test.ts moved
  there, its label tests unchanged; goto.test.ts's three records are full
  `Conventions`. The suite 1479 tests; Code Health 10 on all nine changed
  files, the two new ones included; the approved Helium run unchanged
  (corner, order, bridge, reader ok) (MEASURED, `npm run verify`).
- GLOSSARY.md: **Reference directive**.

## The batch's review (abb68f6..5fe90db)

`/code-review` at high, 110,613 tokens (MEASURED: the last message of
subagents/agent-a96d6b08c98cb9b16.jsonl, input 2 + cache creation 1,437 +
cache read 106,872 + output 2,302). Nine findings; each read against the
code, all nine stand:

1. The help still documented `roman book and canto` and `I.i.2.1`
   (help.html:91, :110) — rewritten to `1.1.2.1`. My own check before step
   1 read only the first 600 characters of line 110 and called the help
   clean. Pinned: conventions.test › "every directive the help names is
   one the record reads", which failed on 1 of the 6 directives the help
   names before the fix (MEASURED).
2. main.ts's seed comment still said "under its directive" — cut.
3. one-offs/shelfLinesRun.ts still stripped the directive — the line and
   its comment gone.
4. A reference builds the record twice — kept: both builds read the same
   memoised text with the same inputs; the record's wording above
   corrected, where it said once.
5. The glossary's "a line of its own … at the top" was stricter than the
   code — reworded: `from the last title` may run on, and the block may
   stand anywhere on the page but not inside a quote or a note.
6. `roman()` sits in store/reference.ts with goto.ts its only app caller —
   left to the architecture run, which decides where a module's parts
   live.
7. The all-false record written out in two tests — goto.ts takes
   `Pick<Conventions, "byBookChapterAndParagraph" | "scripture">`, the two
   fields it reads; its tests' records have just those.
8. A directive's words went unescaped into a RegExp — a line now compares
   by trimmed, lower-cased text.
9. `as unknown as Conventions` — the record is a typed literal, one field
   a line.

The suite 1480 tests.
