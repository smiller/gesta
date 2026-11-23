# Alerts

Every alert Gesta raises, by kind (`GLOSSARY.md`, Alert), written from
`src/model/alertText.ts` by `node tools/alertsPage.ts`; a test fails when
this page is not what the table writes. `…` stands for a part that varies;
⏎ starts another line.

Every error and warning is kept three months in the alert log:
`gesta.alerts()` in the developer console lists them, each with when it was
raised, on which entry, and after which key or control.

## Error

Red. Something went wrong; it stays until what caused it is resolved or it is closed, and a click copies its detail.

| Words | When |
|---|---|
| `not saved` | A save of an entry did not reach storage. It stays until every entry owed lands; a click copies the error. |
| `not saved — changed in another tab, copy your text then reload` | Another tab saved the entry first, so this tab’s typing was refused. A click copies the text this tab was holding. |
| `not saved — deleted in another tab, copy your text` | Typing into an entry another tab deleted. A click copies what was typed. |
| `not deleted — changed in another tab, reload` | A delete refused because another tab saved the entry since. |
| `couldn’t delete — reload` | A delete failed for a reason other than another tab. |
| `deleted in another tab` | The entry on screen was deleted in another tab, with nothing unsaved. |
| `couldn’t load entries — reload` | The journal has not loaded eight seconds after launch. Resolved when it does. |
| `the store could not be read — reload` | The browser’s storage could not be read at launch; a click copies the error. |
| `picture not saved — storage full` | A pasted picture could not be stored: the browser’s storage is full. |
| `picture not saved` | A pasted picture could not be stored, for another reason; a click copies the error. |
| `the picture had nowhere to land — paste it again` | Another entry or the other view was opened while a pasted picture was being read. |
| `that picture couldn’t be read — try copying it as a PNG` | A pasted picture’s data could not be decoded. |
| `line numbers not saved — storage full` | The choice in the Line numbering row (⌃⌘L opens it) could not be kept. |
| `shortcuts not saved — storage full` | Save in the shortcuts panel could not write. Resolved by the next save that works. |
| `bookmarks not saved` | A bookmark change could not be written: storage full, or the list kept is damaged. Resolved by the next write that lands. |
| `Copy failed` | The copy button over a block: the block went, or the clipboard refused. |
| `copy failed — see console` | A click on an alert whose words the clipboard refused. A click on it only closes it. |
| `couldn’t read the pictures` | The backups panel’s sweep of unused pictures could not read the pictures stored. |
| `backed up, but gesta.zip for the reader couldn’t be written` | A backup ran, but the reader’s bundle could not be written. |
| `couldn’t rename — nothing was moved` | Renaming a tagged entry failed; it is left as it was. |
| `export failed — …` | An export that failed outright; a click copies the error. |
| `import failed — …` | An import that failed outright; a click copies the error. |
| `couldn’t set up backups — …` | Choosing the backup folder failed. |
| `couldn’t build the search index — …` | Search’s index could not be built. |
| `couldn’t keep the backup — …` | The reader: a backup picked could not be kept in this browser. |
| `couldn’t read the backup — …` | The reader: the backup kept could not be read. |
| `exported … entries — … pictures missing` | An export wrote every entry, but pictures were missing; a click copies which. |
| `exported … entries; … file(s) failed — … pictures missing` | An export in which some files failed; a click copies the files and errors. |
| `nothing to import here — … .md files will NOT be imported.` | Every file picked for import was refused. |
| `storage full — imported … of …` | An import stopped when storage filled. |
| `imported …, … failed` | An import in which some files failed; a click copies which. |
| `two files here are the same entry (… and …) — remove one and import again` | An import with two files spelling one entry; a click copies the second. |
| `Couldn’t copy the reference` | ⌃⌘R the clipboard refused. A click copies the reference; the next copy that lands resolves it. |
| `Couldn’t copy the link` | A link copy the clipboard refused. A click copies the link; the next copy that lands resolves it. |
| `cannot render … — …; shown as source` | An entry the editor cannot draw (a grid holding a stray line, say): its key and why. It opens in the markdown view, and goes once it parses on the switch back. |
| `… fences stayed paragraphs` | An entry opened, or switched back to from the markdown view, with fences Gesta does not know or reference directives it cannot read: one line each. An error, so the block’s form can still be copied after ten seconds. |
| `… — …` | A move, rename or re-file refused once under way, or failed: why. The old entry is opened again. |
| `… — copies left: …` | A move whose copies failed and could not all be taken back: the copies left. |
| `… — nothing was moved` | A move whose copies failed and were all taken back. |
| `… to … — … entries, … there already deleted, … pictures not found, links updated in … others; links not updated in … entries: …; old copies kept: …` | A move or rename that landed but left links not updated or old copies standing. |
| `filed under … — … entries moved, … pictures not found, links updated in … others; links not updated in … entries: …; old copies kept: …` | A re-file that landed but left links not updated or old copies standing. |
| `backup couldn’t remove … old file(s)` | A backup ran, but old files in its folder would not go; a click copies their names. |
| `backup blocked — …` | Two entries share a filename in the backup folder; the paused pill shows too. |
| `open backup: gesta.zip in Dropbox › gesta-backups › reader` | The reader opened with no backup kept in it. |

