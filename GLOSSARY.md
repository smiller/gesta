# Glossary

The words Gesta's code, tests, help and replies use for its domain. A word
here names a thing a reader of the app would recognise; how the code does it
lives in the code.

**Passage**:
A stretch of a work's text. Named by where it stands: a Stephanus passage,
`6d`, begun in its text by a page label with a letter, `⟨6d⟩`, which the
Go to toolbar's one box, Go to passage, finds, and a reference names bare,
"2a-c". Or made by a selection: every row the selection puts a word, or part
of one, into, whole and in both columns; in a dual-language block, also the
Latin the selected sentence stands beside. What ⌃⌘R quotes, what the column
marks show beyond the selection, and what Ref (all) is offered on. In a block
numbered on both sides, Ref quotes the passage's translation column alone.
_Avoid_: selection (what the hand made, not what it means), quote, excerpt,
section (for a Stephanus passage).

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
text; the toolbars, menus and panels that hang from the masthead open
below it.
_Avoid_: strip.

**Menu area**:
The band down the window's left that an open menu stands in. From 900 px
wide, an entry the menu would cover moves over to keep the menu area clear.
Unlike the alert area it exists only while a menu is open, and only where
an entry would lie under it.
_Avoid_: the retired words `tools/vocabulary.ts` lists.

**Masthead**:
The dark band across the top of the page: the entry's date or name with the
previous and next arrows, its sub-entries or its breadcrumb, the icons
that open the bookshelf menu and the commonplace menu, and the masthead's
buttons on the right: today, rename, delete, export, import, backups, help.
_Avoid_: header, which is a table's first row and sits too near an entry's
heading; toolbar, for its buttons.

**Masthead row**:
One of the rows that open in the masthead under its top line: Go to,
Search and Line numbering, one at a time.
_Avoid_: bar; a table's header row is not one.

**Go to row**:
The masthead row ⌃⌘J opens on its third press: dropdowns that go to another
entry, a day of the journal or any commonplace.

**Menu**:
One of the two lists the masthead's icons open, to go somewhere from: the
bookshelf menu, its authors by shelf, with New author… and Shelves… at its
foot; the commonplace menu, every commonplace in name order, with New
commonplace… at its foot. Opening one selects the row the open entry is or
sits under, else its first row, and shows its icon reversed. ⌃⌘J opens
the bookshelf menu, and pressed again the commonplace menu.
_Avoid_: list, index, dropdown (a `<select>`), panel.

**Search results**:
What the Search row drops below the masthead: a row for each match, where
it is and its words around it.
_Avoid_: hits; menu.

**Toolbar**:
One of three that work on the entry in front of you: the Go to toolbar
(⌃⌘G), the format toolbar, over a selection, and the replace toolbar (⌃⌘E,
in markdown mode).
_Avoid_: bar; control, every button's word and the ⌃ key's name; the
retired words `tools/vocabulary.ts` lists, a panel popping up too.

**Go to toolbar**:
The toolbar ⌃⌘G opens under the masthead, at the right: it asks for a line,
a page, a paragraph, a verse, or a stanza and its line, whichever the entry
numbers, and goes there.
_Avoid_: the retired words `tools/vocabulary.ts` lists.

**Panel**:
One of four the masthead opens over the page, to read or pick from: help
(⌃⌘H), backups, bookmarks (⌃⌘B) and shortcuts (⌃⌘S).
_Avoid_: card, which is a `::: card` box in an entry; the retired words
`tools/vocabulary.ts` lists.

**HTML mode**:
An entry shown formatted, as it reads, and edited so; every entry opens in
it. ⌃⌘M switches to markdown mode and back.
_Avoid_: the retired words `tools/vocabulary.ts` lists.

**Markdown mode**:
An entry shown as its markdown, the text it is stored as, and edited so;
the masthead says "markdown" while it is on. It lasts while the entry stays
open.
_Avoid_: source; the retired words `tools/vocabulary.ts` lists.

**Landing**:
Where ⌃⌘G or a link to a line puts the reader: the line centred in the band
under the masthead and the alert area, and marked. ⌃⌘G's mark goes when
the toolbar closes; a link's at the hand's next click or key that moves. A
jump to a search highlight is centred the same way, but not marked.
