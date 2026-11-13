# Code health 10, and held there

## Why

Asked 2026-11-11: every file's CodeScene Code Health at 10, and no later
change lowering one; the check run automatically on new and changed code,
the Stop hook looping until the suite is green and the score held.

## Measured before choosing (2026-11-11)

- The CodeScene CLI ships inside the MCP install,
  `~/Library/Caches/codehealth-mcp/MCP-1.5.20/cs` (cs 1.0.58). Outside the MCP
  it was not signed in; the reader signed it in with `cs auth login` (OAuth,
  credentials under `~/.codescene/credentials`).
- `cs delta HEAD~1 HEAD` over 92b3ea9 (17 files): 5.1 s. `cs review` over the
  105 non-test files under src/: 12.1 s, 6 cores; the 14 `.svelte` files
  refused, "Unsupported file-type".
- CodeScene's strict delta (`--error-on-warnings`, any worsened issue) over the
  last 20 commits touching src/: 19 flagged, 1 unreadable. It flags a worsened
  issue whose file's score did not move (lifecycle.ts 5.83 → 5.83, 92b3ea9).
- The baseline, below: src/ 90 scored files — 23 at 10, 28 at 9–9.9, 39 at
  4–8.9, none red; 67 below 10, 12,933 lines. src/ tests 88 — 75 at 10, 13
  below (lowest 8.03). tools/ 75 — 36 below 10, 2 red (lowest 3.25), outside
  this plan.
- The string smells, Primitive Obsession and String Heavy Function Arguments:
  both off took keys.ts 9.09 → 9.68, names.ts 8.54 → 9.09, search.ts 8.41 →
  8.95, grammar.ts 8.09 → 8.61. A plain alias, `type Text = string` over keys.ts's
  19 `string` parameters, cleared both, 9.68; a branded type the same.
- A rules file `.codescene/code-health-rules.json` with a rule set matching one
  path applies to text given on stdin under `--file-name` (grammar.ts 8.61 under
  it, keys.ts 9.09 outside it).
- The Stop hook's checks today: tsc 0.6 s, the suite 4.4 s.

## Decided (the reader, 2026-11-11)

1. The gate: a changed file may not score below its HEAD copy, a new file
   must score 10 — so a file at 10 stays at 10, and once the climb ends it is
   "everything stays 10". Not "a touched file must reach 10" (the climb would
   land wherever work lands), not CodeScene's strict delta (19 of 20).
2. Scope: src/, its tests included. `.svelte` is not scored.
3. The string smells: a branded type where two kinds of string meet (a day, an
   entry key, a tag, a file name); a waiver by path in
   `.codescene/code-health-rules.json` for a pure text transform, where every
   argument is a line or a text and nothing else could be mixed up with it, its
   reason recorded below; never a plain alias.
4. The loop: the Stop hook runs `npm run test:health` after tsc, the suite and
   the comment checker, and refuses the stop until all pass. A CLI that cannot
   measure lets the stop through (`--warn-unmeasured`), else a lapsed sign-in
   would block every turn with nothing the agent can fix; `verify`, and so the
   pre-commit, runs it without the flag.

## The checker

