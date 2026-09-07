# Gesta (the successor)

Gesta rebuilt as a project with a build step: the editor on ProseMirror, the
chrome on Svelte 5, the output still ONE `index.html` that opens from
`file://`. The plan and phase 0's record are
`../writer/docs/plans/2026-09-07-feat-successor-app-prosemirror-svelte-plan.md`;
from phase 1 on the decisions and measurements are recorded HERE, in the
dated sections below, and in this repository's history;
the running app is `../writer`, and it stays the running app until this one
imports the whole export and has been used for real entries.

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

## Layout

- `src/model/` — the document model, no DOM: `schema.ts` (nodes, marks, and
  `MARK_ORDER`, the nesting the serializer writes), `grammar.ts` (the line
  regexes and the pure string transforms both arms share), `parse.ts`
  (markdown → document), `serialize.ts` (document → markdown). Tests sit
  beside them as `*.test.ts`.
- `tools/corpus.ts` — the whole-corpus round trip over an export folder,
  `node tools/corpus.ts [dir]`; writes `tools/out/corpus-report.txt`.
  Phase 0's gate: nothing in later phases is worth building until it is
  green over the corpus.
- `src/editor/` — the editor, DOM-facing: `numbering.ts` (the unit walk
  over the document — which rows are lines, and their numbers; no DOM),
  `lineNumbers.ts` (the plugin drawing that answer as node decorations),
  `rows.ts` (the line, pair and gap node views), `rowKeys.ts` (the
  gestures under a fence, as commands: Enter, Backspace, Delete, Tab, the
  typed pipe), `fit.ts` (the fitted measure: the arithmetic pure, the
  measuring pass and its scheduling as a plugin view), `folios.ts` (the
  gutter's switch: `foliopage` on the root where a leaf is the text's),
  `typing.ts` (markdown as you type: the input rules and the two Enter
  arms), `editor.ts` (the
  view with its plugins), `editor.css` (the
  surface's stylesheet, ported from ../writer/src/style.css). Tests beside
  them; the command tests are markdown in, a caret, the command, markdown
  and caret out.
- `fixtures/` — the markdown the page opens with, copied from the export
  mirror: Horace, Odes 1.1 (paired), the Introduction of Pippa Passes (a
  direction, then songs declared `⟨line⟩`), Twelfth Night 1.1 (speakers
  and directions), and Williams's Witchcraft chapter 3 (a prose book with
  leaves).
- `index.html` + `src/main.ts` — the page Vite builds into `dist/index.html`
  (vite-plugin-singlefile inlines everything). In phase 1 it is the editor
  over a fixture, a line-numbering select, a file input, and the markdown
  the document serializes to; `?fixture=pippa&interval=1` opens it at a
  fixture, for a headless look as much as for a hand.

## Phase 0 decisions (2026-09-07)

- markdown-it is the INLINE engine and token pipeline only. The BLOCK grammar
  is ported whole from ../writer/src/js/md.mjs as the core "block" rule
  (`emitBlocks` in parse.ts). MEASURED: markdown-it's block loop skips blank
  lines before any rule sees them, and a quote body in this grammar is a line
  run in which a blank line is content — so neither its own block rules nor
  markdown-it-container fit, and the plan's decision 4 is refined to this.
- The token → document walker is this repository's own (`buildDoc`), not
  prosemirror-markdown's: it throws on any token it does not know, so a form
  the schema lacks is REFUSED rather than dropped, and prosemirror-markdown
  would have pulled a second markdown-it (it pins ^14) into the bundle.
- Inline rules replaced: `text` (stops also at a ⟨ and at an h or w that
  opens a bare URL, so those rules get their turn), `newline` (every newline
  is a break, text kept verbatim either side), `backticks` (one backtick each
  side, one line, spaces kept). Added: `autolink` for bare URLs — claimed
  BEFORE emphasis, so a `_` or `*` in an address is never a marker — `folio`,
  and `<u>` as a matched pair. Disabled: `escape`, `entity`, `html_inline`,
  `autolink`, `linkify`. `*`/`_` emphasis and `~~` are markdown-it's own,
  CommonMark's flanking rules included — settled 2026-09-07 over a
  port of the current app's regex passes (the plan's Status section has the
  measured price of each: 15 files against 9).
