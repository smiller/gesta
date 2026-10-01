# Bookmarks: the list's storage as one module, and ⌃⌘B re-reading a damaged list

The scan's candidate 5, its bookmarks half
(`2026-09-30-refactor-surface-and-place-keeper-plan.md`, "The scan's five
candidates"). Shortcuts stay in main.ts: the save is five lines and the
draft rule is screen state, so the deletion test fails there.

## Where it stood (READ, 2026-10-01, before the move)

- main.ts held the list's storage: the load and THE LATCH (stored text
  this app would not have written sets `unreadable`, every write refused),
  the save with its failure pin (`bookmarksFailGen`), the seed of two pages
  only when the key is absent, the sweep at ⌃⌘B gated on the warm.
- No Vitest test and no Helium step reached the latch, the seed, the
  failure pin or the sweep's gate; the `bookmarks` step plays the happy
  path only. The record's "reached only by Helium" was wrong: nothing
  reached them.
- The latch cleared only on a reload: the load ran at boot and after a
  landed write, and the latch refuses every write.

## Decided (2026-10-01)

1. The storage half moves to `src/store/bookmarkStore.ts`, a factory over
   an injected storage and the pin's two callbacks; the sweep's rule,
   `reachableBookmarks`, moves from `ui/bookmarksModel.ts` to
   `store/bookmarks.ts` so the store does not import the UI.
2. ONE BEHAVIOUR CHANGE, asked: opening ⌃⌘B re-reads the stored list when
   it is damaged, so a list repaired by hand shows without a reload.
   Widened the same day, asked after the look (decision 4).
4. ⌃⌘B re-reads the list at EVERY open, not only a damaged one: with two
   windows open, a row added in one was dropped by the next write in the
   other, which wrote the list it read at launch. Left open: both cards
   open at once, written in turn without a reopen, still lose the first
   write; a `storage` event listener would close that and was not asked.
5. THE SWEEP ASKS THE SHARED STORE before it drops a row (asked the same
   day, after the hand-check of decision 4 found the loss below): a row
   leading nowhere by this window's keys is dropped only when the entry
   store, which every window shares, lacks it too, and is kept when that
   store cannot be read.
6. Everything else is preserved: `corner.approved.txt` unchanged by the
   move; a new Helium step pins the re-read.

## Record

### 2026-10-01 — the move and the re-read

- Tests first: `src/store/bookmarkStore.test.ts`, 10 tests over a memory
  storage. With the re-read line removed, "the open re-reads a damaged
  list" alone failed (MEASURED).
- `reachableBookmarks` and `bookmarkParts` moved to `store/bookmarks.ts`,
  the reachability test with them; the header sentence about the sweep
  left `ui/bookmarksModel.ts`, the sweep now being the store's.
- The new Helium step `bookmarks damaged`: the list set to `not json`, a
  reload, ⌃⌘B, A, the list repaired to `["2026-09-06"]` by hand, ⌃⌘B, A,
  a reload. The successor's run differed from the approved copy by those
  four readings and their console line only (MEASURED); approved. The
  current app read the same on the damaged list and kept the latch over
  the repaired one (MEASURED); two differences listed.
- The approve tool's scrub drops a logged Error's stack frames: the
  minified line and column move with any change to the bundle.

### 2026-10-01 — the re-read at every open (decision 4)

- Tests first: "re-reads the list: a row another window added shows" and
  "a list damaged since it read clean latches at the open" failed, then
  passed with `load()` at every open (MEASURED); the test that a clean
  list was not re-read was removed with the rule it pinned.
- The new Helium step `bookmarks from another window`: Pippa added in a
  second page of the same profile, ⌃⌘B in the first, × on its first row.
  The successor's first window showed the row and stored it after the ×
  (MEASURED). The current app's showed only the row it read at launch,
  and its × wrote `[]`, dropping Pippa (MEASURED): the loss this decision
  fixes, seen. Three differences listed.

### 2026-10-01 — the look at decision 4, and the sweep against the shared store (decision 5)

- The hand-check of `0e0ed97` in two Helium windows: a page made and
  bookmarked in window 2 was missing from window 1's ⌃⌘B. A headless probe
  played it: window 1's ⌃⌘B re-read the list with the row, then the sweep,
  judging by window 1's keys, which miss an entry made after its warm,
  dropped the row and wrote `[]` (MEASURED). Before `0e0ed97` the same row
  was lost at window 1's next write instead; the re-read moved the loss to
  the mere open. With window 1 reloaded first, the row showed and stayed
  (MEASURED).
