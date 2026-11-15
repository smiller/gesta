# The save's tests on the real layer

## Why

The architecture scan over 1d82979..bff8016: `entrySave.test.ts` ran over
a stand-in layer that stored a write only when it landed. The real
`setEntry` puts the text in the cache first.

## Decisions

- The bug it hid, found by a probe on the real layer (MEASURED): after a
  write that did not land, the next save wrote nothing and answered true,
  and `unsaved()` said false, the store empty. A key whose last write did
  not land (`writeError`) now always has something to save and reads as
  unsaved. Test-first.
- The 19 tests run over `entryLayer` and `memEntryStore()`, the stand-in
  gone: a failing write a store whose `set` rejects, a failed read a warm
  over one whose `all` rejects, the store moving under the entry an
  import through `layer.setEntry`. No test here was about another tab.
- The sweep for the cache read as the store: `unsaved()` (fixed with the
  bug) and `toCommonplaces.ts`'s skip of a commonplace already in the
  cache; every other read takes the cache as the journal's current text.

## The phase's review and scan (514d9f3..d88609d)

Review 122,033 tokens, scan 102,680 (transcripts).

- The save fix's `owed` read `writeErrors`: it counted a refusal for
  another tab's change (a save after such a delete refused again, a pin
  with nothing typed), it outlives a delete and a clear, the retry ran only
  for the entry on screen, and a full store failed again on every trigger.
  To the scan's top candidate, grilled next: the layer alone answers
  whether a key still owes a write.
- The archive one-off: current/page/ removed only when no file differs
  too (0 differed in the apply, MEASURED then); the `.md` count reads either
  case; it cannot be rerun, said in its README entry.
- Three comments: one restating a return type, cut; two describing another
  module, reworded.
- Scan candidates 2 (the page-label grammar classifying a typed label) and
  3 (the apostrophe checker taking a file) wait.

## Whether a key owes a write, in the layer

The scan's top candidate, grilled (asked: all five recommended answers).

- `owes(ekey)` in the layer: the last write here did not land and a retry
  could; one refused for another tab's change owes nothing. The two
  records it reads, `unlanded` and `writeErrors`, now cleared together by
  a landing, a delete and `clear()`.
- `retryOwed()` writes every key owed, not only the entry on screen: at
  switching away and at closing, beside the save, and once when another
  write lands; no timer.
- The save's "nothing to save" and `unsaved()` are one judgement: spaces
  in an entry never stored no longer read as unsaved.
- Found building it: a rename's failed copy, deleted by its take-back, was
  written back by a retry. The retry asks "still owed?" at its turn in the
  key's queue, and a failure after its key was deleted owes nothing. The
  test fails without both (MEASURED).
- Left: the notices keep their own record of owed keys for the "not
  saved" pin.
