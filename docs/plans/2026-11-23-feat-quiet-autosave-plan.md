# A landed autosave says nothing; "saved" once when a save error resolves (U17)

Asked 2026-11-23: "since saved is every few seconds and it's an
auto-save, I'm not sure we even need the alert for that. I've been
typing in the app and it's been very distracting. If I had filled out
and submitted a form, I'd want an automatic success alert for that. For
auto-save, we don't need it." Built before U16: "I'm typing in the app
right now".

## Decisions

1. A save that lands says nothing; "not saved" is unchanged.
2. When a save error resolves, its owner says "saved" once, the error
   closed or not.
3. No mock: nothing new is drawn. Played headless.
4. The ledger's holding back of a routine "saved" while a save error
   stood goes with the routine "saved" (`holdsSaved` becomes `saves`).

## Record

- 20:16 Started; U16's half-built work set aside in a stash.
- 20:25 The ledger, test-first: an owner of saves says "saved" once on
  the resolve after an error it raised; the two holding-back tests go.
  The session's routine raise goes; the alert table, `docs/alerts.md`
  and help say so. Eleven Helium steps waited on "saved" before their
  next act: they wait on the save itself (`landed`). The launch's click
  on a success moves to ⌃⌘C's "Link copied"; "after typing" now reads no
  success shown. Two layout readings moved a pixel ("⌃⌘M from 20px down",
  "⌃⌘G for a skipped line"), the same on two plays, likely the alert area
  no longer holding "saved" (inferred). Two readings that read "saved"
  now read the launch's count, which U16's windowed reading removes.
  Approved, the order and reader runs passing.
