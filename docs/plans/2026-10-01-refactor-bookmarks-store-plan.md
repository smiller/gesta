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
