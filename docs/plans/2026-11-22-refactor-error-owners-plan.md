# Errors held by an owner, in one stack (A13.1, candidates 1 and 2)

Asked 2026-11-22, from the architecture run over the last two batches:
"Let's explore 1 with 2 folded in", then each decision below, and "go".

## Decisions (asked, each a choice put to the reader)

1. One change: a handle per error owner (1) and the save error owned by
   the entry layer (2), one plan, one commit.
2. A module owning an error gets `alerts.owner()`, an `ErrorOwner` with
   `raise(…)` (error ids only) and `resolve()`. `raise` stops returning a
   number; `resolveError(gen)` goes.
3. The ledger keeps every error not yet resolved or closed and shows the
   newest; when it goes, the one beneath comes back, for every owner.
4. One error per handle: raising again replaces that owner's error where
   it stands.
5. An error with no owner joins the stack and goes only when closed; one
   whose words match an error already there replaces it at the top.
6. Closing the shown error (its ×, or a click on its words, which copies
   its detail) takes it off for good; the one beneath comes back.
7. The surface's told-on-open lines and session's "deleted in another
   tab" raise beneath a standing error, not skip; `errorShown()` goes.
8. The entry layer holds a save-error handle (raised when a save does not
   land, the refused text its copy; resolved once nothing is owed) and
   plain `raise` for "couldn't delete — reload"; the ledger's owed keys
   and the four-method channel go.
9. The kept log records an error once, when raised.
10. GLOSSARY.md's Alert and the help's alerts paragraph gain a clause: a
    newer error covers an older one, which comes back when it goes.
11. No mock-up: nothing changes in layout; the sequences are played
    headless and handed over as steps.

## Record
- Built: `ErrorOwner` (alertText.ts); the ledger keeps a stack of standing
  errors, each with its owner or none, and shows the top; `beneath` places
  under the top. Owners: the entry layer's saves (`holdsSaved`, which holds
  back a routine "saved"), the surface's fence error, session's deleted-elsewhere
  and copy errors, the journal's load, bookmarks, shortcuts.
- Gone: `raise`'s number, `resolveError`, `errorShown`, `EntryAlerts`'s four
  methods, the ledger's owed keys and its save-error latch.
- The entry layer keeps `owed`, the keys whose write did not land, and
  resolves the save error when the last lands or goes; `clear()` resolves it.
- tools/importCorpus.ts also prints each key still owed. MEASURED
  (`node tools/importCorpus.ts`): 17362 imported, 0 failed, none owed.
- Helium, one reading changed by decision 6: the save error closed at
  places.ts (the step after "typed in the first as the second saves") no
  longer comes back when the deleted-elsewhere error goes on leaving.
- Helium, added: an entry with a refused fence opened over the save error
  leaves the save error shown; closing it shows the fence's error. MEASURED
  (`STEPS="bookmarks from another window"`, then the whole verdict).
- Hand-check: no entry in the backup raises an error when opened (a scan
  of every entry's fences and directives, 0 found), so the beneath-on-open
  path is the step's, not a hand's.
