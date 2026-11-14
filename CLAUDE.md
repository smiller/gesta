# Gesta

Gesta: a journal and bookshelf in one page. The editor on ProseMirror, the
UI on Svelte 5, built by Vite into ONE `index.html` that opens from
`file://`. It began as a rebuild of the `../writer` version, recorded in
the conversion plan, and has been the running app since 2026-09-22; that
version is not maintained, nothing built here is carried back, and only the
conversion plan calls it "the current app".

This file holds what is IN FORCE: the process and the layout. Why each rule
exists, and the measurements behind it, live in THE RECORD: `docs/plans/`,
one plan per piece of work, dated, each with its decisions and a record of
what was built and measured. The first,
`2026-09-07-feat-successor-app-prosemirror-svelte-plan.md`, is the
conversion's own, its phases' record in dated sections; a rule below names
the plan it came from where one exists. A rule a plan set that later work
must keep is restated here.

## The process in force

- REPORTING — what is SAID about the work, which no checker reads:
  - Every factual sentence is tagged MEASURED (naming the command), READ
    (file:line) or INFERRED. One that fits none of the three is deleted,
    not hedged.
  - No connective tissue: a sentence written to make another one land is
    cut. Fabrications sit in those, never in a number.
  - A rate, an interval or a trend needs two dated readings and the gap
    between them.
  - Hand over the artifact, not the claim: a command and its output, a
    probe to paste, a file:line.
  - Report who found what, exactly.
  - A reply's first and last sentences carry something not already in it,
    or they go; a restated fact is the commonest filler.
  - A correct criticism is never softened into a position to be contested.
  - The object is the best version of the project, not being right about
    it.
- THE COMMENT STANDARD (record: docs/plans/2026-09-28-chore-comment-standard-plan.md):
  - NO COMMENT BY DEFAULT. One stays only if someone changing this code
    would get it wrong without it, in a way the code, its names, types and
    tests cannot prevent: a DECISION, a MEASUREMENT, a past FAILURE.
  - It speaks only of the code it sits on. Nothing about what another
    module does; a CONTRACT between modules is a test, written when found.
  - No provenance: dates, "the reader", "the review", "asked" live in the
    record alone.
  - A failure or decision a test can check is PINNED, in a fixed trailing
    form, one group per pin: `(pin: <section> › <reading label>)` for a
    Helium step, `(pin: bridge › …)`, `(pin: reader › …)`,
    `(pin: console › <line prefix>)` for a console line of the approved
    run, `(pin: <file>.test › <title prefix>)` for a Vitest test.
  - No module header where the layout says what the file is; an interface
    member's comment only where its name and type cannot say it.
  - A comment MOVED with its code into another module is re-read against
    this standard before the commit: what was its own module's mechanism
    may be another module's where it lands.
- A CHANGED COMMENT IS READ BEFORE IT IS COMMITTED: `npm run test:comments`
  fails while the ledger of added or changed blocks is unread; each block is
  read against the standard, fixed if it fails, and `npm run comments:read`
  records the ledger. A promise like the accept, not a proof.
