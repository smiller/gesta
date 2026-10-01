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

## Later

- `src/chrome/` renamed `src/ui/`, the word read as the browser's
  (the reader, 2026-09-30: "leave it for now, I'll come back to it"). A
  mechanical commit of its own: the imports, CLAUDE.md, the checker's
  "the chrome's" role.

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
