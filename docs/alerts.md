# Alerts

Every alert Gesta raises, by kind (`GLOSSARY.md`, Alert). The first column
is what the alert says, `…` standing for a part that varies. A row naming
a file and a call is an alert whose words are chosen elsewhere: its second
column says where they come from and what they are.

`tools/alertCatalogue.test.ts` fails when src/ raises an alert this page
does not list under its kind, or this page lists one src/ no longer
raises. It reads the first column only.

## Error

Red. Something went wrong; it stays until what caused it is resolved or
it is closed, and a click copies its detail. Every error is kept three
months in the alert log (`gesta.alerts()` in the console).

| Words | When |
|---|---|
| `not saved` | A save of an entry did not reach storage. It stays until every entry owed lands; a click copies the error. |
| `not saved — changed in another tab, copy your text then reload` | Another tab saved the entry first, so this tab's typing was refused. A click copies the text this tab was holding. |
| `not saved — deleted in another tab, copy your text` | Typing into an entry another tab deleted. A click copies what was typed. |
| `not deleted — changed in another tab, reload` | A delete refused because another tab saved the entry since. |
| `couldn’t delete — reload` | A delete failed for a reason other than another tab. |
| `deleted in another tab` | The entry on screen was deleted in another tab, with nothing unsaved. |
| `couldn’t load entries — reload` | The journal has not loaded eight seconds after launch. Resolved when it does. |
| `the store could not be read — reload` | The browser's storage could not be read at launch; a click copies the error. |
| `cannot render … — …; shown as source` | An entry the editor cannot draw (a grid holding a stray line, say): its key and why. It opens in the markdown view, and goes once it parses on the switch back. |
| `picture not saved — storage full` | A pasted picture could not be stored: the browser's storage is full. |
| `picture not saved` | A pasted picture could not be stored, for another reason; a click copies the error. |
| `the picture had nowhere to land — paste it again` | Another entry or the other view was opened while a pasted picture was being read. |
| `that picture couldn’t be read — try copying it as a PNG` | A pasted picture's data could not be decoded. |
| `line numbers not saved — storage full` | The choice in the Line numbering row (⌃⌘L opens it) could not be kept. |
| `shortcuts not saved — storage full` | Save in the shortcuts panel could not write. Resolved by the next save that works. |
| `bookmarks not saved` | A bookmark change could not be written: storage full, or the list kept is damaged. Resolved by the next write that lands. |
| `Copy failed` | The copy button over a block: the block went, or the clipboard refused. |
| `couldn’t read the pictures` | The backups panel's sweep of unused pictures could not read the pictures stored. |
| `backup couldn’t remove … old file(s)` | A backup ran, but old files in its folder would not go; a click copies their names. |
| `backed up, but gesta.zip for the reader couldn’t be written` | A backup ran, but the reader's bundle could not be written. |
| `backup blocked — …` | Two entries share a filename in the backup folder; the paused pill shows too. |
| `couldn’t set up backups — …` | Choosing the backup folder failed; … is the error. |
| `exported … entries…` | An export wrote every entry, but pictures were missing (“ — 2 pictures missing”); a click copies which. |
| `nothing to import here — …` | Every file picked for import was refused; … says which and why. |
| `storage full — imported … of …` | An import stopped when storage filled. |
| `imported …, … failed` | An import in which some files failed; a click copies which. |
| `couldn’t rename — nothing was moved` | Renaming a tagged entry failed; it is left as it was. |
| `… — …` | A move, rename or re-file refused by its plan: “couldn’t move”, “couldn’t rename” or “couldn’t re-file”, a dash, and why (“… is there already”). The old entry is opened again. |
| `… — copies left: …` | A move whose copies failed and could not all be taken back: the copies left. |
| `… — nothing was moved` | A move whose copies failed and were all taken back. |
| `couldn’t build the search index — …` | Search's index could not be built; … is the error. |
| `open backup: gesta.zip in Dropbox › gesta-backups › reader` | The reader opened with no backup kept in it. |
| `couldn’t keep the backup — …` | The reader: a backup picked could not be kept in this browser. |
| `couldn’t read the backup — …` | The reader: the backup kept could not be read. |

### Words chosen elsewhere