- THE COMMENT CHECKER, `tools/comments.ts` (`npm run test:comments`, under
  `verify`), over src/ with its tests and the daily tools/ (not
  one-offs/): it FAILS on a pin that does not resolve, and on an added or
  changed block that names another module (an identifier another file
  declares at its top level, a file path, a role noun's possessive such as
  "the session's") or carries provenance (a date outside quotes, "the
  reader", "the review", "the reviewer", a confirmation pass, "the plan");
  the app's user, in a sentence about behaviour, is "a reader". It prints
  THE LEDGER. `--commit R` reads one commit; `--sweep` lists every block
  that breaks either rule. It catches six of the fourteen known-bad blocks;
  the review stays the net for a module named only by its role in prose.
- A TEST'S DESCRIPTION STATES THE RULE; the exact forms live only in its
  assertions. `npm run test:titles`, under `verify`, lists tests whose code
  differs from HEAD under the same description; each is read against its
  assertions, fixed if out of step, and `npm run titles:read` records it.
- THE WORD IS "REFERENCE", for what ⌃⌘R makes and every part of it, in
  code, tests, help, tools and replies; a label is a link's text;
  `one-offs/shelfLines.ts` calls a typed attribution a "source line".
  `tools/vocabulary.test.ts` fails on a retired word in src/, tools/,
  one-offs/, this file or the glossary; dated plan records keep their words.
- THE DOMAIN'S WORDS are in `GLOSSARY.md`, the file
  `/improve-codebase-architecture` reads: things a reader of the app would
  recognise, never how the code does them; a word is added when a design
  names it.
- CODE HEALTH 10, AND HELD THERE (record:
  docs/plans/2026-11-11-chore-code-health-plan.md): every TypeScript file
  under src/ (tests included), tools/ and one-offs/ scores CodeScene's Code
  Health 10, and no change lowers one. `npm run test:health`, under
  `verify` and the Stop hook, scores each file that differs from HEAD and
  refuses one below its HEAD score, or a new one below 10, naming its
  smells; the Stop hook's refusal is the loop. A CLI that cannot measure
  fails `verify` but lets a Stop through; sign it in with
  `! ~/Library/Caches/codehealth-mcp/MCP-*/cs auth login`. Primitive
  Obsession and String Heavy Function Arguments are OFF
  (`.codescene/code-health-rules.json`): they read spelling, not safety;
  every structural rule stands at CodeScene's default, and that file is
  never edited to quiet a structural finding. `.svelte` is not scored.
  While restructuring, `cs review <file>` or the MCP's
  `code_health_review` reads a file's smells.
- HELIUM IS THE TRUTH: Sean runs Gesta in Helium (`/Applications/Helium.app`,
  a Chromium fork) from `file://`. Every real-behaviour question is
  answered there; a synthetic event proves only that a handler is reachable.
- HAND-CHECK STEPS ARE ACCURATE BEFORE THEY ARE HANDED OVER. Each step
  names the entry and its kind (a page, a book, a journal day); every
  control by its label on screen; every key, Enter and Escape included; the
  expected result as what is SEEN; and what the step does NOT cover. Its
  expected words, lines and counts come from that entry in the backup
  (THE CORPUS, below), never from a fixture or seed that shares its name.
  Every step a probe can play is played headless first and its expectation
  is MEASURED; a step not played says so. A step no hand can reach (a
  forgotten store, a failed write) is named as the tests', not handed over.
- TEST-FIRST, AND VERIFIED: new behaviour is built test-first (`npm test`,
  Vitest), and `npm run verify` (tsc, the suite, the checkers, then the
  headless tools under their verdict) passes before work is called done.
- THE HELIUM VERDICT: `npm run test:helium` plays the steps
  (`tools/helium-steps.ts`) and compares the whole run, scrubbed, against
  `tools/expected/corner.approved.txt`. `--approve` makes the run just
  played the approved copy: a judgement made after reading the whole diff,
  never to quiet it. It does not play again, and refuses a run with a
  failed section, a run of some steps, or one whose inputs moved since it
  played. A `.received.txt` is never committed. A PASSING RUN IS NOT
  REPLAYED: `tools/heliumStamp.ts` fingerprints what a run reads, and a
  run with the same fingerprint prints "ok — not replayed"; `STEPS=` always
  plays. The comparisons with the `../writer` version, in Helium and in
  the corpus tool, are retired; git history has them.
- REVIEWS, BY BATCH: the free checkers first, then ONE `/code-review` at
  HIGH over a commit range, when a batch touches a DOM seam (main.ts,
  session.ts, editor.ts, paste.ts, renderedView.ts, sourceView.ts) or
  closes a phase, never per commit. Its findings land in one fix commit. A
  confirmation pass is offered at its measured price, runs only on the
  reader's word, and only when a finding changed behaviour. High, not
  medium, and no cheaper tier (record:
  docs/plans/2026-09-28-feat-contents-folds-plan.md). EVERY review's cost is recorded in its plan's record and reported:
  the last message of the run's `subagents/agent-*.jsonl` transcript,
  input + cache creation + cache read + output tokens, never estimated. A
  reviewer finding a MECHANICAL class (a literal, a name that does not
  resolve, a comment shape) owes a checker under `tools/`, not just a fix.
- THE ARCHITECTURE RUN, beside each batch's review, after the accept:
  `/improve-codebase-architecture` (Matt Pocock's, in `.claude/skills/`
  with `codebase-design`, `grilling` and `domain-modeling`, pinned at
  mattpocock/skills `7739eae`, never edited here), aimed at the batch's
  files. Not in the Stop hook: it is a judgement that always finds a
  candidate. Each candidate is grilled, then built test-first or refused
  with its reason as an ADR in `docs/adr/`, which the skill reads; "it
  suggests nothing" means every candidate built or refused. Its cost is
  recorded like a review's.
- THE GATE: no review-shaped call while `src/` or `index.html` has moved
  past the last acceptance. Finish the work, make the suite green, tell the
  reader what to look at, and STOP; they run `! sh hooks/accept.sh` once
  they have looked, and `hooks/pre-review.sh` (PreToolUse on Skill, Agent
  and Workflow) refuses the review skills, any Workflow and a review-shaped
  Agent until the tree's signature matches. The agent asks whether the tree
  is accepted with `sh tools/accepted.sh` alone. `hooks/**`,
  `.claude/settings.json` and the accept script are permission-denied to
  the agent.
- THE TEST GATES: `hooks/stop.sh` refuses to end a turn while `src/` or
  `index.html` differ from HEAD and tsc, the suite or the checkers are red;
  `hooks/pre-commit` (`core.hooksPath hooks`, set once per clone) runs
  `npm run verify` before any commit. `tools/hooks-test.sh`, under
  `verify`, asserts every hook's exit codes over a throwaway repo and reads
  the wiring from this one.
- COMMITS follow Conventional Commits v1.0.0
  (https://www.conventionalcommits.org/en/v1.0.0/): a subject line
  `type(scope)!: summary`, the type one of build, chore, ci, docs, feat,
  fix, perf, refactor, revert, style or test, the scope optional, `!` for a
  breaking change, the whole line 72 characters at most; then a blank line
  and a body with the detail (what changed, what was measured, "asked");
  then the trailers (`Co-Authored-By:`).
- DEPENDENCIES: `node_modules` carries the Dropbox-ignore attribute; a
  clean reinstall runs `mkdir -p node_modules && xattr -w com.dropbox.ignored 1 node_modules`
  FIRST. Versions are pinned exact (`npm install --save-exact`).
- STORAGE: names live OUTSIDE `page750.*` (every `file://` page shares one
  storage origin); the `../writer` version's databases are never read; data arrives by
  import of the export folder.
- NOT YET — more prose checkers: one is added when its class first shows
  up in a review, with its self-test, its hit count measured before its
  rule is chosen.
- NEVER — the single-file checkers (the vocabulary index, check-sync,
  map.sh, names.sh, the concatenating build): TypeScript and the import
  graph answer their question.

## Rules the plans set that later work keeps

- Headless Helium is `--headless=new` by executable path, wrapped in a
  kill. A storage question is answered through playwright-core waiting for
  the attribute, never a `--dump-dom`. The tools use their own profiles
  under `tools/out`, and a lingering headless process is killed by its
  profile name, never by the app's.
- A `.svelte` component never shares a stem with a `.ts` module (the disk
  is case-insensitive). svelte-check is not installed; a component is
  checked by its compile and its test. A decision in a component moves to
  a module, where CodeScene scores it and a node test reads it.
- Every ⌃⌘ chord was carried from the `../writer` version or asked for (⌃⌘I "italic, but a
  line", ⌃⌘N "new"). Whether Helium passes a chord through is answered
  only by pressing it there; every new chord is named for a hand to try.
- A headless step reads THE SCREEN after a gesture (the entry, the
  selection, the bar, the corner), not only the bit the feature promises;
  and a step's wait never swallows its timeout: the reading carries what
  the corner said, matching or not.
- The stored text is markdown, the field `md`; a save is serialize and
  compare; an entry the model refuses is shown as source, never edited as
  a lossy document.
- EVERY HELIUM SECTION STARTS FRESH: storage, clipboard and dialog answers
  cleared and the fixtures seeded before each. A section needing an entry,
  a bookmark list or a shortcut table writes it itself (`writeAll`, `keep`
  in the kit); reading what another section left is the failure; a race a
  reading depends on is held by the step. The verdict's `order` run plays
  the steps last first, and a section reading otherwise than in the corner
  run fails `verify` (`tools/heliumOrder.ts`); the remedy is the section's
  own setup.
- THE ROWS OF A TEXT BLOCK ARE NOT ALL ONE SHAPE. In `::: dual-language`,
  row X is a `.vpair` whose English cell runs down beside the rows after
  it, which are `.vrow:not(.vpair)`, with no English cell; a split line's
  rest (`⟨…⟩`) has its own English or none; plain paired verse has rows
  with no `|`; a block numbered on both sides has rows with nothing on the
  left; a stanza counts its own lines. Anything that acts on a row is read
  in Helium on every kind it can land on, and the report says which kinds
  were played.

## Layout

Tests sit beside their modules as `*.test.ts`; Vitest also reads
`tools/**` and `one-offs/**`. THE CORPUS is
`~/Library/CloudStorage/Dropbox/gesta-backups/current`, this app's backup
(`gesta-snapshots` is the `../writer` version's and is never read).

- `src/model/` — the document model, no DOM: `schema.ts` (nodes, marks,
  `MARK_ORDER`), `grammar.ts` (the line regexes and the pure string
  transforms both arms share), `parse.ts`, `serialize.ts`, `tokens.ts`
  (syntax highlighting's tokenizer), `fenceRefusals.ts` (the `:::` lines a
  parse left as paragraphs, with their reasons), `flatten.ts` (the document
  as one character stream with a position map, which every search site and
  the view switch share).
- `src/editor/` — the editor, DOM-facing:
  - The lines: `numbering.ts` (the unit walk: which rows are lines, their
    numbers; no DOM), `lineNumbers.ts` (drawn as decorations), `rows.ts`
    (the row node views), `rowKeys.ts` (Enter, Backspace, Delete, Tab and
    the typed pipe under a fence), `fit.ts` (the fitted measure),
    `margins.ts` (a margin-note's form and push), `measurePass.ts` (the
    measuring pass's scheduler), `continuations.ts` (a split line's rest),
    `dualLanguage.ts` (a dual-language block's waits and notes),
    `pages.ts` (a book's printed pages: which page labels count, where
    each page begins; no DOM), `pageGutter.ts` (the labels drawn in the
    gutter).
  - THE PASSAGE, `passage.ts` (`GLOSSARY.md`'s word): the rows a selection
    lands in, the refusal, one walk of their lines, what Ref and Ref (all)
    quote, and the marks' ranges. `pairMarks.ts` draws the marks;
    `reference.ts` builds a reference over a passage (the label's ranges,
    the highlight, the clipboard text).
  - Paste and copy: `paste.ts` (what a paste becomes, for both views:
    `pasted` and `pasteProps`, its routes in order), `copy.ts` (what a copy
    says, `copyProps`).
  - ⌃⌘G: `goto.ts` (`ask` and `bar`: the bar and a link to a line alike,
    a stanza page by its Stanza and Line boxes), `landing.ts` (the landing
    mark). ⌃⌘E: `replace.ts`.
  - THE SURFACE, `surface.ts`: what the rendered view (`renderedView.ts`)
    and the source view (`sourceView.ts`) share, and the switch, ⌃⌘M; no
    DOM, tested over fake views. `placeKeeper.ts`: where an entry was left
    and the arrival back; no DOM.
  - Keys and acts: `typing.ts` (markdown as you type), `format.ts` (the
    toolbar's acts), `sourceKeys.ts`, `codeKeys.ts`, `quoteKeys.ts`,
    `gridKeys.ts`, `listKeys.ts`, `links.ts` (a click on a link),
    `insertLink.ts`, `highlight.ts` (the jump to a highlight), `folds.ts`
    (a contents page's folds), `codeHighlight.ts`, `images.ts` (the image
    node view), `inlineStyles.ts`.
  - `editor.ts` (the view with its plugins), `editor.css`. The command
    tests are markdown in, a caret, the command, markdown and caret out.
- `src/store/` — storage, no DOM: `keys.ts` (what an entry key is, the
  hash, `Address` and `asAddress`), `names.ts` (names on disk),
  `store.ts` (the adapter contract and stores), `entries.ts` (the entry
  layer: cache, the one write path, the warm, other tabs' landings),
  `files.ts`, `importFiles.ts`, `pick.ts`, `nav.ts` (the address grammar),
  `lists.ts`, `fsa.ts`, `local.ts`, `plans.ts` (the backup's pure
  decisions), `zip.ts`, `bundle.ts` (the reader's bundle), `io.ts` (the
  disk edge and the backup writer), `exportEntries.ts`, `backup.ts`,
  `pageLabels.ts` (a page label's grammar), `reference.ts` (the
  reference grammar and label),
  `conventions.ts` (a page's reference directives, each read at its
  level, as one record), `headings.ts` (titles and a page's directive
  text), `search.ts`,
  `searchIndex.ts`, `indexStore.ts`, `bookmarks.ts`, `bookmarkStore.ts`,
  `shortcuts.ts`, `contents.ts`, `foldState.ts`, `placeState.ts`,
  `links.ts` (links rewritten on a rename or delete), `shelves.ts`,
  `refile.ts`, `move.ts` (an entry to another key), `pictures.ts`,
  `toCommonplaces.ts` (once: the retired `page/` entries moved to
  `commonplace/`),
  `entrySave.ts` (the open entry's save: the debounce, leaving an
  entry, a rename's or move's hand-over, an entry deleted elsewhere).
- `src/ui/` — the UI, Svelte 5. The models, pure and node-tested:
  `notices.svelte.ts` (the notice ledger), `screen.svelte.ts` (shared
  screen state), `mastheadModel.ts`, `naming.ts`, `searchModel.ts`,
  `gotoModel.ts`, `subEntries.ts`, `lifecycle.ts` (the six acts over
  entries, over ports), `overlays.ts` (one thing open at a time),
  `tabNotice.ts`, `viewCarets.ts`, `bookmarksModel.ts`, `backupsModel.ts`,
  `cardKeys.ts`, `richCopy.ts`, `clipboard.ts`, `counted.ts`,
  `heldKeys.ts`, `mastheadBottom.ts`, `journalLoad.ts` (the journal's
  load: loading, failed or in, what an act refused before it says, and
  its pins). THE ACTS, the page's handlers, each
  a factory over the parts main.ts hands it: `searchActs.ts`,
  `gotoActs.ts`, `lineBarActs.ts`, `replaceActs.ts`, `bookmarkActs.ts`,
  `formatBarActs.ts`, `copyButtonActs.ts`, `folderActs.ts`,
  `panelActs.ts`, `backupsPanelActs.ts`. The components: `Masthead`,
  `Corner`, `Search`, `Goto`, `Toolbar`, `LineBar`, `ReplaceBar`, `Help`
  (over `help.html`), `Bookmarks`, `Shortcuts`, `Backups`, `CopyButton`;
  `ui.css`.
- `src/session.ts` — THE BRIDGE: the editor over the journal; open by
  hash, the save's flush on leave, the walk, the reference and
  entry link to the clipboard, the two views' builders.
- `index.html` + `src/main.ts` — the page Vite builds into one
  `dist/index.html` (the favicon inlined by main.ts); main.ts is the
  wiring. Query strings for the headless tools: `?store=write`,
  `?corner=pill`, `?warm=slow`; the steps write their own entries into the
  store (`SEEDS` and the rest in `tools/steps/kit.ts`).
- THE READER: `npm run build:reader` builds `dist-reader/index.html`, a
  picked bundle's entries read-only; the backup writes the bundle;
  `tools/readerBundle.ts` makes one; `tools/publishReader.sh` publishes it,
  only on the reader's word. Record: docs/plans/2026-10-31-feat-reader-plan.md.
- `tools/` — what is used every day:
  - The corpus: `corpus.ts` (the round trip over the corpus: a fixed
    point, the document unchanged, no asterisk gained; its report in
    `tools/out`), `importCorpus.ts` (the import over it, into memory).
  - Helium: `helium-steps.ts` (THE STEPS; sections in `tools/steps/`, a
    module a group, over `steps/kit.ts` and `steps/timing.ts`; `TODAY` the
    fixed date the page's clock is set to), `adapters/app.ts` (the
    readings over the app), `helium-corner.ts` (the driver: `STEPS=`,
    `ORDER=reverse`, `TIMING=1`), `helium-approve.ts` (the verdict),
    `heliumStamp.ts`, `heliumOrder.ts`, `helium-probe.ts`,
    `helium-bridge.ts`, `helium-reader.ts`. These are checked by their own
    `tsconfig.helium.json` under `npm run check`, over `heliumPage.ts`
    (the page's hooks and playwright's types) and `heliumDom.d.ts` (a query
    answering with an element); `tsconfig.json` leaves them out.
  - The checkers: `comments.ts` with `commentRules.ts`, `testTitles.ts`
    with `testTitlesRun.ts`, `codeHealth.ts` with `codeHealthRun.ts`,
    `vocabulary.ts`, `claudeLayout.test.ts` (every src/ module named
    here), `apostrophes.ts` (what the app shows writes ’, not '),
    `unusedExports.ts` (an export nothing uses, or only
    tests, fails, its allowed list giving each exception's reason),
    `hooks-test.sh`, `accepted.sh`.
- `one-offs/` — scripts run once or a few times over the backup to set
  its entries right; every check holds over them as over `tools/`. What
  each one is: `one-offs/README.md`.
- `hooks/` — `sig.sh`, `accept.sh`, `pre-review.sh`, `stop.sh`,
  `pre-commit`; wired in `.claude/settings.json` and `core.hooksPath`.
- `fixtures/` — the markdown the headless tools seed, copied from the
  export mirror (Horace, Pippa Passes, Twelfth Night, Williams, Donne's
  margin-notes, Samson, Ovid's dual-language and Golding, Horace's
  Satires 1.10).
- `docs/plans/` — THE RECORD: one dated plan per piece of work, the
  conversion's first. `docs/brainstorms/` — the higher-level thinking (and
  mock-ups) a plan may start from, the compound-engineering plugin's.
  `docs/adr/` — architecture decisions, made when the first is (what it
  holds to be settled then).