- The serializer is this repository's own, not prosemirror-markdown's: the
  escaping rules the corpus was written under (column-0 backslash, the indent
  mark, cell pipes, fence escalation) are not its rules.
- Marks nest by the LONGEST STRETCH from each position (serialize.ts,
  `runMd`), ties broken by `MARK_ORDER` — link, strong, em, strike, underline,
  code. A ProseMirror mark set has no order, so where two marks cover exactly
  the same text the tie-break decides the spelling: `*[t](u)*` returns as
  `[*t*](u)` (MEASURED: the corpus writes the second 31 times, the first 17),
  and `***x***` as itself. Text-stable, not byte-stable.
- A link or image destination holding whitespace or an unbalanced paren is
  written in `<…>`; a bare URL keeps a `)` that closes a `(` of its own.
- A heading keeps its trailing whitespace, as the parser keeps it; a table
  cell and a verse cell are trimmed, as the parser trims them.
- Headings are levels 1–6 (`#` is level 1). The current app maps `#` to h2.
- Images serialize as `![alt](src)` with the src as written; the `![img-N]`
  registry is not carried.
- Not carried in phase 0: `fenceRefusals` (the whisper naming a `:::` line the
  parse refused) — editor feedback, for phase 1 or 3; `internalHash` (a pasted
  address-bar URL to this document becoming a bare fragment) — needs the
  document's own URL, for phase 2.

## Phase 1 decisions (2026-09-07)

- "ITALIC, BUT A LINE" is a token at the row's head, `⟨line⟩`, in the
  folio's own brackets: the row is a line whatever it is set in. PER ROW,
  not per block — MEASURED, Pippa Passes interleaves songs with directions
  through 198 italic rows, so a block flag would split the block at every
  song and hand-number every restart; IN THE TEXT, so a backup carries it
  and the running app shows it harmlessly as text until the cutover.
  MEASURED: no `⟨word⟩` of any kind exists in the corpus. The model carries
  it as `kind` on a line or pair node (null = the convention reads the
  marks); the serializer writes it flush at the row's head; the numbering
  walk asks it before the marks. The gesture is ⌃⌘N (`rowKeys.ts`,
  toggleDeclaredLine): every row the selection touches is declared, or
  returned to the convention when all of them already are — over the
  selection, because a song is several lines. ⌃⌘N is free in the current
  app's shortcut table.
- The line number is a NODE DECORATION (`lineNumbers.ts`), recomputed whole
  from position on every change of the document and drawn by the stylesheet
  from `data-line` — never in the document, never stored. The gutter is
  reserved by `.versepage` on the editor root, set by the same plugin
  exactly where a top-level verse block is.
- The row node views draw exactly what their toDOM would; they exist now as
  the seat of what phase 1 adds to a row (the pipe, Enter and Tab under the
  fence, the copy). ProseMirror applies a node decoration's attributes to a
  node view's DOM itself (MEASURED: the Helium DOM dump shows
  `class="vrow vpair ln" data-line="5"` on rows the views built).
- Headless Helium from the shell: `--headless=new` with
  `--virtual-time-budget=4000` and `--screenshot`/`--dump-dom` renders the
  built page from `file://` and exits; the old `--headless` mode HUNG past
  120 s on the same page (MEASURED 2026-09-07) — wrap any run in a kill.