| Raised at | Words and when |
|---|---|
| `src/editor/surface.ts › opts.error(told.join("\n"))` | An entry opened, or switched back to from the markdown view, with fences Gesta does not know or reference directives it cannot read: one line each, “::: versey — not a block Gesta knows, so it stayed a paragraph”, several closing with “2 fences stayed paragraphs”. An error, so the block's form can still be copied after ten seconds. |
| `src/session.ts › opts.error(failText)` | ⌃⌘R or a link copy the clipboard refused: “Couldn’t copy the reference”, “Couldn’t copy the link”. A click copies what was being copied; the next copy that lands resolves it. |
| `src/ui/alertLedger.svelte.ts › error(text)` | The entry layer's failed writes, the “not saved” and “not deleted” rows above, raised keyed so that their entry's landing resolves them. |
| `src/ui/alertLedger.svelte.ts › error(COPY_FAILED)` | “copy failed — see console”: a click on an alert whose words the clipboard refused. A click on it only closes it. |
| `src/ui/folderActs.ts › p.fail(msg)` | An export that failed: “exported 120 entries; 2 file(s) failed”, or “export failed — …”; an import that failed: “import failed — …”. A click copies the files and errors. |
| `src/ui/folderActs.ts › alerts.error((err as Error).message)` | An import with two files spelling one entry: the message names them; a click copies both. |
| `src/ui/folderActs.ts › alerts.error(msg)` | An import that failed before its progress line began: “import failed — …”. |
| `src/ui/lifecycle.ts › ui.error(text)` | A move, rename or re-file that landed but left links not updated or entries standing: “moved to …; 1 link not updated: …”. |

## Warning

Amber. Why an act just tried did nothing. It fades after ten seconds, or
goes when closed, replaced by the next, or another entry is opened.

| Words | When |
|---|---|
| `⌃⌘M toggles markdown` | Tab in prose with nothing selected, or in an empty quote. |
| `Tab indents one list, quote, or code block at a time` | Tab with text selected in prose, or over a selection that spills out of a quote. |
| `no line numbers here` | ⌃⌘L on an entry with no numbered lines. |
| `no earlier entry` | ⌃⌘, at the first entry. |
| `no later entry` | ⌃⌘. at the last entry. |
| `no such …` | An address naming an entry that does not exist: “no such book”, “no such commonplace”, or a sub-entry's noun. |
| `still loading — try that again in a moment` | ⌃⌘R before the entry is drawn. |
| `switch to the rendered view (⌃⌘M) to copy a reference` | ⌃⌘R in the markdown view. |
| `no markdown view here` | ⌃⌘M in the reader. |
| `picture not pasted — one at a time; paste it again` | A picture pasted while the last one is still being read. |
| `place your cursor in the entry` | A shortcut, or a bookmark's link, chosen with no cursor in the entry. |
| `no shortcut to insert` | Enter in the shortcuts panel with no row matching. |
| `already bookmarked` | A in the bookmarks panel on an entry already there. |
| `bookmarks full — delete one, or give one its own key` | A with nine numbered bookmarks. |
| `nothing to bookmark here yet` | A on an entry not yet saved anywhere. |
| `no bookmark …` | A number typed in the bookmarks panel with no row. |
| `“…” already goes to …` | A bookmark key given that another bookmark has. |
| `Nothing to copy` | The copy button over a block that has gone. |
| `nothing to change there` | A toolbar button that would change nothing. |
| `… is still running` | Export or import pressed while one runs: “an export”, “an import”. |
| `export needs a browser that can open a folder to write into` | Export in a browser without a folder picker. |
| `import needs a folder picker` | Import in a browser without a folder picker. |
| `nothing to import` | An import folder with no files to import. |
| `automatic backups need a Chromium browser` | Setting up backups in a browser without a folder picker. |
| `couldn’t create the entry — see the error above` | A new entry made from a selection did not land. |
| `the entry was made — the link was not placed` | A new entry made from a selection landed, but the entry or view on screen changed before its link could be placed. |
| `the text moved while the entry was made — the link was not placed` | A new entry made from a selection landed, but the selected text changed meanwhile. |

### Words chosen elsewhere

