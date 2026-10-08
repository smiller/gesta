# Gesta (the successor)

Gesta rebuilt as a project with a build step: the editor on ProseMirror, the
UI on Svelte 5, the output still ONE `index.html` that opens from
`file://`. The plan and phase 0's record are
`docs/plans/2026-09-07-feat-successor-app-prosemirror-svelte-plan.md`
(moved here 2026-09-07; the copy in ../writer/docs/plans is marked
continued here), and so is THE RECORD: every phase's decisions and
measurements, one dated section per phase under "Phase N decisions",
moved out of this file 2026-09-08 (they were four fifths of it, loaded
into every session). This file holds what is IN FORCE — the process and
the layout — and points at the record; a rule a record entry set that
later work must keep is restated here, not only there. THIS IS THE RUNNING APP
since 2026-09-22 (the reader said so that day: the export imported,
real entries written here). `../writer` is the OLD app: kept as the
comparison tools' other side and not maintained — a feature built here
is never back-ported. Where this file, the plan's record and the tools
say "the current app" they mean `../writer`, the vocabulary of the days
before the cutover.

The process this repository follows is `../writer/CLAUDE.md`, carried over
PER CHECKER as each becomes relevant (the plan's decision 7). What is in force
here NOW, and what is not yet:

- IN FORCE — the whole "Reporting" section of ../writer/CLAUDE.md, verbatim:
  every factual sentence tagged MEASURED / READ / INFERRED, no connective
  tissue, hand over the artifact not the claim, report who found what.
- IN FORCE from 2026-09-28 — THE COMMENT STANDARD, replacing "comments
  record a decision, a measurement or a past failure" after the review
  passes found comments asserting another module's mechanism five times
  (the record: docs/plans/2026-09-28-chore-comment-standard-plan.md):
  - NO COMMENT BY DEFAULT. One stays only if someone changing this code
    would get it wrong without it, in a way the code, its names, types and
    tests cannot prevent: a DECISION, a MEASUREMENT, a past FAILURE.
  - It speaks only of the code it sits on. Nothing about what another
    module does; a CONTRACT between modules is a test, written when it is
    found.
  - No provenance: dates, "the reader", "the review", "asked" live in the
    plan's record alone.
  - A failure or decision a test can check is PINNED, and the comment names
    its pin in a fixed trailing form, one group per pin:
    `(pin: <section> › <reading label>)` for a Helium step,
    `(pin: bridge › <reading label>)` for the bridge tool's,
    `(pin: console › <line prefix>)` for a console line of the approved run,
    `(pin: <file>.test › <title prefix>)` for a Vitest test. The comment
    checker verifies every pin resolves (below).
  - No module header where the layout below says what the file is; an
    interface member's comment only where its name and type cannot say it.
  - A comment MOVED with its code into another module is re-read against
    this standard before the commit: what was the module's own mechanism
    where it stood may be another module's where it lands. Adopted
    2026-10-01 as the remedy for the count below — the plain-English
    other-module class in all five rounds, most of it in comments moved
    whole (the comment-standard plan's verdict).
  - The standing stock was audited against it directory by directory on
    2026-09-28 (the plan's record); the checker's sweep reads 0 blocks
    naming another module and 0 carrying provenance, and a new comment
    is held to the same by the checker.
- IN FORCE — Sean runs Gesta in HELIUM (`/Applications/Helium.app`, a
  Chromium fork), from `file://`. Every real-behaviour question is answered
  there; a synthetic event proves only that a handler is reachable.
- IN FORCE from 2026-10-01 — HAND-CHECK STEPS ARE ACCURATE BEFORE THEY
  ARE HANDED OVER (the reader: "Getting hand-check instructions to be
  accurate and clear is important", after seven wrong or unclear steps on
  2026-09-30 and 10-01, every one his correct sighting against my wrong
  claim). Each step: the entry to use and its kind (a page, a book, a
  journal day); every control BY ITS LABEL ON SCREEN; every key, Enter
  and Escape included; the expected result as what is SEEN, nothing the
  eye cannot catch ("a moment later"); and what each step does NOT cover.
  Every step a scratch probe can play is played first in headless Helium
  and its expectation is MEASURED; a step not played says so. A step
  the code cannot reach by hand (a forgotten store, a failed write) is
  named as the tests' and not handed over.
- IN FORCE — new behaviour is built test-first (`npm test`, Vitest), and
  `npm run verify` — tsc, the suite, then the headless tools under their
  verdict — passes before work is called done. THE HEADLESS TOOLS HAVE A
  VERDICT since 2026-09-12: `npm run test:helium` plays the shared steps
  (`tools/helium-steps.mjs`) over the successor and compares the whole
  run, scrubbed, against `tools/expected/corner.approved.txt`, then
  compares it step by step against THE CURRENT APP's run of the same
  steps, `tools/expected/corner.writer.txt`, failing on any difference
  not listed with its reason in `tools/expected/corner.differences.txt`.
  `../writer` is the reference for what was PORTED; a feature new here
  (the grid, 2026-09-22) has no reference there and lists every field
  it reads differently with that reason. The approved copy is only a
  fence against change. `--approve` makes a run
  the approved copy, a judgement made after reading the diff, never to
  quiet it; `npm run compare:writer` regenerates the current app's run
  when ../writer changes. A `.received.txt` is never committed.
- IN FORCE — `node_modules` carries the Dropbox-ignore attribute. A
  `rm -rf node_modules` loses it with the directory, so a clean reinstall runs
  `mkdir -p node_modules && xattr -w com.dropbox.ignored 1 node_modules`
  FIRST. Versions are pinned exact (`npm install --save-exact`).
- IN FORCE — storage names live OUTSIDE `page750.*`: every `file://` page
  shares one storage origin (MEASURED 2026-09-07 in Helium), and the successor
  never reads the old databases. Data arrives by import of the export folder.
- IN FORCE from 2026-09-08 — THE REVIEW SHAPE, asked from "this is a new
  app; what is the sensible and economic way to review it" rather than
  ported: the free checkers first (tsc with the unused checks on, the
  suite, the corpus tool, the Helium tools), then ONE `/code-review` at
  HIGH over a commit range, by BATCH — when a batch touches a DOM seam
  (main.ts, session.ts, editor.ts, paste.ts) or closes a phase — never
  per commit; its findings land in one fix commit; a confirmation pass
  is offered at its measured price and runs only on the reader's word,
  and only when a finding changed behaviour. HIGH, NOT MEDIUM, from
  2026-09-28 (the reader, on Opus 5.5): over one diff (the contents
  folds, 424 lines) high cost 89,181 tokens against medium's 69,499
  (+28%) and found ten issues against three, all three of medium's among
  them (MEASURED, docs/plans/2026-09-28-feat-contents-folds-plan.md).
  EVERY review's cost is recorded in its plan's record and reported to
  the reader: the figure is the run's final context plus final output; a
  run that returns in the foreground reports none, and it is read from
  the session's `subagents/agent-*.jsonl` transcript (the last message's
  input + cache_creation + cache_read + output tokens), never estimated.
  FIVE ROUNDS WERE COUNTED (2026-09-29 → 2026-10-01): each review's
  comment findings by class, in the table "Was it worth it — the measure
  owed" in docs/plans/2026-09-28-chore-comment-standard-plan.md, with its
  verdict and the remedy chosen (the moved-comment re-read, above); the
  count is no longer owed.
  No cheap reviewer tier: in the running app it cost 750k–985k tokens a
  round against 101k–154k for the medium pass, which found more
  (MEASURED there 2026-09-01). A
  reviewer finding a MECHANICAL class — a literal, a name that does not
  resolve, a comment shape — owes a checker under `tools/`, not just a
  fix: a grep runs free forever.
- IN FORCE from 2026-09-08 — THE GATE: no review-shaped call while
  `src/` or `index.html` has moved past the last acceptance. Finish the
  work, make the suite green, tell the reader what to look at, and STOP;
  they run `! sh hooks/accept.sh` once they have looked, which records
  the tree's signature, and `hooks/pre-review.sh` (a PreToolUse hook on
  Skill, Agent and Workflow) refuses the review skills, any Workflow and
  a review-shaped Agent until the signature matches. `hooks/**`,
  `.claude/settings.json` and the accept script are permission-denied to
  the agent. The reviewer list, the mark-reviewed pin and the skip lines
  of the running app's apparatus served a five-reviewer loop this app
  does not run, and are not carried.
- IN FORCE from 2026-09-22 — THE TEST GATES, carried back from the
  running app's stop.sh and pre-commit after a look on 2026-09-21 found
  the rule above was prose only: `hooks/stop.sh` (a Stop hook) refuses
  to end a turn while `src/` or `index.html` differ from HEAD and tsc or
  the suite is red, so the reader is never asked to look at a red tree;
  `hooks/pre-commit` (git's, `core.hooksPath hooks`, set once per clone)
  runs `npm run verify` on its own exit code before any commit lands,
  the Helium tools included. The Stop hook leaves the Helium tools to
  the commit: they took most of a Stop timeout in the running app. THE
  HOOKS HAVE A SELF-TEST, `tools/hooks-test.sh`, the running app's
  gate-test.sh cut to these five scripts: every hook's exit code over a
  throwaway repo, and the wiring read from this one; `npm run verify`
  runs it, so the pre-commit certifies the gates it is one of.
- IN FORCE from 2026-09-28 — THE COMMENT CHECKER, `tools/comments.ts`
  (`npm run test:comments`, under `verify`, so the pre-commit gates on
  it), the first prose checker, ../writer/tools/claims.sh's class
  re-aimed: over src/ with its tests, it FAILS on a pin that does not
  resolve (the whole tree) and on an added or changed comment block that
  names another module — an identifier another file declares at its top
  level, a file path, a role noun's possessive ("the session's") — or
  carries PROVENANCE — a date outside quotes, "the reader", "the review",
  "the reviewer", a confirmation pass, "the plan" (from 2026-09-29) — with no waiver (the app's user,
  in a sentence about behaviour, is "a reader"; "asked" is not checked,
  being mostly prose); and prints THE LEDGER, every block the diff added or
  changed. `--commit R` reads one commit; `--sweep` lists every block
  that names another module or carries provenance, a reading list for
  the audit. It catches
  six of the fourteen known-bad blocks; the other eight name a module
  only by a role in plain English, and the review stays the net for them
  (MEASURED, the plan's record; the role list gained "the source's",
  "the surface's" and "the keeper's" from the surface and place keeper
  review, 2026-09-30, and "the UI's", a directory's, with the word's
  rename; "the chrome's" was added and dropped again, the word now
  reading as the browser; role nouns match in any case since the
  overlays review, 2026-10-01).
- NOT YET — the other prose checkers (`tools/*.sh` in ../writer),
  re-aimed at this tree's comments and the plan's record as each class
  first shows up in a review; each keeps its self-test and has its hit
  count measured before its rule is chosen.
- NEVER — the single-file checkers (the vocabulary index, check-sync, map.sh,
  names.sh, the concatenating build): TypeScript and the import graph answer
  their question.

Rules the record set that later work keeps (the measurement behind each
is in the plan's record, under the phase named):

- Headless Helium is `--headless=new` by executable path, wrapped in a
  kill; the old mode hung (phase 1). A `--dump-dom` cannot answer a
  storage question — IndexedDB settles after the dump — so the tools drive
  Helium through playwright-core and wait for the attribute (phase 2).
  The tools use their own profiles under `tools/out`, never the running
  Helium's, and a lingering headless process is killed by its profile
  name, never by the app's.
- A `.svelte` component never shares a stem with a `.ts` module: the disk
  is case-insensitive, and a test file was silently overwritten (phase 3).
  svelte-check is not installed (it refuses TypeScript 7 as a peer), so a
  component is checked by its compile and its test.
- Every ⌃⌘ chord is the current app's or was asked for; ⌃⌘I is "italic,
  but a line", ⌃⌘N is "new". Whether Helium passes a chord through is
  answered only by pressing it there, and every new chord is named for a
  hand to try.
- A headless step reads THE SCREEN after a gesture — the entry, the
  selection, the bar, the corner — not only the one bit the feature
  promises: the ⌘-click step asked whether a tab opened and was green
  while the gesture also selected the paragraph (2026-09-09). And a
  step's wait never swallows its timeout: the reading carries what the
  corner said, matching or not — a 3 s whisper had faded by a 5 s wait's
  end, so a chord that did not take read as no corner at all, with
  nothing to say why (2026-09-22).
- The stored text is markdown, the field `md`; a save is serialize and
  compare, and an entry the model refuses is shown as source, never
  edited as a lossy document (phases 2 and 3).

## Layout

- `src/model/` — the document model, no DOM: `schema.ts` (nodes, marks, and
  `MARK_ORDER`, the nesting the serializer writes), `grammar.ts` (the line
  regexes — the `:::` family, the grid's since 2026-09-22 — and the pure
  string transforms both arms share), `parse.ts`
  (markdown → document), `serialize.ts` (document → markdown),
  `tokens.ts` (syntax highlighting's tokenizer: the language table and
  the one-pass scan, yielding spans), `fenceRefusals.ts` (the `:::` lines
  a parse left as paragraphs, named with their reasons), `flatten.ts` (the document as ONE
  character stream with a position map,
  the stream every search site shares: the index text, the jump, the
  reference payload's count; and the same fold over a source text, for
  the view switch). Tests sit beside them as `*.test.ts`.
- `tools/corpus.ts` — the whole-corpus round trip over an export folder,
  `node tools/corpus.ts [dir]`; writes `tools/out/corpus-report.txt`.
  It checks the round trip alone; `--writer` adds the comparison with
  the old app's parser, off by default since 2026-10-08, every form new
  here reading as a difference there. THE CORPUS is `~/Library/CloudStorage/Dropbox/gesta-backups/current`,
  this app's backup, the default of all three corpus tools;
  `gesta-snapshots` is the old app's and is never read (2026-10-08).
  `tools/stageDirections.ts` — a play's stage directions made one
  italic run each, pure, its test beside it; `tools/stageDirectionsRun.ts`
  runs it over the fourteen plays of Tey and Williams in the backup and
  writes the changed entries as an import folder with a before-and-after
  page.
  `tools/corpusRules.ts` its decided differences from the old parser,
  pure: a `###`–`######` heading here, text there; emphasis across a
  line break here, its delimiters text there.
  Phase 0's gate: nothing in later phases is worth building until it is
  green over the corpus.
- `tools/helium-probe.mjs` — the built page opened in headless Helium by
  executable path, one persistent profile, one launch per query string
  given; prints the root's `data-store`, `data-probe` and the console.
- `tools/importCorpus.ts` — the import run over an export folder under
  node into memory, `node tools/importCorpus.ts [dir]`; prints the tally
  and names every failure with its reason.
- `tools/helium-bridge.mjs` — the bridge in headless Helium over a fresh
  profile: seed the fixtures (`?store=seed`), open by hash, refuse, type,
  relaunch, walk; prints what each launch found.
- `tools/helium-steps.mjs` — THE SHARED STEPS: one list of gestures and
  readings, played over an adapter, and `TODAY`, the day the drivers
  and the bridge pin the page's clock to (2026-09-22; never a seeded day); `tools/adapters/successor.mjs` and
  `tools/adapters/writer.mjs` answer the same questions over this app
  and over ../writer (its `window.gesta` seam seeds it, its own ids read
  it). `tools/helium-approve.mjs` runs a tool under its verdict against
  `tools/expected/`; `tools/helium-compare.mjs` reads the two runs step
  by step, the decided differences listed in `corner.differences.txt`;
  `tools/helium-writer.mjs` is the current app's driver.
- `tools/hooks-test.sh` — the hooks' self-test (2026-09-22): the five
  scripts under `hooks/` copied into a throwaway git repo and asserted
  on their exit codes, then the wiring — settings.json, `core.hooksPath`,
  the executable bits — read from this repo; `npm run test:hooks`,
  under `verify`.
- `tools/comments.ts` — the comment checker's run (above);
  `tools/commentRules.ts` its rules, pure: the comment scanner (its own:
  TypeScript 7 exposes none), the pin resolver, the other-module rule,
  the provenance rule, the diff's added lines; `tools/commentRules.test.ts` the self-test,
  the known-bad blocks verbatim from git and real quiet ones (Vitest
  reads `tools/**/*.test.ts` too).
- `tools/helium-corner.mjs` — the shared steps played over the successor
  in headless Helium over a fresh profile, a 19-line driver since
  2026-09-12: the steps and their readings are `tools/helium-steps.mjs`'s
  (above); this prints each reading and the console, and screenshots
  when given a path. `STEPS=a,b` runs the first section and the named
  ones, a development run only (2026-09-28).
- `tools/referenceCorpus.ts` — the citation label for entry keys over the
  mirror read into memory, `node tools/referenceCorpus.ts [dir] [key ...]`;
  the current app's ⌃⌘C on the same entries is the other side.
- `src/editor/` — the editor, DOM-facing: `numbering.ts` (the unit walk
  over the document — which rows are lines, and their numbers; no DOM),
  `lineNumbers.ts` (the plugin drawing that answer as node decorations),
  `rows.ts` (the line, pair, gap, note and margin-note node views), `rowKeys.ts` (the
  gestures under a fence, as commands: Enter, Backspace, Delete, Tab, the
  typed pipe), `fit.ts` (the fitted measure: the arithmetic pure, the
  measuring pass and its scheduling as a plugin view), `margins.ts` (a
  `::: margin-note`'s form: the width and the push pure, the placing pass
  as a plugin view writing a class on the note's own node), `folios.ts` (the
  gutter's switch: `foliopage` on the root where a leaf is the text's),
  `typing.ts` (markdown as you type: the input rules and the two Enter
  arms), `links.ts` (a click on a link: the pure decision and the
  handler), `highlight.ts` (the jump: the nth occurrence of a query
  selected; the scroll is main's, a frame later), `insertLink.ts` (a link placed after the
  caret, and what refuses one), `sourceKeys.ts` (Tab and Shift-Tab in
  the source view, over a text and a selection), `surface.ts` (THE
  SURFACE, what the rendered and the source view share: the interface
  each view answers, the window as a port, and the switch between them,
  ⌃⌘M — the carets held per view, the text at the top carried across,
  the forced source view and the fence pin; no DOM, tested over fake
  views), `renderedView.ts` (the rendered view: the surface over
  `createEditor`), `sourceView.ts` (the source view: the textarea, its
  hidden twin for geometry, its input, paste and Tab), `placeKeeper.ts`
  (THE WINDOW'S PLACE: an arrival back to where an entry was left, the
  hold until a hand moves, the record on a scroll's pause and on leaving,
  a rename's carry and a delete's drop, the switch's carry; no DOM, over
  a page port whose browser adapter is the session's), `format.ts` (the
  toolbar's acts as commands: the marks and their chords, the heading,
  quote and code toggles, the curl over a selection, the word count, the
  cut of a selection into a link), `codeKeys.ts` (Enter on a code
  block's empty last line, the way out), `paste.ts` (what pasted text
  becomes and what copied text says), `goto.ts` (⌃⌘G's decisions over a
  document: what the entry can be asked for, the hits and the cycle, the
  refusals), `landing.ts` (the landing mark as a plugin: a position that
  maps through edits, drawn as a node decoration), `codeHighlight.ts`
  (the tokens drawn as inline decorations over every code block),
  `quoteKeys.ts` (Tab and Shift-Tab in a quote: the run between blank
  lines nested, or spliced back), `gridKeys.ts` (a grid's edges: Enter
  out of the last card, the joins between cards refused), `folds.ts` (a
  work's contents folding under its `##` headings: the sections, their
  counts, the decorations, the triangle's toggle), `listKeys.ts` (the gestures in a list:
  Enter, Tab, Shift-Tab, with the two truths of the refusal), `editor.ts`
  (the
  view with its plugins), `editor.css` (the
  surface's stylesheet, ported from ../writer/src/style.css; the grid's
  rules, 2026-09-22, are its first responsive ones). Tests beside
  them; the command tests are markdown in, a caret, the command, markdown
  and caret out.
- `src/store/` — storage, no DOM: `keys.ts` (what an entry key IS: the day
  and namespace vocabulary, the hash and its highlight payload, `byName`),
  `names.ts` (what a name may be on DISK: `pageName`, the byte budgets,
  `entryFile` and its inverse `importTarget`, `collidingFile`, `pictureKey`), `store.ts`
  (the keyed-store adapter contract, the memory adapter, the entry store
  with its stale-write refusal, the image and backup-handle stores),
  `entries.ts` (the entry layer: the cache, the one write path, the per-key
  chain, the warm, a landing announced to the other tabs and theirs taken — a factory over an injected store and notices),
  `files.ts` (the pick's file records, `oneEach` and `entryDocs`),
  `importFiles.ts` (the import over a file list: the sidecar refs, the
  parse gate, the tally), `pick.ts` (the walk over directory handles,
  names first, then the read), `nav.ts` (the address grammar: a hash to
  the entry it names, an href to the link minted for it), `lists.ts` (the
  derived lists and the neighbour walks, over the cache's keys),
  `fsa.ts` (the directory and file handle types the fakes are shaped to),
  `local.ts` (one localStorage key, read and written inside try),
  `plans.ts` (the backup's pure decisions: the dedup, the reconcile, the
  archive plan, the day's census), `zip.ts` (the zip byte format),
  `io.ts` (the disk edge: the tolerant writer, the listing, the zip walk,
  the backup writer with its sweep and reconcile), `exportEntries.ts` (the
  export walk over the cache and the image store), `backup.ts` (the
  automated backup: the run, the idle debounce, the folder setup and the
  resume, as a factory over callbacks), `folio.ts` (the folio token
  grammar), `reference.ts` (the citation grammar and the label over an
  injected journal), `headings.ts` (an entry's title and a root's
  directive, read from the cache), `search.ts` (the query grammar, the
  scope filter, the scan over an index with its snippets),
  `searchIndex.ts` (the index over the cache: memoised per entry on its
  text, built in chunks), `bookmarks.ts` (the list's rules: what the
  store parses to and refuses, the two views, the trigger's grammar, the
  rows that still lead somewhere), `bookmarkStore.ts` (the list in its one
  localStorage key: the latch, the seed once, the failure pin, the re-read
  and the sweep at ⌃⌘B, checked against the shared entry store — a
  factory over an injected storage),
  `shortcuts.ts` (the text expander's table grammar and the prefix
  filter), `contents.ts` (a book's own order and sections
  read off its parent's contents, the feed flip), `foldState.ts` (what a folding contents page remembers in this browser:
  its open sections), `placeState.ts` (where each entry was left, the 300
  most recent, for every arrival back), `links.ts` (the links in a stored entry
  rewritten over the document model: the host's retarget on a rename or
  a delete, the parent's relabel to a sub-page's heading), `refile.ts`
  (an author re-filed, pure: the keys that move, an address into the old
  name moved by the key it names, the text test for one left behind, the
  heading a pageless author is given). Tests beside
  them, ported from the current app's node suites where they had one.
- `src/ui/` — the UI, Svelte 5 (`src/chrome/` until 2026-09-30, and
  "chrome" its word for the UI in code and prose, both renamed because the
  word read as the browser): `notices.svelte.ts` (the notice
  ledger: the whisper, the pin, the progress line, the deferred one-shot,
  the keyed save-failure family and the pill's text — a factory over the
  clipboard writer, its state a rune), `Corner.svelte` (the indicator and
  the paused pill, drawing that state), `clipboard.ts` (the writer: the
  async API, then the textarea fallback that gives back selection and
  focus), `screen.svelte.ts` (the shared screen state: what the masthead
  reads, the gutter switch, the backups label, the interval),
  `mastheadModel.ts` (what the masthead READS for the open entry, pure:
  the crumbs, the leaf, the title, the sibling tags, the today switch, a
  namespace's roots as panel rows, the label trim), `naming.ts` (what a
  typed name becomes: the URL, slash and filename rules and the two
  refusals, pure over the store's names), `searchModel.ts` (what the
  Search row reads: the starting scope, the scope options, a result's
  "where" label), `Search.svelte` (the row: the scope select, the input,
  the results overlay), `gotoModel.ts` (what the Go to row reads and how a
  pick routes: the destination, the journal shape, a page's chain with
  the sole-child collapse), `Goto.svelte` (the row: a run of native
  selects), `subEntries.ts` (the sub-entry rules, pure: where
  a new one lives, what blocks a rename or delete, the blank subtree the
  confirm sweeps, the buttons' wording, the dialogs' texts, where a delete
  lands, the host of a sub-entry), `lifecycle.ts` (the six acts over
  entries — create, extract, rename, delete, a new root, a parent's links
  following a sub-page's heading — in their order of writes, over the
  entry layer and ports for the session, the editor, the dialogs and the
  UI; no DOM, tested on the memory store), `overlays.ts` (one thing open at
  a time: each opening closes every other — the panel, search, Go to, the
  line bar, ⌃⌘L's lines — in an order Escape's caret hand-back depends
  on, over closers main.ts hands it), `tabNotice.ts` (what another tab's landed write does to the entry on
  screen: redrawn, left to unsaved typing, or said deleted), `viewCarets.ts` (where the view
  toggle puts you back: the count held per view, the alignment between
  the two streams), `Toolbar.svelte` (the floating format bar over a
  selection), `LineBar.svelte` (⌃⌘G's find bar: the Line and Page boxes),
  `Help.svelte` over `help.html` (the help card and its text, the
  acceptance list carried whole), `bookmarksModel.ts` (the card's
  decisions: the rows, the foot line, the typed-key grammar),
  `Bookmarks.svelte` (the card), `Shortcuts.svelte` (the text expander's
  popup with its editor), `Backups.svelte` (the backups panel: setup,
  resume, the status line, the recovery note), `CopyButton.svelte` (the
  one hover copy button over a block), `richCopy.ts` (the HTML flavour:
  the staged passage, over `editor/inlineStyles.ts`, the inline-style
  sweep over a live twin that ⌘C and the hover copy share),
  `Masthead.svelte` (the sticky bar drawing it), `ui.css` (the bar's
  tokens, global). Tests beside them: the ledger's and the model's under
  node, the components' rendered to a string by svelte/server. A
  component never shares a stem with a module (the disk is
  case-insensitive; the plan's phase 3 record has the failure).
- `src/session.ts` — THE BRIDGE, DOM-facing: the editor over the journal —
  open by hash, the debounced save through the layer, the flush on leave,
  the refusal of an unknown book, the walk and today, the reference and
  the entry link to the clipboard, the builders of the two views the
  surface switches between (`src/editor/surface.ts`). `src/editor/images.ts` is the image node
  view it supplies, resolving a relative src from the store;
  `src/editor/reference.ts` the selection half of a reference — the rows
  covered, the line and leaf ranges, the highlight payload, the passage.
- `hooks/` — the gate (2026-09-08): `sig.sh` (the app tree's signature,
  shared), `accept.sh` (the reader's, records it), `pre-review.sh` (the
  PreToolUse refusal); and the test gates (2026-09-22): `stop.sh` (the
  Stop hook: tsc and the suite over a moved tree), `pre-commit` (git's:
  `npm run verify`). Wired in `.claude/settings.json` and `core.hooksPath`.
- `docs/plans/` — the plan, moved here 2026-09-07, with a "Where we are"
  table at its head kept current per phase, and since 2026-09-08 THE
  RECORD after its Status section: one dated section per phase.
- `fixtures/` — the markdown the page opens with, copied from the export
  mirror: Horace, Odes 1.1 (paired), the Introduction of Pippa Passes (a
  direction, then songs declared `⟨line⟩`), Twelfth Night 1.1 (speakers
  and directions), and Williams's Witchcraft chapter 3 (a prose book with
  leaves); and the margin-note step's two seeds, a passage of Donne's
  First Anniversarie with its margin-notes (one moved up from 30 lines on,
  so it is pushed) and a prose page with margin-notes between paragraphs
  and in a grid card.
- `index.html` + `src/main.ts` — the page Vite builds into `dist/index.html`
  (vite-plugin-singlefile inlines everything): `<main>` holding the editor,
  and main.ts the wiring — the layer, the backup, the session, the
  ledger and the masthead's acts meet there. The query strings are the
  headless tools' (`?store=seed`, `?store=seed-stanza`, `?store=write`,
  `?corner=pill`) and
  `?fixture=pippa&interval=1` opens a fixture in scratch, no store.
