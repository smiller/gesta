# Authors filed by surname: a new author asks where it sorts; Rename re-files an author with books

"Harley Price", added 2026-10-05 by "New author…", sorted under H. "C. P.
Cavafy" sorts before "Carroll, Lewis". The shelf sorts by the name an
author is FILED under, its key (READ: `childrenOf` in
`src/store/lists.ts`, the Go to row's sort in `src/ui/gotoModel.ts`), and
shows its page's first heading (`rootLabel`, `src/ui/mastheadModel.ts`).
"New author…" files the name as typed, with an empty body, so no heading
(READ: `newRoot`, `src/ui/lifecycle.ts`). Rename refuses an entry whose
sub-entries have content ("rename after the books are deleted").

The export snapshot (`gesta-snapshots/current`, dated 2026-09-07; READ):
22 of 29 authors filed "Last, First", five single names, "Hildegard of
Bingen" and "Doctor Who" correctly first-word, "C. P. Cavafy" the one
misfiled. Cavafy is 10 entries (the author and 9 poems) and no entry
outside it links in (MEASURED: the one file outside its folder naming it
is its own page). Harley Price has one book (the reader, 2026-10-05).

## Decided (2026-10-05, asked, one question at a time)

1. THE FILED NAME STAYS THE SORT. No separate "sort as" value: the key
   already sorts the shelf, the Go to row and the export folders, and the
   help card says so.
2. "NEW AUTHOR…" ASKS TWICE, bookshelf only ("New page…" unchanged):
   - "Name for the new author:" — what the list shows; written as the new
     page's heading, `# Harley Price`.
   - "Sorted under:" — pre-filled with the filing form, `Price, Harley`;
     Enter takes it, or it is edited first. The author is filed under
     what this box holds, through the naming rule (`typedName`), so
     "Cavafy, C. P." files as "Cavafy, C. P" — the trailing dot dropped,
     as "Housman, A. E" and "Lewis, C. S" already are.
   - THE PRE-FILL: the last word to the front ("Harley Price" → "Price,
     Harley", "Doctor Who" → "Who, Doctor", "Hildegard of Bingen" →
     "Bingen, Hildegard of"); one word stays itself ("Horace"). A wrong
     guess is edited in the box; no smarter rule.
   - A NAME TYPED WITH A COMMA is the filing form: "Price, Harley" in the
     first box gives the heading "Harley Price" (after the comma, then
     before it) and pre-fills the second box with "Price, Harley".
   - Escape on either box creates nothing.
   - A filing name already on the shelf opens that author, as now; the
     match by label as typed stays.
3. RENAME RE-FILES AN AUTHOR WITH BOOKS (authors only: a page or a book
   with content-bearing sub-entries still refuses). The prompt reads
   `File and sort “C. P. Cavafy” under:`, the displayed name in the
   quotes, pre-filled with the current filed name. Everything under the
   author moves to the new name; every link into it is rewritten, in its
   own books and in any other entry (journal days, pages); places, folded
   sections and bookmarks follow.
4. THE HEADING NEVER CHANGES on a re-file. An author page with no `# `
   heading gets one with the OLD filed name, first, so "Harley Price"
   still reads "Harley Price" once filed as "Price, Harley". Link labels
   are not touched: the name they show has not changed.
5. A RE-FILE ONTO A TAKEN NAME gets the existing "already taken" alert.
   Joining two authors is a merge-authors feature, not built until it is
   needed.
6. NO CONFIRMATION; A NOTICE AFTER, in the corner: `filed under Cavafy,
   C. P — 10 entries moved`, with `, links updated in N others` when N is
   not 0; the counts are what was moved and rewritten.
7. A LINK LEFT UNREWRITTEN IS NAMED (2026-10-05, asked). Links in other
   entries are written after the moves land, and one can fail: another
   window saved that entry since this one read it (the stale-write
   refusal), the storage refused the write, or the entry's text does not
   parse (`rewriteLinks` returns null and nothing is said). The link then
   points at a name that no longer exists, and a click is refused as an
   unknown book; nothing is lost. No rollback — the old entries still
   stand at that point, but undoing means more writes that can fail the
   same way. Instead:
   - a stale refusal is retried ONCE, the rewrite redone over the text
     the refusal hands back;
   - an entry that does not parse but holds the old address in its text
     is counted as not updated, not skipped silently;
   - whatever is still not rewritten turns the notice into a PIN that
     names EVERY such entry by its address, enough to find and fix it by
     hand: `filed under Cavafy, C. P — 10 entries moved; 1 link not
     updated: 2026-09-14`. A day reads as its date (`2026-09-14`, a
     tagged one `2026-09-14/Plans`), a page or book by its key
     (`page/Links`).

## Build (test-first; markdown in, the act, markdown out)

### 1. The naming rules, pure — `src/ui/naming.ts`

- `filingForm(name)`: the pre-fill (decision 2). `shownForm(typed)`: the
  heading for a typed name, the comma flip. Tests: two words, three,
  one, already comma'd, "Dorothy L. Sayers" → "Sayers, Dorothy L.",
  stray spaces, a comma with nothing after it.

### 2. New author — `src/ui/lifecycle.ts` `newRoot`

- For a namespace with `titledRoots`: the second prompt, then the
  existing gates (cold cache, registered, the label match over both the
  shown and the filing name), then `setEntry(entryKey(ns, filed), "# " +
  shown + "\n")`. The label match stays first-box-as-typed too
  (`lifecycle.test › goes to the author whose label was typed` keeps
  passing).
- Tests in `lifecycle.test.ts` beside the bookshelf `newRoot` ones: the
  two prompts' texts and the pre-fill; the body written; Escape on the
  second box writes nothing; a comma'd name; a filing name taken opens
  it; "New page…" asks once, as now.

### 3. The re-file — `src/ui/lifecycle.ts` `rename`, a bookshelf-root arm

The prompt text from `renamePrompt` (`src/ui/subEntries.ts`) for a
bookshelf root. Then, in an order chosen so a failure loses nothing:

1. Flush the save, suspend saves (as rename does).
2. THE MOVED SET: the author key and every key under `author/`. Each
   one's markdown with its links into the old author rewritten (step 4's
   function); the author page given its heading if it has none.
