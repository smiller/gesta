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
5. Everything else is preserved: `corner.approved.txt` unchanged by the
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
