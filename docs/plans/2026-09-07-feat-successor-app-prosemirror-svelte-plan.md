---
title: "feat: the successor app — ProseMirror editor, Svelte chrome, a build step, a new repository"
type: feat
status: open
date: 2026-09-07
---

> MOVED HERE 2026-09-07 from ../writer/docs/plans/ (the plan's decision 10
> named that repository as its home while this one did not exist). From
> phase 1 on, the decisions and measurements were CLAUDE.md's dated
> sections until 2026-09-08, when they moved here, below the Status
> section; this file is the plan as written, with every phase's record.

## Where we are (2026-09-07)

Kept current here, one line per phase, so the state of the plan is
readable in this repository without the history. The detail behind each
line is the section of the same name below.

| Phase | State | Record |
|---|---|---|
| 0 — the schema and the round trip | DONE 2026-09-07. Green over 13,380 files; the corpus tool stays as the gate. | "Phase 0 decisions" below and in CLAUDE.md |
| 1 — the editor | CLOSED 2026-09-07. Row views, line numbers, folios, the fitted measure, the row gestures, markdown as you type. One item moved to phase 3: the landing mark. | "Phase 1 decisions" below |
| 2 — storage and the bridge | ALL BUILT 2026-09-07 and the cutover criterion MET on every count measured. Import: 13,565 of 13,565 by hand in Helium, the reload reads them back. Round trip: the largest entry identical after the round trip in the browser. Export and backup: identical to the mirror, 85 archives, the dedup writes nothing on relaunch. Citation: fourteen labels identical to the current app's ⌃⌘C, character for character; the quoted passage under ⌃⌘R not yet compared side by side. | "Phase 2 decisions" below |
| 3 — the chrome | CLOSED 2026-09-08. Svelte 5 installed; the notice ledger and the corner, every status line through them; the masthead (the crumb, the tags, the title row, the tools, the Line numbering row, the pages and bookshelf icons with their panels in the one slot every opener claims, New page/author) over shared screen state; all green in headless Helium. Search is in: the engine ported with its tests, the chunked index, the row with its overlay and the jump, the "?h=" replay. The list keymap is in (Enter, Tab, Shift-Tab in a bullet). The sub-entries' create, rename and delete are in (the extract to a sub-entry waits for the toolbar). The Go to row, the source view, the toolbar with its Tag button, and the ⌃⌘G bar with its landing mark are in. Help, bookmarks, custom shortcuts, the backups panel and the pasted picture, the code blocks' highlighting and the hover copy button, and the rich flavour on ⌃⌘R and ⌃⌘C are in. Tab in a quote, ⌃⌘L and the intervals, and the refused fence named are in — every item of the list agreed 2026-09-07; phase 2's scaffolding (the clear button, the markdown pane) out 2026-09-08, asked that day. | "Phase 3 decisions" below |
| 4 — the checkers | IN PROGRESS 2026-09-08. The review shape settled (one /code-review at medium by batch, a priced confirmation offered), tsc's unused checks on, the gate in `hooks/`; the phase 3 review run and its eight findings fixed in one commit. The prose checkers wait for their first class. | "Phase 4 decisions" below |

Until phase 2's last count is measured and the successor has been used
for real entries, `../writer` stays the running app.


# feat: the successor app

Gesta is rebuilt as a NEW project with a build step and bundled dependencies:
the editor on ProseMirror, the chrome on Svelte 5, the output still one
`index.html` that opens from `file://`. This repository stays the running app
until the successor imports the whole export and has been used for real entries.