3. Write every moved entry under the new name. If ANY write fails:
   remove the new keys that landed, write nothing else, resume saves,
   say "couldn't re-file — see the corner". The old author stands whole.
4. THE OTHER ENTRIES' LINKS: every cached entry outside the moved set
   whose text contains `bookshelf/` (362 of 13,565 in the snapshot,
   MEASURED) is passed through `rewriteLinks` (`src/store/links.ts`) with
   a visit that reads each href by `hashParts` (`src/store/nav.ts`),
   matches its key against the old author or a key under it, and
   rebuilds it by `entryHash` with the same highlight payload — so a
   hand-spelled href matches too. Labels untouched. Changed ones written;
   the count kept for the notice. A write refused as stale is retried
   once over the stored text the refusal carries; an entry whose text
   holds the old address but does not parse, and any write still not
   landed, goes on the not-updated list (decision 7).
5. Remove the old keys.
6. Places (`session.movePlace` per key), folds (the fold store's entry per
   key moved), bookmarks (each bookmark's key moved) — the last two need
   a move on their stores, written as pure functions with tests
   (`movedPlace` in `src/store/placeState.ts` is the shape).
7. Replace the hash, open the author under its new name, the notice.

Tests: Cavafy-shaped fixture (author, three poems, a journal day linking
one poem with a highlight payload, a hand-spelled href, a page linking
the author): every key moved, every href rewritten, labels unchanged,
the day's other text byte for byte; the heading written where missing
and not where present; a failed write leaves the old author whole and
no new keys; a taken name alerts and moves nothing; a book with content
under a page still refuses; the notice's counts; a linking entry
refused stale once is rewritten on the retry; one refused twice, one
whose write fails, and one that does not parse are each named in the
pinned notice by address, the moves standing; a second rename while
one runs is ignored (the `renaming` latch).

### 4. Help — `src/ui/help.html`

The bookshelf paragraph: "New author…" asks for the name shown and where
it sorts; Rename on an author re-files it, books and links with it.

### 5. Helium

- The harness answers every prompt with one `answer`
  (`tools/helium-steps.mjs`); a step with two prompts needs a queue of
  answers.
- A step: "New author…" with "Harley Price", the second box accepted as
  pre-filled: the panel row reads "Harley Price", between the authors it
  sorts among by "Price"; the stored key `bookshelf/Price, Harley` and its
  body.
- A step: the seeded Boethius re-filed (or a seeded two-word author with
  a book): the hash, the stored keys, a link from a page rewritten, the
  corner's notice, the panel order.
- The current app has neither; each field it reads differently is
  listed in `corner.differences.txt` with that reason.

## Hand-check (to be played headless first, then handed over)

In Helium, the bookshelf (the book icon in the masthead):
1. Harley Price's page → Rename → the prompt reads `File and sort
   “Harley Price” under:` holding `Harley Price` → type `Price, Harley`,
   Enter → the corner says `filed under Price, Harley — 2 entries moved`
   (the count INFERRED: the author and one book); the bookshelf list
   shows "Harley Price" among the P's.
2. C. P. Cavafy's page → Rename → `Cavafy, C. P.`, Enter → `filed under
   Cavafy, C. P — 10 entries moved` (10 from the 2026-09-07 snapshot);
   the list shows "C. P. Cavafy" after "Lewis Carroll"; a poem opened
   from the author page opens.
3. "New author…" → `Test Author`, Enter → the second box holds `Author,
   Test` → Enter → the empty page opens headed "Test Author"; delete it
   after.

Not covered by hand: a failed write mid-re-file (the tests' alone).

## Risks

- THE OTHER TAB: each removed key is announced as deleted, so a second
  window open on a Cavafy poem says "deleted in another tab" — what a
  page rename does today. Not changed here.
- A LINK REWRITE THAT FAILS after the moves landed: decision 7. How many
  entries fail to parse is not measured; the corpus tool can answer it
  before building.
- THE BACKUP: the old files are swept by the reconcile; its belt refuses
  a sweep past half the folder (floor 20), which no re-file of an author
  approaches.
- A page rename does not move bookmarks or folds today; this builds the
  moves for the re-file only. Whether page rename should use them is
  left.

## Out of scope

- Merge authors (decision 5).
- Re-filing pages, or books under an author.
- Doctor Who and the other first-word authors: correct as filed.

## Record

### 2026-10-05 — built

- Tests first, each red then green (MEASURED): the two name forms
  (`naming.test`), the re-file prompt (`subEntries.test`), the retrying
  write (`entries.test`, four: lands, unchanged, stale once redone with
  no notice, stale twice or a failed write answering failed), the pure
  re-file (`refile.test`, eight), the fold and bookmark moves, and the
  lifecycle (`lifecycle.test`, thirteen new: the two boxes, the comma,
  Escape on either, a taken filing name; the re-file's moves, links,
  heading, carry of typing, a failed copy taken back, the retry and the
  pin naming the entries left, a pageless author, the latch). The suite:
  750 tests, all green.
- DECIDED IN THE BUILDING, not asked: an author whose books arrived
  without its own page is given one on a re-file, headed by the old name
  (decision 4's rule; otherwise it would read as the new filed name). A
  failed copy pins "couldn't re-file — nothing was moved", not "see the
  corner": removing the copies releases the layer's own notice for them.
  The pin's list names entries by key; the moved ones by their new key.
- THE RETRY lives in the entry layer (`rewriteEntry`): after a stale
  refusal the stored text the refusal carries becomes the base and the
  edit is redone over it, once. A plain retry would have been refused
  again, the base not moving on a refusal.
- The Helium section `author filing` (MEASURED, the verdict's run):
  "New author…" asks `Name for the new author:` then `Sorted under:`
  holding `Price, Harley`; the page is filed `bookshelf/Price, Harley`
  holding `# Harley Price`; the bookshelf lists "Harley Price" between
  "Donne, John" and "Edmund Spenser". Rename on it with a book asks
  `File and sort “Harley Price” under:` holding `Price, Harley`; typed
  `Harley Price`, the corner reads `filed under Harley Price — 2 entries
  moved`, the author page's link to the book follows, the old keys are
  gone. The current app asks once and files as typed: three readings
  listed in `corner.differences.txt`.
- The step's first drafts read wrong three times, each the step's fault:
  a profile left from a development run (the tool's profile persists
  outside the verdict), the windows the section before leaves open
  holding the focus (fixed by bringing the page to the front), and Enter
  pressed in the tick after a click, before the editor took the click's
  caret (the browser's caret was at the heading's end, offset 12; fixed
  by a 150 ms pause, a hand being slower).
- THE PARSE QUESTION: the corpus tool over the 2026-09-07 snapshot reads
  13,565 files, threw 0 (MEASURED) — no entry the rewrite cannot parse.
  31 round-trip with other changes; none of Cavafy's is among them.
- Not played: hand-check step 2 (Cavafy, 10 entries) — the reader's
  data; the headless section plays the same gesture over 2 entries.

### 2026-10-05 — the review at high

- One `/code-review` at high over `2c6a3ea..1723ef8`, after the accept:
  137,994 tokens (MEASURED, the transcript's last message: 2 input +
  871 cache creation + 133,448 cache read + 3,673 output), 10 findings.
  Above the last five at high (86,741–98,996): it ran as a fork of the
  building session, carrying its context (INFERRED from the cache read).
- The findings: a link rewrite over a key whose own save was refused
  releases that save's rescue pin; a failed copy's rollback drops typing
  made meanwhile; the old keys' removals unread, so a refused delete
  leaves the old key and the whisper still says moved; the bookmark move
  writes a list read before another window's adds; a rewrite refused over
  a row deleted elsewhere puts it back in the cache, empty; two commas,
  and a URL, give a wrong heading; places moved one key at a time; every
  linking entry parsed where a text test could filter; a third regex
  escape; plain rename moves no bookmarks or folds.

### 2026-10-05 — review cycle 1, fixed (all 10, asked)

REVIEW CYCLES FOR THIS WORK: 1 (the count kept from here, asked
2026-10-05).

- Each fix test-first, red then green (MEASURED, 14 new or changed tests
  red before, 760 green after; verify green, Helium 0 open):
  1. `rewriteEntry` leaves a key whose own last write did not land,
     answering failed, so the re-file names it and its rescue pin stands.
  2. A failed copy saves what was typed meanwhile under the old name
     before the reopen.
  3. Every removal is read: an old key left is named, `…; old copy kept:
     <key>`, the notice a pin; a rollback that cannot take a copy back
     pins `couldn't re-file — copies left: <keys>`.
  4. The bookmark move re-reads the stored list first
     (`bookmarkStore.move`).
  5. A stale refusal over a row gone from the store is taken as a delete:
     the key leaves the cache, its debts cleared.
  6. Exactly one comma turns a name round; two or more keep it as typed. A
     pasted article link heads the page with the name derived from it,
     and the second box is filled from the shown form.
  7. Places move in one write (`movedPlaces`, the keeper's `moveAll`),
     with folds and bookmarks behind the one `moveKept` port.
  8. The text test (`pointsAt`, one RegExp per re-file) filters both the
     moved entries and the linking ones before any parse.
  9. The regex escape is `reference.ts`'s, exported; `refileKeys` uses
     the module's `under`.
  10. Plain rename moves its key's place, folds and bookmark through the
     same port; routing every rename through the re-file stays out of
     scope.
- Not played by hand or headless: the failure paths (1–5) are the tests'
  alone; a bookmark following a rename is reachable by hand but not yet
  played.

### 2026-10-05 — review cycle 2 (asked: "and review it")

REVIEW CYCLES FOR THIS WORK: 2.

- One `/code-review` at high over the fix commit, `1723ef8..bc34531`:
  113,118 tokens (MEASURED, the transcript's last message: 2 input +
  3,713 cache creation + 105,176 cache read + 4,227 output), 10 findings.
- The findings: the text test now gating the rewrite skips spellings the
  parse-based match moves (`%2F`, a `<…>` destination, lowercase hex) and
  leaves them out of the not-updated list — a regression of cycle 1's
  fix 8; the same as an altitude finding, the comment above `pointsAt`
  now wrong; folds moved after the open has drawn the new key; the batch
  place move keeps a stale record under the target; the deleted-row
  branch announces a landing; an extra store read where the refusal
  could carry the answer; the failure path re-rolling the `failed`
  helper; a trailing comma kept in a three-part name; two comments
  naming another module's behaviour.

### 2026-10-05 — review cycle 2, fixed (all 10, asked)

REVIEW CYCLES FOR THIS WORK: 2.

- Each fix test-first (MEASURED: 6 red before; 766 green after; verify
  green, Helium 0 open). The regression's test — three entries, one link
  each, spelled with `%2F`, `<…>` and a lowercase escape — fails on
  `bc34531` and passes here (MEASURED, a throwaway worktree at HEAD).
  1–2. The linking filter is wide again (`#bookshelf/` anywhere), the
     parse-based match deciding; "not updated" is `pointsInto`: the links
     read by the key they name, then a case-insensitive text test that
     also ends at `%2F` and `>`. Its comment rewritten.
  3. Folds and bookmarks move before the open; places after it, the open
     recording where the old key was left.
  4. `movedPlaces` drops a record already under a new key; a Set, no
     `findIndex`.
  5. A row gone from the store answers with a sentinel: no `landed`, no
     announce.
  6. The stale refusal carries `absent`; no extra read.
  7. The failure path uses `failed`.
  8. Empty comma parts are dropped before the count.
  9–10. The fixture's comment removed; the rewrite's comment speaks of
     `landed`, this module's own port.