| Raised at | Words and when |
|---|---|
| `src/session.ts › warn(REFUSAL_TEXT[out.refused])` | ⌃⌘R over what cannot be referenced: “Select a passage to reference first”, “A code block can’t be referenced”, “A margin-note can’t be referenced — select the text beside it”, “That spans two verse blocks — reference them one at a time”, “Those verse blocks aren’t numbered straight on — reference them one at a time”, “No translation lines selected — Ref (all) quotes the Latin too”. |
| `src/session.ts › warn(sameMsg)` | ⌃⌘T on today, or a link to where you are: “already on today”, “already here”. |
| `src/ui/journalLoad.ts › warn(REFUSAL[state])` | An act tried before the journal is read: “still loading — try that again in a moment”, or, once the read has failed, “couldn’t load entries — reload first”. |
| `src/editor/editor.ts › warn(REFERENCE_HERE)` | A click on a reference in the rendered view: “Reference style is edited in the markdown view (⌃⌘M)”. |
| `src/editor/codeKeys.ts › warn(out.refuse)` | Tab or Shift+Tab in a code block that moves nothing: “nothing to indent — those lines are empty”, “no spaces to remove”. |
| `src/editor/sourceView.ts › opts.warn(r.refuse)` | The same in the markdown view. |
| `src/editor/listKeys.ts › warn(listRefusal(state, shift))` | Tab or Shift+Tab in a list that cannot move: “can’t indent the first item in a list”, “can’t indent an item more than one deeper than its parent”, “at the outer level: switch to markdown (⌃⌘M) to remove”. |
| `src/editor/quoteKeys.ts › warn(quoteRefusal(state, shift))` | The same in a quote: “⌃⌘M toggles markdown”, “Tab indents one list, quote, or code block at a time”, “at the outer level: switch to markdown (⌃⌘M) to remove”. |
| `src/editor/gridKeys.ts › warn(GRID_JOIN)` | Backspace at a card's start or Delete at its end: “a grid’s cards are joined in the source view (⌃⌘M)”. |
| `src/editor/paste.ts › on.warn(r.refused)` | A paste holding fences Gesta does not know: the refused lines, as an entry opened with them says. |
| `src/ui/formatBarActs.ts › warn((act === "code" && codeBlockRefusal(view.state)) \|\| "nothing to change there")` | The code button over a picture: “can’t make a code block from that”. |
| `src/ui/bookmarkActs.ts › warn(r.warn)` | A bookmark key typed: “finish the key”, “no bookmark …”. |
| `src/ui/bookmarkActs.ts › warn(alreadyOn(key, journal))` | A bookmark's link pressed on the entry it goes to: “already on …”. |
| `src/ui/lifecycle.ts › ui.warn(why)` | A delete, move, rename or re-file refused before it starts: “delete the books first”, an address that cannot be used. |
| `src/ui/lifecycle.ts › ui.warn(typed.refuse)` | A name typed for a new entry that cannot be one: “that link’s title can’t be a name — type one instead”, “that name leaves nothing a filename can keep”, “an address can’t have an empty part”. |
| `src/ui/lifecycle.ts › ui.warn(spec.refuse)` | A sub-entry's name: “that name leaves nothing a filename can keep”. |
| `src/ui/lineBarActs.ts › warn(a.said.text)` | ⌃⌘G with a number mistyped or not in the entry: “the lines here are 1–2”, “x is not a line number”, “type a stanza number”. |
| `src/ui/lineBarActs.ts › warn(bar(null, conventions()).inSource)` | ⌃⌘G in the markdown view: “Switch to the rendered view to go to a line or a page”, the noun the entry's numbering asks for. |
| `src/ui/lineBarActs.ts › warn(b.none)` | ⌃⌘G on an entry with nothing numbered: “no line or page numbers here”, or paragraph or verse numbers. |

## Info

Blue. A count, a progress line or a note, telling of no outcome. It fades
on its own; a progress line holds its place until the act ends.

| Words | When |
|---|---|
| `1 word` | The Words button or ⌃⌘W over one word. |
| `… words` | The Words button or ⌃⌘W: the selection's count, or the entry's with nothing selected. |
| `… entries stored` | The journal read at launch. |
| `Source view, to replace` | ⌃⌘E in the rendered view, switching to the markdown view. |
| `indexing…` | Search before its index is built. |
| `exporting…` | An export running. |
| `importing…` | An import running. |
| `backing up…` | A backup starting. |
| `backing up… … / …` | A backup running: files written of all. |
| `keeping the backup…` | The reader keeping a backup picked. |
| `opening the backup…` | The reader opening the backup kept. |

### Words chosen elsewhere

| Raised at | Words and when |
|---|---|
| `src/ui/lineBarActs.ts › info(a.said.text)` | ⌃⌘G landing on a number found in more than one block: “line 3 — block 2 of 4”; or on a line the edition omits, the bar or a link: “line 12 is omitted in this edition”. |

## Success

Green. Something done worked. It fades on its own; a click on it copies
its words, but for a routine one such as “saved”.

| Words | When |
|---|---|
| `saved` | An entry's save landed. |
| `copied` | A click on an alert copied its words. |
| `shortcuts saved` | Save in the shortcuts panel. |
| `backed up` | A backup ran with nothing left over. |
| `exported … entries` | An export wrote every entry and picture. |
| `nothing to export` | An export with no entries. |
| `imported … entries` | An import with nothing failed. |
| `indexed … entries` | Search's index built. |
| `… entries` | The reader: the backup opened, its entries counted. |

### Words chosen elsewhere

| Raised at | Words and when |
|---|---|
| `src/session.ts › succeed(okText)` | ⌃⌘R or a link copied: “Reference copied to clipboard”, “Link copied”. |
| `src/ui/backupsPanelActs.ts › succeed(sweptLine(removed, n))` | The backups panel's sweep: “removed 3 unused pictures”, or “removed 2 of 3 unused pictures — the rest would not go”. |
| `src/ui/lifecycle.ts › ui.succeed(text)` | A move, rename or re-file that landed whole: “moved to …”, “renamed to …”, “filed under …”. |
