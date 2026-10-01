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
   it is damaged, so a list repaired by hand shows without a reload. A
   list that reads clean is not re-read at the open (unchanged).
3. Everything else is preserved: `corner.approved.txt` unchanged by the
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
