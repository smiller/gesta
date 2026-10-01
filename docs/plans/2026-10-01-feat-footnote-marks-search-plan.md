# Footnote marks: no break in a phrase search

The Sidney import (`~/Desktop/gesta-bookshelf-import-sidney`, 2026-10-01)
marks each note in the text as a space and superscript digits after the
word, after its punctuation ("Pedenteria ¹ in comparison", "Amphion, ³
was"). A search for "Pedenteria in comparison" then found nothing.

## Decided (2026-10-01, asked)

1. THE FOOTNOTE FORM ONLY (option 1 of 2): a space and a run of
   superscript digits after a word is skipped by the shared flattening
   (`src/model/flatten.ts`), with its space; a superscript joined to its
   word ("m²", "10³") or opening a block is text.
2. The flattening is the stream search, the jump, a reference link's
   passage, the word count and the view switch's carry all read, so all of
   them skip the marks alike; what is copied (⌘C, ⌃⌘R) comes from the
   document and keeps them.
3. A mark typed or pasted into the search box is skipped the same way.

## Record

### 2026-10-01 — built

- Tests first, red then green (MEASURED): five over the flattening (the
  mark skipped with each kept character at its own position, two marks
  and a two-digit one, "m²" and "10³" kept, a superscript opening a block
  kept with the space between blocks, the source view's flattening
  agreeing), one over the query, one over the jump (the selection takes
  the mark inside it).
- The Helium step `footnote marks`, a page typed with two marks and an
  "m²": "Pedenteria in comparison" finds it and Enter selects "Pedenteria ¹
  in comparison"; "Amphion, was" finds the phrase across the mark after a
  comma; "4 m²" finds "4 m²" (MEASURED, two fresh runs). On the code
  before, the first search found nothing (MEASURED).
- The step's first draft read wrong twice, both the step's fault: the
  results list's old row satisfied its wait, and the search box keeps its
  query while the entry stays open, so a second query was typed onto the
  first. It now waits for the box to hold the whole query and types over
  ⌘A.
- The current app finds none of the three; four differences listed.
