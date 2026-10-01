# The entry lifecycle

Opened 2026-09-30, candidate 3 of the architecture scan (the record of
the scan and of candidates 1 and 2:
`2026-09-30-refactor-surface-and-place-keeper-plan.md`). This is the plan
and THE RECORD: the measurements, the decisions as the grilling settles
them, one dated section per batch.

## Why

- Six operations live in `src/main.ts` (lines 773–967 at 5a0e8dc, about
  190 lines; READ): create (⌃⌘N, the button), extract a selection into a
  new sub-entry (the toolbar's Tag), rename, delete, a new root (a
  panel's "start one"), and a parent's links following a sub-page's
  heading (`relabelParent`, on every show).
- Their rules are pure and tested (`subEntries.ts`, `naming.ts`,
  `links.ts`, `lists.ts`). The ORDER of their writes is not: the new key
  lands before the old clears, the delete's landing opens before the
  remove, saves are suspended through a rename, the host's links are
  retargeted after the flush — promise chains no Vitest test reaches.
- The entry layer already runs over an in-memory store in its own tests
  (READ, entries.test.ts): a second adapter exists.
- Stable: the last fix, 760dcf6, 2026-09-08 (MEASURED). Chosen for what
  its failure costs — an entry lost or duplicated — not for churn.
- `insertLinkAfter` uses only `view.state` and `view.dispatch`;
  `replaceWithLink` and `cutMd` are pure over the state (READ): the
  editor half runs under node over a real `EditorState`.

## Decided (the reader, 2026-09-30, grilling round 1)

1. ALL SIX operations in one module: they share the cold-cache refusal,
   the taken-name check and the link rewriting; `relabelParent` is the
   third way a host's links follow an entry.
2. THE DIALOGS AS A PORT, `{ prompt, confirm, alert }`: the browser's in
   the app, a scripted fake in Vitest. The order refuse → ask → check →
   confirm → write is the module's.
3. The ground rules of candidates 1 and 2: strictly behaviour-preserving,
   the approved Helium run unchanged; tests written and run red BEFORE
   the module exists; one commit, the reader's look, one /code-review at
   high; this plan.
4. No design-it-twice: the six operations fix most of the interface; one
   sketch, argued.

## Decided (the reader, 2026-09-30, grilling round 2)

5. THE EDITOR PORT, `view(): Pick<EditorView, "state" | "dispatch"> |
   null`: the real view in the app, a real `EditorState` with a dispatch
   that applies in Vitest; `insertLinkAfter` narrows its parameter to the
   pair. Tests assert the markdown itself.
6. THE SESSION PORT, `Pick<Session, "current" | "flushSave" |
   "suspendSaves" | "surfaceMd" | "open" | "movePlace" | "refresh" |
   "goto" | "saveNow">`; THE CHROME PORT, `{ say, redraw, replaceHash,
   hideBar, focus }`. A new root's panel close stays in main.ts, before
   the call.
7. Every operation returns a promise settled when its writes have
   landed; main.ts ignores it, tests await it.
8. `coldRefusal(layer)`, pure and exported: the lifecycle and main.ts's
   bookmarks say the same words.
9. Files: `src/chrome/lifecycle.ts` and its test.

## Batch 1 — the lifecycle (2026-09-30)

- Tests first, and this time first in fact: `src/chrome/lifecycle.test.ts`
  run red with the module absent (MEASURED: "Cannot find module"), before
  a line of it was written.
- First green run: 7 of 23 failed, every one an expectation of mine, none
  the module's (a line-for-line move): the serializer writes no trailing
  newline; `firstHeading` reads a level-1 heading only, so a cut opening
  `## Part` takes its tag as its label (READ, headings.ts); a delete's
  blank sub-pages begin their removes before the landing opens — "the
  landing first" guards the deleted entry's own remove, which still
  follows it. Corrected to what the code does; 23 pass (MEASURED).
- `main.ts` 1,091 → 927 lines; `lifecycle.ts` 250 (MEASURED, wc).
  `insertLinkAfter` takes `Pick<EditorView, "state" | "dispatch">`.
  main.ts keeps `warmBlock` for the bookmarks, now over `coldRefusal`.
  The browser's `prompt` is called with one argument where it was, two
  where it was.
- `npm run check` clean; the suite 75 files, 664 tests; the comment
  checker passes; hooks 44/44 (MEASURED).
- THE NET: `npm run test:helium` — corner ok, bridge ok, 153 steps, 0
  open (MEASURED).

## Found on the look (the reader, 2026-09-30)

- A `#` line on a journal day, selected within the line and tagged: the
  new entry held the text with NO heading, the day's link read as the
  tag. The same on bef23be and HEAD (MEASURED, a scratch probe in
  headless Helium): older than this work. The cause (READ, format.ts
  `cutMd`): a cut inside one block is always wrapped as a paragraph, so
  a phrase from a paragraph comes out as its own — and a whole heading
  is flattened with it. The tag as a day's label is by design
  (lifecycle.ts: only a namespace labels by the cut's heading).

11. FIXED, as a commit of its own, test first, before the accept so the
    one review covers it: a selection covering a WHOLE heading cuts it as
    the heading; a phrase from inside a block stays a paragraph. On a page
    or a book the link then reads as that heading.
12. A day's tagged-entry link stays its tag: the masthead row lists and
    finds a day's tagged entries by tag, and the link matches it.

- "New author" with the name the dropdown SHOWS for an existing author
  ("John Donne") opened a new, empty author of that name, where the
  dropdown's own link opens the populated one. Older than this work: the
  check moved line for line (READ, bef23be main.ts against lifecycle.ts).
  The cause: the check reads the KEYS; a bookshelf author is keyed "Last,
  First" and shown by its `#` heading (the seed's Spenser, READ; Donne's
  own key INFERRED, the reader's journal not read). The empty "John
  Donne" stands in the reader's journal, a blank the export skips.

13. FIXED, after the look's last step, as a commit of its own, test
    first: a new root's name is checked against every existing root's
    LABEL too, case aside, and goes there on a match; no "First Last" ↔
    "Last, First" guessing.

## The look's two fixes (2026-09-30)

- 11 committed as c5d3d31: `format.test › cutMd: a whole heading
  selected alone` run red first with the look's own failure (MEASURED:
  "Testing with a heading 3" without its `#`), then green; the suite 665;
  Helium 0 open (MEASURED).
- 13: two tests in `lifecycle.test` — the Donne case red first (MEASURED),
  the name no root carries green before and after (it pins what must not
  change); then green; the suite 667, tsc clean, the checker passes
  (MEASURED). The reader's accept (c66fec7a93b7…) recorded the tree with
  11 written but unbuilt; 13 re-armed the gate, so both are looked at
  before the one review.

## The review — one /code-review at high, 5a0e8dc..44db87e (2026-09-30)

COST 92,368 tokens (MEASURED: the final message's input 2 + cache
creation 2,119 + cache read 87,750 + output 2,497, from the transcript).
Nine findings, all checked against the code; five fixed in one commit,
four declined:

1. FIXED: the label match compared the label against the name AFTER the
   naming rule rewrote it — `pageName` turns ": " into " — " and strips a
   trailing dot (READ, names.ts) — so "Gerard Manley Hopkins, S.J." or
   "Anonymous: Pearl" typed as shown still made a twin. It now matches the
   text as typed or as rewritten; a test of both, red first (MEASURED).
2. DECLINED here, put to the reader: create goes to the new entry whether
   or not its registration landed, its link already saved into the host —
   the oddity kept and pinned in round 3, which the review calls a bug: on
   a reload after a failed write the link is dead.
3. DECLINED: a failed extract leaves the cut in the cache. That is the
   entry layer's model for every write that sticks (written to the cache
   at once, the failure pinned and keyed), not this module's.
