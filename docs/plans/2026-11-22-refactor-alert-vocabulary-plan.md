# One word for alerts (U6)

Asked 2026-11-22: "We want a ubiquitous language / consistent language
here across human-facing text and code"; then Flash renamed Alert ("much
less confusing"); a name for the reserved space; a catalogue of every
alert by kind, its words and when it is raised.

## Decisions (asked, each a choice put to the reader)

1. The word is Alert, its kinds error, warning, info and success, in the
   glossary, the help, code, tests, tools and CSS.
2. The reserved band under the header is the alert area ("bar" already
   names the ⌃⌘G bar, the line bar, the replace bar).
3. Refused outright: flash, notice, whisper. Refused only where they name
   an alert, its kind or the band: failure, refusal, passing, strip; the
   words stay for an act that does nothing and for stripping markers.
4. The ledger's methods: `error`, `errorCaught`, `warn`, `info`,
   `succeed`; `clearWarning`, `releaseError` (`resolveError`, asked after: the
   glossary's "until it is resolved").
5. The kept log moves from the `flashlog` key to `alertlog` once, its
   kinds read failure → error, refusal → warning; the console's
   `gesta.alerts()`.
6. `docs/alerts.md`, by hand, one table per kind: the words, when it is
   raised. A test reads every raise call in src/: a literal or template
   message is in the catalogue (`${…}` as `…`); a call passing a variable
   has its file and function named there.
7. Two commits: the rename, then the catalogue and its test.
8. Asked after the rename: the acts' ports take the ledger's names, in a
   commit before the catalogue; `errorCaught` folds into
   `error(text, { caught, copy })`, one method per kind: `error`, `warn`,
   `info`, `succeed`.

## Record
- Files: notices.svelte.ts → alertLedger.svelte.ts, Corner.svelte →
  Alerts.svelte, flashLog.ts → alertLog.ts, flashStrip.ts → alertArea.ts,
  tabNotice.ts → tabWrite.ts (another tab's write), tools/steps/notices.ts
  → alerts.ts; a component and a module cannot share a stem, so not
  alerts.test.ts beside Alerts.test.ts.
- Two senses were not alerts: `--flash`, the highlight colour, is
  `--glow`; `takeNotice`, another tab's write, is `takeTabWrite`.
- The check: flash, notice, whisper refused in every form ("noticed"
  kept); failure, refusal, passing refused only quoted, and strip only as
  `--strip-`. Measured before choosing: a camel-case strip rule hit 10
  lines of the one-offs' image strips, `.refusal` 5 lines of the verdict's
  refusal to approve. A dated plan's path keeps its words.
- The measurement found `tools/adapters/inPage.ts` still listing the kinds
  as failure and refusal, so `alertSince` would have missed every error and
  warning; fixed, with a test.
- The acts' ports (`say`, `refuse`, `stick`, `pin`, `fail`: about 170
  calls under 15 names) are not renamed here: only the ledger's methods
  were decided.
- Asked after the ports: "pin" for a standing error retires, the
  comment standard's `(pin: …)` keeping the word. Every such pin is the
  number `error()` returns, so `pinned` is `errorShown`, not alertShown.
  The lines an entry opens with (a fence not known, a directive's
  trouble) stay errors, "because the user might want to copy the
  unrecognized form of the block after 10 seconds"; the words calling them
  a warning say error. The help's two "pinned" lines for bookmarks take
  the reader's words; the help as a whole is B2. "Pinned to the bottom"
  in Masthead.svelte, a layout's word, stays.
- The catalogue, docs/alerts.md: 112 raise calls in src/, 33 of them with
  words chosen elsewhere, named by file and `callee(first argument)`
  (MEASURED, tools/alertCatalogue.ts over src/). TypeScript 7 gives no
  scanner to JavaScript, so the checker reads text over sourceSpans. Its
  rules came from its first run: a bare ok() in passage.ts was a helper,
  so progress's and the entry layer's names count only called on
  something; a call handing on its own parameter is wiring; failMsg's
  words are read through (its form a test against the real function); a
  ternary's colon after a call was first taken for a signature, missing
  session.ts's "Couldn’t copy …".
- The paste port `refused`, missed by the ports rename, is `warn`, and the
  editor's onPasteRefused, the same function handed in twice, went.
- U6.2, asked after the catalogue: one table of alert texts, src/model/alertText.ts
  (each entry its kind, words, when, and time on screen; a hand-written
  table, no i18n library: none holds a kind and a when). Callers say
  alerts.raise(id, params?, { caught, copy }), or raise a Said a module
  chose. The four methods, errorCaught and the acts' named ports gave way
  to raise.
- (a), asked: every word an alert shows is in the table. A module making a
  whole alert returns a Said (the Tab, link, name, move and ⌃⌘R
  refusals); a module making a piece calls a PHRASES function and keeps
  returning text (a fence's reason, a directive's trouble, the line bar's
  words, a filename clash), the alert entry framing the pieces.
- The types found what the scanner could not: linkRefusal,
  headingRefusal, aliasRefusal, naming's and subEntries' name refusals,
  the Shelves refusals, move's refusals and its outcome text all reached
  alerts through a variable.
- docs/alerts.md is written by tools/alertsPage.ts from the table, a table
  per kind and the phrases after; the text scanner went. Steps 1-3 landed
  as one commit: the table's exports had no users until the callers moved.
- MEASURED: the Helium verdict matches the approved run with no difference;
  every word on screen is as it was.
- Found on the way, not changed: "imported 1 entries" and "1 entries
  stored" for a count of one.
- U6.1: the entry layer's stuckIdle is stuckUnkeyed, and its test no
  longer says idle-deferred: nothing defers it since U5.
- U6.3: every count of entries in the table says "1 entry" for one
  (imported, entries stored, the reader's bundle, exported three ways,
  indexed). No approved Helium reading showed a count of one.
- Found on the way, asked "Is there anything else it might have broken?":
  U6.2 left tools/importCorpus.ts printing an alert's id where it printed
  its words (an id still adds to a string, so the types passed); fixed.
  The audit (MEASURED): every consumer of a result that became a Said
  checked; every fixed form of the old catalogue and its 12 quoted
  examples rendered through the table to the same words. The page tool
  merged a literal "…" into a placeholder; fixed.
- The batch review (A13): /code-review at HIGH over 9971f9e..HEAD,
  243,451 tokens (MEASURED: 2 input + 1,916 cache creation + 239,147
  cache read + 2,386 output, its transcript's last message). Six findings,
  all nit; fixed in one commit:
  1. a stored log with one item that is no entry read as empty, and the
     carry then cleared the old key: items that are no entry are passed
     over, and an old log that is not a list stays where it is.
  2. progress, its ends and the entry layer's channel took any id: each
     takes its own kind now (BareIdOf, SaidOf, said() typed by its id),
     pinned by @ts-expect-error lines tsc checks.
  3. the help's ⌃⌘B row said "shortcuts", the name of ⌃⌘S's feature: the
     reader's words, "a popup with links to the entries you have
     bookmarked" (the reviewer's "1-9 to jump" left out keyed bookmarks).
  4. the renamed step "the info clicked" clicks a success: "the success
     clicked", the run approved with that label alone changed; a comment
     calling the numbered-apart refusal an error says warning. One it
     named, filing.ts:166, is right: that refusal raises "cannot render".
  5. "PINNED, released by" and "the corner's" in comments, CLAUDE.md's
     "its pins": said as error and resolved. No checker: PINNED's one
     other use is the comment standard's own (CLAUDE.md:49), and every
     other "corner" in src/ is a corner of a block or the Helium section's
     name (MEASURED, grep).
  6. ErrorFrom and the ledger's Kind repeated the table's RaiseOpts and
     Kind: the copies went.
