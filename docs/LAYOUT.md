# Gesta's layout

Every module under `src/`, `tools/` and `one-offs/`, what each is, and the
tools' switches. `tools/claudeLayout.test.ts` fails on a module under
`src/` not named here. The rules in force are in `CLAUDE.md`.

- `src/model/` — the document model, no DOM: `schema.ts` (nodes, marks,
  `MARK_ORDER`), `grammar.ts` (the line regexes, a page label's
  grammar, and the pure string transforms both arms share), `stephanus.ts`
  (a Stephanus number: whether a label is one, its page, what a typed ask
  is, how a run is named), `table.ts` (a markdown table's lines: where one
  starts, its cells read and written), `parse.ts`, `serialize.ts`, `tokens.ts`
  (syntax highlighting's tokenizer), `fenceRefusals.ts` (the `:::` lines a
  parse left as paragraphs, with their reasons), `trim.ts` (a name or what was typed, cut at a cap),
  `flatten.ts` (the document
  as one character stream with a position map, which every search site and
  the view switch share), `alertText.ts` (every alert by id: its words,
  kind, when it is raised and its time on screen).
- `src/editor/` — the editor, DOM-facing:
  - The lines: `numbering.ts` (the unit walk: which rows are lines, their
    numbers; no DOM), `lineNumbers.ts` (drawn as decorations), `rows.ts`
    (the row node views), `rowKeys.ts` (Enter, Backspace, Delete, Tab and
    the typed pipe under a fence), `fit.ts` (the fitted measure),
    `margins.ts` (a margin-note's form and push), `measurePass.ts` (the
    measuring pass's scheduler), `continuations.ts` (a split line's rest),
    `menuArea.ts` (the menu area: the
    band an open menu stands in, and the page moved over to keep it
    clear), `dualLanguage.ts` (a dual-language block's waits and notes),
    `pages.ts` (a book's printed pages: which page labels count, where
    each page begins; no DOM), `pageGutter.ts` (the labels drawn in the
    gutter).
  - THE PASSAGE, `passage.ts` (`GLOSSARY.md`'s word): the rows a selection
    lands in, the refusal, one walk of their lines, what Ref and Ref (all)
    quote, and the marks' ranges. `pairMarks.ts` draws the marks;
    `reference.ts` builds a reference over a passage (the label's ranges,
    the highlight, the clipboard text).
  - Paste and copy: `paste.ts` (what a paste becomes, for both views:
    `pasted` and `pasteProps`, its routes in order), `terminalCopy.ts`
    (a terminal's copy: whether some HTML is one, and the text it pastes
    as), `copy.ts` (what a copy
    says, `copyProps`).
  - ⌃⌘G: `goto.ts` (`ask` and `toolbarFor`: the Go to toolbar and a link to a line alike,
    a stanza page by its Stanza and Line boxes), `landing.ts` (the landing
    mark). ⌃⌘E: `replace.ts`.
  - THE SURFACE, `surface.ts`: what HTML mode (`htmlMode.ts`)
    and markdown mode (`markdownMode.ts`) share, and the switch, ⌃⌘M; no
    DOM, tested over fake views; `viewCarets.ts`, a caret's count across
    the two views and across a changed text. `placeKeeper.ts`: where an entry was left
    and the arrival back; no DOM.
  - Keys and acts: `typing.ts` (markdown as you type), `format.ts` (the
    format toolbar's acts), `markdownKeys.ts`, `codeKeys.ts`, `quoteKeys.ts`,
    `gridKeys.ts`, `tableKeys.ts` (Enter a cell down, out from the last
    row), `listKeys.ts`, `links.ts` (a click on a link, and the link at
    the caret, which ⌃⌘Enter follows), `insertLink.ts`,
    `highlight.ts` (the jump to a highlight), `folds.ts` (a contents
    page's folds), `codeHighlight.ts`, `images.ts` (the image node view),
    `inlineStyles.ts`.
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
  `reference.ts` (the reference grammar and label),
  `conventions.ts` (a page's reference directives: read from its text,
  each at its level, as one record, and what is wrong with them),
  `headings.ts` (titles), `search.ts`,
  `searchIndex.ts`, `indexStore.ts`, `bookmarks.ts`, `bookmarkStore.ts`,
  `shortcuts.ts`, `contents.ts`, `foldMemory.ts` (which entries fold, and the
  sections each holds otherwise than it starts them), `placeState.ts`,
  `links.ts` (links rewritten on a rename or delete), `shelves.ts`,
  `refile.ts`, `move.ts` (an entry to another key), `pictures.ts` (an
  entry's pictures: those its text shows, those kept, the next free name,
  the sweep),
  `toCommonplaces.ts` (once: the retired `page/` entries moved to
  `commonplace/`),
  `entrySave.ts` (the open entry's save: the debounce, leaving an
  entry, a rename's or move's hand-over, an entry deleted elsewhere).
- `src/ui/` — the UI, Svelte 5. The models, pure and node-tested:
  `alertLedger.svelte.ts` (the alert ledger), `alertLog.ts` (every error
  and warning kept three months, read in the console as `gesta.alerts()`), `screen.svelte.ts` (shared
  screen state), `mastheadModel.ts`, `naming.ts`, `searchModel.ts`,
  `gotoRowModel.ts`, `rootListing.ts` (a namespace's roots as listed rows: by shelf,
  labelled, capped where a dropdown shows them), `menuModel.ts` (a menu's items, keys, letters typed, its acts,
  why it closed and what the one slot holds), `subEntries.ts`, `lifecycle.ts` (the six acts over
  entries, over ports), `keptState.ts` (what the browser keeps by entry
  key: places, folds, bookmarks, told once per act), `overlays.ts` (one thing open at a time),
  `tabWrite.ts` (another tab's write: taken, left or said deleted), `bookmarksModel.ts`, `backupsModel.ts`,
  `pickKeys.ts`, `richCopy.ts`, `clipboard.ts`, `counted.ts`,
  `heldKeys.ts`, `chords.ts` (every ⌃⌘ chord: its key, act, help
  line and whether the reader has it), `alertArea.ts` (the alert area
  under the masthead, and where the page shows from), `journalLoad.ts`
  (the journal's load: loading, failed or in, what an act refused
  before it says, and its errors). THE ACTS, the page's handlers, each
  a factory over the parts main.ts hands it: `searchActs.ts`,
  `gotoRowActs.ts`, `gotoToolbarActs.ts`, `landingActs.ts` (a landing, ⌃⌘G's or
  a link to a line's, and a search jump centred), `replaceActs.ts`, `bookmarkActs.ts`,
  `formatToolbarActs.ts`, `copyButtonActs.ts`, `folderActs.ts`, `menuActs.ts` (an open
  menu: its selection, keys, every closing and the focus it gives back),
  `openerActs.ts` (a menu or panel opened, toggled, answered again),
  `backupsPanelActs.ts`. The components: `Masthead`,
  `Alerts`, `Search`, `GotoRow`, `Menu`, `FormatToolbar`, `GotoToolbar`, `ReplaceToolbar`, `Help`
  (over `help.html`), `Bookmarks`, `Shortcuts`, `Backups`, `CopyButton`;
  `ui.css`.
- `src/published.ts` — the page's state published on the root for a
  reader outside the app (the entry, the saves pending, the live alerts,
  the said log, the search row, the menu's selection and area, the
  store, the launch's stages): each value's shape, its encoding and its
  reading while not yet published, which the Helium tools install in the
  page as `__published`.
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
    readings over the app), `adapters/said.ts` (what the page said since a
    step's mark), `adapters/saves.ts` (the write watcher and the wait for
    a save to land), `adapters/waits.ts` (every wait on the page's state:
    named by what it waits for, one line printed when it runs out, and
    the wait for what should not come), `adapters/textPoint.ts` (a point in the
    editor's text by a needle and an offset, and the text node it falls
    in: what a step's selection is set by, in place of a mouse aimed at
    the screen), `adapters/launch.ts` (headless Helium launched over a
    fresh profile, for every tool here), `helium-corner.ts` (the driver: `STEPS=`,
    `ORDER=reverse`, `TIMING=1`, `SHARD=k/n`), `helium-approve.ts` (the verdict;
    `WINDOWS=n`; a whole play whose order run reads otherwise beside
    corner played again once, unchanged), `heliumLedger.ts` (each verdict play appended to
    `docs/helium-runs/<day>.jsonl`; only a whole play of a committed tree
    is evidence for the rate, each run's inputs fingerprinted), `heliumRate.ts`
    (the flake rate from it, per day, window count and section, and each
    run whose same inputs read more than one way, over every whole play), `heliumThrottle.ts` (the corner's steps
    with every page's CPU n times slower, `THROTTLE=n`, and the sections
    that read otherwise: a step that waits on a clock), `heliumShards.ts` (the sections dealt over windows and
    their prints merged back as one window's), `heliumPlay.ts` (a driver played,
    over one window or dealt over several: the profiles, the builds, a
    crashed window's tail, the throttle rate given, never the shell's),
    `heliumStamp.ts`, `heliumOrder.ts`, `helium-probe.ts`,
    `helium-mock.ts` with `mockPage.ts` (a design's mock: `node
    tools/helium-mock.ts <spec>`, a spec under `tools/out/mocks/` naming
    the backup's entries, the states and the options; each state shot as
    the app stands and under each option, every floating bar lifted and
    outlined in a second frame with the text it covers, onto one page
    under `tools/out/mocks/<spec>/`, ready to publish),
    `helium-bridge.ts`, `helium-reader.ts`. These are checked by their own
    `tsconfig.helium.json` under `npm run check`, over `heliumPage.ts`
    (the page's hooks and playwright's types) and `heliumDom.d.ts` (a query
    answering with an element); `tsconfig.json` leaves them out.
  - The checkers: `comments.ts` with `commentRules.ts`, `testTitles.ts`
    with `testTitlesRun.ts`, `codeHealth.ts` with `codeHealthRun.ts`,
    `vocabulary.ts` with `vocabularyRun.ts` (the retired words' rules, and
    `npm run vocabulary`, every line using one, run when a word is retired;
    not under `verify`), `claudeLayout.test.ts` (every src/ module named
    here), `apostrophes.ts` (what the app shows writes ’, not '),
    `unusedExports.ts` (an export nothing uses, or only
    tests, fails, its allowed list giving each exception's reason),
    `hooks-test.sh`, `accepted.sh`, `commitSubject.ts` (the commit-msg
    hook's check: a Conventional Commits subject, 72 characters at most);
    `chordSpelling.test.ts` (a ⌃⌘ key under src/ spelt "Ctrl-Meta-",
    never with "Mod", which is Ctrl off macOS);
    `waitCatches.test.ts` (no wait in the steps or their adapters
    swallows its failure, its allowed list giving each exception's reason);
    `saidReadings.test.ts` (a Helium reading of what the page said reads
    `__said`; the corner only where its showing is the point);
    `alertsPage.ts` (writes `docs/alerts.md` from `src/model/alertText.ts`;
    its test fails when the page is not what the table writes);
    `sourceSpans.ts` (a source file's comments, strings and template
    text, which both `commentRules.ts` and `apostrophes.ts` read).
  - The day's progress, `progress/`: `events.ts` (a day's events replayed
    to a time: each item's state, the counts), `page.ts` (the page, a
    snapshot at a time, or with `--slides` the slideshow, under
    `tools/out/progress/`, the slideshow the day every half hour; with
    `--terminal` the counts and lists as text; below the lists, the day in
    order), `spans.ts` (the day in order: each span of work from its start
    to its end, a parent's own time, the gaps, the totals),
    `log.ts` (an event appended as it happens, refused when it names no
    list or no item, the day's page and slideshow redrawn after),
    `day.ts` (a day's events read from its log), `reviewRow.ts` (a typed
    `/code-review` or `/improve-codebase-architecture` adds and starts its
    row, run by `hooks/skill-row.sh`); each day's events in
    `docs/progress/`.
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
  holds to be settled then). `docs/alerts.md` — every alert by kind, its
  words and when it is raised, written from the table by
  `tools/alertsPage.ts`.
