# Gesta (the successor)

Gesta rebuilt as a project with a build step: the editor on ProseMirror, the
chrome on Svelte 5, the output still ONE `index.html` that opens from
`file://`. The plan and phase 0's record are
`docs/plans/2026-09-07-feat-successor-app-prosemirror-svelte-plan.md`
(moved here 2026-09-07; the copy in ../writer/docs/plans is marked
continued here), and so is THE RECORD: every phase's decisions and
measurements, one dated section per phase under "Phase N decisions",
moved out of this file 2026-09-08 (they were four fifths of it, loaded
into every session). This file holds what is IN FORCE — the process and
the layout — and points at the record; a rule a record entry set that
later work must keep is restated here, not only there. The running app
is `../writer`, and it stays the running app until this one imports the
whole export and has been used for real entries.

The process this repository follows is `../writer/CLAUDE.md`, carried over
PER CHECKER as each becomes relevant (the plan's decision 7). What is in force
here NOW, and what is not yet:

- IN FORCE — the whole "Reporting" section of ../writer/CLAUDE.md, verbatim:
  every factual sentence tagged MEASURED / READ / INFERRED, no connective
  tissue, hand over the artifact not the claim, report who found what.
- IN FORCE — comments record a DECISION, a MEASUREMENT or a past FAILURE; a
  claim about what another function does is an assertion, not a comment.
- IN FORCE — Sean runs Gesta in HELIUM (`/Applications/Helium.app`, a
  Chromium fork), from `file://`. Every real-behaviour question is answered
  there; a synthetic event proves only that a handler is reachable.
- IN FORCE — new behaviour is built test-first (`npm test`, Vitest), and the
  suite plus `npm run check` (tsc) pass before work is called done.
- IN FORCE — `node_modules` carries the Dropbox-ignore attribute. A
  `rm -rf node_modules` loses it with the directory, so a clean reinstall runs
  `mkdir -p node_modules && xattr -w com.dropbox.ignored 1 node_modules`
  FIRST. Versions are pinned exact (`npm install --save-exact`).
- IN FORCE — storage names live OUTSIDE `page750.*`: every `file://` page
  shares one storage origin (MEASURED 2026-09-07 in Helium), and the successor
  never reads the old databases. Data arrives by import of the export folder.
- NOT YET — the acceptance gate, the review order, `hooks/`, the prose
  checkers (`tools/*.sh` in ../writer). They come with phase 4, the review
  order first because it governs spend. Until then: finish the work, make the
  suite green, tell Sean what to look at, and STOP — no reviewers run on code
  he has not seen.
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
- The stored text is markdown, the field `md`; a save is serialize and
  compare, and an entry the model refuses is shown as source, never
  edited as a lossy document (phases 2 and 3).

## Layout

- `src/model/` — the document model, no DOM: `schema.ts` (nodes, marks, and
  `MARK_ORDER`, the nesting the serializer writes), `grammar.ts` (the line
  regexes and the pure string transforms both arms share), `parse.ts`
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
- `tools/helium-corner.mjs` — the corner and the masthead in headless
  Helium over a fresh profile: the indicator after the warm, past its
  whisper, after typing, after a click, and on a refused walk; the masthead
  over the verse fixture; the pages and bookshelf panels through open,
  displace, toggle, Escape, a click outside and a row click; the three
  kinds of link click; the Search row through ⌃⌘K, a query, ↓ and Enter;
  the Go to row through ⌃⌘J on a day, a day pick, the book's chain, a
  scope pick and Escape; a refused fence typed in the source and the
  switch back, then a clean one; Tab and Shift-Tab in a quote, ⌃⌘L over verse
  and Escape; ⌃⌘R over a paired row with the clipboard read
  back; a js fence typed, its tokens, its label, the
  copy button hovered and clicked; a PNG drawn on a canvas pasted as a
  file; the
  backups panel unconfigured; ⌃⌘S over an
  empty table, a table saved, a code
  filtered and Enter; ⌃⌘B, A, a numbered jump, a key given and typed,
  ×; ⌃⌘H over an open panel and Escape; ⌃⌘G over
  verse and over a book of leaves; a
  reference pasted as plain text and its link followed back; the toolbar
  over a double-clicked word, B, and Tag with its dialog; the source view through ⌃⌘M with the caret's
  count carried across, an edit and a Tab in the source, and ⌃⌘M back;
  a tagged entry created, renamed and deleted
  through the dialogs, the host's link and tag bar read at each step; the
  pill under `?corner=pill`; prints each reading and the console, and
  screenshots when given a path.
- `tools/referenceCorpus.ts` — the citation label for entry keys over the
  mirror read into memory, `node tools/referenceCorpus.ts [dir] [key ...]`;
  the current app's ⌃⌘C on the same entries is the other side.
- `src/editor/` — the editor, DOM-facing: `numbering.ts` (the unit walk
  over the document — which rows are lines, and their numbers; no DOM),
  `lineNumbers.ts` (the plugin drawing that answer as node decorations),
  `rows.ts` (the line, pair, gap and note node views), `rowKeys.ts` (the
  gestures under a fence, as commands: Enter, Backspace, Delete, Tab, the
  typed pipe), `fit.ts` (the fitted measure: the arithmetic pure, the
  measuring pass and its scheduling as a plugin view), `folios.ts` (the
  gutter's switch: `foliopage` on the root where a leaf is the text's),
  `typing.ts` (markdown as you type: the input rules and the two Enter
  arms), `links.ts` (a click on a link: the pure decision and the
  handler), `highlight.ts` (the jump: the nth occurrence of a query
  selected and scrolled to), `insertLink.ts` (a link placed after the
  caret, and what refuses one), `sourceKeys.ts` (Tab and Shift-Tab in
  the source view, over a text and a selection), `format.ts` (the
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
  lines nested, or spliced back), `listKeys.ts` (the gestures in a list:
  Enter, Tab, Shift-Tab, with the two truths of the refusal), `editor.ts`
  (the
  view with its plugins), `editor.css` (the
  surface's stylesheet, ported from ../writer/src/style.css). Tests beside
  them; the command tests are markdown in, a caret, the command, markdown
  and caret out.
- `src/store/` — storage, no DOM: `keys.ts` (what an entry key IS: the day
  and namespace vocabulary, the hash and its highlight payload, `byName`),
  `names.ts` (what a name may be on DISK: `pageName`, the byte budgets,
  `entryFile` and its inverse `importTarget`, `collidingFile`), `store.ts`
  (the keyed-store adapter contract, the memory adapter, the entry store
  with its stale-write refusal, the image and backup-handle stores),
  `entries.ts` (the entry layer: the cache, the one write path, the per-key
  chain, the warm — a factory over an injected store and notices),
  `files.ts` (the pick's file records, `oneEach` and `entryDocs`),
  `importFiles.ts` (the import over a file list: the sidecar refs, the
  parse gate, the tally), `pick.ts` (the walk over directory handles,
  names first, then the read), `nav.ts` (the address grammar: a hash to
  the entry it names, an href to the link minted for it), `lists.ts` (the
  derived lists and the neighbour walks, over the cache's keys),
  `fsa.ts` (the directory and file handle types the fakes are shaped to),
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
  store parses to and refuses, the two views, the trigger's grammar),
  `shortcuts.ts` (the text expander's table grammar and the prefix
  filter), `contents.ts` (a book's own order and sections
  read off its parent's contents, the feed flip), `links.ts` (the links in a stored entry
  rewritten over the document model: the host's retarget on a rename or
  a delete, the parent's relabel to a sub-page's heading). Tests beside
  them, ported from the current app's node suites where they had one.
- `src/chrome/` — the chrome, Svelte 5: `notices.svelte.ts` (the notice
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
  lands, the host of a sub-entry), `viewCarets.ts` (where the view
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
  `Masthead.svelte` (the sticky bar drawing it), `chrome.css` (the bar's
  tokens, global). Tests beside them: the ledger's and the model's under
  node, the components' rendered to a string by svelte/server. A
  component never shares a stem with a module (the disk is
  case-insensitive; the plan's phase 3 record has the failure).
- `src/session.ts` — THE BRIDGE, DOM-facing: the editor over the journal —
  open by hash, the debounced save through the layer, the flush on leave,
  the refusal of an unknown book, the walk and today, the reference and
  the entry link to the clipboard, the source view and its switch. `src/editor/images.ts` is the image node
  view it supplies, resolving a relative src from the store;
  `src/editor/reference.ts` the selection half of a reference — the rows
  covered, the line and leaf ranges, the highlight payload, the passage.
- `docs/plans/` — the plan, moved here 2026-09-07, with a "Where we are"
  table at its head kept current per phase, and since 2026-09-08 THE
  RECORD after its Status section: one dated section per phase.
- `fixtures/` — the markdown the page opens with, copied from the export
  mirror: Horace, Odes 1.1 (paired), the Introduction of Pippa Passes (a
  direction, then songs declared `⟨line⟩`), Twelfth Night 1.1 (speakers
  and directions), and Williams's Witchcraft chapter 3 (a prose book with
  leaves).
- `index.html` + `src/main.ts` — the page Vite builds into `dist/index.html`
  (vite-plugin-singlefile inlines everything): `<main>` holding the editor,
  and main.ts the wiring — the layer, the backup, the session, the
  ledger and the masthead's acts meet there. The query strings are the
  headless tools' (`?store=seed`, `?store=write`, `?corner=pill`) and
  `?fixture=pippa&interval=1` opens a fixture in scratch, no store.
