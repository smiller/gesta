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