## Warning

Amber. Why an act just tried did nothing. It fades after ten seconds, or goes when closed, replaced by the next, or another entry is opened.

| Words | When |
|---|---|
| `Select a passage to reference first` | ⌃⌘R with nothing selected. |
| `A code block can’t be referenced` | ⌃⌘R in a code block. |
| `A margin-note can’t be referenced — select the text beside it` | ⌃⌘R in a margin-note. |
| `That spans two verse blocks — reference them one at a time` | ⌃⌘R over two verse blocks that are not one run. |
| `Those verse blocks aren’t numbered straight on — reference them one at a time` | ⌃⌘R over verse blocks numbered apart. |
| `No translation lines selected — Ref (all) quotes the Latin too` | Ref over a dual-language block with no English selected. |
| `already here` | A link or a go-to row to the entry already open. |
| `already on …` | A bookmark’s link, or a contents link to an author or a book, pressed on the entry it goes to. |
| `already on today` | ⌃⌘T on today’s entry. |
| `no such …` | An address naming an entry that does not exist: “no such book”, “no such commonplace”, or a sub-entry’s noun. |
| `… fences stayed paragraphs` | A paste holding fences Gesta does not know: one line each, with why. |
| `no spaces to remove` | Shift+Tab in a code block or the markdown view over lines with no spaces to remove. |
| `nothing to indent — those lines are empty` | Tab in a code block or the markdown view over empty lines. |
| `can’t indent the first item in a list` | Tab on a list’s first item. |
| `can’t indent an item more than one deeper than its parent` | Tab on an item already one deeper than the one above. |
| `at the outer level: switch to markdown (⌃⌘M) to remove` | Shift+Tab at a list’s or a quote’s outer level. |
| `a grid’s cards are joined in the source view (⌃⌘M)` | Backspace at a card’s start or Delete at its end. |
| `Reference style is edited in the markdown view (⌃⌘M)` | A click on a reference in the rendered view. |
| `can’t make a code block from that` | The code button over a picture or a page label. |
| `an entry can’t move under itself` | A move or rename into a place under the entry itself. |
| `nothing at … to move it under` | A move or rename under an entry that does not exist. |
| `“…” is there already and has sub-entries of its own` | A move into an entry holding a sub-entry of the same title that has its own. |
| `… is there already` | A move onto an entry that already exists. |
| `the shelves keep their name` | Renaming the Shelves entry. |
| `the shelves hold no books` | A book made, or a tag placed, on the Shelves entry. |
| `“…” is the shelves’ own name` | An author named, filed or moved to the Shelves entry’s name. |
| `that link’s title can’t be a name — type one instead` | A new entry named from a link whose title gives no name. |
| `that name leaves nothing a filename can keep` | A name typed that leaves no letters a filename keeps. |
| `an address can’t have an empty part` | A rename typed as an address with an empty part. |
| `delete the … first` | Deleting an entry whose sub-entries hold text. |
| `a tagged entry holds no entries of its own` | ⌃⌘N on a day’s tagged entry. |
| `no link inside a code block` | A link placed with the cursor in code. |
| `no link inside a link` | A link placed with the cursor in a link. |
| `no link inside a heading — place your cursor below it` | A new entry’s link placed with the cursor in, or a selection cutting into, a heading. |
| `a letter b to z, then letters or digits — a adds, a leading digit jumps` | A bookmark key given in a shape keys do not take. |
| `“…” already goes to …` | A bookmark key given that another bookmark has. |
| `⌃⌘M toggles markdown` | Tab in prose with nothing selected, or in an empty quote. |
| `Tab indents one list, quote, or code block at a time` | Tab with text selected in prose, or over a selection that spills out of a quote. |
| `no line numbers here` | ⌃⌘L on an entry with no numbered lines. |
| `no earlier entry` | ⌃⌘, at the first entry. |
| `no later entry` | ⌃⌘. at the last entry. |
| `still loading — try that again in a moment` | An act tried before the journal is read, or ⌃⌘R before the entry is drawn. |
| `couldn’t load entries — reload first` | An act tried once the journal’s read has failed. |
| `switch to the rendered view (⌃⌘M) to copy a reference` | ⌃⌘R in the markdown view. |
| `no markdown view here` | ⌃⌘M in the reader. |
| `picture not pasted — one at a time; paste it again` | A picture pasted while the last one is still being read. |
| `place your cursor in the entry` | A shortcut, or a bookmark’s link, chosen with no cursor in the entry. |
| `no shortcut to insert` | Enter in the shortcuts panel with no row matching. |
| `already bookmarked` | A in the bookmarks panel on an entry already there. |
| `bookmarks full — delete one, or give one its own key` | A with nine numbered bookmarks. |
| `nothing to bookmark here yet` | A on an entry not yet saved anywhere. |
| `…` | ⌃⌘G with a number mistyped or not in the entry, on an entry with nothing numbered, or in the markdown view; its words are the Go to popup’s phrases. |
| `finish the key` | Enter on a bookmark key typed part-way that more than one key starts with. |
| `no bookmark …` | A number typed in the bookmarks panel with no row, or a key typed that no bookmark has. |
| `Nothing to copy` | The copy button over a block that has gone. |
| `nothing to change there` | A toolbar button that would change nothing. |
| `an export is still running` | Export or import pressed while an export runs. |
| `an import is still running` | Export or import pressed while an import runs. |
| `export needs a browser that can open a folder to write into` | Export in a browser without a folder picker. |
| `import needs a folder picker` | Import in a browser without a folder picker. |
| `nothing to import` | An import folder with no files to import. |
| `automatic backups need a Chromium browser` | Setting up backups in a browser without a folder picker. |
| `couldn’t create the entry — see the error above` | A new entry made from a selection did not land. |
| `the entry was made — the link was not placed` | A new entry made from a selection landed, but the entry or view on screen changed before its link could be placed. |
| `the text moved while the entry was made — the link was not placed` | A new entry made from a selection landed, but the selected text changed meanwhile. |

