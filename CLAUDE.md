# Gesta (the successor)

Gesta rebuilt as a project with a build step: the editor on ProseMirror, the
chrome on Svelte 5, the output still ONE `index.html` that opens from
`file://`. The plan, its decisions and its measurements are
`../writer/docs/plans/2026-09-07-feat-successor-app-prosemirror-svelte-plan.md`;
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
- `index.html` + `src/main.ts` — the page Vite builds into `dist/index.html`
  (vite-plugin-singlefile inlines everything). In phase 0 it is a round-trip
  playground and nothing more.

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
