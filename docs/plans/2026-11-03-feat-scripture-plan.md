# feat: the Bible — `scripture` references and numbered prose

REVIEW CYCLES: 1

## The ask (2026-11-03)

"I'm interested in putting the KJV version of the Bible, possible paired
with the Latin vulgate text, into the bookshelf." Ruled the same day, after
the sources and four sample pages in headless Helium:

- "KJV on its own. (ref KJV, Genesis 1.3)"
- "Clementine Vulgate lined up with Douay-Rheims as a separate work. (ref
  Douay-Rheims, Genesis 1.3)"
- "Apocrypha in."
- "Yes to all five": the KJV as `::: verse`, a verse a row; the Douay as
  `::: prose` pairs with the verse numbers drawn; a `scripture` reference
  rule; the Douay's own book names and Psalm numbers; the KJV's marginal
  notes left out.

## The rules

- A root whose page carries `::: reference` / `scripture` / `:::` names its
  books plainly and joins the chapter and verse to the book with a space:
  "KJV, Genesis 1.3", "KJV, Genesis 1.3-5", a chapter "KJV, Genesis 1", a
  book "KJV, Genesis", "KJV, 1 Samuel 17.49" (a book whose name opens with a
  number is a title). Every other root cites as before.
- `::: prose numbered` (and `::: prose 5 numbered`): the block's sentence
  numbers are drawn in the margin at the Line numbering interval, as a verse
  block's lines are, and its page paints the gutter. Without the word, a
  prose block's numbers stay undrawn. A passage quoted from such a block
  keeps the word.

## Done

