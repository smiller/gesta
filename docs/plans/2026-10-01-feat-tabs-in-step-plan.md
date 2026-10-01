# Tabs in step: each landed save announced to the other tabs

Follows the bookmarks-store plan's decision 7, reverted after its review
(`2026-10-01-refactor-bookmarks-store-plan.md`): a read at every open
raced typing and failed saves. The review's altitude finding is this
plan: a tab that lands a write says so, and the others update their copy
at once, with no wait at an open.

## Where it stands (READ / MEASURED, 2026-10-01)

- Each tab holds its own copy of the journal (the cache) and a base per
  entry, the text its save is judged against; a save over a row another
  tab moved is refused, "not saved — changed in another tab, copy your
  text then reload" (help.html, "More than one tab").
- Two file:// windows pass a notice both ways, a `BroadcastChannel`
  message and a `storage` event: MEASURED headless and in the reader's
  own Helium (the bookmarks-store plan's record).

## Decided (2026-10-01)

1. AFTER EACH LANDED WRITE OR DELETE the entry layer announces the key on
   a `BroadcastChannel`; the other tabs read that row from the store,
   after any queued op of their own on the key.
2. AN ENTRY NOT ON SCREEN takes the row: the cache and the base become
   the stored text (or the key leaves the cache, deleted), with no word.
   Skipped for a key this tab holds a write for that has not landed (a
   failed save's text is its only copy).
3. THE ENTRY ON SCREEN (the reader's choice, option 1 of 3): with nothing
   unsaved here it is redrawn with the stored text, the window's place
   kept; with typing not yet saved it is left alone, base and all, and
   the pending save is refused as today, its notice saying so.
4. THE ENTRY ON SCREEN DELETED in another tab, nothing unsaved here
   (asked, as recommended): left on screen, the corner pinned "deleted in
   another tab"; typing there is refused as today.
5. help.html's "More than one tab" rewritten (asked, as recommended): the
   tabs keep in step; the refusal stays for typing caught mid-change.

## Tests first

- The layer over the memory store, the channel faked: an announce on a
  landing, none on a failure; a notice taken into cache and base; skipped
  for an unlanded write; after the key's queued ops; a delete.
- The session's rule for the entry on screen, as a pure decision over
  (pending save?, surface text = cache?) where it can be.
- Helium, two windows: the page edited in the second while the first
  holds it off screen, then opened in the first (the text, a save that
  lands); the page open in the first, redrawn; open with typing pending,
  refused.

## Record

### 2026-10-01 — built

- THE STORE: `peek` (a read that bases nothing) and `rebase` (the base
  set to a text taken); two tests over both adapters, red then green.
- THE LAYER: an `announce` port called on every landing; `takeNotice`
  reads the row after the key's queued ops, drops it when this tab wrote
  or removed the key meanwhile or holds an unlanded write for it, waits
  for the warm, and takes the row into cache and base where the caller
  accepts; a delete taken clears the key's debts. Seven tests, red then
  green (MEASURED).
- THE SCREEN: `ui/tabNotice.ts`, the rule as a pure decision, three
  tests; the session asks it for the entry on screen and redraws in
  place, leaves it, or pins "deleted in another tab".
- main.ts: one `BroadcastChannel` named `gesta.v1.entries`.
- help.html's "More than one tab" rewritten.
- Helium, the two-window step (MEASURED): the page open in the first,
  saved in the second, redrawn in the first; typed in the first as the
  second saved, the first's typing left and its save refused, the stored
  text the second's; open in the first and deleted in the second, left
  on screen with "deleted in another tab", and typing there refused,
  nothing stored. The other tab's write in the last two is made straight
  to the store and announced (`foreignWrite`), to land inside the first's
  save delay. Every other reading unchanged.
- The current app (MEASURED): its first window never reached the page in
  the first two (the row missing earlier in the step); typing into a page
  another tab deleted is saved there, bringing the page back. Four
  differences listed.
