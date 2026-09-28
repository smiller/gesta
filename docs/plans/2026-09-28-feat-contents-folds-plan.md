---
title: "feat: a work's contents fold under its headings — seven books on one screen"
type: feat
status: built, awaiting the reader
date: 2026-09-28
origin: the Faerie Queene contents page, and a mockup iterated with the reader 2026-09-28
---

# feat: a work's contents fold under its headings

## Overview

The Faerie Queene's contents page runs several screens: seven books, six
of them with a proem and twelve cantos under their `##` heading. On a
WORK'S contents page each `##` section folds under its heading, so the
page closes to its headings — the reader's mockup of 2026-09-28
(scratchpad `contents-accordion-mockup.html`, drawn over the successor's
own stylesheets) settled the look. The text is not touched: folding is
how the page is drawn. Every factual sentence is tagged READ / MEASURED /
INFERRED as CLAUDE.md's reporting rule asks.

## What was decided, and where

All by the reader, 2026-09-28, over the mockup.

| Decision | |
|---|---|
| A `##` section folds: everything under the heading down to the next heading of level 1 or 2 | the mockup (a section may open with a paragraph — Dedications) |
| Only on a WORK's contents page: a bookshelf entry below the author (two or more key segments) that has sub-entries. NOT an author page — grouped works are searched whole — and nowhere outside the bookshelf | Q3 |
| Any number of sections open at once | Q1 of the mockup's switches |
| A closed section shows its count, `N entries` (`1 entry`): the links under the heading. The label-reading `Proem · 12 cantos` cannot be general | Q3, seen in the mockup |
| A small triangle in the margin before the heading, pointing right when closed and down when open; ONLY the triangle toggles, so the heading's words stay editable | Q1 of the four |
| Mouse only for now; a chord (`⌃⌘X-1 to open`, the reader's idea) left for later | Q2 |
| Coming back shows the page as it was left: the open sections remembered per page, in this browser; and the view scrolled to the link it was left from | Q4 |
| Every section starts closed on a first visit | the mockup |
| Anything landing inside a closed section opens it: a search result's highlight, a link's highlight payload, a caret moved there | proposed with the plan, not objected to |
| Content before the first `##` never folds (title, subtitle, directive) | the mockup |

## Proposed solution

- `src/editor/folds.ts` (new): pure over the document — `foldSections(doc)`
  (each section's heading position, its body's range, its key — the
  heading's text — and its link count), `foldDecorations(doc, open)` (a
  node decoration on each heading: class `fold`, `data-count`,
  `aria-expanded`; on each top-level block of a closed section's body:
  class `folded`), and `sectionAt(doc, pos)`. The plugin holds
  `{ on, open: Set<string> }`, rebuilt on a doc change, set by meta;
  its view opens the section holding the selection when that section is
  closed; `handleDOMEvents.mousedown` toggles when the press lands on a
  fold heading LEFT of its text (the triangle is a `::before` in the
  margin). Tests beside it, the editor.test.ts chain shape.
- `src/store/contents.ts`: `foldsContents(keys, date, tag)` — bookshelf,
  two or more segments, at least one child (READ: `childrenOf`,
  lists.ts:29). Tests beside it.
- `src/session.ts`: when an entry opens, the session asks
  `foldsContents` and hands the editor `folds: { open }` read from the
  stored state; the editor reports every toggle back; a followed link on
  such a page records its href as the page's `left`; reopening the page
  scrolls that link into view (its middle, a frame after the paint, the
  landing's own scroll path).
- The stored state: ONE localStorage key, `gesta.v1.folds` (NS + "folds",
  keys.ts:18, the shortcuts' and bookmarks' pattern, main.ts:331,380), a
  JSON map from entry key to `{ open: [heading…], left: href }`; a
  per-browser convenience, never in the text or a backup; read and
  written inside try/catch.
- `src/editor/editor.css`: the mockup's rules — the triangle, the count
  as `::after` from `data-count` (small, sans, muted, hidden when open),
  `.folded { display: none }`, a closed heading's tighter bottom margin.
- `src/chrome/help.html`: a sentence on folding contents.
- tools/helium-steps.mjs: one successor-only section — seed a work with
  two `##` sections, read the folds closed, click a triangle, read it
  open, follow a link and come back, read the open set and the scroll —
  its differences from the current app listed.

## Batches

1. The model half, no DOM: folds.ts's pure functions and plugin state,
   contents.ts's decision; tests.
2. The wiring: the mousedown toggle, the session's hand-off, the stored
   state, the scroll back, editor.css, the help; checked in headless
   Helium over the Faerie Queene contents page.
3. The Helium step and its listed differences.

Each test-first and committed green; the reader looks, accepts through
the gate, then one `/code-review` at medium (the batch touches session.ts
and editor.ts, DOM seams).

## Acceptance criteria

- The Faerie Queene contents page opens with its eight headings closed,
  each with its count (`3 entries`, `13 entries` ×6, `3 entries`).
- A click on a triangle opens or closes that section alone; a click on
  the heading's words places the caret there as before.
- Follow a canto link, come back: the same sections open, the canto's
  link in view.
- An author page (Spenser, Edmund) does not fold; a journal entry or a
  page with `##` headings does not fold.
- A search result inside a closed section opens it and lands.
- The source view (⌃⌘M) shows the markdown, unchanged.
- `npm run verify` green.

## Record

### Batch 1 — 2026-09-28, the model half

- src/editor/folds.ts: `foldSections` (a `##` heading to the next heading
  of level 1 or 2; the key its text; the count its link runs, `N entries`
  / `1 entry`), `sectionAt`, `foldDecorations` (the heading: `fold`,
  `data-count`, `aria-expanded`; a closed body's top-level blocks:
  `folded`), and the plugin — `{ on, open }` set by `setFolds` and
  `toggleFold`, opening a closed section when the selection lands in it
  (in `apply`, so no second transaction), reporting the open set through
  `onChange`, and a mousedown left of a fold heading's box toggling it.
  The mousedown is batch 2's to check in Helium.
- src/store/contents.ts: `foldsContents` — bookshelf, two or more key
  segments, at least one child.
- MEASURED: folds.test.ts and contents.test.ts 14 tests green; tsc clean.

### Batch 2 — 2026-09-28, the wiring

- editor.ts takes the plugin (`folds` in EditorOptions, `editorState`'s
  fourth argument); session.ts decides with `foldsContents`, reads and
  writes `gesta.v1.folds` (src/store/foldState.ts: parse forgiving, per
  page `{ open, left }`), records a followed link as `left`, and scrolls
  back to it a frame after an open; editor.css carries the mockup's
  rules, the count as `::after` from `data-count`; help.html a paragraph.
- THE WARM GAP, found by the reader: after a refresh the page opens from
  its ONE primed row (main.ts:989-1007) — a work's contents cannot see its
  sub-entries then, and draws unfolded — and the warm reopens only an
  entry it deferred. `session.refreshFolds()`, called when the warm lands,
  asks again; the editor is now always given the plugin's options (off
  where the page does not fold) so a page switched on later remembers.
  MEASURED in headless Helium with a TRUE reload (`page.reload()`): 0
  folds with the call taken out, 8 with it. An earlier "reload" test had
  navigated by hash within the same document, reloaded nothing, and read
  8 — it could not have seen the gap.
- MEASURED, headless Helium over the Faerie Queene folder through the
  import act: eight headings closed with their counts (3, 13 ×6, 3
  entries), no link showing; the triangle beside Book III opened it alone;
  a click on Book II's words placed the caret there and toggled nothing;
  after following Canto v and coming back, Book III open and Canto v's
  link in view; a highlight link to `Letter to Raleigh` opened Dedications
  (a first try aimed at `Canto vii`, which also matches inside `Canto
  viii`, landed in an already open book and proved nothing).
- `npm run verify` exit 0 — 531 tests, 43/43 hook checks, 105 Helium
  steps, 0 open.

### Batch 3 — 2026-09-28, the Helium step

- tools/helium-steps.mjs: "contents folds", after the stanza step, on the
  contents page its seeds already make (a `##` Book heading over a canto
  link): closed with `1 entry` on arrival, opened by the triangle, the
  canto followed, and on the way back still open with the link in view.
  Readers `folds` and `clickFoldTriangle` in both adapters.
- THE TRIANGLE'S TARGET: the step's first click missed. Drawn with a
  border trick the triangle's box was ten pixels wide (editor.css now
  gives it a 1.2em square, the shape a mask in the page's colours); and
  the step aimed at a two-line heading's MIDDLE, below the triangle,
  which stands beside the first line — `elementFromPoint` there read
  `MAIN`. The step now aims beside the first line.
- MEASURED: the successor's run gained exactly the four new lines, read
  and approved (112 lines). The current app's run, regenerated twice, read
  the list step's "saved" whisper as `show: false` where this morning's
  record and the successor read `true` — the whisper racing the read, in
  an app this plan does not touch; the record keeps its earlier `true`
  rather than list a difference whose cause is timing. Ten fields decided
  in corner.differences.txt, the current app having no folds: 109 steps,
  0 open.
