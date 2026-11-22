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
