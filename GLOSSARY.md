# Glossary

The words Gesta's code, tests, help and replies use for its domain. A word
here names a thing a reader of the app would recognise; how the code does it
lives in the code.

**Passage**:
The rows a selection means: every row the selection puts a word, or part of
one, into, whole and in both columns; in a dual-language block, also the
Latin the selected sentence stands beside. What ⌃⌘R quotes, what the column
marks show beyond the selection, and what Ref (all) is offered on. In a block
numbered on both sides, Ref quotes the passage's translation column alone.
_Avoid_: selection (what the hand made, not what it means), quote, excerpt.

**Reference**:
What ⌃⌘R makes: a link to the entry, labelled with where the passage stands
(its lines, stanzas, paragraphs or leaves), with the passage quoted under it.
_Avoid_: the retired words `tools/vocabulary.ts` lists.

**Label**:
A link's text; for a reference, the work and the passage's place in it.

**Reference directive**:
A line in a `::: reference` block standing at the top level of a root's or
a work's page, inside no other block, naming a convention its references follow, the whole of its line. On a
root's page: `by chapter and verse`, `by title alone`, `by innermost title
alone`; on a work's page, for the entries below it: `prose by paragraph,
verse by line`, `by book, chapter, and paragraph`, `part titles in roman`;
`by half-line` on any page, for it and every page below.
_Avoid_: setting, option, flag.

**Terminal copy**:
Text copied from a terminal: its lines broken at the window's width, its
margin the indent every line shares, a table drawn in box characters.
Pasted, it is the text it was, its wrapped lines joined and its tables
markdown tables, never a paragraph per coloured run.
_Avoid_: terminal paste, console text.

**Commonplace**:
A named entry that belongs to no day and no author: Books, Birthdays,
Verdour. The paper icon lists them; "New commonplace…" makes one, and
"+ sub-entry" one beneath it. Its address is `#commonplace/Name`.
_Avoid_: page (the printed page's word), note (a block in an entry).

**Page**:
A printed page of a book, begun in its text by a page label, `⟨138⟩`.
⌃⌘G's Page box finds one; a reference names the pages a passage is on,
"p. 138", "pp. 138-9".
_Avoid_: leaf, folio; page for a Commonplace or for whichever entry is
open.

**Alert**:
A notification in the alert area, one under another, each with an × that
closes it; a click on its words copies them.
Its kind says what it tells, whoever started what it reports:
- **Error**, red: something went wrong (a save, a copy, a fence the page
  could not read); stays until it is resolved or closed. A newer error
  covers an older one, which comes back when the newer goes.
- **Warning**, amber: why an act just tried did nothing; fades after ten
  seconds, or goes when closed, replaced by the next, or another entry is
  opened.
- **Info**, blue: a count, a progress line or a note, telling of no outcome
  ("12 entries stored", "exporting… 2000 / 7500"); fades on its own.
- **Success**, green: something done worked ("saved", "Link copied",
  "backed up"); fades on its own.
They stack in that order, at most one of each. Every error and warning is
kept three months in the alert log.
_Avoid_: the corner; the retired words `tools/vocabulary.ts` lists; failure,
refusal, passing for its kinds (an act that does nothing is still refused).

**Alert area**:
The band under the masthead where alerts show, stuck there as the page
scrolls and always one alert tall, so an alert coming or going moves no
text; the bars, lists and dialogs that hang from the masthead open below
it.
_Avoid_: strip.