- `src/model/grammar.ts` (`PROSE_OPEN`, `proseNumbered`), `schema.ts` (the
  prose block's `numbered`), `parse.ts`, `serialize.ts`.
- `src/editor/numbering.ts` (`paintsLines`, a numbered block's sentences
  shown), `lineNumbers.ts`, `editor.css` (the gutter on a numbered prose
  block, its page's heading padded into it).
- `src/store/headings.ts` (`scripture`), `reference.ts`
  (`Journal.scripture`, the plain titles and the space).
- `src/ui/help.html`: both, in the `::: prose` item.
- Tests: roundtrip.test (the fence word kept), numbering.test (drawn, the
  gutter), reference.test (the directive; the labels). `npm run verify`
  passes (MEASURED 2026-11-03).

## The text (tools/out/bible, git-ignored)

- eBible.org's USFM: eng-kjv (1769, with the Apocrypha: 80 books, 36,822
  verses), latVUC (the Clementine Vulgate Project's text; 1 John 5.7 has the
  Comma), engDRA (Challoner's revision as printed in 1899): 73 books each.
  The VulSearch 2017 revision is inside its InstallShield installer and was
  not read.
- tools/rows.py parses a book into verses, headings (psalm titles, Psalm
  119's letters, the epistles' subscriptions, the Epistle of Jeremy's title)
  and paragraphs before the first verse (Sirach's prologue). The KJV's
  supplied words in italics, LORD in capitals, its ¶ marks kept, its 6,959
  marginal notes dropped; the Clementine's [ ] marks dropped.
- tools/build.py writes `~/Desktop/gesta-bible`: the two root pages, a page
  per book, a page per chapter; 2,851 pages, 72,633 verse rows. The KJV's
  Rest of Esther opens at 10.4; Ecclesiasticus 1.7, printed wholly in
  italics, is marked `⟨line⟩` so it stays a numbered verse.
- The Clementine and the Douay differ in 14 chapters by one verse; the
  Latin follows the Douay's numbering (`REALIGN`): seven split at a phrase,
  Psalms 42 at two, six joined (Judith 4.5+6, Psalms 19.9+10, Ecclesiasticus
  29.16+17, Isaias 46.11+12, 1 Thessalonians 4.11+12, 2 Thessalonians
  2.10+11). After it, 0 chapters differ.
- importCorpus 2,851/2,851; corpus 2,851 clean. Headless Helium: "KJV,
  Genesis 1.3"; "Douay-Rheims, Psalms 22.1" from either column; the Douay's
  numbers drawn every 5; Rest of Esther 10 opens at 4; Ecclesiasticus 1.7
  numbered; Psalm 119's BETH unnumbered between 8 and 9 (MEASURED).

## Every verse numbered, and in a quotation (asked 2026-11-03)

"in scriptures, the line numbering shouldn't be optional, it should be every
line. (Don't even show the line numbering row in the header, every line
should be automatic.) And it should show up in references too".

- `numbered` now means every number drawn, whatever the interval, and on a
  verse fence too (`::: verse numbered`, `::: verse 4 numbered`).
- `rowDecorations` draws a numbered block's numbers where it stands quoted,
  in a note or in a card; `editor.css` gives such a block a gutter of its own.
- `ownNumbers`: a page whose every top-level numbering block is numbered is
  marked `ownnumbers`; main.ts offers no Line numbering row there.
- The KJV's 1,362 chapter pages rebuilt as `::: verse numbered`
  (~/Desktop/gesta-bible-numbered); the backup's copies were unedited since
  the import (2,849 of 2,851 pages as shipped; the two root pages edited).
- Headless Helium at interval 0: KJV Genesis 1 and the Douay's Canticle 1
  draw 1, 2, 3…; no Line numbering row; Canticle 1.1-2 quoted into a journal
  day draws 1 and 2 (MEASURED 2026-11-03).

## The search index, faster (asked 2026-11-03)

"and look at making the search index faster", after the reader's first
search over the bundle with the Bible took 12.5 s (headless Helium, MEASURED).

- Under node over the backup (17,128 entries, 148 MB): the parse 4,966 ms,
  the flatten 7,062 ms — its per-character position map, which the index
  never reads (a CPU profile: `push`, `flattenDoc` and `nodesBetween` about
  37% of the run). The Bible's share of the whole: 1,070 ms of 11,792.
- `flattenDocText`: the same text from string operations, a separator
  standing as \u0001 until the end so a footnote mark is skipped only after a
  space from the text. Equal to `flattenDoc(…).text` on all 17,128 entries
  (MEASURED); 1,319 ms against 7,062.
- main.ts: the index flattens with it; a search waiting on the build takes
  50 ms slices instead of 12.
- The reader's first search over the real bundle: 12.5 s → 7.4 s with the
  new flatten → 7.0 s with the slices (twice, MEASURED in headless Helium).

## The index kept between launches (asked 2026-11-03: "Let's build that.")

- `searchIndex.ts`: `fingerprint` (cyrb53 with the length); `know(kept)`
  seeds texts by key, used only where the markdown's fingerprint matches;
  `made()` the texts parsed since, `stale()` kept keys gone from the cache.
- `indexStore.ts`: `dexieIndexKeeper` (bulk writes, one table `texts`),
  `memIndexKeeper` for tests.
- main.ts: the kept texts read once before the build's first step (every
  call waits on the read; a failed read is an empty one), the parsed ones
  saved and the stale dropped when the build completes. Databases
  `gesta.v1.index` (the app) and `gesta.reader.index` (the reader).
- Headless Helium over the real bundle (17,128 entries): the first search
  with nothing kept 6.8–7.0 s; after a relaunch 1.3, 0.9, 0.9 s (MEASURED).
- Tests: searchIndex.test (the fingerprint; the seed, the made and the
  stale; the memory keeper). `npm run verify` passes.

## Review cycle 1 (2026-11-03)

One `/code-review` at high over 9d5be38^..af776d6, all four commits
accepted. 129,716 tokens (the run's own count). Ten findings: a kept text
outliving a parser change; a facing block's right column still on the
interval; one build chain per call made while the kept index loads; texts
parsed after the first build never kept nor freed; the kept index read and
written in one main-thread task; numbered blocks in containers the CSS has
no gutter for; the decoration walk descending into every row; refusal
reasons not knowing `numbered`; comments naming other modules, the gutter
test copied twice, the help's note item contradicting the numbered one.
Fixed on the reader's word ("let's review, and after that republish").

### Cycle 1's fixes

1. vite.config.ts hashes `src/model`'s source into `__PARSER__`; the index's
   fingerprints carry it, so a parser change rebuilds the kept index once
   and nothing else does (the page's own fingerprint is unchanged otherwise).
2. `rightUnits` numbers every row of a numbered facing block.
3. main.ts builds the index in ONE chain; each search waiting on it is
   answered once when it completes.
4. `made()` holds one row per key; the texts parsed after the build are kept
   when the window is hidden.
5. `dexieIndexKeeper` reads and writes in pages of 500, pausing between.
   The reader's first search after a relaunch: 1.3 s (against 0.9 s read
   whole), the page painting between pages (MEASURED).
6. A numbered block below the top level is numbered only in a quotation, a
   note or a card (a margin-note pinned); a verse fence cannot stand in a
   list item at all (MEASURED: it parses top-level).
7. The decoration walk stops at textblocks.
8. fenceRefusals names `numbered` on a dual-language or stanza fence, and
   before the number.
9. The two comments reworded to their own code.
10. `offersInterval` once in main.ts; the help's note item allows
    `numbered`.
- Tests: numbering.test, lineNumbers.test, fenceRefusals.test,
  searchIndex.test (one each). `npm run verify` passes.

## Confirmation pass (2026-11-03)

One `/code-review` at high over 124a0fe, asked ("and a review is fine").
115,746 tokens (the run's own count). Ten findings, all fixed:

- fenceRefusals reads the numbers with `numbered` set aside on either side
  (`::: verse 179 0 numbered`: "0 is not a starting line for the right
  column"); "goes after the number" only where the number is good.
- The kept texts let go once the build completes, their keys alone kept;
  `stale()` reports a key once; `keepIndex` writes nothing when there is
  nothing new.
- `__PARSER__`: the files parse.ts and flatten.ts import, comments out, with
  the pinned markdown-it and prosemirror-model versions.
- A quoted numbered facing block numbers its right column; a margin-note's
  descendants are never numbered; the stylesheet's containers pinned by a
  test against GUTTERED.
- A throw in the build ends it and says so (the next search starts again);
  the kept read's failure is caught whole.
- The store's pages pause only in a visible window.
- The vite.config comment speaks of its own hash.
- The reader's first search: 7.6 s with nothing kept, 1.3 s after a
  relaunch (MEASURED). `npm run verify` passes.