`tools/codeHealth.ts` (pure: the files in scope, the git status read, the
refusal, the findings' lines, the cache key) and `tools/codeHealthRun.ts`
(the run): each .ts file under src/ that differs from HEAD — modified, new,
untracked, renamed (scored against its old name) — scored now and at HEAD,
both by stdin under the file's path so a waiver applies to both; scores
cached under `tools/out/code-health-cache.json` by text, path, rules and CLI
version (a rerun 0.12 s). Played 2026-11-11: a clean tree; a comment added to
refile.ts (9.68 → 9.68, passes); keys.ts copied as a new file (9.09, refused,
its three smells named); a nested function added to codeHighlight.ts (10.00 →
8.28, refused, four smells named); a missing CLI (exit 1, exit 0 with
`--warn-unmeasured`). NOT played: a signed-out CLI — HOME moved did not sign
it out. The three files score 10.

## The climb

Batches by directory, the pure ones first, each one's tests the net and the
Helium approved run the fence that behaviour did not move: src/model/, then
src/store/, then src/editor/'s modules without a DOM, then src/ui/'s models,
then the DOM seams (main.ts, session.ts, editor.ts, paste.ts, renderedView.ts,
sourceView.ts) under the review shape. Each batch: refactor, `npm run verify`,
the reader's look and accept, a review where a batch touches a seam.

### Decided again (the reader, 2026-11-11, after src/model/)

5. Branded keys after the structural work, as a batch of their own
   (superseded by 6 the same hour).
6. Primitive Obsession and String Heavy Function Arguments OFF for `src/**`,
   one rule set, the per-file waivers below folded into it; every structural
   rule at CodeScene's default. Measured first: the TypeScript thresholds
   (`cs rules-config list-thresholds`) put Primitive Obsession at 30% of a
   file's functions taking any plain type, string, number or boolean;
   HEAD's headings.ts plus one function taking only a Node went 9.68 → 9.38,
   String Heavy set off; importFiles.ts with every complex function split
   went 9.39 → 9.38, flagged at 44% of functions and 41% of arguments
   strings. Ten under the defaults meant branded line numbers and positions
   as well as keys across most of src/. Branded keys now stand only on their
   merits as a safety change.

### Waivers (string smells), folded into decision 6

`.codescene/code-health-rules.json`, a rule set per file (the CLI's
`set-rule` edits a rule set that exists and cannot add one, so the file is
written by hand and checked with `cs rules-config validate`):

- `src/model/grammar.ts` — Primitive Obsession and String Heavy Function
  Arguments: every argument is a markdown line, the text's lines, a position
  in them or a backtick run; nothing else could be passed for one.
- `src/model/serialize.ts` — Primitive Obsession: every string argument is
  markdown being written (a marker, a mark's inner text, a cell, an indent),
  every number a count or a line number.
- `src/model/parse.ts` — Primitive Obsession: the text's lines, a position in
  them and the token sink.

### The baseline, 2026-11-11

#### src/, not tests: 67 files below 10

| Score | File | Smells |
|---|---|---|
| 4.43 | `src/editor/reference.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity, Primitive Obsession |
| 4.99 | `src/main.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Primitive Obsession |
| 5.06 | `src/editor/rowKeys.ts` | Bumpy Road Ahead, Code Duplication, Complex Conditional, Complex Method, Overall Code Complexity |
| 5.46 | `src/model/parse.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession |
| 5.83 | `src/ui/lifecycle.ts` | Complex Conditional, Complex Method, Large Method, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 5.92 | `src/editor/paste.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession |
| 6.21 | `src/store/reference.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 6.59 | `src/session.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Primitive Obsession, String Heavy Function Arguments |
| 6.81 | `src/ui/gotoModel.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 7.00 | `src/editor/typing.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity |
| 7.03 | `src/editor/fit.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession |
| 7.10 | `src/editor/numbering.ts` | Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession |
| 7.52 | `src/store/move.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 7.56 | `src/editor/quoteKeys.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity |
| 7.56 | `src/store/plans.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity |
| 7.66 | `src/model/flatten.ts` | Complex Conditional, Complex Method |
| 7.77 | `src/editor/format.ts` | Complex Conditional, Complex Method, Overall Code Complexity |
| 7.80 | `src/model/serialize.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity, Primitive Obsession |
| 7.86 | `src/store/lists.ts` | Bumpy Road Ahead, Complex Method, Excess Number of Function Arguments, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 7.90 | `src/editor/dualLanguage.ts` | Complex Conditional, Complex Method, Overall Code Complexity |
| 8.03 | `src/editor/goto.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity |
| 8.03 | `src/editor/folds.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity |
| 8.06 | `src/store/io.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Overall Code Complexity |
| 8.07 | `src/store/entries.ts` | Complex Conditional, Complex Method, Overall Code Complexity |
| 8.09 | `src/store/backup.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Overall Code Complexity |
| 8.09 | `src/model/grammar.ts` | Bumpy Road Ahead, Complex Method, Deep, Nested Complexity, Primitive Obsession, String Heavy Function Arguments |
| 8.41 | `src/store/search.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Primitive Obsession, String Heavy Function Arguments |
| 8.48 | `src/editor/continuations.ts` | Complex Method, Overall Code Complexity |
| 8.50 | `src/store/bundle.ts` | Complex Conditional, Complex Method, Overall Code Complexity |
| 8.51 | `src/ui/viewCarets.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments |
| 8.54 | `src/store/names.ts` | Complex Method, Overall Code Complexity, Primitive Obsession, String Heavy Function Arguments |
| 8.54 | `src/ui/subEntries.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments, Primitive Obsession, String Heavy Function Arguments |
| 8.59 | `src/editor/editor.ts` | Complex Conditional, Complex Method, Overall Code Complexity |
| 8.67 | `src/store/contents.ts` | Complex Conditional, Complex Method, Excess Number of Function Arguments |
| 8.81 | `src/store/links.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments |
| 8.86 | `src/editor/sourceKeys.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method |
| 8.95 | `src/editor/lineNumbers.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method |
| 8.95 | `src/store/bookmarks.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, String Heavy Function Arguments |
| 8.95 | `src/ui/searchModel.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments |
| 9.09 | `src/editor/placeKeeper.ts` | Complex Conditional |
| 9.09 | `src/store/keys.ts` | Complex Method, Primitive Obsession, String Heavy Function Arguments |
| 9.09 | `src/ui/notices.svelte.ts` | Complex Method, Primitive Obsession, String Heavy Function Arguments |
| 9.17 | `src/editor/surface.ts` | Complex Conditional, Complex Method |
| 9.19 | `src/store/shelves.ts` | Bumpy Road Ahead, Complex Method |
| 9.24 | `src/editor/renderedView.ts` | Complex Conditional |
| 9.24 | `src/ui/mastheadModel.ts` | Bumpy Road Ahead, Complex Method, Excess Number of Function Arguments |
| 9.31 | `src/model/fenceRefusals.ts` | Complex Method |
| 9.38 | `src/editor/gridKeys.ts` | Complex Conditional, Complex Method |
| 9.38 | `src/editor/listKeys.ts` | Complex Conditional |
| 9.38 | `src/editor/sourceView.ts` | Complex Conditional |
| 9.38 | `src/store/foldState.ts` | Complex Conditional, Complex Method |
| 9.39 | `src/store/importFiles.ts` | Complex Method |
| 9.40 | `src/store/nav.ts` | Bumpy Road Ahead, Complex Method |
| 9.48 | `src/store/searchIndex.ts` | Bumpy Road Ahead, Complex Method |
| 9.60 | `src/model/schema.ts` | Complex Method |
| 9.66 | `src/store/store.ts` | Complex Method |
| 9.68 | `src/editor/folios.ts` | Complex Conditional |
| 9.68 | `src/editor/highlight.ts` | Complex Conditional |
| 9.68 | `src/editor/margins.ts` | Complex Method |
| 9.68 | `src/model/tokens.ts` | Complex Method |
| 9.68 | `src/store/exportEntries.ts` | Complex Method |
| 9.68 | `src/store/headings.ts` | Complex Conditional |
| 9.68 | `src/store/refile.ts` | Complex Method |
| 9.68 | `src/store/zip.ts` | Excess Number of Function Arguments |
| 9.68 | `src/ui/clipboard.ts` | Complex Method |
| 9.68 | `src/ui/bookmarksModel.ts` | String Heavy Function Arguments |
| 9.68 | `src/ui/naming.ts` | Complex Method |

#### src/ tests: 13 files below 10

| Score | File | Smells |
|---|---|---|
| 8.03 | `src/ui/lifecycle.test.ts` | Code Duplication, Complex Conditional, Excess Number of Function Arguments |
| 8.28 | `src/editor/paste.test.ts` | Complex Conditional, Primitive Obsession, String Heavy Function Arguments |
| 8.41 | `src/editor/reference.test.ts` | Bumpy Road Ahead, Complex Conditional, Complex Method, Excess Number of Function Arguments, Primitive Obsession, String Heavy Function Arguments |
| 8.79 | `src/store/io.test.ts` | Complex Conditional, Complex Method, Primitive Obsession, String Heavy Function Arguments |
| 8.81 | `src/editor/placeKeeper.test.ts` | Code Duplication |
| 9.09 | `src/editor/editor.test.ts` | Complex Conditional, String Heavy Function Arguments |
| 9.38 | `src/editor/folds.test.ts` | Complex Conditional |
| 9.68 | `src/editor/gridKeys.test.ts` | Complex Conditional |
| 9.68 | `src/editor/format.test.ts` | Complex Conditional |
| 9.68 | `src/editor/insertLink.test.ts` | Complex Conditional |
| 9.68 | `src/editor/quoteKeys.test.ts` | Complex Conditional |
| 9.68 | `src/editor/typing.test.ts` | Complex Conditional |
| 9.68 | `src/store/pick.test.ts` | Complex Conditional |

## Record

### 2026-11-11 — src/model/

Every file at 10, its six tests already there (13 of 13, MEASURED):

| File | Before | After | What changed |
|---|---|---|---|
| tokens.ts | 9.68 | 10 | the language lookup and the matched group's class split out of `tokenize` |
| schema.ts | 9.60 | 10 | a row block's attributes read and drawn by two functions, not inline in `rowBlock` |
| fenceRefusals.ts | 9.31 | 10 | the 11-arm ternary of `fenceLineReason` an ordered list of reasons over one read of the opener |
| flatten.ts | 7.66 | 10 | the two flatteners share one collector; a footnote mark's start a named test |
| grammar.ts | 8.09 | 10 | the opener tests lists of regexes; `fenceBody` split into the code fence, the rows and a note inside them; waiver above |
| serialize.ts | 7.80 | 10 | the mark and block writers tables; the longest mark, a row, the opener's numbers and an item's continuation named functions; waiver above |
| parse.ts | 5.46 | 10 | the token walker a builder over tables (complexity 71 before); the block arms an ordered list; the list levels a writer; waiver above |

HEAD's scores under the waivers: grammar.ts 8.61, serialize.ts 8.05, parse.ts
5.62. The nets: tsc, the suite (1437), the corpus round trip over the backup
(17,347 files; its report identical to HEAD's but for the time, 61 round trip
differs in both), `npm run verify` with the Helium runs played (corner, bridge,
reader ok; 544 steps, 0 open). One moved comment failed the standard
(serialize.ts's grid: "which the parse refuses", another module's refusal) and
lost the clause.

### 2026-11-11 — src/store/

Every file at 10, 64 of 64 with its tests (MEASURED), under decision 6. The
shapes the fixes took: a long function cut into named steps sharing one
context object (the backup run, the move plan, the reference label, the
entry layer's write paths, inside their factories where they read its
state); a compound condition named or split; a five- or six-argument
function given one object for the arguments that travel together, its
callers following:

| Function | Was | Now |
|---|---|---|
| referenceLabel | (date, tag, range, folio, journal, facing) | (date, tag, { range, folio?, facing? }, journal) |
| retargetLinks | (md, oldHref, newHref, oldLabel, newLabel) | (md, { href, label }, { href, label } \| null) |
| relabelLinks | (md, href, sub, oldHeading, heading) | (md, href, sub, { was, now }) |
| searchHits | (hay, needle, left, right, limit?) | (hay, query, limit?) |
| subPageOrder, subPageNeighbors, navNeighbors | keys and bearing apart | one `Walk` { keys, bearing } |
| backupPlan | (today, lastDated, sig, lastSig, oursLast) | (today, sig, { dated, sig, ours }) |
| writeBundle | (dir, files, manifest, day, written) | (dir, files, manifest, { day, written }) |
| emitZipEntry | (path, raw, stored, day, at) | ({ path, raw, stored }, day, at) |

Callers outside src/store/: session.ts (navNeighbors, subPageOrder),
ui/gotoModel.ts, ui/lifecycle.ts, editor/highlight.ts, editor/reference.ts,
tools/referenceCorpus.ts; the 61 referenceLabel calls in its test rewritten
by an argument parser, the rest by pattern, each count checked.

Read on the way: refile.ts's mayName first came out building every match
before testing one, losing the early exit 59331c8 measured (1,338 ms to 28
ms); put back as a loop that stops at the first hit. The nets: tsc, the
suite (1437), `npm run verify` with the Helium runs played (corner, bridge,
reader ok; 544 steps, 0 open); the comment ledger's 25 moved blocks read,
all keeping to the standard, one gaining "nothing is swept" for what its own
function now does, two merged on withFirst; the 32 tests whose call shape
changed read, their assertions untouched.

### 2026-11-11 — src/editor/

Every file at 10, 65 of 65 with its tests (MEASURED); 34 were below. The
largest: editor/reference.ts 4.56 (wordEdges cc 31, blockPassage 26),
rowKeys.ts 5.06 (enterInRow 32, Backspace and Delete duplicated), paste.ts
6.09, typing.ts 7.00, fit.ts 7.25, numbering.ts 7.32 (blockUnits 30),
quoteKeys.ts 7.56 (shiftTabInQuote 29), continuations.ts 8.48 (place 36).
Shapes as in src/store/, and two of their own: Backspace and Delete made one
edge command in two directions; a measuring pass split into its reads and
its writes, every read still before every write and inside the measuring
class.

Signatures changed, callers following: coveredUnits, referenceRange and
passageMd take their trailing flags as an options object (a three-argument
call unchanged); referencePayload takes the entry as `{ date, tag }`
(callers in session.ts, tools/bookshelfQuotes.ts, two tests' files);
landingWord takes `lineHits`'s `{ hits, blocks }` (main.ts); wrapIn its
attributes and join test as options. The test calls rewritten by an argument
parser (scratchpad recall.py), one spread call by hand; the scratch files
under tools/out that tsc reads kept compiling the same way.

Read on the way: continuations' block step returns the carry unchanged for a
block with no rest, as the loop's early return left it; format's and the row
commands' `dispatch?.(build())` build nothing without a dispatch. The nets:
tsc, the suite (1437), `npm run verify` with the Helium runs played (corner,
bridge, reader ok; 544 steps, 0 open); the ledger's 48 blocks read, two new
comments that only restated their code removed (placeKeeper.test's helper,
sourceKeys' quote table), two merged on the step they describe; the 46 tests
whose code changed read, their assertions untouched.

### 2026-11-11 — src/ui/, session.ts, main.ts

177 of the 178 scored .ts files under src/ at 10, tests included (MEASURED);
the one left is main.ts, 5.13 → 6.92. The batch: lifecycle.ts 6.19 → 10
(relocate cc 45 cut into stages over one relocation: the plan with its
pictures and texts, the take-back, the link rewrite and its tally, the old
keys cleared, the arrival; create and extract sharing one prompt-and-read),
gotoModel.ts 7.23, session.ts 7.00, viewCarets.ts 8.51, searchModel.ts 8.95,
subEntries.ts 9.09, mastheadModel.ts 9.24, clipboard.ts, naming.ts,
notices.svelte.ts 9.68, lifecycle.test.ts 8.03 (its world built from small
fakes) — all to 10.

Signatures changed, callers following: gotoPick takes the entry and the pick
as two values, subLevel what is wanted as one; scopeOptions the keys, journal
and shelves page as one; crossViewOffset `{ toSource, pastTail }`;
mastheadModel `{ keys, journal, today }`; moveConfirm the entry as one value,
refiledText and movedText one MoveOutcome.

MAIN.TS STOPS SHORT: its compound conditions and long handlers fixed, it then
reads Code Duplication over 26 functions, most of them untouched (readBackups,
acts.sweep, renderSearch, openRow, acts.panel) and none reported at HEAD — the
smell latent, as the string rule was, surfacing as the others clear
(INFERRED). The CLI names the functions but not the pairs. Ten there likely
means main.ts's 1,500 lines of wiring split into modules — the bookmarks
card, the line bar, the replace bar, the copy button, the format bar, import
and export — a design change for a batch of its own. CodeScene's function
names in this file are off: an anonymous `acts.x = () =>` handler is reported
under the named function above it (`acts.replace.open` read as 5 arguments,
`edit`'s count).

The nets: tsc, the suite (1437), `npm run verify` with the Helium runs played
(corner, bridge, reader ok; 544 steps, 0 open); the ledger's 33 blocks read,
two new comments removed (one restating its code; one explaining a
`boolean | null` answer, the answer made `"there" | "switched" | "refused"`
instead); the 15 tests whose calls changed shape read, their assertions
untouched.

### 2026-11-11 — main.ts split (the reader: "Split main.ts, then review")

main.ts 6.92 → 10.00, 1,534 lines → 559 (MEASURED, `cs review`, `wc -l`).
Eleven modules under src/ui/, each a factory over a deps object that main.ts
builds, the moved body kept verbatim where it scored and cut into named steps
where it did not: searchActs, gotoActs, lineBarActs, replaceActs, bookmarkActs,
formatBarActs, copyButtonActs, folderActs, panelActs, backupsPanelActs, and
heldKeys (the held-key guard made a pure `swallows` over the code, the repeat
and the focused element, under test, with `listenHeldKeys` the DOM's half); and
in src/store/pictures.ts `pictureMoves`, the lifecycle's three picture ports
over the image store, under test. The chords are a table; the entry-shown
handler two named steps. Every new file scores 10 on its first commit.

THE DUPLICATION FINDING IN A WIRING FILE: main.ts read Code Duplication over
five "functions" after the moves (the session's, the lifecycle's and the
folders' deps objects, the warm's callback, the key listeners), and removing
any ONE of the five cleared it, while removing any single line inside one did
not (MEASURED, a scored copy per removal). Naming the warm's callback in four
steps made it worse, 8.81 over seven, and was reverted; a comment added inside
the session's deps object pulled the entry-shown steps into the set. The
finding behaves as a threshold over many short call sequences, not as a pair
of copied blocks (INFERRED). main.ts sits at 10 just under it: a new handler
written in main.ts may tip it, and the ratchet will say so; the cure is the
one used here, the handler in a module of its own.

The comment ledger, 61 blocks, read against the standard with the moved-comment
re-read: five moved comments spoke of another module's mechanism and were cut
to their own code — the export's "the sweep belongs to the backup tiers", the
import's description of what the session's refresh repaints, the search's
"kicked off after the warm" and "a real navigation drops its query" (both
main.ts's now), the progress line's retirement (now its pin,
`notices.test › a newer progress retires the older handle`); the centring's
frame moved into lineBarActs with its MEASURED comment (`centreSoon`,
`landSoon`), the frame having been main.ts's. One comment found stale and cut:
the Go to row's "No save flush: it would rewrite an untouched entry", over the
`flushSave()` that aa3a4f3 added (READ; `flushSave` writes only with a save
pending).

THE SPLIT'S ONE REGRESSION, caught by the corner run (MEASURED, verify exit 1,
five readings changed): main.ts handed folderActs `win.showDirectoryPicker`
as a value at launch, where it had read it at the click. The steps install
their picker after the launch, so export and import found none ("pickers":0,
the import's refusals unsaid), and in a real browser the method called off
`window` would have been an illegal invocation (INFERRED, not played). The
picker is now a getter bound to `window`, read at the click, and the backups
panel's `canPick` read at each read of the panel as it was. No other deps
member holds a value read at launch that main.ts read at use (READ: every
`screen.*` part handed over is mutated in place, never reassigned).

The nets after the fix: tsc, the suite (1445, eight new: `pictureMoves` and
`heldKeys`), the comment ledger recorded as read, the titles check, the code
health gate (15 files, main.ts 6.92 → 10, every new file 10), the hooks'
self-test 46/46, and the Helium runs played (corner, bridge, reader ok; 544
steps, 0 open; 399 fields decided, 0 open) — MEASURED, `npm run verify` exit 0.

### 2026-11-12 — the review of the whole climb (6840333..0d35cd7)

One `/code-review` at HIGH over five commits, 113 files, as decided: 414,844
tokens (MEASURED, the last message of `agent-abe739057cb17f3d2.jsonl`: 2 input
+ 2,035 cache creation + 409,548 cache read + 3,259 output). No correctness
regression found, every extracted function read against what it replaced; ten
findings, every one read against the code and held (READ), all ten fixed in one
commit:

1. `codeCloses` copied the rest of the lines on every code fence in a `:::`
   body: a loop again, stopping at the close.
2. `sectionEnd` copied the tail of the heading list on every `##`, rerun on
   every change with folds on: a loop again.
3. The root's `--client-w` observer had moved into the copy button's factory,
   where only the factory's being built kept the grid's break-out: back in
   main.ts. 4. Its comment re-read there, cut to its own code.
5. session.ts kept its own ⌃⌘ test beside `plainChord`: it imports it; the
   chord comment's "⇧ and ⌥ excluded" left with the line it described.
6. Four reads of the masthead's bottom, two forms (`?? 0` clamped, `|| 0`):
   one, `ui/mastheadBottom.ts`, the clamped form, the format bar keeping its
   element for its observer.
7. `acts.search` and `acts.lineBar` filled by a hand-written list over no-op
   stubs: the factory's whole result, as replace's.
8. Three count-and-plural helpers: one, `ui/counted.ts`, in folderActs,
   backupsPanelActs and subEntries.
9. `isRowBlock` and `isNote` twice each: exported once from schema.ts.
10. main.ts's second `Ns` and a `Walk` beside store/lists.ts's unrelated one:
    `Ns` exported from panelActs, main.ts's `WalkDir`.

None is a mechanical class a grep would hold (READ), so no checker is owed. No
finding changed behaviour but the masthead's clamp at 0, which a sticky bar's
bottom never goes below (INFERRED), so no confirmation pass is owed.

## tools/ (2026-11-12)

Asked: "Everything under src/ is at 10. The overall score is 9.23, brought down
by tools/ ... let's run the same process to get tools/ also up to CodeHealth
10." Decided by the reader the same day: the gate covers tools/'s .ts and .mjs
scripts too, not tools/out; Primitive Obsession and String Heavy Function
Arguments off for tools/** as for src/**; a batch at a time, committed on the
reader's word, one `/code-review` at HIGH after the last.

THE BASELINE (MEASURED, `cs review` over the 111 tracked .ts and .mjs scripts):
72 at 10, 38 below, helium-probe.mjs unscored; with the string rules off for
tools/, 37 below, 213 function findings. The worst: shelfLines.ts 3.42,
helium-steps.mjs 3.48 (2,941 lines, 29 findings, among them Large Method and
Number of Functions in a Single Module), commentRules.ts 5.55, quoteMarks.ts
6.69, harvardMilton.ts 6.89, stageDirections.ts 7.21.

THE NET for the run scripts, which have no tests of their own: every
`*Run.ts`, corpus.ts and importCorpus.ts played under a scratch HOME holding
a frozen copy of the backup and of `~/Desktop/gesta-imports` (each script's
default output is a Desktop folder it clears, so the real one is never
touched), once from a worktree of HEAD and once from the tree being changed,
the outputs and logs compared with their clocks masked. Two HEAD passes come
out identical (MEASURED). Of the 28, 16 run to their end over the backup; six
the backup already holds stop at their guard ("the backup has these
already"), so a second pass plays them over a copy without those pages, where
all six run to their end; six stop where HEAD stops, their work done in the
backup (a passage already set right, a reading the backup no longer has), and
are compared on that path alone. corpus.ts is compared with `--writer` too,
the only path that reaches its text diff.

### Batch 1 — the checkers

The gate's scope (`inScope` in tools/codeHealth.ts) widened, its test first;
the rules file a second rule set for tools/**, validated by the CLI.
commentRules.ts 5.55 → 10: the JavaScript comment scanner, one loop of
43 branches, made a lexer of steps over one state, tried in the old order (a
comment, a string, a template, a regex, the rest), the string and block ends
shared with the CSS scanner; a pin's resolver a function per kind; the
other-module test its three collectors; the block join a named predicate.
unusedExports.ts 9.12 → 10 and its test 9.68 → 10: the three import readers
and the per-file check apart. corpus.ts 8.95 → 10: the line resync and the
common prefix apart. The nets: the self-tests (commentRules 47, unusedExports
3, the live check over the tree finding the same allowed list); the comment
checker's sweep and its ledgers of the last six commits identical to HEAD's;
the corpus report identical with and without `--writer` (MEASURED).

### Batch 2 — the text transforms and their run scripts

29 files to 10 (MEASURED, `cs review`): shelfLines.ts 3.42, quoteMarks.ts
6.69, harvardMilton.ts 6.89, stageDirections.ts 7.21, bookshelfQuotes.ts 7.76,
elisions.ts 7.9, fencedProse.ts 7.96, miltonPoems.ts 8.35,
orgReferencesRun.ts 8.42, orgReferences.ts 8.55, hwaetTexts.ts 8.59,
quoteJoins.ts 8.67, miltonMasks.ts 8.82, miltonSonnets.ts 8.95, pipeTables.ts
9.01, miltonCaps.ts 9.09, orgDrawersRun.ts and speechGaps.ts 9.24,
htmlTags.ts, miltonPoemsRun.ts and spokenItalics.ts 9.38, wyattPages.ts 9.51,
miltonSamsonRun.ts 9.6, elisionsRun.ts, harvardStrips.ts, hwaetTexts.test.ts,
shelfLinesRun.ts and speechMarks.ts 9.68, beowulfWyatt.ts 9.84; seven more
changed at their calls alone, held at 10.

The shapes: a function of many branches made an ordered list of rules, each
its own function, the first that answers deciding, in the old order
(elisions, the spaced quotation mark, a link's resolver, the Harvard line's
verdicts); a scan's closures lifted to functions over one state (shelfLines'
run search, its letter-by-letter follow, its joins and speakers,
withinQuotation, the play's directions, Thurber's outline). Four signatures of
five arguments made smaller: `readLine(a, b, { witness, known, n })`,
`referenceAt(index, key, { from, to, …cut })`, `findLine(…, { first, last })`,
and `quotedProse` with no fifth argument, `quotedProseByEnds` its other mode;
every call rewritten by a parser, an untracked scratch file under tools/out
among them. One slip, caught by the self-test: `carried`'s loop read a line
before checking it was in range (the original checked first), and failed
three tests until put back in order.

THE NET widened for shelfLines.ts, whose Milton run makes 35 runs references:
a third pass, the shelf lines run over every author on the shelf, 1,514 runs
in 816 entries from HEAD, 808 s (MEASURED). The comparison masks the clocks,
the repo's path, and a stack trace's frames and source excerpt, the error's
message compared: a refactored file's throw comes from another frame.

The nets: the transforms' self-tests (the suite, 1,445); the test titles read,
eleven whose calls changed shape, one assertion restored that the rewrite had
made compare a call with itself (an empty cut against none), the ends test
renamed for its function; and the three passes from the changed tree against
HEAD's — A and B identical, C's 816 entries and its 2.3 MB review page
identical byte for byte, its summary line differing in the output folder's
name alone (MEASURED).

### Batch 3a — the Helium files made TypeScript

Asked, on the reader's question whether there was a reason the Helium files
were still .mjs: no decision in the record said so (READ, the plans grepped),
node had run .ts here since phase 0, and the .mjs files were the only code no
type checker read — tsconfig.json includes tools/ but sets no allowJs
(MEASURED). Converted first, so the restructure that follows has tsc as a
net. The eleven files renamed with `git mv`, every reference to them
following (the pin resolver's file names, the stamp's file filter, the unused
exports test's special case, package.json, CLAUDE.md); left as they were: the
`../writer` version's own md.mjs in corpus.ts, the hooks self-test's throwaway t.mjs, the
code health test's .mjs cases.

A function handed to `page.evaluate` travels to the browser as its source:
node's type stripping leaves each annotation as spaces, and the source still
parses as JavaScript (MEASURED, a probe printing a stripped function's
`toString()`).

1,169 errors at the first strict check (MEASURED): 513 parameters with no
type, 216 properties tsc did not know, some 280 possible nulls, nearly all of
them reads of the page inside the browser callbacks. DECIDED: the Helium
files are their own program, `tsconfig.helium.json`, strict but for null
checks, a query answering with an element that carries what the steps read
(`tools/heliumDom.d.ts`); `tsconfig.json` leaves them out, so src/ and the
rest of tools/ keep the strict DOM. `npm run check` runs both. The reason: a
`!` on each read is an assertion, no safer than the run itself, where a
missing element fails its step; the checking worth having is the node side,
the parameters, the steps' one `Adapter` (this app's), every function's
name and arity. That checking found, while typing: this app's
`seedStanza` and `seedMargin` took no seeds where the steps pass them and the
writer's take them; its `launch` never read its seeds; a forEach index never
read; `waitPairGrew`'s `prev` a string of column widths where I had first
guessed a number. The `../writer` version's adapter lacks `pictureKeys` and eight readers,
all added after it was frozen: its driver hands it over by a cast, the
decision commented. One src/ file changed: three inferences in
src/store/io.ts that fell back to any once null checks were off in the Helium
program, which imports it, given explicit types.

The gate saw the two adapters as new files: typing their one-line readers
changed most lines, below git's rename threshold (MEASURED, `git diff -M`:
blankRow R060, the drivers R070–R096, the adapters D and A), so each had to
reach 10 now. Their two functions over the limit each, `screen` and
`cornerAfter`, could not be cut the usual way: a function an evaluate runs
carries everything it calls, and CodeScene counts its inner helpers against
it. THE SHAPE FOR THE PAGE'S CODE, the one batch 3b uses: each part of a
reading a top-level function, scored on its own, the parts' sources composed
into the one script an evaluate runs (`inPage` in tools/adapters/inPage.ts),
so the reading stays one evaluation at the same moment; a callback that
needs nothing else passed by reference. The composed scripts parse (MEASURED).
Both adapters to 10, inPage.ts new at 10, helium-probe.ts scored at 10 now its
lines are typed; helium-steps.ts holds at 3.48 until 3b.

### The comparison with the `../writer` version retired (2026-11-12)

Asked, mid-3b: "Are we still comparing against the `../writer` version? It's going to get
more and more out of date, surely?" The `../writer` version was frozen 2026-10-17 and
never played since; its run `corner.writer.txt` stood as last generated,
compared on every verify. MEASURED: of `corner.differences.txt`'s 324 decided
differences, 112 said only "new here, the old app frozen"; the 271 steps it
called identical were pinned reading for reading by `corner.approved.txt`
already. What it added was a second signature on approving a changed ported
behaviour (INFERRED, from how the two were wired); what it cost was a line
for every new step, an adapter of 192 lines and its driver kept compiling,
a cast in the steps' adapter type, a special case in the unused exports test.
Retired before 3b, the reader agreeing: helium-compare.ts, helium-writer.ts,
adapters/writer.ts, corner.writer.txt and corner.differences.txt removed (git
history keeps them), `test:helium` the approve run alone, the approve script's
`--writer` mode and the `../writer` version's seam types gone. corpus.ts's `--writer`
parser comparison, off by default, stays.

### Batch 3b — the steps cut into modules

helium-steps.ts 3.48 → 10, 2,941 lines → 47, helium-bridge.ts 9.68 → 10; the
sixty sections in twelve modules under tools/steps/, imported in their order,
with the kit (`steps/kit.ts`: the run's page, context and adapter as live
bindings set once by `bind`, the shared helpers, the dialogs, `section()` that
registers a section) and the timing harness (`steps/timing.ts`); every new
file at 10 (MEASURED, the gate: 21 files, none below HEAD).

DONE IN STEPS, each one checked before the next. First the sections MOVED
whole, their text as it stood but for an assignment to the dialogs' answer
made `setAnswer()`: the corner, bridge and reader runs as approved over the
moved tree (MEASURED). Then the big sections CUT by a parser (acorn over
node's `stripTypeScriptTypes`, which keeps every position): a section's or a
step's top-level statements made named steps where no local declared above is
read below, never in a function that returns early; a helper arrow or a fixed
value that reads none of its function's locals moved to module scope first,
an identical one shared, a different one with the name numbered; a value read
from the first statement to the last passed as a parameter (Horace's stored
text). The steps are written between their section's header and the next, so
the comment checker's pins still find each reading in its section's span. A
reading run in the page whose own complexity was the finding made top-level
functions, scored apart, composed into the one script an evaluate runs
(`inPage`, `inPageWith` for one argument): the cursor, the copied link, the
page labels, the bridge's launch reading.

THE PIN RESOLVER followed, its test first: a section is `section("name", …)`
in any file under tools/steps/, its span to the next header in its file and
never into the next file; all 706 pins resolve (MEASURED).

One slip, caught before any run: renaming a work's key in the scripture step
by a pattern rewrote "work" inside five labels and a seed's text. The guard
written for it reads every step label (each `log` and `section` name) as a
multiset and every string literal as a set against HEAD's steps: 438 labels,
the same, the only strings gained or lost the moved files' paths (MEASURED).

A second slip, caught by the corner run (MEASURED, nine readings of two
sections differing, `label` and `band` read as `selected` and `address`): two
sections each had their own `seen`, and the hoist numbered the later ones
`seen2` and `seen3` in the sections' bodies but not inside the helpers
hoisted with them, and shared one `ask`, identical in text in both sections,
though each section's `seen` meant another reading. Each section given its
own `ask` again. A helper is safe to share only where every name it reads
means the same thing in both places; numbered names occurred in lines.ts
alone (READ, the tool's own report), so no other module is touched by it.

A third difference, not a slip: the first full run after that fix read five
asks in the lettered-line section with the corner saying "1611 entries
stored", where the approved copy reads null. The section's own text and order
were HEAD's (READ, its statements compared); played alone, and after the
section before it, it read null from HEAD and from this tree, twice each; the
next full run read as approved (MEASURED). A race: in a full run the store
holds 1,611 entries, the reload's warm is slow, and the asks read the corner
near the whisper's fade. NEXT, asked: the steps made independent of their
order ("we have tests which are dependent on the order that they're run in,
and that's very bad"), after the one-off scripts are split from tools/; this
reading the first case.

The nets: both tsc programs, the suite (1,446, the resolver's new case among
them), the pins, the labels' guard, and the corner, bridge and reader runs
played over the cut tree against their approved copies, twice for the corner
run, its second play as approved (MEASURED).

### Next, in order (asked, 2026-11-12)

1. The one-off scripts split from the tools used every day: "everything in
   src/ and tools/ is used every day, and the stuff in one-offs/ ... is, well,
   one-offs" — after the review of the tools/ climb.
2. The steps made independent of their order: "we have tests which are
   dependent on the order that they're run in, and that's very bad"; the
   lettered-line asks reading the reload's whisper in a full run the first
   case.
3. The string rules revisited: "We're ignoring 'Primitive Obsession' and
   'String Heavy Function Arguments' across the board. We probably want to
   revisit that." Decision 6's measurement stands as the starting point:
   splitting a function, the cure for every other smell, set both off.

### The review of the tools/ climb (4fe38e4^..6ff6d29)

One `/code-review` at HIGH: 245,807 tokens (MEASURED, the last message of
`agent-aa4449da1f4fae8ce.jsonl`: 2 input + 178 cache creation + 243,131 cache
read + 2,496 output). The 29 transform refactors read as faithful, line by
line against the old code; corner.approved.txt unchanged across the range.
Eight findings, each read against the code:

1. THE STAMP MISSED THE STEP MODULES (behaviour): the run's fingerprint read
   tools/helium-*.ts and tools/adapters/ but not tools/steps/, so an edit to a
   step module alone would have printed "ok — not replayed". Every run in this
   climb was played after its last step edit (READ, the order of the runs), so
   none passed unplayed. Fixed by `stamped()` in heliumStamp.ts, a pure
   predicate the approve script filters by, and a test that walks the
   drivers' imports through tools/ and fails on any file left out — the
   checker a mechanical class is owed.
2. The pin resolver relies on each section opening `section("name", ` at a
   line's start: `stepsLayout.test.ts` fails on any other form and on two
   sections of one name.
3. The failure hint named the retired compare tool: dropped.
4. CLAUDE.md read as if TODAY were 2026-09-22: it is 2026-09-12, pinned since
   2026-09-22.
5. Moved comments with dates and another module's mechanism: the three named
   cut to their own code. The comment checker reads src/ alone; whether its
   standard should hold over tools/ is offered as a decision, not taken here.
6. A part left out of an in-page reading would show only in Helium:
   `adapters/inPage.test.ts` fails on any top-level function a listed part
   calls that is not listed with it (probed: leaving out textareaFocused
   names it).
7. `view`, `write` and `caretAt` copied into three modules: one each in the kit.
8. The cut's debris: 51 lines holding only `;` or spaces removed; 52 step
   names chosen by hand from what each step does, the labels unchanged
   (MEASURED, the labels' guard: 438, the same).

ALSO, asked: the dashboard read tools/ at 9.99. tools/residue.py, a phase-0
Python script, scores 9.38 (MEASURED, `cs review`); the gate reads .ts and
.mjs only. Left for the split of the one-off scripts.

### The one-off scripts split into one-offs/ (2026-11-12)

The reader's answers: the folder `one-offs/`; every check kept over it (tsc,
the suite, the unused exports, the gate at 10, the two string rules off as for
tools/); helium-probe.ts, importCorpus.ts, referenceCorpus.ts, readerBundle.ts
and publishReader.sh stay in tools/; residue.py goes, ported; and the comment
standard's checker extended to the daily tools/ ("Yes, with the split").

- 83 files moved with `git mv` (MEASURED, git status): every transform, its
  run and its 25 tests, the four runs with no transform of their own
  (finnsburhWyattRun, miltonPsalmsRun, miltonSamsonRun, orgDrawersRun), and
  the five data files they read. No import crosses the split (READ). The
  caches moved from tools/out/{harvard,hwaet,wyatt} to one-offs/out/,
  ignored.
- The configs widened: tsconfig.json includes one-offs/ and leaves out
  tools/out and one-offs/out, whose untracked scratch scripts tsc had begun
  to read; Vitest reads one-offs/**/*.test.ts; the rules file gives
  one-offs/** the two string rules off; codeHealth.ts scores one-offs/*.ts;
  the unused-exports and vocabulary tests walk it.
- one-offs/residue.ts, the port of residue.py: Code Health 10, its output
  byte for byte the Python's over the plain report (209 lines) and the
  `--writer` report (8,772 lines) (MEASURED, diff).
- The nets: every run script played from one-offs/ under a scratch HOME,
  passes A and B, identical to HEAD's from tools/ (MEASURED, same.sh).
- The comment checker over src/ and tools/, tools/out and tools/expected
  left out: 709 pins, all resolving. Its sweep flagged 62 blocks in tools/,
  16 naming another module and 50 carrying provenance, four of them both
  (dates, "the review", "the reader", a confirmation pass); every one cut to its own code, and the
  comparison's leftovers the checker cannot see ("successor-only",
  "the current app" in the steps) cut with them (MEASURED, the sweep reads 0
  in tools/). corpus.ts and referenceCorpus.ts keep "the current app": their
  `--writer` and ⌃⌘C questions are that comparison. (Reversed 2026-11-12,
  asked: both questions retired, and the app named by its age nowhere but
  the conversion plan — "the `../writer` version" where it must be named.) Two flagged blocks were
  the checker's own subject (its provenance rule's banner, its known-bad
  list), reworded.
- Left for project 2: two sections are still named for the `../writer` version
  ("editing as the old app does",
  "notices and surfaces as the old app has them"), their names in src/'s
  pins and the approved copy; and references.ts's
  `if (!inSource)` before the grid's ⌃⌘M, a hedge for the `../writer` version's view.

### Project 2 — the Helium steps independent of their order (2026-11-12)

Asked: "we have tests which are dependent on the order that they're run in,
and that's very bad", and, mid-way, "Aren't we trying to get rid of
order-dependent failures here?" — yes: the work below removes them.

- THE FRESH START. Before each section the adapter's `fresh` goes to
  about:blank, clears the `file://` origin's storage through the DevTools
  protocol (`Storage.clearDataForOrigin`, every type: the entries, the
  pictures, the index, localStorage), seeds the fixtures again and empties
  the clipboard; the kit's `freshStart` drops the dialogs' answers. Probed
  first: after the clear no database and no localStorage key is left, and
  the reseed brings the fixtures back; clear and reseed 98–155 ms, five
  times (MEASURED). Each section's output opens with a `== name` line.
  `STEPS=` now plays the named sections alone; `ORDER=reverse` plays them
  all last first.
- WHAT IT FOUND. The first full run with the fresh start: one section
  failed and 79 lines moved (MEASURED). Nine readings leaned on an earlier
  section, each now given its own setup: contents folds (the stanza seeds),
  a link to a paragraph before the warm (the Augustine work, now
  `AUGUSTINE_SEEDS` in the kit, shared with the section that wrote it), the
  sub-entries' "other tag" (a Music sub-entry written first), the digit
  held on the bookmarks card, a bookmark's link in the markdown view and the
  second window's rows (a bookmark list kept first), a shortcut chosen with
  no cursor (the table kept, then a reload), and the shelf with no list (an
  unlisted author written first). Played alone, 14 of their readings matched
  the old approved copy exactly; the shelves read the one author written
  for them (MEASURED).
- A RACE MADE A HOLD. `losing nothing` typed into an entry an import was
  about to overwrite: whether the typing's save (0.5 s after the last key)
  or the import's write of that entry (after 1,500 fillers) landed first
  decided between the tally and a refusal. The old run read the refusal
  every time, the fresh store the tally every time (four runs), the step's
  own comment promising the tally. The fake folder now holds that one
  file's read until the typing has saved; the tally is waited for by its
  own words (a "saved" whisper had passed the old wait), and the caret is
  read once the import shows. Three runs alone: the tally (MEASURED).
- THE PROOF. The whole run forward and the whole run reversed, in parallel
  on their own profiles: 60 sections of 60 the same, no section failed
  (MEASURED, a section-by-section compare). After the approval, the
  reversed run against the approved copy: 60 of 60 (MEASURED).
- THE APPROVAL, read whole before it was made: 50 lines moved besides the
  60 headers (MEASURED). The lists (go-to, search scopes, the bookshelf,
  the shelves) no longer carry other sections' entries ("1570 pages" is "3
  pages"); arrivals no longer carry an earlier caret; the walk from 3pr1
  lands on 3m1, the next in the Consolatio's contents, where an earlier
  section's save had left 3pr2; the import's tally and the caret back in
  the text, and the two refusals gone from the console.
- The side list's two items: the two sections still named for the `../writer` version
  are `editing` and `notices and surfaces`, their 29 pins in src/ renamed
  with them, all 709 resolving (MEASURED); the grid step's hedge for the
  `../writer` version's view, a ⌃⌘M pressed only if the view was not source, removed,
  the reading before it showing the view forced to source.
- EVERY COMMIT CHECKS IT (asked: "I want order independence checked on
  every commit. I was going to ask how we avoided adding new
  order-dependent browser tests"). The verdict's `order` run plays the steps
  reversed on its own profile beside `corner`, and `tools/heliumOrder.ts`
  (test-first, five tests) names each section, and the console taken as a
  set of lines, reading otherwise than corner's approved copy; a difference
  fails `verify` and there is nothing to approve. The verdict with it: 5:25,
  against 5:26 without it (MEASURED, `time`), the two played side by side.
  Over the real runs it named nothing; with one reading changed, its section
  (MEASURED). A leak planted to prove it (a count in the kit surviving the
  fresh start, logged by `pill`): the verdict failed, `order` naming `pill`
  alone (MEASURED); the leak removed.
- ITS FIRST CATCH, on the next verify: `order` named `bookmarks` (MEASURED),
  corner passing. Not a leak: a selection placed by script and a chord two
  frames later, the editor not yet holding the selection under the load of
  two runs at once, so the card read the caret. The adapter's three
  placements (`selectBetween`, `selectAll`, `caretAfter`, 22 uses of the
  first) now wait for the browser's selectionchange, a second at most, and
  that step waits for the format bar; the verdict after: all four ok, no
  reading moved, 5:25 (MEASURED).

### The logic out of the components (2026-11-12)

Asked: CodeScene does not score `.svelte`; "keep the .svelte files lean ...
and extract business logic into .ts files", before project 3, so that what
moves is held there too.

- THE SURVEY: twelve components, 1,132 lines; 225 of them script, 54 its
  branches (an if, a ternary, an && or ||) over eight of them (MEASURED, a
  count over the scripts). The state, the decisions and the acts already
  stood in `.ts` (screen.svelte.ts, the models, the acts); what remained in
  the scripts was prop types, element bindings and focus methods, and
  seven small decisions (READ).
- MOVED, test-first (14 tests, red first): the backups status line
  (`backupsModel.ts`, its plural through `counted`); the list keys Search
  and Shortcuts each held a copy of, Enter in a bar's field and the press
  that holds the focus ReplaceBar and LineBar each held, and the focus
  leaving a card (`cardKeys.ts`); the row lit while its key is typed, once
  inline in the markup, and a click's act (`bookmarksModel.ts`); the option
  a Go to level shows picked (`gotoModel.ts`). The branches left in the
  eight scripts: 23 of 54 (MEASURED), each a call's own guard.
- KEPT in the components: the props, the elements and their focus, the
  bookmarks card's measured key column, the aria wording, the markup's
  choice of panel.

### Project 3 — the string rules revisited (2026-11-12)

Asked: "We're ignoring 'Primitive Obsession' and 'String Heavy Function
Arguments' across the board. We probably want to revisit that."

- UNDER THE DEFAULTS (the rules file set aside, every scored .ts reviewed,
  the file restored): 63 of 323 below 10, 37 in src/, 5 in tools/, 21 in
  one-offs/, every one at 9.38 or 9.69 and no other smell; four files score
  None (MEASURED). In src/ the median file has 59% of its functions taking a
  plain type against the rule's 30%, and half its arguments strings
  (MEASURED).
- THE RULES ARE LEXICAL: refile.ts as it stands 9.38 (81% and 81%); with
  `type Text = string` written for its strings, 10; with a branded
  `string & { readonly __brand }`, 10 (MEASURED). A rename meets them as
  well as a type the compiler holds apart.
- WHAT A BRAND WOULD HAVE CAUGHT, the plans and fix commits searched by the
  kinds a brand separates (keys, names and labels, markdown and text, line
  numbers and positions, encoded and decoded): one clear case, the move's
  review finding 1 (2026-11-11), a key typed into the address box
  URL-decoded as an address; one near case, a pixel offset carried from the
  rendered view to the source (2026-09-28), a brand per view's offset more
  ceremony than it was worth; and three that read like confusions and were
  not — a typed name matched against keys alone, a text test missing a
  key's escaped spellings, a test reading one column of two (READ). None
  between the ProseMirror, stream and source positions.
- DECIDED (asked): both rules stay off for src/, tools/ and one-offs/, for
  the reason above. Sized next, on its merits: one brand, `Address`, the
  encoded form a link carries, accepted only where it is decoded.
- BUILT (asked: "build it"): `Address`, a branded string in keys.ts, the
  `#…` form; `entryHash` and `internalHash` return one, `hashParts`,
  `namesEntry` and `hashTarget` take one and the decoders drop the `#`
  themselves, so the nine `x.slice(1)` before a decode are gone;
  `asAddress` the one cast. Test-first (the new test and 35 rewritten calls
  red before). tsc then named every place outside text met the decoder, 22
  (MEASURED), each now an `asAddress` of the whole href, location.hash or
  typed text, or the Address it already held. The suite 1,470, both tsc
  programs clean, every touched file at 10 (MEASURED).

### The review of the day's four commits (582c878..7b4a8e4)

One `/code-review` at HIGH: 190,423 tokens (MEASURED, the last message of
`agent-afb8e7de087624989.jsonl`: 2 input + 1,767 cache creation + 185,943
cache read + 2,711 output). Nine findings, all the reviewer's, held until
the reader has the list. Checked before handing over: the one-offs' stale
paths, 26 scripts giving `node tools/…` and 29 paths no longer there
(MEASURED); the clipboard half of the parallel-load finding is not so —
headless Helium keeps its own clipboard, a page's write and read leaving
the Mac's pasteboard as it was (MEASURED, saved and restored around the
probe).
- FIXED, 1–8 (asked: "Let's fix 1-8 in one commit"), the ninth the
  clipboard half not so and the load half answered by 2 and 3:
  1. A fresh start that throws fails its own section ("FRESH START
     FAILED"), not the run.
  2. `order` is held to the corner run played beside it, corner's approved
     copy where corner was not replayed: a reading changed on purpose fails
     corner alone.
  3. The placing script arms its selectionchange watch in the same task as
     its addRange.
  4. Enter while a composition is open picks nothing in Search or the
     Shortcuts popup (test-first).
  5. The 26 moved scripts' usage lines and the 29 paths read
     `one-offs/`, and CLAUDE.md's vocabulary rule names
     `one-offs/shelfLines.ts`. The checker owed, `tools/paths.test.ts`:
     a tools/ or one-offs/ file named in the code or CLAUDE.md is there,
     a test's paths and another repository's aside; red before (MEASURED).
  6. A group's profiles are emptied before any of its runs starts; a
     spawn error settles the run.
  7. Text without the leading # names no entry (test-first); the paste's
     patterns capture the #.
  8. The first-? rule once (`beforeQuery`); `entryAt` reads an address
     once where three callers parsed it twice (test-first).

### The confirmation pass (7b4a8e4..893cbc0)

One `/code-review` at HIGH over the fix commit, on the reader's word:
121,828 tokens (MEASURED, the last message of `agent-a59eea3d8b054a0ef.jsonl`:
2 input + 2,567 cache creation + 116,544 cache read + 2,715 output). Ten
findings, held until the reader has the list. Checked: the approval's
refusal matches SECTION FAILED and EXIT and not FRESH START FAILED; three
steps arm the selection watch a script before their placement or click
(keys.ts:50, views.ts:23, views.ts:121); typedAddress keeps its own
`split("?")`; every tools/ path package.json names is there today (READ and
MEASURED).
- FIXED, all ten (asked: "go"), no further pass:
  1–3. One `failedRun` (heliumStamp.ts, test-first) for a section failed,
     a fresh start failed or a bad exit: the approval refuses such a run,
     and `order` is no pass when its own run failed, so two runs failing
     alike are not stamped; a start not seeded throws, the one path.
  4–5. `watchSelection` and `selectionMoved` in the adapter: where the
     selection stands is noted, and the wait ends at a selectionchange
     that finds it moved, so an event queued earlier is passed over;
     `placed()` and the three steps use them, the six copied arms gone.
  6–7. While a composition is open no key acts on a list (test-first), and
     the bookmark key's field takes Enter through `enterKey`.
  8. typedAddress reads `beforeQuery`.
  9. The path checker reads package.json, .claude/settings.json and
     hooks/ too, and takes `./tools/…`; probed: package.json names 8, the
     hooks and settings none, the `../writer` version's path passed over (MEASURED).
  10. The paste's pattern run once.

### A terminal's copy pasted (2026-11-12)

Found by the reader: today's summary copied from the terminal and pasted
into Gesta came in as a paragraph per coloured run. Asked: "please
investigate", then a mock-up to paste, then "build it".

- THE CAUSE (MEASURED, the clipboard read after a fresh copy): Ghostty
  copies one `<div style="…white-space: pre;">` holding the text and a
  `<div style="display: inline">` per coloured or bold run, its line breaks
  where the window wrapped. ProseMirror's HTML parser takes every div for a
  block. Replayed headless: 234 stored lines with the HTML, 58 from its
  plain text alone.
- THE MOCK-UPS, pasted by the reader from the plain text put on the
  clipboard: the list right, but a break wherever the terminal wrapped
  ("are / spelled", "the / decoder"); the reader's rule — a line not ending
  in a full stop runs on into the next — kept a list item starting its own
  line, 54 lines to 33, stored as 37 (MEASURED); "That looks right".
- BUILT, test-first (two tests red first): `terminalCopy` (that one
  white-space: pre block, a `<pre>` and pre-wrap and Gesta's own copy not
  it) and `unwrapped` in paste.ts; the editor's paste takes such a copy's
  plain text, unwrapped, as markdown. A Helium section, "a terminal's copy
  pasted", pastes a terminal-shaped copy: stored as two sentences joined
  and a two-item list, 3 paragraphs and 2 items drawn (MEASURED).
- REVIEWED (asked: "review"): one `/code-review` at HIGH over
  `0ea826f..2b90ab0`, 87,498 tokens (MEASURED, the last message of
  `agent-a87bed4357a01802b.jsonl`: 2 input + 610 cache creation + 84,522
  cache read + 2,364 output). Seven findings, held until the reader has the
  list. Checked: a one-line paste, or one into a list item, verse line or
  cell, gets nothing from `pasteBlocks` and falls back to the HTML route;
  `unwrapped` makes `::: verse a | one b | two :::` of a verse fence and runs
  "Shall I commit?" into the next sentence (MEASURED).
- FIXED, 1–5 of the seven (asked: "go"); the parser-level rewrite declined
  (it would not join the wrapped lines, and a terminal copying no HTML is
  not told from any plain text); the VS Code half of 4 answered by its fix:
  1. A terminal's copy never takes the HTML route: where the blocks route
     declines it (one line; a list item, verse line or cell), its unwrapped
     text goes through `view.pasteText`, the editor's own plain-text paste.
  2. Markdown copied out of the terminal keeps its structure: nothing in a
     ``` or ::: fence joins, and a fence, heading, quote or table line is
     never joined (test-first).
  3. A sentence ends at . ? ! : or …, a closing quote or bracket after it;
     a line starting •, `1)` or ⏺ starts its own (test-first).
  4. `terminalCopy` checks what its title says: the block holds only text
     and inline runs, and nothing follows it.
  5. The Helium section reads the kit's selector and plays a one-line copy
     and a copy into a list item; on the editor before fix 1 they read
     "beforegit log" in 2 paragraphs and the item in 3 (MEASURED), with it
     one paragraph and one item.
- CONFIRMATION PASS (asked): one `/code-review` at HIGH over
  `2b90ab0..58d3d8a`, 85,838 tokens (MEASURED, the last message of
  `agent-ad1036e5f3e0eada8.jsonl`: 2 input + 1,949 cache creation + 81,518
  cache read + 2,369 output). Ten findings, held until the reader has the
  list. Checked: `unwrapped` joins `const a = 1` / `const b = 2`, and in a
  code block the joined text is what goes in (MEASURED and READ); the
  source view's paste handles pictures alone (READ).
- FIXED, 1–5 of the ten (asked: "go"); 6–8 kept as the limits of the
  guess, the workaround ⌘⌥⇧V (plain text, no HTML, the lines as copied):
  1. In a code block a terminal's copy keeps its lines, the editor's own
     code paste taking it; joined before (MEASURED: `const a = 1 const b = 2`).
  2. The fallback inserts the plain-text slice itself, its links made bare,
     not a second paste.
  3. A link or span inside counts as an inline run; `display: inline`
     exactly, an inline-block refused (test-first).
  4. The source view joins a terminal's copy too, through the browser's own
     insert (Helium: "x" before, "x passed before it landed." after).
  5. The pins named; the restating comment gone; `unwrapped` once.