- THE ROW IS THE UNIT under a fence, and every key makes, joins or leaves
  a row — never a cell, never the block (`rowKeys.ts`, ahead of the base
  keymap, which would split the fence at an empty row and join its first
  line into the heading above). Enter splits a line, or a pair's caret cell
  with the rest carried to a new row beneath; an empty last row is the way
  out, to a paragraph below the block; an empty row mid-block is a stanza
  break and a fresh row. A typed `|` in a line makes the pair at the caret
  (MEASURED: the corpus holds two literal pipes in full-width rows, so the
  gesture is the pair's); Backspace at the translation's start, or Delete at
  the original's end, takes it out again. Backspace at a row's start deletes
  a gap above, joins a line above, and only moves the caret to another
  shape. Tab crosses the pipe, Shift-Tab back. Shift-Enter in a row is
  Enter: a break inside a cell would be written as a space.
- THE FITTED MEASURE is ported whole (`fit.ts`, from
  03-the-fitted-measure.js, whose comments hold the measurements behind
  every constant): one column edge per entry, written as `--par-w` and
  `--vb-col` on the editor root, outside the document. The arithmetic is a
  pure function pinned in fit.test.ts with the current app's measured
  cases; the pass and the scheduling (a grow per keystroke gated on the
  caret's row having spilled, a settle 500 ms after typing stops and on
  resize, one measurement per frame) are DOM and are looked at in Helium.
  The measured inputs are written as `data-fit` on the root, so a headless
  dump can compare them against the answer. MEASURED 2026-09-07, Odes 1.1:
  inputs identical at 1400px and 900px windows (floor 712, originals
  330.8, translations 399.8, gap 43.2, frame 62.2); the entry fits at
  839px with a 332px original column, and under a narrower window the cap
  alone moves it — headless Helium's innerWidth is 6px under the window
  size it was given. MEASURED by Sean in Helium the same day: typing
  "and on" repeatedly into both cells of Odes 1.1's first line widened the
  columns keystroke by keystroke until the sixth, where the entry met the
  cap and the row wrapped — the grow side, which no test can prove.
- FOLIO LABELS ARE NOT A DECORATION AND NOT MEASURED. The plan said
  decorations; the current app measured every marker into an overlay
  because its inline ::after sat in the text flow and could move a line
  break. Here the tick and the "p. N" label are the marker's own
  pseudo-elements, absolutely positioned, and both take the marker's STATIC
  position — the visual line it sits in — so a leaf that turns
  mid-paragraph lands its label on the third visual line of one with no
  measurement (MEASURED 2026-09-07 in headless Helium over Witchcraft 3:
  "p. 61" and "p. 62" beside the lines their markers sit in, the tick at
  the word; Sean, in Helium the same day: plausible). The plugin's whole
  job is the `foliopage` class on the root,
  set where a folio sits outside every note. The gutter column is ONE
  declaration for verse numbers and folios.
- DATA REPAIRED 2026-09-07: the Tey and Allingham shelves' leaf markers,
  1,070 in 396 files, taken out by
  ../writer/docs/plans/2026-09-07-repair-folios-fiction.py over a copy in
  export layout (~/Desktop/repair4) and imported by Sean (890 entries).
  Fiction prose does not want folio numbers, and MEASURED before the
  repair those shelves carried them partially — one per chapter opening
  in The Man in the Queue, under two a file across Allingham. The plan's
  census of 1,046 files with folio tokens predates this.
- MARKDOWN AS YOU TYPE is prosemirror-inputrules over the document
  (`typing.ts`), the current app's transforms re-asked of the tree: inline
  marks on the closing marker with the body's own marks kept (the markers
  come out and the mark goes on over what is there), block markers on the
  space at a LINE's start — a quote's lines are one paragraph with breaks,
  so a marker behind a break first peels its line into its own paragraph —
  `--` between spaces, the curl and its step, the bare URL on space or
  Enter, `[title](url)` on its `)`, a ``` line and Enter. The tests drive
  the plugin's own text-input handler character by character. What is
  typed after a made link is PLAIN: the caret then touches the label's
  marks, and an italic label ran on into the prose until the stored marks
  were cleared. Backspace straight after any rule undoes it
  (undoInputRule), which the current app did not have — its "type the
  quote again" step is kept beside it. No as-you-type arm for the :::
  family, as the current app has none. Not done: a URL finished with Enter
  inside a verse row stays bare (the row's Enter claims the key first).
- Not yet in phase 1: the landing mark (deferred to phase 3 with the go-to
  bar that is its only trigger), the note row's view and the exit from a
  note nested in a row fence (today Enter there is the base keymap's).