## Info

Blue. A count, a progress line or a note, telling of no outcome. It fades on its own; a progress line holds its place until the act ends.

| Words | When |
|---|---|
| `1 word` | Word count: from the Words button or ⌃⌘W: one word, in the selection or the entry. |
| `… words` | Word count: from the Words button or ⌃⌘W: the selection’s, or the entry’s with nothing selected. |
| `…` | ⌃⌘G landing on a number found in more than one block, or on a line the edition omits; its words are the Go to popup’s phrases. |
| `… entries stored` | The journal read at launch. |
| `Source view, to replace` | ⌃⌘E in the rendered view, switching to the markdown view. |
| `indexing…` | Search before its index is built. |
| `exporting…` | An export running. |
| `importing…` | An import running. |
| `backing up…` | A backup starting. |
| `backing up… … / …` | A backup running: files written of all. |
| `keeping the backup…` | The reader keeping a backup picked. |
| `opening the backup…` | The reader opening the backup kept. |

## Success

Green. Something done worked. It fades on its own; a click on it copies its words, but for a routine one such as “saved”.

| Words | When |
|---|---|
| `saved` | An entry’s save landed. |
| `copied` | A click on an alert copied its words. |
| `Reference copied to clipboard` | ⌃⌘R copied a reference. |
| `Link copied` | A link to the entry copied. |
| `… to … — … entries, … there already deleted, … pictures not found, links updated in … others; links not updated in … entries: …; old copies kept: …` | A move or rename that landed whole. |
| `filed under … — … entries moved, … pictures not found, links updated in … others; links not updated in … entries: …; old copies kept: …` | A re-file that landed whole. |
| `removed … unused pictures` | The backups panel’s sweep removed every unused picture. |
| `removed … of … unused pictures — the rest would not go` | The backups panel’s sweep removed some unused pictures; the rest would not go. |
| `shortcuts saved` | Save in the shortcuts panel. |
| `backed up` | A backup ran with nothing left over. |
| `nothing to export` | An export with no entries. |
| `exported … entries` | An export wrote every entry and picture. |
| `imported … entries` | An import with nothing failed. |
| `indexed … entries` | Search’s index built. |
| `… entries` | The reader: the backup opened, its entries counted. |

