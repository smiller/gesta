# The surface, then the place keeper

Opened 2026-09-30. Two deepenings of `src/session.ts`, chosen from an
architecture scan (Matt Pocock's improve-codebase-architecture skill,
dry run, the report in the session's scratchpad, not the repo). This is
the plan and THE RECORD: the scan's measurements, the decisions as the
grilling settles them, one dated section per batch.

## Why

- `src/main.ts` 20 commits and `src/session.ts` 17 since 2026-09-15; the
  next file 11 (MEASURED, git log). 1,091 and 686 lines (MEASURED, wc).
  Neither has a Vitest file; the suite runs under node, no DOM (READ,
  vite.config.ts).
- Seven fix commits on 2026-09-28 went through `session.ts`,
  `placeState.ts` and `viewCarets.ts` (MEASURED): cb1b26c, 1a8a616,
  016c951, 054af51, 972dc9d, 573fcff, f352e3f. Their subjects name rules
  of the window's place and the view switch, testable today only in
  Helium (READ).
- `session.ts` asks which surface is open at 14 sites — `mdView &&
  source` / `else if (view)` (MEASURED, grep), each arm hand-written; the
  textarea's geometry twin sits among the navigation code.
- `main.ts` reaches into `session.view` 29 times and `session.mdView` 7
  (MEASURED, grep). Left alone this pass (below).
- The source view records its place as a pixel offset only, `pos: -1`
  (READ, session.ts recordPlace).

## The scan's five candidates and where they stand (kept here: the scan's
## report was an HTML page in a session's scratchpad, not in the repo)

The architecture scan of 2026-09-30 (Matt Pocock's
improve-codebase-architecture skill, a dry run over main.ts and
session.ts, the two hottest files) named five deepenings:

1. THE PLACE KEEPER — the window's place in one module. Strong. DONE:
   fabb19b, reviewed (this plan).
2. THE SURFACE — the rendered and source views behind one interface.
   Strong. DONE: 98469d1, reviewed (this plan).
3. THE ENTRY LIFECYCLE — create, extract, rename, delete, a new root, the
   parent's relabel. Worth exploring. DONE: ff1daea, reviewed, with three
   older bugs fixed on the look
   (`2026-09-30-refactor-entry-lifecycle-plan.md`).
4. THE OVERLAYS — which overlay closes which. Worth exploring. DONE:
   9a99502, reviewed (`2026-09-30-refactor-overlays-plan.md`); its odd
   blanks open questions there.
5. BOOKMARKS AND SHORTCUTS — each a module over the local-storage seam in
   `local.ts`: the bookmarks' latch (writes refused while the stored text
   is unreadable), the seed once when the key is absent, the fail-pin
   generations, now in main.ts and reached only by Helium. Speculative:
   their pure halves are tested already, and what stays in main.ts is
   mostly wiring — the deletion test half passes. BOOKMARKS DONE
   2026-10-01 (`2026-10-01-refactor-bookmarks-store-plan.md`), with ⌃⌘B
   re-reading a damaged list; shortcuts left in main.ts, the deletion test
   failing there.

Considered and not listed: the copy button's and the floating bar's
geometry, moved out of main.ts, would gather no rule a test could read.

## Decided (the reader, 2026-09-30, grilling round 1)

1. STRICTLY BEHAVIOUR-PRESERVING: `corner.approved.txt` comes out
   byte-identical. What the seam makes possible (the source view's place
   as a text position) is listed under "Later", never folded in.
2. The surface interface is the SESSION's alone this pass; `main.ts`'s
   reach into `session.view` and `session.mdView` is a later candidate.
3. Vitest gains the view switch: code written against the surface
   interface, tested over two fake adapters — the order hold → mount the
   other → align the top → place the caret; a forced source view stays
   forced; a seen caret drops the hold; a refused parse keeps the fence
   pin. The tests are written first and fail until the extraction lands.
4. No design-it-twice for the surface: the 14 call sites fix most of its
   interface. Reconsidered for the place keeper, whose interface is open.
5. The word: THE SURFACE, what both views share; its adapters THE
   RENDERED VIEW and THE SOURCE VIEW. No GLOSSARY.md: the term goes into
   CLAUDE.md's layout, the decisions here.
6. Two commits, one batch: the surface, the reader's look and accept;
   the place keeper, look and accept; then ONE /code-review at high over
   both, its cost recorded here.

Numbering below runs on from round 1's; the grilling's question numbers
(Q7, Q8, Q10) are not kept.

