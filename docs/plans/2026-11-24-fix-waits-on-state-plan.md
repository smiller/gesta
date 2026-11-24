# The Helium waits wait on the app's state, not the clock (U19)

Asked 2026-11-24: "let's start with 1 and 2 … feel free to go on to 3
… write whatever tests / framework you need to justify choices", then
"Putting in stuff that gets rids of all the flakes would be wonderful."
On 2026-11-23 the ledger read 1 flaky play in 15 (5 windows 1/5, 3 and 1
windows 0/5), F6 woke three times, all in the order run at 5 windows,
and F7 once.

## Decisions

1. The search publishes the query its rows answer (`data-search`:
   open, answered, rows, empty); `searchFor` waits on that.
2. The entry save publishes how many saves are pending
   (`data-saves-pending`: a debounce running, each write until it lands
   or fails); the save wait reads that, not 650 ms since the last edit.
3. `THROTTLE=n` slows every page's CPU n times through CDP, so a step
   that waits on a clock reads otherwise every play instead of now and
   then; the tool for finding the rest.
4. Search reopened keeps its query with the caret at its end, so what
   is typed adds to it (B9, the reader's pick: "if you want to modify /
   add to an existing search, you can just keep typing"); a reading in
   the launch section holds it.
5. ⌃⌘Enter on a search result picks it, as Enter does (the reader's
   yes).

## Record

- 07:14 U19 added, with U19.1 (F6), U19.2 (F7), U19.3 (`rest()`).
- 07:17 `entrySave.test.ts`: the saves pending told as they change; the
  session publishes them.
- 07:19 `searchActs.test.ts`: a typed query stands unanswered until its
  scan has run; the load's reanswer answers it; `searchShown` in
  `searchModel.ts`, published from `Search.svelte`.
- 07:20 F6's section alone, 20 plays under ten CPU hogs: 0 of 20 missed
  (`tools/out/f6-stress.sh`). Its window of the order run (`ORDER=reverse
  SHARD=1/5`, 15 sections) under eight hogs: 0 of 5 before it was
  stopped. Load alone did not reproduce it.
- 07:24 `THROTTLE=4` on the section: F6 on the first play, its new
  reading saying why: the box held "outsideoutside". The search keeps
  its query; ⌃⌘K reopened it with "outside" and the caret at its end,
  drawing that query's hits at once; the second pass typed "outside"
  after it. The old wait for any `.hit` caught the reopened query's rows
  before the 150 ms scan of "outsideoutside" cleared them: F6 was the
  plays where the scan came first. `searchFor` now replaces the query
  the box kept, and waits on the answer.
- 07:27 So the 2026-11-23 record's "in the search box it neither picks
  the result nor follows" (follow-link plan, A21) was read off the same
  race: with a real hit, ⌃⌘Enter on a result picks it, as Enter does
  (`listKey` takes a modified Enter as Enter), and follows no link.
- 07:28 Both save rules read at each of the 229 save waits of one whole
  corner run (a temporary two-rule wait; `tools/out/measure.jsonl`): the
  650 ms guess never read landed with a save pending; the pending count
  was never later; together 42.6 s of waiting against 69.4 s. 27 waits
  the count passed at once within 650 ms of a key or a click.
- 07:30 The count in, the guess and its edit clock gone; the corner at
  1x in 5 windows (`tools/heliumThrottle.ts 1`): only the ⌃⌘Enter
  reading differs from the approved copy, 65 s.
- 07:33 The corner at 4x in 5 windows: "picture" and "column marks"
  read otherwise besides it.
  - "a picture pasted, then another entry at once": the decode came
    before the step's navigation. The step now holds the page's decodes
    (`holdDecodes`) until it has navigated; so does "a picture pasted,
    then Search typed in", where an 800 ms delayed decode and a 2 s
    sleep stood.
  - "a paired line's English into the next line's Latin" (F4): alone it
    read right at 4x, 6x and 10x (5 plays) and in its own window at 4x.
    Each drag after the first starts with "Reference copied to
    clipboard" standing, which moves the text 50 px down (the editor's
    top 176 without it, 226 with it); when its time runs out mid-drag
    the text moves up, and the drag ends two lines low, as F4 read.
    `aimable` closes the info and success alerts and settles before a
    point is measured: the drags, and the measured clicks in keys and
    filing.
- 07:39 F2's guess, ProseMirror's 20 ms focus timer writing its
  selection back over one a script placed after Escape: placed with no
  wait, 3 of 3 stood at 1x and at 10x. Not shown; F2 stays on watch.
- 07:45 `rest()`'s 574 calls in a whole corner run, counted under
  `TIMING=1`: the 100 ms ended 6 before two frames at 1x, 5 at 4x, every
  section reading as approved in both. The throttle slows the frames
  and the timers alike; `rest()` is not where the flakes came from, and
  its sites stay as they are, the count kept. The bridge and the reader
  at 4x: as approved.
