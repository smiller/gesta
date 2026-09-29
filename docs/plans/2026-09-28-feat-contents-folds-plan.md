---
title: "feat: a work's contents fold under its headings — seven books on one screen"
type: feat
status: built and reviewed
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

### The review — 2026-09-28, /code-review at HIGH and at MEDIUM over 04435e9..d1deeb7

Asked by the reader: high instead of medium, both run, cost and findings
compared. The diff: 424 lines over src and tools.

| | medium | high |
|---|---|---|
| tokens (final context + output, the figure a review reports) | 69,499 | 89,181 (+28%) |
| output tokens written | 2,028 | 4,078 |
| cache read over all turns | 520,109 | 651,215 (+25%) |
| turns / tool calls | 10 / 9 | 11 / 11 |
| recipe (the transcript's first line) | one careful diff pass, ≤15 findings | 8 inline angles, dedup, no verify, ≤10 findings |
| findings | 3 | 10 (the cap) |

MEASURED from the two transcripts in the session's subagents folder: the
medium run went in the foreground and reported no count; the arithmetic
reproduces the reported figures of the other runs exactly (89,181, 85,878)
and one within 30 (50,254 against 50,284).

Findings, both levels: typing in an open heading closed it (keyed by live
text); twin headings toggled together; the warm's switch-on folded away a
highlight and scrolled to the remembered link. High alone, behaviour:
closing a section left the caret in hidden blocks; the remembered link was
never cleared and every reopen jumped to it; a ⌃⌘G landing inside a closed
section stayed hidden; a full-URL contents link was never found for the
scroll back. High alone, cost and form: sections recomputed per keystroke
and caret move; the fold decision and the stored state read three times
per open; two comments asserting another module's mechanism. All ten
judged real and fixed in one commit:
- folds.ts: sections cached in the plugin state, recomputed on a doc
  change; open sections held as heading positions mapped through edits,
  remembered by text with twins numbered (`Notes`, `Notes (2)`); a section
  made by an edit opens; closing moves a caret inside onto the heading's
  end; any selection, edit or switch-on landing inside a closed section
  opens it; `openFoldAt` for ⌃⌘G (main.ts's landOn).
- session.ts: the fold decision and the stored page read once per open;
  the remembered link used once then cleared, skipped when a highlight
  has landed, matched through internalHash; the warm's second look scrolls
  only if the window has not moved since the open.
- MEASURED: folds.test.ts 12 tests (6 new, each failing first); headless
  Helium over the Faerie Queene folder — typing in an open heading kept it
  open; back from Canto ix, Book III open and its link in view; reopened
  again, no scroll; a true reload on a highlight into Dedications opened
  Dedications.

### 2026-09-28 — a different entry opens at its top

- Found by the reader after the review: Book V's proem, opened from its
  link far down the contents page, opened scrolled down, its heading under
  the masthead. Nothing moved the window on an open (READ, the open path);
  the folds made long scrolls through a contents page common. session.ts's
  open now scrolls to the top when the entry is a DIFFERENT one; the same
  entry reopened (an import's refresh) keeps its place; a highlight and the
  remembered link still scroll after it.
- MEASURED, headless Helium: the contents at scrollY 237, the proem's link
  clicked — before, the proem opened at 265 with its heading at -66; after,
  at 0 with its heading at 199. The fold probe re-run: the scroll back to
  Canto ix, the link used once, the highlight after a reload, all as before.

### The confirmation pass — 2026-09-28, /code-review at HIGH over d1deeb7..7539133

- COST: 87,278 tokens (the run's report), over 240 changed lines (188+,
  52−, src and tools) — the two fix commits. Ten findings, its cap.
- All ten judged real, fixed in one commit:
  - folds.ts: OFF computes nothing (sections walked every link per
    keystroke on pages that never fold); a deleted heading drops out of the
    open set (mapped by its start it landed on the next heading and opened
    it); closing collapses a selection reaching in from either end; drawn by
    position, a twin's key numbered after U+0001 (a visible "Notes (2)"
    collided with a heading of that text); a dead exemption removed.
  - session.ts: Back and Forward keep the browser's place (the Navigation
    API's "traverse"), the first fix having forced them to the top; the
    open-at-top reset in the source view and the refused-as-source branch
    too; the scroll back to the remembered link runs AFTER a highlight is
    placed and checks again in its frame; the warm's second look reads the
    scroll before the folds move it and clears the link even when it
    skips.
  - Comments: the open() comment's false claim about the view switch and
    two claims about another module's mechanism, rewritten. This is the
    comment class CLAUDE.md names as owed a checker (claims.sh's port);
    found in two reviews of this plan, the port is owed twice over.
- MEASURED: folds.test.ts 16 tests (5 new, each failing first); `npm
  test` 541. Headless Helium: a canto scrolled to 2000, walked forward
  (the next at 0), Back — 2000 again; a source-view walk from 1500 opens at
  0; the fold probe as before (typing in an open heading, the scroll back
  once, the highlight after a true reload).

### The third pass — 2026-09-28, /code-review at HIGH over 7539133..016c951

- COST: 93,330 tokens (the run's report). Ten findings, its cap again —
  three high passes, three capped lists (89,181; 87,278; 93,330).
- Most traced to scroll handling bolted onto open() over two rounds; it
  was REPLACED rather than patched: `open(date, tag, how)` with an
  `OpenHow` of "new" (the top, then a folding page's scroll back to the
  link it was left from), "traverse" (the entry's own place, remembered by
  the session when it was left — the browser's restore ran against the page
  being left and a short one clamped it to 0) or "keep" (a refresh, a
  rename — which had jumped to the top under its new key). The traversal is
  read once by openHash from the Navigation API's "traverse" and kept
  across a pre-warm deferral; the remembered link is set only on a new
  navigation, never by the view switch's remount.
- folds.ts: the boundary after a heading is not its body (a heading
  selected whole by Escape reopened a section as it closed); the plugin
  view builds no keys when the fold state is the same object; comments
  reworded; the twin test asserts the exact key.
- NOT FIXED, decided: twin keys stored under this morning's spelling
  ("Notes (2)") are not migrated. The feature is a day old, only the
  reader's browser holds fold state, and the Faerie Queene has no twin
  headings; a migration would outlive the one record it serves.
- MEASURED: folds.test.ts 17 (the Escape test failing with the old
  boundary, passing with the new); `npm test` 542. Headless Helium: the
  contents opened out long, left at 2310 for Canto viii (a page 1000 tall),
  Back — 2310, and still 2310 a frame later; a canto at 2000, walked, Back
  — 2000; a source-view walk from 1500 opens at 0; the fold probe as before.
- The comment class (claims.sh's) found in all three passes: owed.

### 2026-09-28 — every entry returns to where it was left

- Asked by the reader, trying it: Book I, Canto vi, scrolled to stanza 7,
  the contents, then Canto vi again, opened at the top — "I'd expect it to
  go to stanza 7, the last place I was at on that page". Chosen: across
  reloads, in this browser (the reader, option 2 of two).
- src/store/placeState.ts: one key, `gesta.v1.places`, the 300 most
  recently left entries, each `{ pos, y }` — the text position just under
  the masthead in the rendered view (a pixel offset drifts with the
  window's width and edits above) and the offset for the source view.
- session.ts: an open is ARRIVE (a link, a walk, a pick, Back or Forward,
  a reload: back to the remembered place, the top on a first visit, the
  top when a highlight is owed and its own scroll centres the hit) or KEEP
  (a refresh, a rename). The place is recorded on leaving an entry, on a
  debounced scroll and on pagehide. This RETIRES the three passes'
  new/traverse split and the Navigation API's traversal flag, and the
  contents page's separate remembered-link scroll (foldState keeps the
  open sections only; a stored `left` from before is ignored): the
  contents' own place, remembered when a link is followed from it, does
  that job. The warm's second look re-applies the place once folding has
  moved the text.
- MEASURED, headless Helium: Canto vi at the top on a first visit;
  scrolled to stanza 7, the crumb to the contents, Canto vi's link — stanza
  7 at the top; a true reload — stanza 7; Book II, Canto iii on a first
  visit at the top; a highlight link into Canto vi's stanza 30 — the hit
  selected, stanza 28 at the top, not the remembered 7. `npm run verify`
  exit 0 with the shared Helium runs unchanged: the contents step's "back
  on the contents" reads its canto link in view through the place alone.

### The review — 2026-09-28, /code-review at HIGH over 1a8a616..bdeb1c6

- COST: 84,245 tokens (the run's report; its transcript's last message
  reads 79,960 context + 4,285 output, the same figure), 2 min 36 s, six
  tool uses. Ten findings, its cap — the fourth high pass of four capped.
- Findings, the reviewer's: (1) Back and Forward — the browser's scroll
  restore runs before hashchange, so the place recorded for the entry
  being left is read at the target's offset, and now persisted;
  (2) `openedAtY` is taken before the frame re-apply, so the warm's
  "still" test skips the post-fold restore; (3) the scroll-idle recorder
  records a place drifted by content settling above it (images from
  IndexedDB), each visit higher; (4) a forced source view's place is lost
  (mdView reset before recordPlace); (5) delete and rename record a place
  under the old key — a deleted key's place outlives it, a renamed one's
  is not carried; (6) a stored place inside a folded section restores to a
  meaningless offset and does not open the section; (7) a new comment
  asserts main's mechanism, and wrongly (claims.sh's class, fifth
  sighting); (8) the DOM half has no test and no headless step; (9) every
  scroll pause parses and rewrites the whole 300-record list, and the
  read/write shape duplicates the folds'; (10) the frame re-apply reads the
  session's view when it runs, not the one it was scheduled for.

### Its fix — 2026-09-28, the ten findings in one commit

- (1) `history.scrollRestoration = "manual"`: the page alone sets the
  window's place. MEASURED before the fix, headless Helium, a new shared
  step "places": Pippa left at 1200, Horace, Back, Forward, Back — Horace
  at 670 and Pippa at its top, and a reload kept the wrong place. After:
  Pippa at its line each time and after the reload, Horace at its top.
- (2)(3)(10) REPLACED rather than patched, as the third pass's scroll
  was: an arrival HOLDS its restored place and sets it again whenever the
  editor's mount changes size (a ResizeObserver) until the reader's own
  wheel, key, pointer or touch releases it; while held nothing is recorded
  from the scroll. `openedAtY`, the "still" test and the frame re-apply
  are gone; the warm's refreshFolds sets a held place at once. MEASURED:
  400px added above Pippa's held place (the editor's padding, as a
  picture resolving would), the window 1198 → 1598 on the same line, and
  the next visit on that line.
- (4) the place recorded before a forced source view is released.
- (5) `movePlace(from, to)`: a rename carries the place, a delete and its
  swept blank sub-entries drop theirs (`movedPlace`, placeState.ts, tested).
- (6) a place inside a closed section opens it (openFoldAt) before its box
  is read. MEASURED: Consolatio padded to six Books, all opened, left in
  Book 5's fourth paragraph, the fold store emptied, back — Book 5 open,
  the paragraph in view at the page's clamped bottom (612 of 612).
- (7) the comment asserting main's centring reworded as a decision; the
  foldState header's claim about placeState reworded as history.
- (8) the shared step "places" (six readings, successor-only, listed in
  corner.differences.txt); the old app's run regenerated: 115 steps, 0 open.
- (9) one `stored(key, parse)` helper under both keys; a place equal to
  the last written is not written.
- Found by the step, not the review: an entry left at the TOP came back
  57px down (the text position under the masthead lies below the page's
  top padding); a place left at y 0 now returns to 0.
- NOT PROBED: finding 2's own path (a contents page opened from its
  primed row before the warm, left scrolled) — the warm lands too fast in
  a seeded profile to open that window; the held place covers it by the
  same ResizeObserver the 400px probe exercised.
- The steps scroll BY A WHEEL since this fix (`wheelTo` in helium-steps.mjs):
  the first pre-commit run failed the toolbar step — its script
  `scrollTo(0, 0)` did not release the held place, a late resize set
  Twelfth Night's place again, and the double-click selected a node
  instead of "music" (MEASURED, the run before it had passed). A script's
  scroll is no reader's; the three `scrollTo`s in the steps are wheels.
- Two timing flakes on the way to the commit, neither in this change's
  code (MEASURED): `searchIndex.test.ts`'s rows() reuse took 67 ms against
  its 50 ms bound in one pre-commit run; the current app's regenerated run
  read its "saved" whisper faded at "a list typed" once and showing on the
  next regeneration, which is the copy kept.

### The fifth pass — 2026-09-28, /code-review at HIGH over bdeb1c6..cb1b26c

- COST: 90,925 tokens (the run's report; transcript 87,414 context +
  3,511 output), 3 min 36 s, ten tool uses. Ten findings, its cap — five
  high passes, five capped lists.
- The reader's rule, set before it ran: CUT HERE unless something really
  bad. None is: no finding loses text or a backup; each misplaces the
  reading by a line or two, or leaves a convenience record stale.
- Findings, the reviewer's, NOT FIXED, kept for a later look: (1) a
  sticky masthead growing after the warm (a wrapped tag list) moves the
  text without resizing the mount, so a held place is not set again;
  (2) a hold outlives a scroll or edit that fires no wheel, key, pointer
  or touch — a classic scrollbar dragged, Edit-menu paste, dictation — and
  the next resize jumps back; (3) the fold store is neither moved on a
  rename nor dropped on a delete, the class just fixed for places;
  (4) a section opened by a restore is saved as the reader's own;
  a ResizeObserver loop error is possible from that dispatch; (5) a held
  visit never moves its record to the front, so a daily-read entry can
  age out of the 300; (6) places dropped before the removal resolves, not
  put back on its failure; (7) one list rewrite per swept key; (8) the
  place bookkeeping hangs off two chrome call sites, not the entry
  layer's remove and move; (9) the last-written skip trusts this tab over
  another window's write; (10) `wheelTo` swallows its timeout, against
  the steps' rule.
- (1) and (2) FIXED 2026-09-28 in f352e3f, found again through the flaky
  Helium verdict (the comment-standard plan's record): scroll anchoring is
  off while a place is held, and any scroll the code did not make lets the
  hold go. Eight remain.