## Decided (the reader, 2026-09-30, grilling round 2)

Found for it: both views already fold to one stream type, `Flat`
(`flattenDoc`, `flattenText`; READ, flatten.ts), so the counting rules
(`countBefore`, `positionAt`, `crossViewOffset`, `arrivingCount`) can be
written once over either. The switch treats the views differently at two
points, both the window's place (READ): the rendered view's alignment
opens a closed section, holds and remembers the place, the source view's
only scrolls; a seen caret releases the hold in the rendered view only. A
hold set by an arrival never reaches a switch, but only because ⌃⌘M's own
keydown releases it first through the capture listener (INFERRED,
session.ts) — a rule kept by listener order, owed to the place keeper.

7. SMALL QUESTIONS: each view answers only what differs — its text, its
   stream, its caret and whether the caret is seen, the position under a
   height, the scroll to a position, the caret placed, an insert, the
   words, the teardown. The switch's rules are written once above them.
8. THE MODULE OWNS which view is mounted, the reader's chosen view, the
   forced source view (`forced`, `readerView`), the carets held per view
   (`carets`, `placedAt`) and the fence-refusal pin; its operations are
   `show(md)` — the open path, its source fallback included — `switchTo`
   (⌃⌘M) and `current`. The session keeps the keys, the saves, the
   navigation, the picture's aim, copy and reference, and the window's
   place until the place keeper.
9. THE WINDOW AS A PORT, `{ y(), scrollTo(y), under() }`: the browser
   window and a Vitest fake. The place keeper inherits it.

## Decided (the reader, 2026-09-30, grilling round 3)

10. The two differences stay IN THE OPEN in the switch, `if (!to.source)`
    at the two points, calling a place port the session supplies until
    the place keeper: `{ hold(place), release(), remember(place) }`.
