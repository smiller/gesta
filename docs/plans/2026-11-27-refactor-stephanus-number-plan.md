# refactor: one module for the Stephanus number (A32.1.1)

## Decisions

- Candidate 1 of the A32.1 architecture run, grilled in three rounds.
- The name is the Stephanus number, `src/model/stephanus.ts`: "PagePassage"
  refused (it is a Stephanus number, not a passage on a page); "Stephanus
  reference" clashes with the reference ⌃⌘R makes. GLOSSARY gains
  "Stephanus number"; "Passage" keeps the stretch and the selection.
- Stephanus alone: a Bekker number (Aristotle, page, column a/b, line)
  carries a line and is a different form; no Aristotle is on the shelf.
- The module answers four things: whether a label is a Stephanus number,
  its page, what a typed ask is (a number, a page, nothing, not a number),
  how a run is named. `grammar.ts` keeps only the source spliced into the
  page form.
- The precedence moves whole into the store's `located()`: the editor hands
  the rows' count beside the page and no longer nulls it.
- `goto.ts` keeps the search through the labels and the refusal's words.
- The code's names follow (`data-stephanus`, `stephanusOf`,
  `stephanusAnswer`, `stephanusOver`); the reader's words ("Go to
  passage", "no passage 6e") do not change.

## Record

- 16:19 item added and started; tests first: `stephanus.test.ts` failed on
  the missing module, and the store's precedence test failed with
  "Plato, *Euthyphro*, 1-4" against "2a-c".
- 16:21 the module and the callers; suite green, health 10 on every
  changed file, the comment ledger read; `STEPS=passages` reads as before.
- 16:23 `npm run verify` green; the Helium verdict identical (corner, order,
  bridge, reader: ok). No difference in behaviour turned up; "06d" is taken
  as before.
