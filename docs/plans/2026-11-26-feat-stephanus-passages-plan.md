# Stephanus passages: lettered page labels ⌃⌘G goes to (U29.1)

Asked 2026-11-26, after the Euthyphro's import: "People do cross-reference
to works of Plato by Stephanus number, so we are going to need to be able to
make that a section number that one can go to." Designed on the real page
(mock `tools/out/plato/mock/stephanus.html`, the Euthyphro at 1200 and 900 px:
idle, two sections in a row, scrolled to 12b, ⌃⌘G landed on 6d); every
decision below the reader's.

## Decisions

1. A page label may be digits and one lower-case letter a to e, `⟨2a⟩`: a
   passage, the Stephanus section (Bekker's `1094a` fits the same form); a to e
   alone, so `8x` stays a mix and `9z` not a page. It stands
   before the word the section begins on; on Plato's pages, in Burnet's
   Greek column alone.
2. The gutter draws a passage bare, `2a`: never `p.` (asked: "Stephanus
   numbers shouldn't say `p. ` before the number").
3. ⌃⌘G on an entry holding passages has one box, "Go to passage"; the line
   box goes. `6d` lands on its label, `6` on the page's first passage, `6a`;
   a passage not there is refused, "no passage 6f — page 6 runs 6a-e" (the
   reader's words, put in the alerts' lower case and dash).
4. A reference over a passage names the passages it runs through, `2a`,
   `2a-c`, `2d-3a`, the hyphen of `pp. 138-9`, in place of the row count;
   after the work's title, as a printed page is.
5. `GLOSSARY.md`: Passage is a stretch of a work's text, named by where it
   stands or made by a selection. The word was the agent's, accepted
   2026-11-12 as the fourth of four bundled answers, its claim on the app's
   vocabulary never put on its own (the reader: "I don't think it was
   surfaced to me").

## Record

- 18:32 Built test-first: `PAGE_PASSAGE` in the grammar; a passage's
  label carries `data-passage` and the gutter draws it bare; `pageLabel`
  names `2a`, `2a-c`, `2d-3a`; a reference reads its passages over the rows
  it quotes, whole and in both columns (over the words selected, a row's
  translation was named by the next passage: the test's first reading), and
  a passage stands in under a numbered book too (`Plato, *Republic*,
  509d-511e`, where the row count said `6`); ⌃⌘G's one box, `noPassage`
  and `noPassageHere` in the alerts; the help and the glossary. Corpus over
  the backup: the same 61 round-trip differences as HEAD, report identical.
- Helium section `passages` (verse.ts): six real rows of the Euthyphro; the
  gutter `2a 2b 6c 6d`; Go to passage `6d`, `6` → `6c`, `2B` → `2b`; `6e`,
  `9`, `6f` refused; ⌃⌘R `2a` and `6c-d`.
- Import folder `~/Desktop/gesta-imports/gesta-plato-passages`: the
  Euthyphro with its 70 passages labelled where Burnet begins them,
  replacing the row-start text; round trip, corpus and the layout probe
  (234 of 234 rows level, 1000 and 1400 px) clean.