11. The session hands the module its builders, `{ rendered(doc),
    source(md) }` — the rendered view needs the entry's folds, picture
    resolver and link routing — and Vitest hands it fakes the same way.
    `session.view` keeps working from the rendered adapter the session
    built; the interface carries no `EditorView`. The module calls
    `onView(md)` and `switched()` (the session's save and redraw) at the
    point they are called today: after the alignment, before the caret.
12. Files: `src/editor/surface.ts` (the interface, the window port, the
    switch; no DOM), `src/editor/renderedView.ts`,
    `src/editor/sourceView.ts` (the textarea, its twin, its listeners),
    `src/editor/surface.test.ts`.
13. The tests written first, over fake views and a fake window: the
    switch's order; near the top stays at the top; the top carried by the
    crossing, not an equal count; a moved caret retires the other view's
    hold; a seen caret scrolls and releases, an unseen one leaves the
    window; a refused switch back keeps the source view, pinned, a forced
    view forced; a clean parse releases the pin, refusals pin anew; an
    unparseable entry shown forces the source view and the next show puts
    the reader's view back; a show clears both carets and the fence pin.
    A comment that moves keeps its Helium pin and gains the Vitest one.

## Batch 1 — the surface (2026-09-30)

- Tests first: `src/editor/surface.test.ts`, nine, run red with the
  module absent (MEASURED), green once it landed (MEASURED).
- `session.ts` 686 → 427 lines; `surface.ts` 205, `renderedView.ts` 65,
  `sourceView.ts` 98 (MEASURED, wc). The 14 branch sites on the open view
  are 0 in `session.ts` (MEASURED, grep); the switch names the two
  differences at two branches on `source`, as decided (10).
- `npm run check` clean; the suite 73 files, 620 tests (MEASURED). The
  comment checker FAILED once, on a new block naming another module's
  function (`crossViewOffset` in the interface's comment), reworded;
  passes (MEASURED). Hooks 44/44 (MEASURED).
- THE NET: `npm run test:helium` — corner ok, bridge ok, 153 steps, 0
  open against `corner.writer.txt` (MEASURED): the approved run came out
  unchanged.
- TWO ORDERS MOVED on the open path, both inside one task, neither read
  by any step (INFERRED harmless, the approved run unchanged): the
  release of a forced source view now tells the chrome (`onView`) after
  the entry key is set rather than before, and on an entry forced to
  source the chrome is told before the place is set rather than after.
  Neither callee reads the other's state (READ, main.ts's onView and
  session's place).
- FOUND, KEPT: on an entry forced to source, a highlight owed is not
  consumed — the open returns before it (READ, the old open). Kept as
  `if (surface.forced) return;`, uncommented: whether it is a decision
  or an accident is not recorded anywhere.
- Caret reset on show is observable through the interface only where a
  hold and the map disagree on one text; the Vitest test covers the fence
  pin's release, and `walk › ⌃⌘M, then ⌃⌘.` in Helium stays the carets' pin.
- Committed 98469d1; looked at and accepted by the reader the same day
  (accept.sh, signature 91ef715e588c…, the margin-note work with it).

## Decided (the reader, 2026-09-30, grilling round 4 — the place keeper)

Found for it (READ, session.ts after 98469d1): five variables of state,
five listeners and a ResizeObserver, six functions through the session,
the surface's place port, three `movePlace` calls in main.ts. The
rendered view records the text position at the masthead's edge 24px in;
the source view a pixel offset; the surface's `topAt` reads a third
point, the middle, stepping down.

14. DESIGN IT TWICE: three sub-agents in parallel — the smallest
    interface, the common caller's default made trivial, ports and
    adapters with the node test as first-class caller — compared, one
    recommended. Its cost read from the transcripts and recorded here.
15. THE KEEPER OWNS THE LISTENERS, through an events port, `on("hand" |
    "scroll" | "resize" | "leave", fn)`: the browser adapter wires the
    real events, Vitest fires them by hand.
16. GEOMETRY THROUGH THE SURFACE: it gains `placeAt(under)` (the rendered
    view's position at the masthead's edge; null in the source view,
    meaning a pixel place) and `reveal(pos)` (the rendered view opens a
    closed section; the source view nothing); the keeper scrolls with
    `scrollToPos`. `placeAt` stays apart from `topAt`: unifying their
    points would change behaviour (1).
17. THE LISTENER-ORDER RULE MADE A RULE: the switch calls `release()` at
    its start, pinned by a Vitest test; unobservable today, the hold being
    gone already by ⌃⌘M's own keydown.

## Design it twice — the run (2026-09-30)

Three read-only Plan agents in parallel over one brief: A the smallest
interface, B the common caller, C ports first with the node test as
first-class caller. COST, by the review rule (the last message's input +
cache_creation + cache_read + output, read from each
`subagents/agent-*.jsonl`): A 57,336, B 52,322, C 57,836; 167,494 in all
(MEASURED). The harness's own `subagent_tokens` said 60,978, 55,496,
63,165; 179,639 (MEASURED) — a different figure, both kept.

All three arrived at the same spine unprompted: `open(ekey, how, show)`
running record → key → drop another entry's hold → show → arrival
inside the keeper; the keeper keeping its own entry key; the hold kept
by reference; the listeners through the events port in today's order.
They differed on the highlight owed, the switch's port, where rename and
delete go, and the small ports. C caught that decision 17's release must
come AFTER the switch's no-op guard, or a switch to the view already open
would drop an arrival's hold. Checked for A and C: main.ts's rename calls
`open` then `movePlace` (READ, main.ts), so the place recorded on leaving
is carried.

## Decided (the reader, 2026-09-30, grilling round 5)

18. THE HIGHLIGHT OWED rides in the arrival: `open(ekey, "arrive" |
    "owed" | "keep", show)` — A's; B's hidden read rejected.
19. THE SWITCH'S PORT is `{ carry(pos), release() }`: the keeper holds
    `{pos, y: 1}`, applies it, sets `y` to the window's (at least 1) and
    remembers it. The switch keeps no place rule.
20. RENAME AND DELETE through a separate `move(from, to)`; main.ts
    unchanged (2).
21. ONE `Page` PORT, `{ on(event, fn), anchoring(on) }`, its browser
    adapter also setting `scrollRestoration`; timers are Vitest's fakes,
    no clock port.
22. Decision 17 AMENDED: the switch's release comes after its guard on the
    view already open.

## Decided (the reader, 2026-09-30, grilling round 6)

23. Files: `src/editor/placeKeeper.ts` (no DOM) and its test; the
    browser `Page` adapter in session.ts where the listeners are
    registered today; the surface gains `placeAt` and `reveal`;
    `OpenHow` stays the session's, which turns an arrival with a
    highlight owed into `"owed"`.
24. The tests written first over fakes (a surface, the window, the page,
    the storage): arriving; the highlight owed; the hold (resize, hand,
    the 1px and 2px scrolls); another entry; recording (held, the two
    views, no surface, the last scroll's 400ms, leaving, before `show`);
    the write memo and `move`; applying (the pixel cases, the clamp,
    `reveal` first, the fallback); `reapply`; rename and delete; `carry`;
    and in surface.test the release after the guard and `carry`.

## Batch 2 — the place keeper (2026-09-30)

- Tests: `src/editor/placeKeeper.test.ts`, fourteen. THE MODULE WAS
  WRITTEN BEFORE THEY WERE RUN: red was shown after the fact, with the
  module moved aside (MEASURED: "Cannot find module"), not before it was
  written — the order decision 24 set was not kept.
- `surface.test.ts`: the place port is `{ carry, release }`; a switch
  releases first and a switch to the view already open lets nothing go
  (decision 22). One edit of mine asserted "no release at all" for an
  unseen caret, contradicting 22; corrected to "none for the caret".
- `session.ts` 427 → 363 lines; `placeKeeper.ts` 129 (MEASURED, wc). No
  place state is left in the session: `held`, `placedY`, `lastWritten`,
  the timer, the listeners and the ResizeObserver are the keeper's
  (MEASURED, grep). The listeners are registered in today's order, from
  the same point in `startSession`; `scrollRestoration` is set a few
  statements earlier than before, inside the same synchronous start.
- `npm run check` clean; the suite 74 files, 635 tests (MEASURED). The
  comment checker FAILED once, on a role noun's possessive in a new
  comment ("the masthead's"), reworded; passes. Hooks 44/44 (MEASURED).
- THE NET: `npm run test:helium` — corner ok, bridge ok, 153 steps, 0
  open (MEASURED).
- Committed fabb19b; looked at and accepted by the reader the same day
  (accept.sh, signature 39553bdfdb83…). On the look: ↓ at the bottom of a
  long entry snaps to the top when the text has focus with the caret
  above — the same in bef23be and HEAD (MEASURED, a scratch probe in
  headless Helium); an editor's convention, left as it is (the reader).
  The fold step by hand: reached through ⌃⌘M, the same reveal; the
  arrival form needs the fold memory deleted, which the Helium step does.

## The review — one /code-review at high, bef23be..fabb19b (2026-09-30)

COST 133,205 tokens (MEASURED: the final message's input 2 + cache
creation 7,413 + cache read 121,527 + output 4,263, from the transcript;
the harness's `subagent_tokens` said the same). Ten findings, all checked
against the code; eight fixed in one commit, two declined:

1. renderedView's `topAt` comment named the source view's twin — reworded
   to its own stepping.
2. surface's forced-release comment named the chrome's pill — reworded to
   the module's own rule.
3. the keeper's arrival comment said the highlight scrolls itself —
   reworded to what the keeper does; the rename pin moved in with it (8).
4. the hold comment described the adapter's wiring ("whenever the editor
   changes size", "the browser's find") — reworded to the keeper's events.
5. "Unpinned" beside a pin, left over from the move — dropped. Mine.
6. DECLINED: the source view's `placeAt`/`reveal` unused behind the
   keeper's `source` check, and a null that means two things. The failure
   named — the check dropped, the source view recording pos 0 — fails
   `placeKeeper.test › is skipped while held` today (READ): it is guarded.
7. `rendered` a second truth beside `surface.current`, cleared by hand —
   now `live()`, the rendered view only while it IS the surface's current
   one; the builders no longer clear it.
8. session.ts's OpenHow comment duplicated the keeper's — dropped, its
   second pin moved to the keeper's.
9. DECLINED for this commit: each switch flattens each view twice. The
   old session did the same (READ, bef23be), nothing measured it slow,
   and this pass is behaviour-preserving; listed under Later.
10. a redundant ternary over `stored()`'s default — one call.

THE CHECKER OWED (the mechanical class, 1 and 2): the role list gained
"the source's", "the surface's", "the keeper's", and "the chrome's" as a
directory's noun (an owner ending in "/"). Hits in src/ before choosing:
the source's 2 (renderedView's, now gone; the keeper's own, reworded),
the chrome's 1, the surface's 0, the keeper's 0; "the editor's" 8, left
out as ambiguous (MEASURED, grep). The self-test gained the five blocks
verbatim from fabb19b — seven of fourteen caught now — and a directory
test.

## Later

- The source view's place as a text position, now that its adapter can
  say which text stands at the top.
- `main.ts`'s 29 reaches into `session.view` and 7 into `session.mdView`
  through the surface interface.
- The switch flattens each view once instead of twice (review finding 9),
  if a long canto's ⌃⌘M ever measures slow.