- 07:47 The whole verdict: the corner differed only in the ⌃⌘Enter
  reading; order, bridge and reader ok. Approved.
- 07:52-07:57 Five whole plays of the committed tree at 5 windows
  (`node tools/heliumRate.ts`): 0 of 5 read a section otherwise, 77-80 s
  each; on 2026-11-23 at 5 windows, 1 of 5, 86-90 s.
- 10:15 B9 and ⌃⌘Enter decided (4, 5). "Search reopened and typed in"
  played alone: `{"value":"outside sky","caret":11,"end":11}`.
- 10:18 `/code-review high f7d619b..8c721b0` (A26): 1 important, 8 nits;
  124,415 tokens (input 2, cache creation 3,306, cache read 116,933,
  output 4,174).
  - 1, the save wait reading early after a write not through the entry
    save (important): its case does not stand, the create writing before
    it moves the hash (`src/ui/lifecycle.ts:491`). Probed: after each
    "landed", 700 ms watched for a write opening. 229 of 230 quiet at 1x
    and 203 of 230 at 4x; every late one at the section start's seed
    check, the one named the search index's (`gesta.v1.index:texts`),
    none after a gesture. Not changed.
  - 2, a hand-over stopping a deleted entry's debounce left one pending:
    shown by its test, fixed.
  - 3, a save that throws as it is made: does not stand, the store's
    call runs inside `.then` (`src/store/entries.ts:219`).
  - 4, `searchFor` pressing ⌘A with the box unfocused: it now says so and
    types nothing. 5, a search wait that runs out answers null.
  - 6, the throttle tool: builds first; stderr inherited.
  - 7, the ledger's tree: everything outside docs/, read as the play
    starts. 8, each wait that ran out counted by what it waited for, each
    such line now "<a thing>'s wait ran out".
  - 9, the search shape in two places: `adapters/searchShown.ts`, held to
    the app's by `heliumSearch.test.ts`.
- 11:05 F4's cause probed (`tools/out/f4probe.sh`): its drag played three
  ways, three times each: the alert standing throughout, closed between
  the aim and the drag, and `aimable` first. All 9 selected as approved.
  The forced close moved nothing: "Reference copied to clipboard" alone
  leaves the editor's top at 176; the 226 at 07:33 was with "12 entries
  stored" standing too. F4's cause stays unshown; it stays on watch.
- 11:10 The reader: "it feels brittle if we're failing tests because of
  pixel position. I'd far rather be measuring state than appearance."
  Steps that aimed the mouse only to place a selection now set it
  (`R.selectFrom`, over `adapters/textPoint.ts`): column marks' five
  drags, keys' Horace click and its four word clicks, filing's two
  heading clicks, the shelf's double-click. Kept as mouse gestures, the
  gesture being what is read: the click below a table (`aimable` kept
  for it), the drag out of the Line box, the click outside a menu, the
  format toolbar's double-click (the toolbar places on mouseup), the
  wheel scrolls, the click low in the source view; "the entry's top"
  checks layout. Each changed section played alone reads as approved.
  - The text is searched across nodes, since an earlier selection's
    marks split the words; a first mapping put a point between two
    nodes at the earlier one's end, and the shelf's rename ran across the
    block before. The rule, pinned: the later node's start unless the
    point closes its needle.
- 11:21 `/improve-codebase-architecture tools/out/arch-files.txt` (A26.1),
  25 files: six candidates, 1 and 2 Strong (one mapping from the text to
  a selection; one module for the waits on the page's state), 3-5 Worth
  exploring, 6 Speculative. The walk: 171,639 tokens (input 2, cache
  creation 5,897, cache read 158,488, output 7,252). Checked before the
  report: `waitSearchRows` still waits on any row (app.ts:433, views.ts
  187 and 198); a hand-over's write is not told as pending
  (entrySave.ts:114-117).
- 11:40 Candidates 1 and 2 grilled (Q1-Q15, all yes): 1 first, its own
  commit; 2 after, its sweep before its forms.
- 12:05 Candidate 1 (A26.1.1): `textPoint.ts` owns the mapping, the
  editor's text in blocks of pieces and two points in, two landings or
  none out; four node tests from the real splits (marks splitting "o et
  praes", the caret closing "Sean Miller", a needle only across two
  cells, a point past its block). In the page, the text nodes grouped by
  their nearest ancestor not laid out inline; `selectFrom`,
  `selectBetween`, `caretAfter` (so `caretAt`), `caretBefore` and
  `wordAt` all through it, a missing needle failing its step by name.
  Carets set without focusing the editor, selections with it, as before.
  The whole corner at 1x in 5 windows: 0 sections read otherwise.
