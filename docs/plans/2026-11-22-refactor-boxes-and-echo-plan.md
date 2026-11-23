# The Go to popup's boxes read once, and the echo cap in the alert's words (A15.1.3)

Asked 2026-11-22, from the architecture run over a52e7e3..HEAD: "Let's
look at candidates 3 and 4", yes to four questions, then "go".

## Decisions

1. Candidate 3: goto.ts reads once per entry which boxes the popup asks,
   each one's label and what each finds; `popup()` shows it and `ask()`
   routes by it. The box keys stay `line`, `page`, `stanza`.
2. Candidate 4: the alert entries that quote what was typed or a name cap
   that parameter in their own words; callers pass raw values; the cap
   lives in the alert table; `trimLabel` moves to src/model/trim.ts, which
   the table and the lists import; the lists' cap stays with them.
3. The shared `notANumber` piece a refused fence uses stays uncapped.
4. `keyTaken` caps the typed key too.

## Record

- `boxesOf` gives the labels and `finds` (the line box: a stanza or a
  number; the second box: a paragraph or a page). On a page in stanzas
  under the prose-by-paragraph convention, `ask()` used to send a `page`
  word to the paragraphs, a path no box reached; it reaches pages now
  (goto.test › is read once with its label: "nothingNumbered" before,
  "noPageNumbers" now). Code Health: a three-part condition at first
  (9.53); `byForm` and an early case for no document: 10.
- The cap: `echo` in alertText.ts for noPage, notANumber, notStanzaOrLine,
  alreadyOn and keyTaken; eight call sites pass raw values; goto.ts no
  longer imports src/ui/. The catalogue folds a cut stand-in into one "…",
  so docs/alerts.md is unchanged.
- Helium: the verdict matched the approved run unchanged.
- The batch review (A16), `/code-review high d2740d7..HEAD` over this and
  the landing: 124,513 tokens (its transcript's last message; its own line
  saying it spent none was wrong). Six findings, fixed (asked: "Yes, fix
  all six"):
  1. The four tool readings call one in-page reader, `__pageTop`, beside
     the alert readers; they still read the published value.
  2. GLOSSARY.md's Landing: a search jump is centred, not marked; ⌃⌘G's
     mark goes with the popup, a link's at the next click or moving key.
  3. alertArea.ts's and landingActs.ts' moved comments say their own
     reasons, not their callers'.
  4. `findsOf` reads what the boxes find; `ask()` no longer walks the
     blocks for labels it throws away.
  5. The catalogue's stand-in weighs as 0 when compared as a number, so
     `trimLabel` leaves it whole; the fold that would have swallowed a real
     "…" went. A length of 0 was tried first: it broke the rows of entries
     that read a parameter's length.
  6. (pre-existing) typeStanzaFor, thereAlreadyWithSubs and shelvesTaken
     cap what they quote too.