- Tests first: five sweep tests over a fake shared store, four failing
  before the change (the open now resolving whether the sweep wrote), then
  14 green (MEASURED).
- The `bookmarks from another window` step now makes its page in the
  second window, and stands last of the steps that read the page lists:
  the current app's first window learns of a page made in another (its
  lists live in localStorage, which every window shares), the successor's
  does not, and placed before them it changed five readings of ⌃⌘J and
  ⌃⌘K (MEASURED). That gap is older than this work and is put to the
  reader, not listed as decided.
- The successor's first window kept the made page's row and stored it
  after its × (MEASURED); the current app's dropped it, writing `[]`
  (MEASURED).

### 2026-10-01 — the review at high over b3bfd91^..095ecd0

One `/code-review` at high, after the look and the accept. COST 88,959
tokens (MEASURED: the run's last message, input 2 + cache creation 1,509
+ cache read 85,140 + output 2,308, from its subagent transcript). Eight
findings, unverified by the run, each read against the code here:

1. FIXED, DATA LOSS, introduced by 095ecd0: the sweep's store read went
   through `entryStore.all()`, which bases every row it returns; a page
   another window made after this one's warm, based at "" until then
   (a blank write from here refused), was based at its stored text, and a
   write from here over it landed. MEASURED on 095ecd0 in the
   two-window step extended to open the row's page from the first window
   and type: the stored text became "typed in the first". Fixed with
   `keys()` on the keyed store (Dexie's primary keys), the entry store
   (no ledger touch) and the layer (`storedKeys`); the sweep reads that.
   MEASURED after: the write refused, "not saved — changed in another
   tab, copy your text then reload", the other window's text kept.
2. FIXED: the keys were a snapshot at the open; a page made and
   bookmarked during the store read could be dropped. `open` takes the
   keys as a function, asked again after the read.
3. FIXED with 1: the full read carried every entry's text to take keys.
4. NOT TAKEN, PUT TO THE READER: every other reader of this window's keys
   (Go to, search, the walk, the open of an address) is blind to entries
   another window made since the warm — the general gap the two-window
   step found (decision 5's record). Opening such a page from here shows
   it blank and refuses the write, as measured in 1.
5. FIXED with 1: main.ts no longer holds the raw entry store.
6. FIXED: a late render after the sweep clears the key editor when its
   row was dropped, rather than leave the edit pointing at nothing.
7. FIXED: a test for a sweep that reads the store and drops nothing.
8. NOT TAKEN: `bookmarkParts` is one more spelling of the key split six
   other modules re-spell; folding them into `keys.ts` is its own
   refactor, not this batch's.

No mechanical class among them, so no checker is owed.

- A FLAKE, the second: the first full Helium run of this fix failed in
  "reference copy" — ⌃⌘R's clipboard wait timed out at 5 s — and the
  re-run passed (MEASURED). The first was 2026-09-30
  (`2026-09-30-refactor-entry-lifecycle-plan.md`, 1 in 3 runs); by that
  record a fix is now owed. Not in this commit.

### 2026-10-01 — an address another window wrote, read from the store (decision 6)

6. ASKED, after the review's finding 4 was put: a window opening an
   address its cache lacks, after the warm, reads that entry from the
   store first (`primeEntry`, which bases it at the stored text), then
   opens it. Before the warm the path is unchanged. Go to and search
   still list only what this window has loaded or opened.

- The test is the two-window step: before the change its first window
  opened the other window's page blank and refused the typing (MEASURED,
  the review's fix run); after, it opened with "made in the second
  window" and the typing landed after it (MEASURED). Every other reading,
  the bridge's unknown-book refusal included, unchanged (MEASURED).
- The current app's run, regenerated: one difference in "a list typed"
  (its corner not showing) on the first run, gone on the second
  (MEASURED, 1 in 2), outside this change.

### 2026-10-01 — the "clipboard flake", owed a fix at its second sighting

- MISNAMED (READ): the wait that timed out is `waitBar`, the floating
  bar's, the step's only `waitForFunction` without a catch (cornerAfter
  catches; the clipboard read waits on nothing). The 2026-09-30 record's
  "⌃⌘R's clipboard wait" and its shared-clipboard guess do not hold.
- NOT REPRODUCED (MEASURED): 0 misses in 52 runs of the first section and
  the four steps before "reference copy" (12, then 40 with the diagnosis
  in place); 0 in 30 probe loops of the same gesture after ⌃⌘L and
  Escape; 0 in 80 probes of a selection made 0–50 ms after the editor
  takes focus (prosemirror-view's 20 ms focus timer, which restores its
  own selection over a DOM one it has not read: the candidate, READ, not
  shown). Full runs: 2 misses in about 17 over two days.
- THE FIX, the step's, its cause unknown: `waitBar` no longer throws — on
  its timeout it answers what the page held (the selection's length,
  whether it sits in the editor, the active element, the editor's focus
  class). "reference copy" selects again once on a miss and appends the
  first miss to `tools/out/flakes.log`, outside the verdict; a second miss
  reads as `barMissed` in the ⌃⌘R reading. The retry path played with a
  forced miss: logged, re-selected, the reading unchanged (MEASURED).
  OWED: read `tools/out/flakes.log` when it has entries; they name the
  state the cause left.

### 2026-10-01 — the second review at high, over 095ecd0..d87d66b

One `/code-review` at high over everything after the first review: its
fixes, decision 6 and the flake work; it stands as the confirmation
pass. COST 90,698 tokens (MEASURED: input 2 + cache creation 2,862 +
cache read 83,418 + output 4,416, from its subagent transcript). Ten
findings, each read against the code:

1. FIXED, a race (READ): a read after the warm that resolved late opened
   whatever address was current, unread. Its continuation now opens only
   while the address it read is still the one asked for. Unpinned.
2. FIXED, data back from a delete (READ, then a test red first):
   `primeEntry` read the store outside the key's queue, so an entry
   removed here and opened again at once read back its row before the
   delete landed. It now reads after the key's queued ops and refuses
   when a removal came between.
3. NOT TAKEN, put to the reader: an entry this window already holds,
   edited in another window since, still opens with this window's text
   and its first save is refused ("changed in another tab") — the
   older multi-window gap, not this batch's.
4. FIXED: `waitBar` throws again on its timeout, now with what the page
   held in the message; only "reference copy" catches it.
5. FIXED: the two listed reasons for the current app's readings said
   what was never read; they now say what its run shows.
6. NOT TAKEN: one store read per open of an address the cache lacks,
   after the warm. Its cost was not measured; an open is one
   IndexedDB get.
7. NOT TAKEN, INFERRED: a row read in after the warm is not announced to
   the count or the search index; Go to reads the cache's keys and so
   lists it once opened. Not measured.
8. FIXED: the session comment named the store's refusal; reworded.
9. FIXED with 4: the date left the tools comment (tools/ is outside the
   comment standard's src/ scope, so no checker is owed).
10. FIXED: the × branch's own clear of the key editor, a copy of the
    render's.

No mechanical class in src/, so no checker is owed. The Helium verdict
read unchanged, 0 open, no miss logged (MEASURED).

### 2026-10-01 — every entry re-read at its open (decision 7)

7. ASKED, after the second review's finding 3 was put: after the warm,
   EVERY address opened is read again from the store first, held or not
   (`refreshEntry`), so an entry another window edited since opens with
   that edit. The re-read replaces the stale-write base with the text it
   read (`reread` on the entry store): get's first-wins kept the first
   text seen, and a save after a re-read was refused against it. Opens
   by create, rename and delete stay on the cache, this window's copy
   being the latest there.

- Tests first: two store tests over both adapters, four layer tests,
  red then green (MEASURED).
- The first full run broke "sub-entries": the day's tag bar lost Ideas
  (MEASURED). An empty stored row is a registration (a created tagged
  entry is stored empty), and the re-read had dropped it as absent; a
  test pinned it red, then the fix (MEASURED).
- The two-window step goes on: the page edited again in a second window
  while the first holds its older copy, then opened and typed into in
  the first. On 2bbf4c3's code the first opened its old copy and the
  typing was refused; after, it opened with the edit and the typing
  landed (MEASURED). The current app's first window opens its own copy
  and refuses the typing (MEASURED); two differences listed.