This plan lives here because the successor's repository does not exist yet and
because it CLOSES docs/plans/2026-08-24-refactor-modular-source-and-build-plan.md:
the residue that plan named (the editor and decor fragments, the `ui` module never
priced, the seam's remaining symbols) is answered by replacing the editor rather
than by extracting it.

## Decisions (2026-09-07, all in one conversation)

| # | Question | Decision |
|---|----------|----------|
| 1 | Shape | A new repository, porting into it — not an in-place refactor. The document model changes, and 887 top-level names in one scope read the page element (MEASURED `grep -c '^  var \|^  function ' index.html`), so the editor swap is one large change the artefact probe cannot arbitrate. |
| 2 | Editor | ProseMirror DIRECT, not TipTap. The editor work is the custom node types (verse and prose rows, note rows, folios, the fitted measure) plus decorations for line numbers, folio labels and the landing mark — all written against ProseMirror's own schema, node-view and plugin APIs, which TipTap exposes but does not simplify. |
| 3 | Chrome | Svelte 5, narrowly over Vue. With ProseMirror direct no framework binding is involved; the margin is that Svelte's model (a declared variable is reactive) reads closest to the imperative fragments being ported. Both frameworks broke once recently; bundle size is irrelevant for one user on a local file. |
| 4 | Parser | markdown-it, with markdown-it-container for the `::: card-*`, `::: note` and `::: reference` bodies (ordinary markdown). The `::: verse` and `::: prose` bodies need a CUSTOM block rule: one row per line, `\|` splitting text from translation, a blank line as a stanza gap, an optional start number on the opener (READ src/js/md.mjs `VERSE_OPEN`, `PROSE_OPEN`). markdown-it-container would fold those lines into paragraphs. |
| 5 | Headings | Levels UNCAPPED. An entry's title is its FIRST LEVEL-ONE heading, everywhere. The current app already says that for a day and a namespace root; a sub-entry today takes its first heading of either level. The one shelf that depended on that (Horace, 162 poems titled `##`) was corrected in the data 2026-09-07 and in its converter (make.py:234, not re-run). A day's tagged entry is labelled by its tag alone (READ index.html:9024, the masthead reads the heading memo only for an untagged day), so the seven journal tagged entries that open with `##` are unaffected and need no edit. |
| 6 | Speaker line | NO schema node. Bold-in-verse stays the speaker convention, carried as a numbering rule over bold-only rows. The 1998–99 chat transcripts (28 files, ~8,000 `<name>` tags) stay literal text. The parser must keep angle-bracket text as text. Reversible later by a migration from exactly the bold lines a node would replace. |
| 7 | Checkers | The `tools/` and `hooks/` apparatus (7,200 lines of shell, MEASURED `wc -l`) comes along PER CHECKER as each becomes relevant: the acceptance gate and review order first (they govern spend), the prose checkers when the first comment is written, the single-file ones never (the vocabulary index, check-sync, map.sh, names.sh, the build — TypeScript and the import graph answer their question). |
| 8 | Storage names | Database and localStorage names OUTSIDE `page750.*` from the first commit. MEASURED 2026-09-07 in Helium: every `file://` page shares one storage origin, and a non-Gesta page listed `page750.backup`, `page750.cutover`, `page750.entries`, `page750.images`. Data moves by EXPORT and IMPORT only; the successor never reads the old databases. |
| 9 | Target browser | Helium, launched by executable path. MEASURED 2026-09-07: `playwright-core` 1.63.0 launched Helium 0.14.8.1 (Chromium 150) headless and read a page back. Stock Chromium is the CI fallback where Helium is absent. The WebKit harness (`webkit-verify.*`, `webkit-checks.js`, 2,577 lines) is not carried: CLAUDE.md already calls it a second-engine sanity check, not the target. |
| 10 | Plan home | This file, in this repository; the modular-source plan closes with it. |

## Settled inputs — measured 2026-09-07

**The corpus** (`python3 docs/plans/2026-09-07-probe-corpus-census.py` over the backup
mirror `~/Library/CloudStorage/Dropbox/gesta-snapshots/current`, read-only; the
script sits beside this plan and re-runs against any later mirror): 13,380 md files — journal 7,658, bookshelf
5,521, page 201; none evicted, none empty; largest 657 KB
(journal/2021/2021-11-28), longest 6,422 lines (a Doctor Who entry). Forms by
file count: verse fences 2,222 (348,815 rows, 27,396 piped, 66,586 stanza gaps;
ONE file uses `::: verse N`), note 229 (29 inside a verse/prose row), prose 28
(536 rows, 485 piped), card 64, reference 2, code fences 407 files / 3,486 fences
(ruby 134, then elisp, bash, lisp, emacs, clojure), tables 50, folio tokens 1,046
files / 7,603 (bookshelf only), links 744, bare URLs 2,236, `__` 34, `~~` 4,
`***` 47. Images export as relative `![alt](stem-img-N.webp)` sidecars, 266
references; the `![img-N]` registry form appears in ONE file. No unknown `:::`
opener anywhere. Off-grammar: `###` in ONE journal file (four lines,
2026-08-21--gesta-wrangling), and the angle-bracket transcript tags above.

**The round trip is content-preserving and NOT byte-preserving.**
`sh tools/restore.sh --to <scratch> <backup-folder> 2026-09-01` (13,060 files)
diffed against the mirror rewritten from a re-imported database: nothing missing
on either side; 55 files differ — 37 by blank-line or trailing-newline count
only; 3 where a `www.` link target gained `https://`; 2 where `_x_` became `*x*`
and 1 where `-  ` became `- `; 1 where a blank line inside a quote became `> `;
3 where quoted legacy folio markup `<a name="#pN">` was migrated to `⟨N⟩`; the
rest edits made after the archive run. So the successor's round-trip check MUST
normalise blank lines and link schemes before comparing, or it reports about
forty false failures on its first run over the corpus.

**Emphasis with edge whitespace.** The 2026-09-07 round trip found the current
serializer writing `*Name *x` for `<em>Name </em>x`, which the parser reads as
text; fixed in 8f5e2f0 and e3edaf3 (`markAround`), and the corpus repaired by
import folders and hand edits the same day. Two lessons carry: (a) contenteditable
produces edge-whitespace emphasis routinely, so the successor's serializer (or
prosemirror-markdown's) must hoist it — pin it as a fixed-point property from
day one; (b) a text-stable loss is invisible to a byte diff, so the round-trip
check also counts literal asterisks surviving in parsed text, per file, before
and after — the test is "no file made worse", not "none left".

**Toolchain present** (MEASURED `npm view`, 2026-09-07): node 24.13.0, npm 11.6.2;
prosemirror-model 1.25.11, prosemirror-markdown 1.13.7, markdown-it 15.0.1,
markdown-it-container 4.0.0 (last modified 2023-12; ~200 lines, could be owned),
svelte 5.57.0, vite 8.2.2, vite-plugin-singlefile 2.3.3, vitest 5.0.0 with
@vitest/browser 5.0.0, playwright 1.63.0, dexie 4.4.5, fflate 0.8.3,
fake-indexeddb 6.2.5.

## What ports verbatim, and what is replaced

| From this repo | Lines (MEASURED `wc -l`) | In the successor |
|---|---|---|
| Pure modules: keys, names, nav, zip, plans, io, store, entries, folio, reference, search, bookmarks, shortcuts | 3,045 | Copied as ESM; already node-tested. `zip.mjs` then shrinks under fflate, `store.mjs` under Dexie (keeping the stale-write refusal). |
| Their node tests | 3,002 | Copied with them. |
| md, serialize, dom, numbering | 2,070 | Replaced by the schema, markdown-it rules and decorations. Line numbers, folio labels and the landing mark become decorations, so the strip-at-every-seam family disappears. |
| Editor fragments (as-you-type, Enter/Tab, paste, fences, folios, fit) | 4,574 | Replaced by ProseMirror node views, keymaps and input rules. The 59 execCommand and 37 getSelection calls, 48 ZWSP sites and 109 engine-quirk comments (MEASURED `grep -c`) go. |
| Panel/chrome fragments | 3,176 | Svelte components; nine hand-rolled openers, eleven renderers and 93 listeners become state and templates. |
| Export, import, backup, FSA | ~1,900 | Ported as-is. No library abstracts directory handles and the mirror-plus-archive plan. |
| README "Using Gesta" | 651 | The behaviour spec. |
| tests.html | 28,875 | Read as a behaviour list, NOT ported. Triage task: which of its 214 test functions pin behaviour and which pin engine quirks or strip seams that no longer exist. |
| style.css, body.html | 1,815 | Ported into components near-verbatim. |
| test.sh, build.mjs, the WebKit harness | ~3,400 | Replaced by Vitest browser mode (Helium via executable path) and Vite config. |

## Phases

**Phase 0 — the schema and the round trip (the first thing that can be judged).**
The repository is `~/Library/CloudStorage/Dropbox/claude/gesta` (created 2026-09-07,
marked available-offline), a sibling of this one. Its `node_modules` already exists
EMPTY with the Dropbox-ignore attribute set, so the first install fills it in
place and Dropbox neither syncs nor evicts it:

```
mkdir -p ~/Library/CloudStorage/Dropbox/claude/gesta/node_modules
xattr -w com.dropbox.ignored 1 ~/Library/CloudStorage/Dropbox/claude/gesta/node_modules
```

A `rm -rf node_modules` loses the attribute with the directory, so a clean
reinstall runs both lines again first. The process this repository follows is
its CLAUDE.md, read from `../writer/CLAUDE.md`; decision 7 says which of it
comes along, and when. Then: Vite + vite-plugin-singlefile + TypeScript + Vitest; the
ProseMirror schema for the CURRENT markdown grammar (paragraph, headings 1–6,
lists nested and ordered, quote, table, code fence with language, the five `:::`
forms with the verse/prose row grammar, folio tokens, images by relative path,
links, the inline marks) with markdown-it as the parse arm and a serializer whose
emphasis hoists edge whitespace. Tests: the 32-form matrix from
src/js/serialize.test.mjs, then the WHOLE CORPUS from the export folder — every
file parsed, serialized, compared under the normalisation above, with a report
of every file that does not survive and the stray-asterisk count per file. Nothing
in later phases is worth building until this is green over 13,380 files.

**Phase 1 — the editor.** Node views for verse/prose rows (the pipe, the pair, the
gap), the note row inside a fence, folio markers as content, the fitted measure
(a plugin view measuring the widest row, one edge per entry); decorations for
line numbers (computed from position, never stored), folio labels and the
landing mark; keymaps for Enter/Tab inside each container; input rules for the
as-you-type transforms (smart quotes, dashes, links). The Horace shelf and a
Shakespeare play are the fixtures.

**Phase 2 — storage and the bridge.** Dexie stores under NEW names; the ported
keys/entries/store modules; the import of the export folder as the ONLY way data
arrives; the export and the backup mirror + archive ported as-is. Cutover
criterion: import the full export, the phase-0 round trip green, the citation
and reference features producing the same text as the current app on the same
fixtures.

**Phase 3 — the chrome.** Panels, bars, notices and the masthead as Svelte
components over shared state; the "every opener closes the others" rule as one
piece of state. The 651-line help text is the acceptance list.

**Phase 4 — the checkers, per checker.** The acceptance gate and the review order
first; the prose checkers as the first comment blocks appear; the single-file
checkers never.

## Non-goals

- No change to the current app beyond fixes it needs while it remains the running
  one. Its process (this repository's CLAUDE.md) governs those.
- No reading of the old databases by the successor, ever.
- No conversion of the chat transcripts, no speaker node, no repair pass for
  asterisks that are already literal text (they cannot be told from typed ones).

## Risks

- **A form the schema does not know is dropped silently by ProseMirror's parser.**
  Answered by phase 0's whole-corpus run and the "no unknown `:::` opener" census,
  repeated against the export folder at cutover.
- **Upgrade churn.** ProseMirror, Svelte and Vite each ship breaking releases; the
  one dev dependency this repository took (linkedom) cost a Dropbox ignore flag, a
  CI step and a silent-skip bug (modular plan, item 18). Pin exact versions;
  Dropbox-ignore `node_modules` on day one.
- **The verse/prose node views have no precedent to copy.** Phase 1 is where the
  design risk sits; phase 0 is cheap enough to abandon if the row grammar does
  not fit the model.

## Relationship to the modular-source plan

Closed by this plan. Its items 1–27 stand as done; its residue (editor and decor
as fragments, `ui` never priced, seam round 7) is not pursued in this repository.
The seam shrink's remaining candidates (`sh tools/seam-exports.sh`, 36 names) stay
as a worklist for any fix the current app still needs, and are otherwise moot.

## Status

**2026-09-07 — phase 0 built**, in `~/Library/CloudStorage/Dropbox/claude/gesta`
(`git init` run, nothing committed; its CLAUDE.md carries the decisions below).

- Toolchain, pinned exact (MEASURED `npm ls`): vite 8.2.2, vite-plugin-singlefile
  2.3.3, vitest 5.0.0, typescript 7.0.2, prosemirror-model 1.25.11, markdown-it
  15.0.1. `npm run build` writes `dist/index.html`, 168.87 kB, no external
  reference (MEASURED `grep`); Helium 0.14.8.1 headless `--dump-dom` over
  `file://` renders it and the playground reports its demo byte-identical.
- Decision 4 REFINED: markdown-it is the inline engine and token pipeline
  only; the block grammar is ported whole from src/js/md.mjs as the core
  block rule, and markdown-it-container is not used. MEASURED: markdown-it's
  block loop skips a blank line before any rule sees it, and a quote body in
  this grammar is a line run in which a blank line is content. The token →
  document walker and the serializer are the successor's own (no
  prosemirror-markdown: it pins markdown-it ^14, and its serializer's escapes
  are not this grammar's). Marks nest by longest stretch, ties by
  link > strong > em > strike > underline > code.
- Suite: 33 tests (`npm test`), the 32-form matrix grown to 60 forms, each a
  fixed point at the top level and inside a quote, plus the normalizations,
  the hoist, and the parse pins from md.test.mjs.
- THE WHOLE-CORPUS RUN (`node tools/corpus.ts`, the mirror at 13,565 files
  today, 20 s): not a fixed point 0; document changed after one pass 0;
  asterisks grew 0; threw 0; round trip differs 31; text differs from the
  current parser 44. Report: `tools/out/corpus-report.txt` (gitignored,
  regenerated by the run); `tools/residue.py` lists what is left as
  file:line. Before the data repairs below the last two were 46 and 76.
- The 34 by shape (MEASURED from the report): 15 `*[t](u)*` → `[*t*](u)`, the
  tie spelling chosen by count (the corpus writes the second 31 times, the
  first 17); 6 nested same-mark emphasis `*a *b* c*` (CommonMark nests, a
  mark set merges, the inner run is lost); 4 `-  ` → `- `; 3 adjacent links
  to one address merged; 2 adjacent code spans merged; 1 `_x_` → `*x*`;
  1 `¯\_(ツ)_/¯` read as emphasis; 1 `]( url` space dropped; 1 `[url](url)` →
  bare.
- DATA REPAIRED 2026-09-07: the Doctor Who transcripts' bracketed bold
  location headings — 297 lines carrying the pre-8f5e2f0 marker damage
  (`**[****Trial room]**`) and 273 clean `**[Tardis]**` — rewritten to the
  shelf's own convention, bare `**Tardis**` (26,384 such lines against 570
  bracketed), by `docs/plans/2026-09-07-repair-bold-headings.py` over a copy
  of the shelf in export layout, imported (385 entries), backed up (45 files);
  four odd ones fixed by hand first. That took 12 files out of the round-trip
  list and 32 out of the asterisk classes. The same day, by hand in the
  running app: `_On Sophistical\nRefutations_` (2016-08-28) and the two
  shruggies (2022-04-04, the 2026-07-01 AI Pro session) put in backticks;
  by `docs/plans/2026-09-07-repair-king-victor.py`: Browning's King Victor
  and King Charles, whose italics ran inverted from line 2380 (a speaker
  label `*Cha.**`) to the end — the web-reader source carries the same
  inversion; and by `docs/plans/2026-09-07-repair-browning-directions.py`:
  105 standalone stage directions in 13 Browning files made wholly italic
  so the numbering skips them (there are no citations into the Browning
  plays). The data pass STOPPED there, 2026-09-07: what remains is
  typo-level and blocks nothing.
- The 48 (MEASURED, `visibleText` against src/js/md.mjs's `mdToHtml` under
  node, whitespace collapsed, images stripped): 16 files show MORE literal
  asterisks than the current app — CommonMark's flanking rule refuses an
  opener after a letter and before punctuation (`Doctor*, I’ve…*!`); 16 show
  FEWER — emphasis spanning lines, which the current regexes cannot read, and
  the nested case; 16 others, all journal: links CommonMark reads where the
  current parser swallowed an outer `[` into the link text (the successor is
  right there), the shruggie twice, and one `?h=` link whose address holds an
  unbalanced `(` (journal/2026/2026-06-30.md), which CommonMark refuses.
- OPEN, for phase 1 (the numbering rule, 2026-09-07) — DECIDED 2026-09-07 in ../gesta (the phase 1 record below): a wholly italic verse
  row is apparatus and takes no number (numbering.mjs, whollyIn) — right for
  the plays, and MEASURED over the mirror it cannot be narrowed to bracketed
  rows: Shakespeare's 5,627 directions are bare italics (`*Exit*`), Browning
  962 bare against 208 bracketed, Williams 1,449 against 382. What the rule
  lacks is "italic, but a line": Fra Lippo Lippi's sung lines (`*Flower o'
  the broom,*`) drop out of the count where editions number them. The
  successor's numbering decoration needs a way to say so — a per-entry or
  per-row mark, decided in phase 1 with the row node views.
- DECIDED 2026-09-07: emphasis is COMMONMARK'S, markdown-it's own rule, not
  a port of the current five regex passes. The price, MEASURED after the data
  repairs: 15 files where a marker touching a letter on one side and
  punctuation on the other (`Doctor*, I’ve…*!`, `*f.*16`) goes literal where
  the current app read emphasis, against 9 files where an italic passage
  closing on a later line reads as the italics it was, and no second grammar
  to carry. The 15 sites are in tools/residue.py's list for the hand. Also
  decided: the tie spelling stays the one chosen by count ([*t*](u)).
- Not carried in phase 0: `fenceRefusals` (editor feedback), `internalHash`
  (needs the document's URL), the `![img-N]` registry (images serialize as
  `![alt](src)`, `<…>` around a source holding whitespace).

**2026-09-07 — continues in `../gesta`.** Phase 1 began there (its commit
7742a91: the verse row node views, the line-number decoration, and the
`⟨line⟩` token that closes the OPEN item above — a wholly italic row
declared a line, per row, in the text). From here on the record of the work
is gesta's own: the dated sections per phase BELOW, moved here from its
CLAUDE.md 2026-09-08, and its history the rest. The "Where we are" table
at the head is kept current per phase.

## Phase 0 decisions (2026-09-07; moved here from CLAUDE.md 2026-09-08)

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

## Phase 1 decisions (2026-09-07; moved here from CLAUDE.md 2026-09-08)

- "ITALIC, BUT A LINE" is a token at the row's head, `⟨line⟩`, in the
  folio's own brackets: the row is a line whatever it is set in. PER ROW,
  not per block — MEASURED, Pippa Passes interleaves songs with directions
  through 198 italic rows, so a block flag would split the block at every
  song and hand-number every restart; IN THE TEXT, so a backup carries it
  and the running app shows it harmlessly as text until the cutover.
  MEASURED: no `⟨word⟩` of any kind exists in the corpus. The model carries
  it as `kind` on a line or pair node (null = the convention reads the
  marks); the serializer writes it flush at the row's head; the numbering
  walk asks it before the marks. The gesture is `toggleDeclaredLine`
  (`rowKeys.ts`): every row the selection touches is declared, or returned
  to the convention when all of them already are — over the selection,
  because a song is several lines. The chord is ⌃⌘I, "italic, but a
  line" (chosen 2026-09-07; MEASURED in Helium the same day: it reaches
  the page, and toggles on and off). ⌃⌘N is RESERVED for "new" — a book, a
  sub-page, a tagged entry — in the phase 3 chrome (decided the same day).
  Free ⌃⌘ letters by the current app's table and macOS's defaults, after
  these two: A E O P U V X Y Z; whether Helium passes one through is
  answered only by pressing it there.
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
  size it was given. MEASURED in Helium, by hand, the same day: typing
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
  the word; looked at in Helium the same day: plausible). The plugin's whole
  job is the `foliopage` class on the root,
  set where a folio sits outside every note. The gutter column is ONE
  declaration for verse numbers and folios.
- DATA REPAIRED 2026-09-07: the Tey and Allingham shelves' leaf markers,
  1,070 in 396 files, taken out by
  ../writer/docs/plans/2026-09-07-repair-folios-fiction.py over a copy in
  export layout (~/Desktop/repair4) and imported the same day (890
  entries, 398 files backed up).
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
  quote again" step is kept beside it; accepted 2026-09-07 after a look
  in Helium, as were Shift-Enter in a row being Enter and Tab in a
  full-width row being consumed. No as-you-type arm for the :::
  family, as the current app has none. Not done: a URL finished with Enter
  inside a verse row stays bare (the row's Enter claims the key first).
- A NOTE THAT IS A ROW takes the family's exit: Enter inside it is the
  note's (the base keymap splits its paragraph), and the second Enter on
  its empty last paragraph steps out into a ROW of the fence — paired
  where the block holds a pair, full-width where it does not, never a bare
  paragraph. A note emptied by the exit goes with it. Elsewhere a note's
  exit is the base keymap's lift, which lands a paragraph after the note.
- PHASE 1 CLOSED 2026-09-07, with one item moved: the landing mark waits
  for phase 3 and the go-to bar that is its only trigger.

## Phase 2 decisions (2026-09-07; moved here from CLAUDE.md 2026-09-08)

- THE PORTED MODULES are keys, names, store and entries (`src/store/`),
  from ../writer/src/js, with their node tests re-spelled for Vitest: 67
  tests, every case the four suites pinned except the ones below that have
  no ground here. The comments kept are the decisions, measurements and
  failures behind each rule; the cross-references to the flat scope and the
  fragments are not.
- STORAGE NAMES: the prefix is `gesta.` — `gesta.v1.` on localStorage,
  `gesta.entries`, `gesta.images` and `gesta.backup` for the databases —
  outside `page750.*` as decision 8 requires. No cutover database: there is
  nothing to cut over from.
- THE STORED TEXT IS MARKDOWN, the field `md` where the current app stores
  `html`: the model's own form (phase 0), so export is a file write, import
  is a parse, and the corpus round trip IS the storage format. The cost is a
  parse per open and a serialize per save.
- NO LOCALSTORAGE ERA. entries.mjs carries a device through a dual-write
  period into the store being authoritative; the successor starts there, so
  the pre-cutover arms — `cutoverEntries`, `reclaimLocalEntries`,
  `confirmStored`, `eachStoredEntryKey`, `migrated`, the flag store — are
  not ported. What is: the cache, `setEntry`/`removeEntry`, the per-key
  write chain with the stale arm that puts the cache back (guarded by the
  removal counter), `primeEntry`, and the warm with its read-failure flag
  and held error.
- THE BARE GLOBALS BECOME AN INTERFACE: `entryLayer(store, notices)` is a
  factory, and `EntryNotices` (landed, removed, stuck, stuckIdle) is the
  enacted list of what the layer tells the chrome — the save-failure
  ledger, the index debt and the emptiness memo stay the chrome's, in
  phase 3. The rescue text a stale write offers for copying is the refused
  markdown itself; the current app converted its HTML first.
- THE INDEXEDDB ADAPTER IS DEXIE'S (`dexieKeyedStore`, store.ts), behind
  the same five-call contract as the memory adapter; the contract tests and
  the entry-store tests run over BOTH, Dexie under fake-indexeddb, the
  "other tab" over Dexie being a second connection to the same database.
  One database per store, as the current app keeps. The hand-rolled
  adapter's four measured failures (the cached handle, the reopen, the
  blocked open, the versionchange) are Dexie 4's own concerns: auto-open, a
  close on versionchange, a reopen on the next access.
- MEASURED 2026-09-07 in Helium 0.14.8.1, headless by executable path
  (`node tools/helium-probe.mjs --fresh '?store=write' '' '?store=write'`,
  one persistent profile under tools/out): the write run reports 1 row, the
  relaunch reads 1 back, the next write makes 2 — a Dexie row written from
  file:// survives a relaunch. The page's probe is `?store=write` and the
  root's `data-store` / `data-probe` (main.ts), until the bridge replaces
  it. HEADLESS DUMPS CANNOT ANSWER A STORAGE QUESTION: `--dump-dom` under
  `--virtual-time-budget` dumps before IndexedDB's real-time I/O settles
  (one read run showed 0, the others no attribute at all), and `--timeout`
  never exited; playwright-core 1.63.0 (decision 9's harness) drives Helium
  and waits for the attribute. Dexie 4.4.5, fake-indexeddb 6.2.5 and
  playwright-core 1.63.0 are pinned exact.
- THE IMPORT (`importFiles.ts`, `pick.ts`, the buttons in main.ts) is
  29-import.js re-asked of a store that holds markdown: the file's text is
  stored AS WRITTEN, after a PARSE that the current app did not have — a
  form the schema refuses is a counted, named failure, never a blind row —
  and the write reports whether it landed, so the tally is what the store
  holds. The count-then-confirm gate, the refused-.md note, the sequential
  loop, the unreadable-file rules and the duplicate-key refusal before any
  read are the current app's. The import NEVER CLEARS: it overwrites entry
  by entry and deletes nothing, so a subset folder lands only its own
  entries (asked and settled 2026-09-07). `clear` is its own button with
  its own confirm, for probe rows and starting over.
- A PICTURE IS ITS BYTES UNDER THE PATH ITS REF RESOLVES TO
  (`page/Trip Log-img-1.webp`), the ref in the text staying as written
  (phase 0): the import files the sidecar there, the export will write it
  back to the same path, and the editor's rendering of a relative src is
  the bridge's question. The current app rewrote refs to data URLs and
  stored them under a content hash; `imgHash` is ported but unused.
  MEASURED 2026-09-07 over the mirror: 297 webp sidecars, refs spelled
  `![](stem-img-N.webp)`, no legacy folio markup left, one file with the
  `![img-N]` registry form.
- MEASURED 2026-09-07 (`node tools/importCorpus.ts`, the mirror at
  gesta-snapshots/current): 13,876 files read, 13,565 entry docs
  attempted, 13,565 imported, 0 failed, 297 pictures filed, 3.8 s in
  memory. The parse gate refused nothing. MEASURED the same day in Helium
  by hand, from file://, the picker over the same folder: "imported 13565
  entries", none failed, on a profile that read 0 before, and the reload
  after it "13565 entries stored" — the warm reads the whole journal back.
  Playwright cannot answer a directory picker, so that half stays a hand's.
- THE BRIDGE (`session.ts`) is load, saveNow, routeHash and the
  flush-on-leave listeners re-asked of a store that holds markdown: a save
  is SERIALIZE AND COMPARE, skipped when the text is what the store holds
  (a navigation through 13,565 entries rewrites none of them), and an
  empty document over no stored entry mints nothing. The debounce is the
  current app's 500 ms; a navigation flushes the entry being left; a
  hidden tab and an unload land what the debounce holds. A stored text
  the model refuses is SHOWN as text, not edited: an editor over a lossy
  parse would save the loss. The chords are the current app's — ⌃⌘, and
  ⌃⌘. walk, ⌃⌘T is today — and the buttons beside them.
- THE DERIVED LISTS ARE THE CACHE'S KEYS (`lists.ts`): the current app
  kept a day index and per-parent tag lists in localStorage, healed after
  every warm, with an index-debt ledger for a listing that failed to
  write. Here the warm leaves every key in the cache, so a day's tags, a
  page's sub-pages and a namespace's roots are one walk over
  Object.keys, an ancestor counting as registered whether or not it has a
  body, and there is nothing to heal or owe.
- MEASURED 2026-09-07 (`node tools/helium-bridge.mjs`, headless Helium,
  a fresh profile seeded with the fixtures): a page, a book page and a day
  open by hash with the editor's markdown identical to the store's; an
  unknown author is refused with "no such author" and today stays open; an
  unknown page mints on visit; text typed into it reads "saved" after the
  debounce and comes back after a relaunch; ⌃⌘. walks from one seeded day
  to the next. MEASURED by hand the same day over the imported journal:
  #2021-11-28, the corpus's largest entry (657 KB), "appears fairly
  instantly" and the details pane reads "identical to what the store
  holds"; #2022-02-06 shows its pictures, resolved from the store by their
  relative names, the pane still identical. No fixture carries a picture,
  so the image view's look stays a hand's.
- EXPORT AND THE BACKUP are plans.mjs, io.mjs, zip.mjs, 28-export.js and
  35-automated-durable-export ported with their decisions intact — the
  archives before the mirror, the dedup that may skip on its own and the
  reconcile that may not delete on its own, the belt, the entry as the
  sweep's unit, the day's census written only on a clean day. What the
  markdown store made simpler: `exportEntries` is a walk over the cache
  with the sidecars read back by path, no HTML to serialize and no data
  URL to peel; `backupSig` hashes the cache's markdown. ZIP STAYS
  HAND-ROLLED where the plan's inventory said fflate: 99 lines carrying
  two measured decisions (the Unix host byte, the file mode) that a library
  would have to be checked against, and the tests read the archive back
  through the engine's own DecompressionStream. The notice ledger (the
  savedGen pin, the busy yield) is not carried: the runner takes a status
  line, a trouble callback and a stick callback, and phase 3's chrome
  decides what they paint. `unreadEntries` has no counterpart — the cache
  is complete after the warm — so the reconcile spares only the entries
  whose pictures did not arrive.
- MEASURED 2026-09-07 by hand in Helium: `export…` into an empty folder
  wrote 13,565 entries, and `diff -rq` against the mirror it was imported
  from found 13,565 md files and 297 pictures on each side, zero files
  differing, nothing only in the export. The 70 directories only in the
  mirror are EMPTY (`find -type d -empty`): the current app's reconcile
  deletes files and never directories, and an export makes only the
  folders its files need. MEASURED the same day by hand: `set up automatic
  backups…` into an empty folder counted "backing up… N / 13650" (85
  archives, then 13,565 docs) and ended "backed up"; the folder then held
  `archive` and `current` only, 85 zips under bookshelf, journal and page,
  a manifest of 85 lines naming each root's zip, `current` identical to
  the export by `diff -rq`, and one archive (Marlowe, 20 files) passing
  `unzip -tq`. The reload after it said "13565 entries stored" and no
  "backing up…": the signature matched and the dedup wrote nothing.
- THE CITATION is reference.mjs, folio.mjs and 24-copying-a-reference.js
  ported: the grammar whole with its tests, the label over a Journal the
  caller supplies (an entry's title, a root's "from the last title"
  directive), and the selection half re-asked of document positions —
  "covers" is an overlap that holds ink, a passage is rows or a cut of the
  document serialized back to markdown. ⌃⌘R copies the reference, ⌃⌘C the
  entry link, text/plain only until phase 3's chrome adds the rich
  flavour. AN ENTRY'S TITLE IS ITS FIRST LEVEL-ONE HEADING everywhere
  (decision 5), where the current app read a sub-page's first heading of
  either level; the legacy `<a name="#pN">` folio form is not read
  (MEASURED: none in the mirror). The highlight payload counts the
  selected text as a literal substring without the search's case folding
  (search is phase 3's).
- MEASURED 2026-09-07 (`node tools/referenceCorpus.ts` over the mirror):
  the nine corpus cases the current app's referenceParts documents label
  exactly as its table says — Milton, *Paradise Lost*, 1; Shakespeare,
  *King John*, 3.1; Rostand, *Cyrano de Bergerac*, 1.2; Boethius, *De
  consolatione philosophiae*, 1m2; Housman, *Last Poems*, *25. The
  Oracles*; Blake, *Songs of Innocence*, *A Cradle Song*; Dante,
  *Inferno*, 7; Doctor Who, *New Earth*; Lewis, *The Screwtape Letters*,
  12 — plus Williams, *Witchcraft*, *3. The Dark Ages*; Horace, *Odes*,
  1.1; a Marginalian sub-page by its heading; *Books*; *Gesta*, 22 June
  2021. MEASURED the same day by hand: the current app's ⌃⌘C on the same
  fourteen entries gave the same fourteen labels character for character,
  and its hrefs the encoding the successor's entry link writes. The
  passage half (⌃⌘R over one selection in both apps) is not yet compared.

## Phase 3 decisions (2026-09-07; moved here from CLAUDE.md 2026-09-08)

- SVELTE 5.57.0 and @sveltejs/vite-plugin-svelte 7.3.0, pinned exact, the
  plugin ahead of singlefile in vite.config.ts; `svelte.config.js` is empty
  (no preprocessor: the compiler reads erasable TypeScript, which is all
  the tsconfig allows) and exists to stop the plugin announcing its
  absence. svelte-check 4.7.6 is NOT installed: MEASURED, npm refuses it
  as a peer of TypeScript 7.0.2 (it wants ^5 || ^6), so a component's
  `<script lang="ts">` is checked by the compile and its test only; the
  `.svelte.ts` modules are checked by tsc, whose ambient runes come from
  `/// <reference types="svelte" />` in vite-env.d.ts.
- SHARED STATE IS A RUNE IN A `.svelte.ts` MODULE, made by a factory like
  the store's layers, and read by a component's template. MEASURED: under
  Vitest's node environment the plugin compiles for the server, so a rune
  module's state is a plain object and a component renders to a string
  through svelte/server — the ledger's 30 tests and the corner's 4 run with
  no DOM package. The reactivity is Svelte's own and is looked at in
  Helium. MEASURED: `Notices.svelte` beside `notices.svelte.ts` fails tsc
  on this case-insensitive disk (TS1149), so the component is `Corner`,
  named for what it draws. FAILURE the same day: writing `Notices.test.ts`
  beside `notices.test.ts` silently overwrote the ledger's tests, and the
  rename to `Corner.test.ts` carried the wrong file; the ledger's suite was
  rewritten from the record. A component never shares a stem with a
  module — the disk cannot tell them apart.
- THE NOTICE LEDGER (`notices.svelte.ts`) is 06-save-load.js ported with
  its decisions intact: the whisper that yields to a pin and a busy line,
  the pin whose click copies its detail and whose affordance no caller can
  omit, the owned release that stands down under a newer notice, the
  progress handle that alone ends the busy state and drops a prior
  unclicked pin, the deferred one-shot in ONE slot, the keyed save-failure
  family with its latch replayed at an op's end, and "with both latches
  armed only the save failure shows". DROPPED: the index-debt key shape
  and the `lesser` rank — the lists are derived from the cache (lists.ts),
  so a save owes one write and there is nothing to rank. The entry layer's
  `EntryNotices` is the ledger's `entry` object: landed and removed release
  the key, stuck is the keyed family, stuckIdle the deferred one-shot.
- THE CORNER (`Corner.svelte`) keeps the current app's span: a status line
  whose click is a mouse's convenience and never in the tab order, so the
  compiler's two a11y codes are ignored with the reason beside them.
  MEASURED in 5.57.0: the space-separated `svelte-ignore` list silenced
  only its first code; the comma-separated form silences both.
- WHAT PAINTS WHAT (main.ts): the session's `say` is the whisper, "saved"
  at the current app's 1400 ms and the rest at 3000; the backup's `say` is
  the whisper too, each "backing up… N / M" restarting the clock, so an
  autosave "saved" may overwrite it as the current app let it and a pin
  outranks both; the backup's `stick` is stickErr and its `onTrouble` the
  pill; export and import hold a progress handle from the click (import's
  from the confirm), stepping through the file writes, ending in ok, fail
  with the failures listed one per line as the copy, or a silent cancel on
  a dismissed picker; an unreadable store at the warm sticks with the error
  copyable where it used to whisper.
- MEASURED 2026-09-07 in headless Helium over the build: `node
  tools/helium-bridge.mjs` green over a fresh profile with every status
  now read from `.saved.show` (the tools were pointed there from the old
  `#status`); `node tools/helium-corner.mjs` over the seeded page saw "5 entries stored"
  shown then fading past 3 s, "saved" shown after typing and gone on a
  click, "no earlier entry" on ⌃⌘, at the first entry, the pill hidden with
  no backup configured, and an empty console; under `?corner=pill` (set
  AFTER the launch run, which clears an unconfigured backup's trouble) the
  pill drawn bottom-right with its text, 22px in from the right edge. The
  pin and the progress line are not reachable from a headless run (a stale
  write needs a second tab, the pickers a hand) and wait for a look in
  Helium. DECIDED the same day, after the look: the text STAYS as a
  notice fades, where the current app's hide reset it to "saved" for the
  fade. MEASURED by hand the same day: "saved" whispers and dismisses,
  the export line counts the whole journal; NO pill on launch over a
  configured folder — READ backup.ts: the pill is drawn for any permission
  but "granted" and for a failed run, so its absence means Helium restored
  the grant without a prompt and the run went ahead. ACCEPTED 2026-09-07:
  the remembered grant is welcome; the pill is for the prompt and the
  failed run, and the README's "asks once a session" no longer describes
  Helium.
  `dist/index.html` is 563.94 kB after Svelte. MEASURED by hand the same
  day: a two-tab export ended in the stale tab's "not saved" over its
  count (the save-fail latch outranking the op's end, as ported); from one
  tab, "exported 13565 entries".
- THE CLIPBOARD WRITER (`clipboard.ts`) is the current app's writeClipboard
  ported, added the same day when the pin's click COPIED NOTHING by hand
  in Helium over a bare `navigator.clipboard.writeText`: the async API
  first, and on its refusal the off-screen textarea plus execCommand that
  restores the selection and the focus it displaced (the current app's
  measured reason: focusing an editing host with no selection invents a
  caret at offset 0). The ledger's click and the session's ⌃⌘R and ⌃⌘C
  go through it. Whether the fallback is what Helium needs from file:// is
  a hand's answer.
- THE MASTHEAD, first slice (`Masthead.svelte` over `mastheadModel.ts`):
  the sticky dark bar ported from .site-head with the journal icon, the
  date line as a BREADCRUMB (every ancestor its own link, the leaf bold,
  a top-level page its bold label alone, a day "Era — date"), the day's
  sibling tags under it, the tools (today when the open day is not today,
  export, import, backups, clear — the last phase 2's own, kept while the
  successor is not the running app), the title row (a sub-page's or a
  day's first level-one heading, hidden when none) and the Line numbering
  row, shown only over a gutter. The model is pure over the cache's keys
  and the journal's headings and is recomputed on an open, a landed save,
  an import and a clear — never per keystroke, since a day's tag list
  walks every key. NOT YET: the books and pages icons (their panels), the
  create, rename and delete of tagged entries and sub-pages, Go to,
  Search, help, the mode pill, the ⌃⌘G bar. Dropped with the bar: phase
  2's prev and next buttons — the current app has none, the chords walk.
  MEASURED 2026-09-07 in headless Helium: the bridge tool reads the crumb
  "Past — Sunday, 6 September 2026" on a day, "Browning, Robert › Pippa
  Passes" with the title row on the book page, "Brand New" on a minted
  page; over Horace the bar is sticky, 118px tall with the Line numbering
  row shown, the title row hidden, today shown. `dist/index.html` is
  582.10 kB. MEASURED in 5.57.0: `return $state(...)` is refused by the
  compiler — a rune is declared into a variable first.
- THE PANELS (the same day, asked for by hand: "only the journal icon"):
  the bookshelf and pages icons with their dropdowns, ported from
  18-pages-panel.js. THE ONE SLOT is `screen.panel` — every opener sets
  it, so opening one closes the others by construction, and the later
  overlays (help, backups, bookmarks, shortcuts) join it as values; the
  in-flow rows compete for no spot and stay out of it. The rows are built
  per open (`panelRows`, pure) and never rebuilt while open; a row is an
  anchor so ⌘-click works, and its click closes the panel since a click on
  the open entry's own row moves no hash. Closes: the opener again, a
  click outside any panel or opener (read from the target, since the
  components' handlers are delegated), Escape, a Tab out (focusout with
  relatedTarget outside), and a navigation (the masthead's refresh on a
  new key). "New page…" / "New author…" is `typedName` (naming.ts, the
  promptTag and refuseName rules, pure) over window.prompt; a new root is
  REGISTERED by storing an EMPTY body — the cache is the index, the warm
  keeps an empty row, the export skips a blank, and in the bookshelf that
  registration is what lets the refused-when-unknown address open — then
  opened, or "already on <label>" when it is the open one (session.goto
  now takes the same-place words; today says "already on today"). The
  shelf's repaint-while-hovered debt is not carried: nothing here repaints
  an open panel. NOT CARRIED: the shelf's empty line before the warm reads
  "Still loading…" as the current app's did, though the openers are
  reachable before the warm only for the instant the warm takes.
  MEASURED 2026-09-07 in headless Helium (`tools/helium-corner.mjs` over
  the seeded fixtures): the pages panel lists Horace and Williams over
  "New page…"; the shelf icon displaces it with "Browning, Robert" over
  "New author…"; the shelf's own icon again closes it; Escape closes; a
  click outside closes; a row click opens the page and closes the panel.
  The prompt is a hand's. `dist/index.html` is 586.95 kB.
- LINK CLICKS IN THE EDITOR (`src/editor/links.ts`, the same day, by hand:
  a book's contents row did not open): 07c-link-clicks.js ported as a
  DOM click handler on the view over a pure decision — the modifier opens
  EVERY link in a new tab, internal ones included; a plain click on an
  internal link (a bare fragment, or a full URL pointing at this document)
  routes in this tab, "already here" when it points at the entry it is
  printed on; a plain click on an external link places the caret. The
  reference block's whisper is not carried: there is no markdown view to
  send the reader to yet. The seed gains `page/Links`, an entry holding
  the three kinds. MEASURED 2026-09-07 in headless Helium
  (`tools/helium-corner.mjs`): the link to itself whispers "already
  here"; the external link leaves the entry; ⌘-click opens page/Horace in
  a new tab with the entry unmoved; a plain click opens it in the tab.
  MEASURED by hand the same day over the journal: the shelf's Lewis row
  to The Screwtape Letters to Letter 1 by plain clicks, ⌘-click into a
  new tab. Also that day, by hand: the `::: card-*` fills were missing — the box
  was ported, the eleven colours and the card's own ink were not; ported
  into editor.css. `dist/index.html` is 588.28 kB.
- SEARCH (the same day, asked for by hand): search.mjs, 23-search.js,
  26-search-results…js and 27-the-masthead-search-line.js ported. THE
  ENGINE (`store/search.ts`) is the module whole with its seven tests
  re-spelled and the scan beside them: the 1:1 fold, the edge-underscore
  grammar, the boundary rule, the stride, the ONE scope filter failing
  closed, the cap with one past it. THE STREAM (`model/flatten.ts`) is
  exactly `textBetween(0, size, " ", " ")` with whitespace runs folded,
  built by hand so every character knows its position: the index text,
  the jump and the reference payload's count all read it, pinned equal
  over every fixture, and a link selectionLink minted lands where findHit
  looks. THE INDEX (`store/searchIndex.ts`) is a walk over the cache's
  keys with a memo per entry on its exact markdown, so it needs no
  invalidation and re-flattens only what moved; the flatten is a PARSE,
  MEASURED 4.4 s over the whole mirror under node (123 MB) against 0.15 s
  to lowercase the raw text, so the first build is CHUNKED at 12 ms a
  step — kicked off in idle time after the warm, finished on demand under
  an "indexing… N / M" progress line when a search comes first — and
  every scan after it is memo hits. DECIDED without asking: searching the
  parsed text, as the current app searched the visible text, over the raw
  markdown that would have cost nothing to index but shown markers and
  matched addresses. THE ROW (`Search.svelte`, in the masthead between
  the title and Line numbering) is the current app's: ⌃⌘K or the summary
  toggles, the scope select preselects the open book else Journal with
  the roots grouped by namespace and the open unregistered book unioned
  in, the scan 150 ms after the last keystroke off the query as typed,
  Enter and the arrows flushing a pending scan, ↑↓ wrapping, the results
  an overlay under the whole bar, Escape, a click outside and a
  navigation closing it (the navigation dropping the query), focus to the
  input on open and back to the editor on close. THE JUMP
  (`editor/highlight.ts`) selects the nth occurrence under the search
  parse and scrolls to it; a "?h=" payload replays LITERALLY through the
  session's pending highlight, applied after the paint and dropped by a
  newer navigation. NOT CARRIED: the current app's re-answer of an open
  row after a warm (the warm completes before the chrome can be used),
  the scope relabel on an edited heading (the options are rebuilt per
  open). MEASURED 2026-09-07 in headless Helium (`tools/helium-corner.mjs`
  over the seeded fixtures): ⌃⌘K opens the row with the input focused and
  the page's book preselected; "sister" under Everything lists "Williams
  › 3. The Dark Ages" then "2026-09-05" with the word marked in each
  snippet; ↓ moves the bar; Enter opens the chosen day with "sister"
  selected and the row closed. `dist/index.html` is 603.33 kB.
- THE LIST KEYMAP (`editor/listKeys.ts`, the same day, by hand: Enter at
  the end of a bullet made no bullet): prosemirror-schema-list 1.5.1
  pinned exact, its splitListItem, sinkListItem and liftListItem over the
  schema's list_item, ahead of the base keymap. What is this module's:
  the gate (a caret in an item), Enter chaining the split with the lift
  so an empty last item steps out into a paragraph, Shift-Tab REFUSED at
  the outermost level where the library would lift the item out of the
  list — leaving a list is the source view's job, as the README says —
  and the two truths of Tab's refusal (13e-enter-and-tab-dispatch.js):
  "can't indent the first item in a list", or when that list is nested
  "can't indent an item more than one deeper than its parent". The floor
  reads "at the outer level" until ⌃⌘M exists to be named. A Tab in a
  list is consumed whether or not it moved. Refusals reach the corner
  through the editor's `onRefuse`, the session's say. Every item the
  selection touches moves together (the library's range), and the items
  below an outdented one follow it down a level, pinned in the tests.
  MEASURED 2026-09-07 in headless Helium (`tools/helium-corner.mjs`):
  "- one", Enter, "two", Tab, Enter, "three", Shift-Tab, Shift-Tab typed
  into a fresh page gave "- one / (nested) two / - three" and the corner
  "at the outer level". `dist/index.html` is 606.64 kB. By hand the same
  day: two bullets sat a paragraph apart — the item's own line is its
  first paragraph here, where the current app set it as bare text in the
  li, so `.page li > p:first-child` takes no margin and a continuation
  block keeps the current app's gap on both edges; the accent-coloured
  marker was ported with it. MEASURED in headless Helium after: 2.7px
  between two adjacent item lines (the 0.15em item margin, collapsed),
  a nested list still 18px (its own 1em bottom margin, as in the current
  app); looked at by hand the same day over a journal entry's two
  bullets: right.
- THE SUB-ENTRIES (the same day): 15-tagged-sub-entries-create-rename-
  delete.js ported, minus the extract — the toolbar's Tag button, which
  moves a selection into a new sub-entry, waits for the toolbar. The RULES
  are pure (`chrome/subEntries.ts`): every page hosts at every depth and
  a day's tagged entry is the one leaf; a sub-page's name takes the
  filename rule, a day's tag is the typed text; content-bearing
  descendants block a rename or a delete at every depth and blank ones
  never do, the blank subtree swept only past the confirm; the delete
  lands a root on today, a sub-page on its parent, a tag on its day; the
  noun leads the name in both dialogs and the reading, not the key, is
  shown. THE LINKS (`store/links.ts`) are rewritten over the document
  model, parse → judge each link run → serialize, null when nothing
  moved: the host's links retarget on a rename with a bare-name label
  following and a hand-written one staying, drop on a delete with an
  emptied paragraph, and a parent's minted label follows a sub-page's
  heading (the bare name or the previous heading, remembered per key from
  the last look). THE CREATE registers the name at once by storing an
  empty body, drops the link after the caret through `insertLink.ts`
  (never replacing a selection, never appended at the end; a code block
  or a link refuses first), saves the host and goes. THE RENAME flushes
  the save, stores the body under the new key BEFORE clearing the old
  (an empty body moves too — the row is the registration here, and the
  first run dropped it: MEASURED, the tag bar lost the renamed entry),
  retargets the host, replaces the address and reopens. THE DELETE
  opens the landing first (opening cancels the pending save that would
  resurrect the entry), then removes, retargets, and reopens the landing
  so a host that lost a link is redrawn. The three buttons sit first in
  the tools, worded per namespace by `subButtons`. MEASURED 2026-09-07 in
  headless Helium (`tools/helium-corner.mjs`, the dialogs answered by
  the harness): a day offers "+ tagged entry"; "Ideas" typed opens
  #2026-09-06/Ideas with the crumb "Past — … › Ideas" and rename and
  delete in its place; the day's body ends with [Ideas](#2026-09-06/Ideas)
  and its tag bar lists it; "Plans" typed at rename moves the address and
  the host's link; delete lands on the day with the link gone and no
  tags. `dist/index.html` is 613.03 kB. ⌃⌘N, reserved for "new" in
  phase 1 and asked for by hand the same day, is bound to the create:
  a tagged entry on a day, a sub-page on a page, a book on an author;
  on the one leaf that hosts nothing, a day's tagged entry, it whispers
  "a tagged entry holds no entries of its own" where the button is
  hidden, since a chord is a press. MEASURED in headless Helium: ⌃⌘N on
  a day with "Ideas" answered opens #2026-09-06/Ideas; ⌃⌘N there
  whispers the refusal. Confirmed by hand in Helium the same day.
- THE GO TO ROW (the same day, first of the three asked for: Go to, the
  source view, the toolbar): 19-the-consolidated-go-to-line…js ported.
  THE ORDER (`store/contents.ts`) is a book's own, read off the parent's
  contents over the document model — the links in document order with
  the section heading in force, all or nothing over the content-bearing
  subs, a heading that is itself a link a child where it stands, a feed
  of dated names newest first unless the book states its order, memoised
  on the parent's text. THE LINE (`chrome/gotoModel.ts`, pure with the
  routing): a Destination select (Journal, then every root grouped by
  namespace, the open unregistered book unioned in), then the journal
  shape at full preselect depth — Year, Month, Day labelled by its
  heading, a Tagged entry select with "← the day" only when the day has
  tags — or ONE SELECT PER LEVEL of a page's chain with "← the parent"
  and its own path; a terminal pick jumps, a non-terminal one rebuilds
  strictly downstream placeholder-led (a preselected option can never be
  re-picked, and under terminal navigation the placeholder is safety); a
  page with no content-bearing subs is terminal on the scope pick; a
  SOLE CHILD THAT IS ITSELF A PARENT collapses, its children standing in
  its place under its name with the work's own row reading "Index" —
  one hop, not a walk. THE ROW (`Goto.svelte`, between the title and
  Search): ⌃⌘J or the summary toggles, built fresh on open with the
  first select focused, emptied on close so a dismissed control is dead;
  a jump closes the row BEFORE the hash write; Escape and a navigation
  close it. NOT CARRIED: the open-line rebuild after a warm. FOUND by
  the row's arrival, by hand and by the tool: index.html's `details {
  margin: 2rem 32px }` for phase 2's pane reached the three masthead rows
  and set them 64px apart (MEASURED 325px of masthead over a day); the
  rule is scoped to `details.pane` and the rows sit 4px apart. The
  results list's `:empty` never matched the compiler's comment markers,
  so an open Search with no query hung an empty ruled bar; it hides by
  attribute now. MEASURED 2026-09-07 in headless Helium
  (`tools/helium-corner.mjs`): ⌃⌘J on a day focuses the Destination with
  2026, September and "6 — Act 1, Scene 1…" preselected and the other
  day labelled by its heading; "05" picked opens 2026-09-05 with the row
  closed; on Pippa Passes the chain reads "← the author" over the book
  by its title; Journal picked there gives today's shape; Escape closes.
  `dist/index.html` is 622.07 kB.
- THE SOURCE VIEW (the same day, second of the three asked for): 13b-the-
  view-switch-and-its-carets.js ported, re-asked of a store that holds
  markdown. The surface is a TEXTAREA over the entry's markdown, sized to
  its text (`field-sizing: content`), in the current app's source face,
  saving on the same debounce; the switch is a serialize, the switch
  back a parse, and a text the model refuses stays in the source view
  and says why — so the stored text the model refuses, which phase 2
  showed as an inert <pre>, now opens as editable source. ⌃⌘M toggles;
  the mode pill leads the tools while the source is on; a navigation in
  the source view paints the next entry's source. THE CARETS
  (`chrome/viewCarets.ts`, pure): what survives the flip is a COUNT of
  flat characters before the caret, held per view with the text as the
  staleness test, and the greedy alignment between the two streams —
  the rendered a subsequence of the source — carries it the other way
  when the hold is stale; glued syntax stays ahead of the caret, a
  separate token is crossed, the tail belongs behind a reader below it
  all; a MOVED caret retires the other view's hold. The rendered stream
  is flattenDoc's and the source's flattenText's, the same fold with raw
  indices. TAB IN THE SOURCE (`editor/sourceKeys.ts`, pure): two spaces
  at a caret; a selection shifts whole lines and stays selected; an end
  at a line start leaves that line; an empty line gains nothing;
  Shift-Tab takes up to two back, and at a caret with none is left to
  the browser; a selection that moved nothing says why. NOT CARRIED: the
  picture-pad distinction in the tail bit (no pad is drawn below a
  trailing picture here), the `![img-N]` markers (a picture is its
  `![](…)` as written), the caret's visibility in the source (assumed
  seen). ⌃⌘R in the source view says to switch. MEASURED 2026-09-07 in
  headless Helium (`tools/helium-corner.mjs`): ⌃⌘M over Twelfth Night
  shows the pill, focuses the source, whose text equals the store's,
  with the caret at "music be" where it had been placed; "MUSIC " typed
  and a Tab, then ⌃⌘M back, render "MUSIC   music be" with the caret
  after the edit and the store identical. `dist/index.html` is 626.38 kB.
  Confirmed by hand in Helium the same day, the Making Verity Cards
  page's formatting surviving the round trip. FOUND by hand the same
  day: a toggle taken from the top of a long entry landed the window at
  the source's END — a fresh textarea's selection sits at its end, and
  focusing scrolls that into view before the caret was placed; MEASURED
  in headless Helium (scrollY 1619 for a caret at index 2), fixed by
  placing the caret BEFORE the focus (scrollY 0 from the top, 466 for the
  mid-entry caret's own line). FOUND by hand the same day, twice more:
  a reader who SCROLLED away from the caret without clicking was pulled
  back to the caret. Two causes, both measured with a scroll log: the
  teardown between the surfaces empties the page for an instant and the
  window's scroll clamps to the top — the scroll is now put back after
  the mount, before the caret is placed; and the arriving view took the
  visibility bit from its own older hold, where the bit that describes
  the reader is the LEAVING view's, written on every toggle — the
  current app's "keep the caret as visible as it was" — so an unseen
  caret is placed with `preventScroll`. MEASURED after: mid-entry 529,
  from the top 0, scrolled to the bottom 1546 of 1542.
- THE TOOLBAR (the same day, third of the three asked for): 14-floating-
  format-toolbar.js, 25-word-count-on-demand.js, md.mjs's curlQuotes and
  extractToTag ported. THE ACTS (`editor/format.ts`, pure over a state):
  the four marks are prosemirror-commands' toggleMark, ⌘B ⌘I ⌘U bound in
  the editor's keymap with ⌘' for the curl; H is the current app's `#`,
  level 1 here, toggling with the paragraph; quote wraps or lifts; the
  code block toggles; the curl walks every text node the selection
  touches outside code with the previous character carried within a
  block (the current app's dash, quote, closed-dash and elision rules);
  the word count is over the flat stream, the selection's or the whole
  document's, and in the source view over the PARSED markdown so both
  views report one number; the extract cuts a run inside one textblock
  as a PARAGRAPH (the current app's blockNormalize; measured first as a
  one-line verse fence when the word came from a verse line) and a run
  across blocks as the covered structure, and replaces it with the link,
  an emptied heading shell becoming a paragraph, a deletion that leaves
  no textblock getting a paragraph of its own. THE BAR
  (`chrome/Toolbar.svelte`) floats over the selection, placed by the
  page on selectionchange a frame later, on scroll, and on the EDITOR'S
  own selection changes (`onSelect`, since the DOM's selectionchange
  runs a beat before the state has the new selection — measured, the H
  lit for the old caret's heading); clamped under the masthead; hidden
  in the source view and over a search jump's selection until the
  reader next touches the page; inside a code block only the code
  toggle shows; Tag shows where the entry hosts. Its mousedown is
  swallowed so the selection survives the click. Tag is the current
  app's extract: the prompt, the naming rule, the taken check, the new
  entry stored with the cut, the link in its place labelled by the cut's
  first heading on a page, the host saved, the new entry opened. ⌃⌘W
  says the count. MEASURED 2026-09-07 in headless Helium
  (`tools/helium-corner.mjs`): a double-click on "music" floats the bar
  above the word with Tag offered; B lights and the store holds
  **music**; Tag with "Music" answered opens #2026-09-06/Music holding
  "**music**", the day reading "If Music be the food of love" with Music
  the link. `dist/index.html` is 638.85 kB. By hand the same day: Enter
  on a code block's empty last line did not leave it — the README's rule
  for every fence, which the base keymap's lift answers for a quote, a
  card and a note and the row keys for verse, had no arm for the code
  block; `codeKeys.ts` takes the empty line with it and lands in a
  paragraph below. MEASURED in headless Helium: a fence typed, a line,
  Enter twice, "after the block" in its own paragraph. Confirmed by hand
  the same day.
- THE PASTE AND THE COPY (the same day, by hand: a reference pasted into
  the rendered view arrived as its markdown text): the text half of
  13c-paste-and-source-copy.js ported as the editor's clipboardTextParser
  and clipboardTextSerializer (`editor/paste.ts`). Several pasted lines
  render as the markdown they spell; a single line stays as typed unless
  it is an unambiguous quote or heading line or a pasted entry link,
  which lands inline; inside a list item, a table cell or a verse row
  the lines arrive as breaks; in a code block every character is
  literal; a form the schema refuses stays as typed. The copied text is
  the selection's markdown, inline content as a paragraph. NOT CARRIED:
  the current app's own clipboard flavour — the editor's HTML carries
  its structure between entries, and the text parser is asked only of
  PLAIN text; the quote-body arm's DOM surgery — a block slice fits
  inside a quote through the model; the pad paragraphs — the model's
  own fit. The serializer's decisions stand where the paste meets them:
  a pasted literal asterisk is the serializer's to escape or not, and a
  continuation line inside an item that READS as a block becomes that
  block. NOT YET: a pasted image (the sidecar store exists; the paste
  of bytes is its own slice). MEASURED 2026-09-07 in headless Helium
  (`tools/helium-corner.mjs`, a synthetic paste event — the handler's
  reach, the real paste being a hand's): "[*Gesta*, 7 September
  2026](#2026-09-07?h=blind%20cord):\n\n> blind cord" pasted into a
  fresh page stores as that markdown, the link and the quote drawn.
  `dist/index.html` is 640.37 kB. Confirmed by hand the same day; and
  found by hand: the reference link followed back showed the passage
  selected WITH the format bar over it — only the search's own jump had
  told the bar to stay away. The session now reports every highlight it
  places (`onHighlight`), and the page keeps the bar off it until the
  reader next touches the page, for a link's payload as for a search.
  MEASURED in headless Helium: a pasted link with "?h=food%20of%20love"
  followed selects the words with the bar hidden. The selection's
  colour, by hand the same day: the browser's blue — `.page ::selection`
  in the flash was left out of the stylesheet port and is in.
- ⌃⌘G AND THE LANDING MARK (2026-09-08, first of the remaining list, the
  order confirmed the night before): 20-g-go-to-a-line.js ported. THE
  DECISIONS (`editor/goto.ts`, pure): what the entry can be asked for —
  line, page, both or none, the line box answering for sentences too — the
  hits of a line number across every numbered block, the cycle that
  re-finds the marked row among the live hits rather than carrying an
  index, the landing word said only where several blocks make the
  ordinal load-bearing and form-neutral in a prosimetrum, the three
  refusals (one block its range, several the longest, a number below the
  first named back), a leaf found case-blind and named back when
  missing, the ask checked and named back as typed. THE MARK
  (`editor/landing.ts`) is a plugin position mapped through every edit
  and drawn as a node decoration in the flash — a row's background, a
  leaf marker's spread shadow — never in the document; the bar's close
  takes it off. THE BAR (`chrome/LineBar.svelte`) hangs off the masthead
  at the right gutter with one box per kind of number and an "or" where
  both stand; ⌃⌘G toggles it (refused in the source view, and where
  nothing is numbered), the boxes emptying when it opens on another
  entry; the landing is CENTRED in the band under the masthead; Escape,
  the × and ⌃⌘G again hand the caret to the landed row (a pair's first
  cell, or just after a leaf marker), a click outside and a navigation
  take the plain close. NOT CARRIED: the current app's repaint of a
  gutter stripped by typing (the numbers are decorations here and never
  leave), and its focus recovery when a box hides under the reader (the
  kind is fixed at the open). MEASURED 2026-09-08 in headless Helium
  (`tools/helium-corner.mjs`): over Horace ⌃⌘G focuses the Line box
  alone; "3" Enter marks row 3, its middle 3px off the band's; Enter
  again on one block stays; Escape closes with the caret in row 3; over
  Witchcraft 3 the Page box alone; "9z" says "9z is not a page number";
  "61" marks leaf 61. `dist/index.html` is 647.51 kB.
- HELP (2026-09-08): 16-help-panel.js ported, the help section of the
  current app's body.html carried WHOLE into `chrome/help.html` and drawn
  by `Help.svelte` as trusted markup — it is phase 3's acceptance list,
  and it is edited here only where this app differs: the source view's
  picture references (`![](name.webp)`, not `![img-N]`), and ⌃⌘N in the
  key table. WHAT IT PROMISES THAT IS NOT YET BUILT, as of this entry:
  bookmarks (⌃⌘B), custom shortcuts (⌃⌘S), the pasted image, the backups
  panel behind the button, the code block's language label and copy
  button, the hover copy of quotes and cards, the rich clipboard flavour,
  Tab in a quote, ⌃⌘L, the every-2nd/3rd/4th intervals — the remaining
  list, in order. The card is the panel slot's third value, so ⌃⌘H or
  the help button opening it closes the pages and bookshelf panels, and
  either of those opening closes it; Escape and a click outside close
  it. MEASURED 2026-09-08 in headless Helium: ⌃⌘H over an open pages
  panel shows the card with "Custom keys" and the panel gone; Escape
  closes. `dist/index.html` is 689.75 kB, the help text being 42 kB of it.
- BOOKMARKS (2026-09-08): bookmarks.mjs ported whole with its tests
  (`store/bookmarks.ts`) — the store's two member shapes, null for
  anything this app would not have written, the numbered cap of nine
  with keyed rows uncapped, the trigger grammar — and 22-bookmarks-b.js
  as `chrome/bookmarksModel.ts` (pure: the rows keyed-first, the labels
  read live, the foot line, the sweep of rows that lead nowhere, the
  typed key resolving on the press when nothing can grow and waiting
  when it can, Enter taking the sole candidate or asking for the rest)
  and `Bookmarks.svelte` (the card in the panel slot's fourth value,
  holding focus itself so A, 1-9 and a typed key reach the page's
  handler; the keyed column measured off a probe in a row). The store is
  `gesta.v1.bookmarks`, device-local; an unreadable store latches and
  refuses writes; a failed write pins through the ledger's deferred
  one-shot and a landed one releases it; the two pages the current app
  pinned are seeded once when the key is absent. The link button drops
  an entry link after the editor's caret through insertLink.ts with the
  same refusals as a minted sub-entry's, labelled by what the entry is
  called. ⌃⌘B toggles; a jump closes the card before the hash write and
  says "already on …" for the open entry. NOT CARRIED: the current app's
  panelCaret capture at the open — the editor's selection survives the
  card taking focus. MEASURED 2026-09-08 in headless Helium
  (`tools/helium-corner.mjs`, a fresh profile where the seeded pages are
  unreachable and swept): ⌃⌘B on a day shows "No bookmarks yet." with
  "Press A to add bookmark for 2026-09-06"; A adds the row marked "you
  are here"; from Horace, ⌃⌘B then 1 opens the day; the key button, "fb",
  Enter keys the row; "f" lights it; "b" jumps with "already on
  2026-09-06"; × empties the list. `dist/index.html` is 702.48 kB.
- CUSTOM SHORTCUTS (2026-09-08): shortcuts.mjs ported whole with its
  tests (`store/shortcuts.ts`) and 21-custom-shortcuts-text-expander.js
  as `Shortcuts.svelte` in the panel slot's fifth value: a code box that
  filters the table by case-sensitive prefix, the rows with the first
  highlighted, ↑↓ wrapping, Enter or a row's mousedown inserting the
  expansion at the caret in EITHER view (the session's insertText: the
  editor's transaction, or the source textarea's setRangeText), the
  editor beneath loading its text only on its hidden→shown transition
  and never while dirty, Save writing the raw text to
  `gesta.v1.shortcuts` (device-local), a refused write pinned through
  the deferred one-shot and released by a landed retry, "no shortcut to
  insert" for an Enter over no row. An empty table opens the editor at
  once. NOT CARRIED: the current app's caret capture at the open — the
  editor's selection survives the popup. MEASURED 2026-09-08 in headless
  Helium (`tools/helium-corner.mjs`): ⌃⌘S over no table shows "No
  shortcuts yet — add some below." with the editor open; "sig: Sean
  Miller / md: markdown" saved lists both and whispers "shortcuts
  saved"; "m" typed filters to md; Enter closes the popup and the entry
  reads "markdown". `dist/index.html` is 709.47 kB.
- THE BACKUPS PANEL (2026-09-08): 17-backups-panel.js ported as
  `Backups.svelte` in the panel slot's sixth value, behind the masthead's
  "backups" button where phase 2 had the setup button bare: "Set up
  automatic backups…" or "Change backup folder…", "Resume backups" where
  the last run stalled, the status line — an unloaded journal outranking
  every other status, the trouble's own words, else "Automatic backups
  are on." — and the recovery note. The runner's state is read at the
  open and again on every trouble change while the panel stands; a
  browser with no folder picker is told so and offered nothing. The
  corner's pill stays as it was. MEASURED 2026-09-08 in headless Helium:
  the button opens the card with the setup button alone and no status
  on a profile with no folder; Escape closes. `dist/index.html` is
  713.34 kB.
- THE PASTED PICTURE (2026-09-08): the image arm of 13c-paste-and-source-
  copy.js ported. The editor's handlePaste hands an image file to the
  session, which decodes it (createImageBitmap), downscales to 1400
  across on white and recompresses as webp at 0.85 (`editor/images.ts`,
  the current app's placeImage re-asked of bytes), files the bytes under
  the entry's folder as `<base>-img-<N>.webp` — N one past the highest
  the text already names (`nextImageName`, names.ts, pure with a test),
  the mirror's own spelling, so a paste here exports as the current
  app's did — and places it: the image node at the caret in the rendered
  view with a paragraph minted below when it lands at the end, the
  `![](name)` text in the source view. WHERE IT WAS AIMED is checked when
  the bytes are ready, the decode landing a beat later; a picture that
  cannot land, one pasted during another's decode, or one the engine
  cannot read STICKS, the gesture being spent. NOT CARRIED: the current
  app's content-addressed dedup (a picture is its bytes under its own
  name here, phase 2's decision) and its jpeg fallback for an engine
  without webp (Helium has it). MEASURED 2026-09-08 in headless Helium
  (`tools/helium-corner.mjs`, a 1600×800 PNG drawn on a canvas and
  pasted as a file): the entry stores "A picture: ![](Pictured-img-1.webp)",
  the picture draws from the store at 1400×700 with a paragraph after
  it. `dist/index.html` is 715.02 kB.
- CODE BLOCKS AND THE COPY BUTTON (2026-09-08): md.mjs's tokenizer ported
  pure (`model/tokens.ts`, the language table and aliases whole, one
  alternation pass yielding spans, with tests), drawn by
  `editor/codeHighlight.ts` as inline decorations over every fenced block
  with a language, recomputed on a document change — never in the text;
  the corner language label and the four token colours are the
  stylesheet's, off the block's data-lang, the label yielding to the
  copy button on hover. THE COPY BUTTON (`chrome/CopyButton.svelte`,
  11-copy-a-code-block…js) is ONE fixed button over whichever code
  block, quote, card, verse or prose block, note or reference the mouse
  is nearest inside — a quote inside a quote is one nest, a card or a
  code block between them stopping the climb — clamped under the
  masthead, wide enough to cover a code block's label, hidden in the
  source view. It copies a code block's lines, or the block's FULL
  markdown (the node found through the view, serialized as a document of
  one block) with the block's rendered HTML beside it; "copied" is said
  only for the block it is still over, keyed on the element and a click
  counter. NOT CARRIED YET: the inline-style sweep that makes the HTML
  flavour arrive with its colour, rule and paired grid — that is item 8's
  rich flavour, next. MEASURED 2026-09-08 in headless Helium: "```js",
  Enter, "const n = 42 // answer" gives a block labelled js with const,
  42 and the comment as tokens; the hover shows "Copy this code block"
  inside the block's edge with the label faded; the click says "copied".
  `dist/index.html` is 722.23 kB.
- THE RICH FLAVOUR (2026-09-08): 12-block-clipboard.js's inline-style
  sweep and the reference's staging ported (`chrome/richCopy.ts`).
  Anything whose look is class-driven CSS — a card's colour, a note's
  rule and smaller type, a paired row's grid, a code block's box and its
  token ink — is written inline, read off the LIVE twin's computed
  style; a quote and a reference block are left unstyled on purpose; a
  passage built from markdown is parked under the editing surface for
  the length of the sweep, since a detached element's computed style is
  empty. ⌃⌘R now writes the markdown with the HTML beside it — the
  citation anchor with the label's italics as em, then the passage's
  blocks (`referencePayload` hands its parts, tested); ⌃⌘C the link as
  an anchor; the hover copy button the block swept. MEASURED 2026-09-08
  in headless Helium with the clipboard permission granted and read
  back: text/plain and text/html both present, the HTML opening
  `<p><a href="…#page/Horace?h=…"><em>Horace</em>` with
  grid-template-columns inlined on the paired row. OBSERVED there:
  Chromium's clipboard hands the fragment href back resolved to the
  file's full address — the write is `href="#…"`, as the current app's
  is; what a receiving application sees is its clipboard's doing.
  `dist/index.html` is 723.76 kB.
  FAILED 2026-09-08 by hand: a card hover-copied into Mail arrived as
  uncoloured lines with the pair interleaved — the button wrote the
  block's RAW outerHTML, the sweep imported and never called. Fixed the
  same day, and ⌘C over a selection given the same sweep: the editor's
  `clipboardSerializer` parks the serialized fragment under the surface
  and sweeps it against itself (`editor/inlineStyles.ts`, moved out of
  richCopy.ts so the editor does not import the chrome). MEASURED the
  same day in headless Helium over a light-blue card holding a paired
  row: the hover copy's HTML and ⌘C's both spell
  `background-color: rgb(129, 177, 169)` — the live card's computed
  colour — with the grid on the row, and ⌘V on a fresh page brings back
  one card with one pair, the markdown opening `::: card-light-blue`.
  Looked at by hand the same day in Mail: right; ⌃⌘R over a paired row
  into Mail the same day: good.
- TAB IN A QUOTE, ⌃⌘L AND THE INTERVALS (2026-09-08): the quote arm of
  13e-enter-and-tab-dispatch.js ported (`editor/quoteKeys.ts`), re-asked
  of the model, where a quote's body is ONE paragraph of lines with
  breaks and a blank line is two breaks (the grammar's line run, phase
  0): THE UNIT IS THE RUN between the blank lines around the selection —
  several runs when it crosses one — cut out of the paragraph and
  wrapped in a quote of its own, the lines before and after staying;
  Shift-Tab splices the inner quote's lines back into the flat run with
  a blank line either side (the library's lift left two paragraphs
  adjacent, which the serializer writes with no blank quote line and the
  parser reads back as one run — MEASURED by the round-trip test, the
  lift fails it); an inner quote holding anything but paragraphs takes
  the lift. The serializer's spellings stand: a nested quote as `>>`, no
  blank quote line between a quote's blocks. A selection reaching outside
  the outermost quote says "Tab indents one list, quote, or code block at
  a time"; Shift-Tab on the outermost says the floor, now in full: "at
  the outer level: switch to markdown (⌃⌘M) to remove", the list's floor
  reading the same. ⌃⌘L toggles the Line numbering row with its select
  focused, "no line numbers here" where nothing is numbered, Escape
  closing it; the intervals are the current app's seven (none, every
  line, every 2nd, 3rd, 4th, 5th, 10th). MEASURED 2026-09-08 in headless
  Helium: "> quoted words" then Tab stores ">> quoted words"; Shift-Tab
  twice puts it back and says the floor; ⌃⌘L over Horace opens the row
  with the select focused and the seven intervals; Escape closes.
  `dist/index.html` is 727.52 kB.
- THE REFUSED FENCE NAMED (2026-09-08, the last of the list but the
  scaffolding): md.mjs's noteRefusals and 11b's stickFenceRefusals
  ported. `model/fenceRefusals.ts` walks the DOCUMENT rather than the
  parse: had a `:::`-shaped line opened anything it would not be a
  paragraph's text, so every such line in a paragraph is a refusal by
  construction, with the current app's reasons — a starting number that
  is not one, a word that takes nothing after it, a card without its
  colour, a block Gesta does not know. The session pins them on the
  switch back from the source, one per line (an OWNED pin through the
  ledger), and a clean parse of the page releases it — the switch's, and
  only that one; a navigation releases it too, the page having gone.
  NOT CARRIED: the pin on a rendered-view paste (the text parser has no
  seat at the ledger; the source view is where a fence is typed). MEASURED
  2026-09-08 in headless Helium: "::: versey / line / :::" typed in the
  source and ⌃⌘M pins "::: versey — not a block Gesta knows, so it stayed
  a paragraph"; the fence corrected to "::: verse" and switched again
  clears the corner with the verse rendered. `dist/index.html` is
  728.50 kB. WHAT REMAINED of phase 3 was the scaffolding out — the clear
  button and the markdown pane under the entry — once the cutover was
  close, asked 2026-09-08.
- THE SCAFFOLDING OUT (2026-09-08, asked that day): phase 2's clear
  button and the markdown pane under the entry are gone, and with the
  pane the SERIALIZE PER KEYSTROKE that fed it — the session's `onShow`
  now hands the chrome what the store holds and the key, never the
  markdown on screen. The store's `clear()` stays on the adapter contract
  with its tests; nothing in the page calls it. The headless corner tool
  read the pane at twelve steps and now reads the open entry's row
  straight from IndexedDB after the save's debounce (`storedMd`), which
  is the truer question — what LANDED, not what the editor would write.
  MEASURED 2026-09-08 in headless Helium: the corner tool's twelve
  store reads give the same markdown the pane gave, and the bridge tool
  is green. `dist/index.html` is 729.51 kB. Confirmed gone by hand the
  same day over today's entry: the tools read tagged entry, export,
  import, backups, help, and the page ends at the entry.
- THE OPEN ENTRY FIRST (2026-09-08, by hand: two seconds of blank after a
  refresh): the current app's primeOpenEntry, whose seat the layer's
  `primeEntry` had kept — the address's ONE row read and opened before
  the warm reads the whole journal; a day opens whether or not its row
  exists, a keyed entry once its row is in the cache (primed, or seeded),
  an absent one waiting for the warm to answer whether it is refused;
  the masthead's lists are redrawn when the warm lands. The page's probe
  now stages "primed" before "all". MEASURED 2026-09-08 in headless
  Helium: "start;seed;primed;all;" over the seeded profile; the two
  seconds over the journal are a hand's to time. ⌃⌘G on Paradise Lost
  book 1 with 254 was confirmed by hand the same night.
- THE COPIED BLOCK COMES BACK WHOLE (2026-09-08, by hand: a paired verse
  block copied in the rendered view and pasted back arrived as its cells'
  text in paragraphs, the two languages interleaved). Two causes. Every
  node that drew itself lacked a rule to READ itself back — the editor's
  own copy travels as that DOM — so the verse, prose, line, pair, cell,
  gap, card, note and reference nodes now carry parseDOM rules matching
  their toDOM. And a drag from inside one row copies open at the row
  (MEASURED: a selection across two pairs slices to the pairs, open two
  deep, the block left out), which a paste merges into the paragraph it
  lands in; `closeRowSlice` (paste.ts, `transformCopied`) closes a slice
  whose ends are inside a row block, a list or a table — the README's
  "a drag from inside one bullet, cell or verse line into the next copies
  as the block those parts came from" — and the copied text follows the
  same closed slice. MEASURED 2026-09-08 in headless Helium: Horace's
  verse block selected, ⌘C, pasted with ⌘V into a fresh page stores
  "::: verse" with all 36 pairs and the first line inside the fence.
  Confirmed by hand in Helium the same day over the German block.
- A BLOCK-SHAPED TEXT PASTE IS SET DOWN, NEVER FITTED (2026-09-08, by
  hand: a verse fence copied from the source view and pasted into the
  rendered view lost its first original line to the paragraph above,
  the fence opening on the translation). The editor's replace opens a
  closed block slice up to fit the paragraph it lands in, peeling the
  first cell's text into it. `pasteBlocks` (paste.ts) names the blocks a
  block-shaped plain-text paste spells — outside a code block, a list
  item, a cell or a row, and not a single entry link — and `placeBlocks`
  sets them down: an empty paragraph replaced, a caret at a paragraph's
  edge putting them before or after it, a caret mid-paragraph splitting
  it with the blocks between, the caret landing after them; the
  editor's handlePaste takes that road for a paste carrying no HTML, the
  editor's own copies keeping the editor's paste. MEASURED 2026-09-08 in
  headless Helium: a fence pasted as text stores "start end / ::: verse
  / Heil! Heil! | Hail! Hail! / Erlösung | Salvation / :::", the first
  pair whole. `dist/index.html` is 730.62 kB.
- PHASE 3 CLOSED 2026-09-08, asked that day, every item of the list
  agreed 2026-09-07 built, measured in headless Helium and looked at by
  hand, the scaffolding out. The current app stays the running app until
  this one has been used for real entries. Phase 4 next: the review
  order first, because it governs spend, then the acceptance gate,
  `hooks/` and the prose checkers, carried over from ../writer/CLAUDE.md
  per checker as each becomes relevant.

## Phase 4 decisions (2026-09-08)

- THE REVIEW SHAPE, asked from "this is a new app; what is the sensible
  and economic way to review it" (the running app's five-reviewer loop
  had spent a week's allowance in a day, and its CLAUDE.md's order was
  out of date — its memory records one /code-review at medium since
  2026-09-02): the free checkers first, then ONE `/code-review` at
  medium over a commit range by batch, findings in one fix commit, a
  confirmation pass offered at its price. tsc gained `noUnusedLocals`
  and `noUnusedParameters` (the card copy's lost colour was an import
  used nowhere); five test sites fired, none in the app. THE GATE
  (`hooks/`): `accept.sh` records the signature of src/ and index.html,
  `pre-review.sh` refuses a review skill, a Workflow or a review-shaped
  Agent while the tree differs from it; exercised from the shell —
  refused, ungated for a search, accepted, re-armed by one byte. The
  hooks and the settings are permission-denied to the agent.
- THE PHASE 3 REVIEW, the first: `/code-review medium c5e1ff4^..HEAD`
  after the acceptance by hand, MEASURED 155,660 tokens, 28 tool uses,
  19 minutes; fifteen candidates verified, 13 confirmed, 2 plausible,
  1 refuted (a pending-highlight leak: the payload is set after the
  refusal). The eight most severe, all fixed in one commit:
  a reopen after an async write (a delete's retarget, a rename's
  writes, an import's tally) cancelled the debounce and repainted from
  the store, dropping keystrokes typed in the window — `session.refresh`
  flushes first and repaints only where the store differs, a rename
  carries the surface's text to the new key; a multi-line paste inside
  a `::: reference` block (a code-shaped textblock) was parsed and split
  the directive in two — every code-shaped textblock is literal now,
  pinned; Enter in the ⌃⌘G bar after ⌃⌘M dereferenced a null view — the
  bar closes with the switch; `indexOrder` filtered every key once per
  day, MEASURED by the review at 500–708 ms a call over 13,600 keys and
  paid per scan — one bucketed pass, pinned under 100 ms, and the order
  kept while the key set stands; a hash change in the two seconds before
  the warm was refused over the one primed row ("no such author" on a
  contents link), the walk said "no earlier entry" falsely, and a root
  typed then could store an empty body over a real one — the address's
  row is primed and failing that the warm reopens the hash, the walk and
  the new root wait for the warm; the search's "indexing…" progress line
  retired an export's handle, whose failed writes then ended unshown —
  not while the ledger is busy; one stored text the model refuses forced
  the source view on every later navigation — the forced view is its
  own flag, the reader's choice put back on the next open; a refused
  address in the source view remounted the textarea — the arm reads
  `!view && !source`. Also from the review: the extract checks its text
  still stands after the write before placing the link; the three tools
  still read the pane's `#same`, gone with the pane.
  NOTED, NOT FIXED: `stick` has no busy guard, so a pin raised
  mid-export leaves the corner on the last "exporting…" line (a faithful
  port of the current app's ledger); Tab on a heading, table or code
  block inside a quote is swallowed with the bare floor; a warm that
  fails after the primed entry is open leaves it editable with every
  save silently refused, the one boot pin the only notice; the two
  plausibles (an index flatten with no try/catch, Shift-⌘V over a
  source offering text/html bypassing the set-down road). MEASURED
  after: 475 tests green, tsc clean, both Helium tools green over a
  fresh profile, the console empty. `dist/index.html` is 730.38 kB.
  OBSERVED: a verifier's scratch test under src/ moved the signature
  mid-review and a sibling's Agent call was refused by the gate — the
  gate works, and a reviewer must not write under src/.
- THE CONFIRMATION PASS over the fix commit, after a second acceptance
  by hand: one sonnet agent scoped to e8b4781, told what was settled and
  forbidden to write under src/; MEASURED 177,838 tokens, 42 tool uses,
  12 minutes. It fuzzed the new `indexOrder` against the old over 200
  key sets (the one difference the intended one), and walked the
  deferred hash, the forced view, the extract guard and the bar's close
  clean. ONE DEFECT CONFIRMED in the delta, fixed the same day: a rename
  left the editor live under the OLD key through its writes, so a
  debounce firing then wrote the surface back under the key just removed
  and the entry stood under both — saves are SUSPENDED from the rename's
  flush until the open of the new key (`session.suspendSaves`), what is
  typed meanwhile still carried. Also taken: the order memo's signature
  is `JSON.stringify(keys)`, unambiguous where a joined string could in
  principle collide (a key may hold any character). ACCEPTED as a
  residual: a keystroke landing between `refresh`'s flush and its
  compare, while a retarget writes, is dropped by the repaint — a window
  of one IndexedDB write, not the whole operation it was. MEASURED after
  in headless Helium: the rename step now reads the day's stored link
  `[Plans](#2026-09-06/Plans)` back (the tool had a placeholder there),
  85 lines, the console empty; 475 tests, tsc clean. `dist/index.html`
  is 730.45 kB. The round closes here: a third pass is the exception,
  and this one found no behaviour past the rename. Confirmed by hand
  in Helium the same day: words typed just before a rename stand under
  the new name, and the old tag is gone from the day's bar; the contents
  link after a refresh, the walk before the warm, the bar gone on ⌃⌘M, a
  search during an export, and a delete's day all good by hand the same
  day. The reference-block paste confirmed by hand too, with a note:
  the block accepts any pasted text, sense or not, as the current app's
  does — kept (asked and settled 2026-09-08). THE REFERENCE BLOCK'S LOOK
  is the current app's, ported whole the same day when the monospace
  stand-in was seen beside it by hand: a quiet aside on a left rule with
  the small-caps "Reference style" label. MEASURED in headless Helium:
  the label in small caps, a 3px rule in the rule colour, Georgia at
  0.85em in the muted ink, the paragraph after it unchanged; looked at
  by hand the same day: better. `dist/index.html` is 730.64 kB.
- ⌘-CLICK ON A LINK (2026-09-09, by hand in the cutover trial: a ⌘-click
  on an external link selected the whole paragraph and raised the format
  bar). A ⌘-mousedown is ProseMirror's own "select this node" gesture,
  and the link handler ran on CLICK, after the node selection was made;
  the new tab opened even so. The modified press is taken on mousedown
  now, before ProseMirror sees it; the plain click stays a click.
  WHY NO CHECK CAUGHT IT: the pure test covers the decision, not the
  handler's meeting with the editor's mouse gesture; and the headless
  step ⌘-clicked one internal link and asked ONE question, whether a new
  tab appeared — true on the old code too. MEASURED 2026-09-09: over the
  old handler the extended step reads nodeSelected true, the paragraph's
  text selected and the bar shown for both links; over the fix, a new
  tab for each, nothing selected, no bar. The rule taken from it is in
  CLAUDE.md: a headless step reads the screen after a gesture, not the
  one bit the feature promises. `dist/index.html` is 730.74 kB.
  Confirmed by hand in Helium the same day.
- THE AUDIT OF THE HEADLESS STEPS (2026-09-09, asked for): every one of
  the corner tool's 82 steps now reads THE SCREEN after its gesture
  through one reader — the entry, what is selected (a node, N chars,
  none), the bar, which panel and which rows stand open, the view, the
  corner's text — appended to the step's own reading as one line.
  MEASURED over a fresh profile: no step leaves a panel, a row or the
  source view standing that it should have closed; the bar is on only
  where the step itself made a selection (⌃⌘R, the ⌘C, the
  double-click) and off over the two highlights that suppress it; the
  view is rendered again after every switch. No defect in the app; the
  tool named a panel by its Svelte hash class, fixed. The corner's text
  lingers across quick steps, a whisper's clock being longer than the
  tool's waits, which is the notice fading as decided. The bridge tool's
  nine steps already read entry, crumb, title, status and first line.
- LINKS IN THE TEXT (2026-09-09, by hand: the browser's blue and visited
  purple): the current app's one rule, `.page a { color: var(--accent) }`,
  was left out of the 2026-09-07 stylesheet port; ported. MEASURED in
  headless Helium over the Links page: all three links rgb(61, 107, 44)
  with the underline kept, visited or not; looked at by hand the same
  day: better. `dist/index.html` is 730.75 kB.
- A BOOK'S PAIRED PROSE IS THE TEXT (2026-09-12, by hand: Boethius 3pr1
  drawn as a blockquote — the fill and the left rule). The current app's
  quoted-matter dress for a verse or paired-prose block is scoped OFF
  both `versepage` and `prosepage`; the port carried `versepage` alone,
  and nothing set `prosepage`, so a book's paired prose, which paints no
  gutter, took the dress. `countsSentences` (numbering.ts) is the
  current app's numbersSentences — a top-level prose block holding a
  pair — and the line-number plugin sets `prosepage` on the root from
  it beside `versepage`; the stylesheet's rule is scoped on both.
  Pinned: prosepage on a paired prose block, not on a pipe-less one nor
  one inside a quote, both classes where a verse and a paired prose
  block share the entry. MEASURED in headless Helium over 3pr1 pasted
  whole: the prose block with no border and a transparent background,
  its rows a two-column grid, the root `prosepage`; both tools green,
  the console empty. `dist/index.html` is 730.96 kB. Confirmed by hand
  in Helium the same day.
- THE WALK FOLLOWS THE INDEX (2026-09-12, asked: ⌃⌘. from the Consolatio's
  3pr1 went to 3pr2 where the book's index reads 3pr1, 3m1, 3pr2 — the
  prose and the verse alternate in the text). `subPageNeighbors` takes
  the sibling order it is given and `navNeighbors` an order provider;
  the session hands it the parent's `subPageOrder` (contents.ts), the
  same order the go-to row reads, memoised on the parent's text — a
  stated index as stated, by name where the parent states none, and by
  name where a content-bearing sub is missing from the index (the
  row's all-or-nothing rule, kept). A sub the order does not hold (an
  open unregistered one) is still placed by comparison. Pinned: next
  from 3pr1 is 3m1, prev from 3m1 is 3pr1, a blank in the order is
  skipped, and the same keys walk 3m1, 3m2, 3pr1, 3pr2 by name; the
  test red over the old walk, MEASURED. The seed gains a Boethius book
  with a three-entry index. MEASURED in headless Helium: ⌃⌘. from 3pr1
  opens 3m1, again 3pr2, ⌃⌘, back 3m1; the bookshelf panel now lists
  Boethius over Browning; the console empty. `dist/index.html` is
  731.48 kB. Confirmed by hand the same day over the Consolatio's
  book 3.