4. DECLINED: rename's taken check by key alone. A bookshelf author is
   shown by its heading, which a rename leaves alone, and a page's label
   is its key, so the key check already covers what the list shows.
5. DECLINED: two roots sharing a heading, the first in key order wins.
   Rare, and the shown name is ambiguous to the reader as well.
6. FIXED: four moved comments told another module's mechanism — the
   button hidden, `open` lifting the suspension, opening cancelling a
   pending save, unknown keys refused — reworded to this module's own
   rules or dropped.
7. FIXED: main.ts's `warmBlock` repeated the module's cold refusal; both
   now call `refuseCold(layer, say)`, exported and tested.
8. FIXED: `const shown` in `newRoot` shadowed the module's `shown`;
   renamed `labelled`.
9. FIXED: the prompt adapter's branch on an absent value — the dialog's
   default fills it either way.


## Decided (the reader, 2026-09-30, after the review)

14. No confirmation pass: finding 1's change is a few lines under two
    tests; a pass would cost about the review's 92k again.
15. CREATE DOES AS EXTRACT DOES (finding 2, Q40): the new entry is
    registered FIRST; only once that lands is the link put at the caret,
    the host saved, the entry opened. A write that fails says so and
    changes nothing; the editor gone during the write leaves the entry
    standing and says the link was not placed. The link now appears a
    moment after the prompt, not at once. Its own commit, test first.

- 15 committed as 7b022a2: three tests red first, then green; the suite
  669, Helium 0 open (MEASURED). Looked at and accepted by the reader the
  same day (accept.sh, f7be1b76b759…): the link stands on the parent
  after the caret. CANDIDATE 3 CLOSED.
- A FLAKE, recorded: the pre-commit of this docs-only change failed in
  Helium's "reference copy" section — ⌃⌘R's clipboard wait timed out at
  5 s — with src/ unchanged since 7b022a2 passed; the next two runs
  passed (MEASURED: 1 failure in 3 runs). The headless run and the
  reader's live Helium share the system clipboard, a likely cause, not
  tested (INFERRED). Watched for: a second occurrence is a fix owed.

## Later

- OPEN QUESTION (the reader, 2026-09-30, on the look: surprised twice, at
  the extract's label and the heading's relabel): should a day's tagged
  entries take their titles from their first level-one heading, as pages
  and books do? Today they are their tags everywhere — carried from the
  old app (the successor plan's decision row 5, 2026-09-07), not chosen
  here. A feature with its own plan, likely a mockup: the masthead's tag
  row, the extract's label, the relabel, Go to's and search's names, and
  the seven journal tagged entries that open with `##`. Kept as is for
  ff1daea and its fix.
- DONE 2026-09-30, the reader's word: `src/chrome/` renamed `src/ui/`,
  and `chrome.css` `ui.css`, a commit of its own — the imports in four
  files, the checker's owner paths (the role noun "the chrome's" kept,
  the word still naming the UI in prose), CLAUDE.md. The `ChromePort`
  and `chrome` names inside the code left as they are.

## Decided (the reader, 2026-09-30, grilling round 3)

Found on the reread (READ, main.ts at 5a0e8dc), both kept (3) and each
given a test, so a change to either is a decision: a NEW ROOT prompts
before its cold-cache refusal, where every other operation refuses
first; a CREATE goes to the new entry whether or not its registration
landed, where extract and a new root check.

10. The tests written first, over the memory store, a real
    `EditorState`, scripted dialogs and fake session and chrome ports: the
    cold cache; create; extract; rename; delete; a new root; the parent's
    links following a heading — each asserting what was written, in what
    order, and what was said.
