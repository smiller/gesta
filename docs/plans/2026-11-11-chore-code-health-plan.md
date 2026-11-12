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
