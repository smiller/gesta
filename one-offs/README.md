# one-offs/

the scripts run once or a few times over the backup to
set its entries right, kept out of `tools/` since 2026-11-12 (asked) so
that `src/` and `tools/` hold only what is used every day; every check
holds over them as over `tools/`: tsc, the suite, the unused exports,
Code Health 10 with the two string rules off. A `*Run.ts` reads the
backup and writes an import folder with a review page; their caches are
under `one-offs/out`, ignored. `one-offs/residue.ts` — the corpus
report's sites grouped by class, for fixing data by hand.
`one-offs/fencedProse.ts` — a fence with no language holding prose made a
quotation, pure, its test beside it; `one-offs/fencedProseRun.ts` runs it
over the backup and writes the changed entries as an import folder with a
review page.
`one-offs/oldSpellings.ts` — an entry's old inline spellings respelled
outside code, pure, its test beside it: an Emacs link to an address or
to a day of the journal a markdown link, text between slashes italic;
`one-offs/oldSpellingsRun.ts` runs it over the backup and writes the changed
entries as an import folder with a review page.
`one-offs/pipeTables.ts` — a two-column pipe table made a `::: verse` block
of pairs, or the reference its lines make when they quote the bookshelf,
pure, its test beside it; `one-offs/bookshelfQuotes.ts` finds the bookshelf
passage a quotation's lines are and mints the reference ⌃⌘C would, its
test beside it; `one-offs/pipeTablesRun.ts` runs both over the backup and
writes the changed entries as an import folder with a review page.
`one-offs/orgReferences.ts` — the old `[[target][label]]` links made
markdown links, their words kept, and a quotation a link introduces
replaced by the passage it is given, pure, its test beside it;
`one-offs/orgReferencesRun.ts` resolves each against the backup — a
journal day, a bookshelf passage placed by its quotation, its line
anchor or its words — and writes an import folder with a review page;
`one-offs/orgDrawersRun.ts` points an old `[[#anchor]]` link at the place
its Org property drawer marks, then clears the drawers, the same way.
`one-offs/shelfLines.ts` — runs of an author's verse quoted line for line in
an entry found and made the references ⌃⌘R makes for them, and quoted
paragraphs that are a book's text (a prose book, a translation beside
verse) placed and joined while nothing is left out between them, a
quotation and its translation one reference, a typed source line's own words
kept round the link, a line inside another writer's quotation left with it,
pure, its test beside it;
`one-offs/shelfLinesRun.ts [author-prefix,…]` (Milton by default; several
prefixes a comma apart, a comma and a space inside a filed name) writes
an import folder with a review page. Letters are matched with accents dropped and ð and þ one
letter; the review compares words with them kept.
`one-offs/beowulfWyatt.ts` — Wyatt's Beowulf (1894) as Wikisource
transcribes it made one bookshelf page, `bookshelf/Beowulf`, its page
saying `no author` and `Old English verse`: the apparatus dropped, the
spelling plain, the transcription's misreadings set right by line
(`misread`), pure, its test beside it; `one-offs/beowulfWyattRun.ts` fetches
the pages (cached under `one-offs/out/wyatt`), checks the 3182 lines against
the printed numbers, sets right the misreadings read against Wyatt's
printed page, refuses a backup page edited since it was written, and
writes an import folder with a review page; `one-offs/finnsburhWyattRun.ts`
the same for the Finnsburh fragment, Wyatt's appendix, made
`bookshelf/Finnsburh` (`finnsburhLines` keeps his asterisks where the
fragment breaks off); `one-offs/wyattPages.ts` the pages' fetch and cache
both runs share.
`one-offs/hwaetTexts.ts` — an Old English text with its translation as
early-medieval-england.net gives it, a row a half-line, made one bookshelf
page of pairs, a whole line each, pure, its test beside it;
`one-offs/hwaetTextsRun.ts [id …]` runs it over Deor, The Wanderer and The
Seafarer, and Hávamál in stanzas (`stanzaLines`: a row a line, each stanza
its own `::: stanza N` fence), pages cached under `one-offs/out/hwaet`; it
checks each poem's count and the site's numbers, carries the site's notes
as footnotes (a mark after the line, the stanza's notes in a `::: note`
after its last line), leaves out a poem the backup already has (by its key
or its heading), and writes an import folder with a review page.
`one-offs/harvardMilton.ts` — the Harvard Classics' Milton (1909) read from
two scans' OCR against each other, a poem at a time: the page furniture
dropped, a line the page ran over joined back, the two read word by word,
a disagreement settled by another edition's line (Thurber's, Beeching's)
or the words the edition prints elsewhere, its æ and œ, which neither scan
reads, put back, the rest named; pure, its test beside it.
`one-offs/miltonSonnets.ts` — the sonnets made pages, a sonnet a page under
`Milton, John/Sonnets`, the Italian ones paired with Cowper's translations,
pure, its test beside it; `one-offs/miltonSonnetsRun.ts` runs both over the
scans and texts cached under `one-offs/out/harvard`, the names respelled and
the readings given Milton's word as asked, and writes an import folder with
a review page.
`one-offs/harvardStrips.ts` — a disputed line seen on the printed page: found
in scan A's hOCR, cut from the archive's page image (cached under
`one-offs/out/harvard/pages`) onto a sheet that headless Helium screenshots,
to be read by eye; the hOCR's parse and the finder pure, tested.
`one-offs/paradiseRegained.ts` — Gutenberg's Paradise Regained (#58), the
Harvard text, made four book pages laid out as Paradise Lost's, pure, its
test beside it; `one-offs/paradiseRegainedRun.ts` reads it against the two
scans (`readAgainst` in harvardMilton.ts), each word or mark they differ on
settled as read on the page, the Oxford edition's readings, the names and
spellings the bookshelf's Paradise Lost has as asked, and writes an import
folder with a review page.
`one-offs/miltonPoems.ts` — Milton's shorter poems made pages, a page each
beside Lycidas: the furniture between a scan's lines told from verse, a
witness's stanza gaps, the verse paragraphs read from where the edition
indents a line (scan A's hOCR), an elision's apostrophe and the first
words' small capitals set right, the stanza numerals and headings as
italic rows; pure, its test beside it; `one-offs/miltonPoemsRun.ts` reads the
sixteen poems from the two scans, the lines whose reading was wrong as read
on the printed page, the spellings and names as asked, and writes an import
folder with a review page.
`one-offs/miltonMasks.ts` — Arcades and Comus made pages: Thurber's edition
read for their outline (a speaker's prefix written out, a split line's
rest, the directions by their openings, the song headings, a verse
paragraph or a song's stanza) and the page laid out as a play, a speaker a
bold row, a direction or heading an italic row; pure, its test beside it;
`one-offs/miltonMasksRun.ts` reads the words from the two scans against that
outline, checks the count against Thurber's margin, and writes an import
folder with a review page. `one-offs/miltonSpellings.ts` the spellings and
names both runs give the shelf's or the modern form, as asked.
`one-offs/miltonCaps.ts` — a Milton page's capitals matched to the bookshelf's
Paradise Lost, word by word from its mid-sentence usage (nine times in ten
either way), a line's or sentence's first word and a word it lacks left;
pure, its test beside it; `one-offs/miltonCapsRun.ts` applies it to the pages
made from the Harvard Classics as the backup has them now, the words kept
by reading (a personification, a name, a title, another sense) listed with
their reasons, and writes an import folder with a review page; it rewrites
Arcades and Comus in their own folder, so it runs after miltonMasksRun.ts.
`one-offs/miltonPsalmsRun.ts` — Milton's Psalms I–VIII and LXXX–LXXXVIII from
`one-offs/miltonPsalms.txt`, set from the Oxford edition's pages (its italics,
its notes on the Hebrew, its verse numbers as italic rows), a page a psalm
under `Milton, John/Psalms`, each line checked against Beeching's text for
a slip in the setting; writes an import folder with a review page.
`one-offs/elisions.ts` — an elision's apostrophe typed as an opening
quotation mark (‘tis, ‘orse) turned, pure, its test beside it;
`one-offs/elisionsRun.ts` runs it over the bookshelf in the backup and
writes the changed entries as an import folder with a review page;
`one-offs/elisionsRead.json` the marks judged by reading each in its
sentence, by entry and the words either side, standing over the rules
but for a sure clip; `UNREAD=path` writes the marks not yet read.
`one-offs/quoteMarks.ts` — a single quotation's marks set right, pure, its
test beside it: a closing mark typed as an opening one after italics, an
opening one typed as a closing one before them, and an edition's spaced
marks closed up (“ ‘ Let there be light! ‘ said God), a spaced mark that
could be either left for a hand; `one-offs/quoteMarksRun.ts` runs it over
the bookshelf in the backup and writes the changed entries as an import
folder with a review page, a journal entry whose highlighted link and
quotation carried the old marks set right to follow.
`one-offs/strayMarks.ts` — quotation marks the wrong way round or set
apart that a single quotation's rules do not reach, pure, its test
beside it: a double mark turned (*Unique!*“, ”You will not), a word
quoted back to front (”comedy“member), a double closing mark set apart
(me.  ”), a single mark run onto its punctuation (said.’*Ancient*), a
plural's possessive set apart (Augustus ’ stepson), a spaced mark that
could be either left for a hand; `one-offs/strayMarksRun.ts` runs it over
the bookshelf in the backup the same way, with a review page.
`one-offs/speechMarks.ts` — quotation marks set by reading, each named by
the words around it, pure, its test beside it; `one-offs/speechMarksRead.json`
the marks read (a speech in single marks where its book speaks in
doubles, a quotation inside a quotation, a doubled mark);
`one-offs/speechMarksRun.ts` sets them in the backup's entries and writes an
import folder with a review page.
`one-offs/stageDirections.ts` — a play's stage directions made one
italic run each, pure, its test beside it; `one-offs/stageDirectionsRun.ts`
runs it over the fourteen plays of Tey and Williams in the backup and
writes the changed entries as an import folder with a before-and-after
page.
`one-offs/quoteJoins.ts` — quotes a blank line apart made one quotation, the
blank line an empty quoted line as deep as the shallower side, pure, its
test beside it; `one-offs/quoteJoinsRun.ts` runs it over the journal before
2026 in the backup and writes the changed entries as an import folder
with a review page; `one-offs/quoteJoinsApart.json` the gaps read as two
quotations, by entry and the quoted line above.
