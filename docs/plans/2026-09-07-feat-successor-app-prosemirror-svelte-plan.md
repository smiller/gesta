---
title: "feat: the successor app — ProseMirror editor, Svelte chrome, a build step, a new repository"
type: feat
status: open
date: 2026-09-07
---

> MOVED HERE 2026-09-07 from ../writer/docs/plans/ (the plan's decision 10
> named that repository as its home while this one did not exist). From
> phase 1 on, the decisions and measurements are CLAUDE.md's dated
> sections; this file is the plan as written, with phase 0's record.

## Where we are (2026-09-07)

Kept current here, one line per phase, so the state of the plan is
readable in this repository without the history. The detail behind each
line is CLAUDE.md's section of the same name.

| Phase | State | Record |
|---|---|---|
| 0 — the schema and the round trip | DONE 2026-09-07. Green over 13,380 files; the corpus tool stays as the gate. | "Phase 0 decisions" below and in CLAUDE.md |
| 1 — the editor | CLOSED 2026-09-07. Row views, line numbers, folios, the fitted measure, the row gestures, markdown as you type. One item moved to phase 3: the landing mark. | CLAUDE.md "Phase 1 decisions" |
| 2 — storage and the bridge | ALL BUILT 2026-09-07 and the cutover criterion MET on every count measured. Import: 13,565 of 13,565 by hand in Helium, the reload reads them back. Round trip: the largest entry identical after the round trip in the browser. Export and backup: identical to the mirror, 85 archives, the dedup writes nothing on relaunch. Citation: fourteen labels identical to the current app's ⌃⌘C, character for character; the quoted passage under ⌃⌘R not yet compared side by side. | CLAUDE.md "Phase 2 decisions" |
| 3 — the chrome | CLOSED 2026-09-08. Svelte 5 installed; the notice ledger and the corner, every status line through them; the masthead (the crumb, the tags, the title row, the tools, the Line numbering row, the pages and bookshelf icons with their panels in the one slot every opener claims, New page/author) over shared screen state; all green in headless Helium. Search is in: the engine ported with its tests, the chunked index, the row with its overlay and the jump, the "?h=" replay. The list keymap is in (Enter, Tab, Shift-Tab in a bullet). The sub-entries' create, rename and delete are in (the extract to a sub-entry waits for the toolbar). The Go to row, the source view, the toolbar with its Tag button, and the ⌃⌘G bar with its landing mark are in. Help, bookmarks, custom shortcuts, the backups panel and the pasted picture, the code blocks' highlighting and the hover copy button, and the rich flavour on ⌃⌘R and ⌃⌘C are in. Tab in a quote, ⌃⌘L and the intervals, and the refused fence named are in — every item of the list agreed 2026-09-07; phase 2's scaffolding (the clear button, the markdown pane) out 2026-09-08 on Sean's word. | CLAUDE.md "Phase 3 decisions" |
| 4 — the checkers | NEXT, from 2026-09-08. The review order first, because it governs spend; then the acceptance gate, `hooks/`, the prose checkers. | — |

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
- OPEN, for phase 1 (the numbering rule, 2026-09-07) — DECIDED 2026-09-07 in ../gesta (its CLAUDE.md, phase 1): a wholly italic verse
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
is gesta's own: its CLAUDE.md carries the decisions and measurements in
dated sections per phase, its history the rest. This file stays the plan
and phase 0's record, and is not appended to per change.