## Phrases

Words that stand inside the alerts above, never alone: the Go to popup’s, a refused fence’s reason, a directive’s trouble, a filename clash.

| Words | Name |
|---|---|
| `no …` | `noUnit` |
| `no …, the last … is …` | `noUnitLast` |
| `no … — the longest … ends at …` | `noUnitLongest` |
| `no … here` | `noUnitHere` |
| `no numbered …s here` | `noNumbered` |
| `the only … here is …` | `onlyUnit` |
| `the …s here are …–…` | `unitsRange` |
| `no numbered paragraphs here` | `noNumberedParagraphs` |
| `no paragraph … — the paragraphs here are …–…` | `noParagraph` |
| `… is omitted in this edition` | `omitted` |
| ` — … of …` | `ofBlocks` |
| `…` | `unitAt` |
| `no page numbers here` | `noPageNumbers` |
| `no page … here` | `noPage` |
| `type a … number` | `typeNumber` |
| `use roman or arabic characters, not both` | `romanOrArabic` |
| `… is not a … number` | `notANumber` |
| `no stanzas here` | `noStanzas` |
| `no stanza … here — the last is …` | `noStanza` |
| `no line … in stanza … — it has … lines` | `noLineInStanza` |
| `type a stanza for line …` | `typeStanzaFor` |
| `type a stanza number` | `typeStanza` |
| `type a stanza, or stanza.line` | `typeStanzaOrLine` |
| `… is not a stanza or stanza.line, like 2.1` | `notStanzaOrLine` |
| `no … numbers here` | `nothingNumbered` |
| `Switch to the rendered view to go to …` | `switchToGo` |
| `… takes no numbered: the word is verse’s and prose’s` | `noNumberedTaken` |
| `numbered goes after the number, like ::: … numbered` | `numberedAfter` |
| `… takes one number; a second, for the right column, is verse’s alone` | `oneNumberOnly` |
| `… is not a starting line for the right column` | `notRightStart` |
| `verse takes two numbers at most: its first line, and its right column’s` | `twoNumbersAtMost` |
| `… is not a starting …` | `notStarting` |
| `stanza needs its number, like ::: stanza 2` | `stanzaNeedsNumber` |
| `… takes nothing after it` | `takesNothing` |
| `… is not a count` | `notACount` |
| `card blocks must include a colour, like card-light-green` | `cardNeedsColour` |
| `not a block Gesta knows` | `unknownBlock` |
| `“…” is not a reference directive` | `notADirective` |
| `“…” is read on an author’s page` | `readOnAuthorPage` |
| `“…” is read on a work’s page` | `readOnWorkPage` |
| `“…” is read on any page` | `readOnAnyPage` |
| `two entries would write one file — … is claimed by …. Rename one of them.` | `filenameClash` |
