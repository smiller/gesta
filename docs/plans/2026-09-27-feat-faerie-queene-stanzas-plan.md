---
title: "feat: stanza fences and the Faerie Queene — ::: stanza N, cited I.i.2.1"
type: feat
status: built, awaiting the reader
date: 2026-09-27
origin: the grilling of 2026-09-27 (this conversation's questions 1–21)
---

# feat: stanza fences and the Faerie Queene

## Overview

Spenser's *Faerie Queene* is cited book.canto.stanza.line — `I.i.2.1` is
Book I, Canto i, stanza 2, line 1 — and its lines renumber in every
stanza. Gesta cannot say that today: a citation is the author, the work,
the key's digit-led numerals joined by dots and a line range, with no
stanza, and a selection over two verse blocks is refused (READ,
src/store/reference.ts:97-166; src/editor/reference.ts:76-79, :318).
This plan is the feature that makes it sayable, then the import that
uses it. Every factual sentence is tagged READ / MEASURED / INFERRED as
CLAUDE.md's reporting rule asks; the READ citations for the seams come
from a research pass over the code on 2026-09-27 (an Explore agent's
report, cited below as "the research pass"), spot-checked where marked.

## Motivation

The reader asked for the whole poem on the shelf with its real
citations: to follow `I.i.2.1` from a book or an article to the line,
and to copy a passage and have it cited the way Spenserians cite it.
The source is Renascence Editions' HTML of Grosart's 1882 text
(https://luminarium.org/renascence-editions/fqintro.html), which prints
no stanza numbers (READ).

## What was decided, and where

All from the grilling of 2026-09-27, by the reader, unless marked.

| Decision | Settled |
|---|---|
| Citations read `I.i.2.1`: book upper-case Roman, canto lower-case roman, the proem `pr` (`I.pr.1-4`), stanza and line arabic | Q "Citation" |
| A work opts in with a directive on the WORK's page: `::: reference` / `roman book and canto` / `:::` | Q "Directive", Q14 |
| Stanza citation happens only under that directive; the Faerie Queene is the only work so far whose lines restart per stanza | Q "Scope" (stanza fences general or not) |
| Each stanza is a fence carrying its number: `::: stanza N`, the number WRITTEN, not counted | Q "Stanza no." |
| The stanza number is DRAWN in the text, because it is how a reference is followed: bold, in its own column left of the line-number gutter, beside the stanza's first line (mockup variant D), shown whatever the Line numbering interval, "none" included | Q1 (display), the mockup of 2026-09-27 |
| A selection across stanzas cites `I.i.2.8–3.2`; exactly one whole stanza `I.i.2`; whole stanzas `I.i.2–3` | Q "Across", Q16 |
| ⌃⌘G's Line box takes `stanza.line` in such a work: `2` is stanza 2, `2.1` its first line | Q "Go to" |
| The masthead crumb's bold leaf is respelled under the directive (`I.i`, not the key `1.1`); the title row stays the entry's heading | Q10, Q11 |
| Keys flat and digit-led: `1.pr`, `1.1` … `6.12`, `7.6`–`7.8` | Q "Shape" |
| Entry headings `Book I, Canto i`, `Book I, Proem`, `Book VII, Canto viii (vnperfite)`; contents links under their group read `Canto i`, `Proem` | Q "Headings", Q2, Q6, Q9 |
| Each book a `##` group whose heading is its title page: `## Book I: The Legende of the Knight of the Red Crosse, or of Holinesse` (source spelling, out of capitals); `## Book VII: Two Cantos of Mutabilitie` | Q7, Q8, Q12, Q13 |
| Scope: Books I–VI, the Mutabilitie Cantos, the dedication, the Raleigh page; the front matter BEFORE Book I, the dedication on the contents page, sentence-cased (by hand, for the proper nouns) | Q "Scope", Q "Front matter", Q15 |
| Text as printed out of capitals; apostrophes curled; leading indentation thrown away; the canto's argument in a `::: note` | Q "Spelling", Q3, Q5, the request |
| Editorial brackets dropped, the letter kept (`co[m]peld` → `compeld`) | Q19 |
| Mechanical slips fixed by the converter and each listed; `Y cladd` → `Ycladd` confirmed against the reader's print; `Humiltá` kept (the print has it) | Q21 |
| Stanza counts checked against a second witness, Project Gutenberg's text | Q17 |
| Order: this plan; the sample (done, below); the feature test-first through the gate and one review; the full conversion and import; the Raleigh page last | Q18 |
| Every row of a stanza is a numbered line: a row set wholly in italics is never a stage direction in the Faerie Queene, so a stanza fence has no apparatus at all | the reader, 2026-09-27 |
| The stanza number is ALWAYS drawn, wherever a `::: stanza N` fence stands; citing by stanza waits on the directive (a hand-typed stanza elsewhere cites its line only) | the reader, 2026-09-27 (question C) |
| A passage copied from mid-stanza is written `::: verse K`, the citation beside it naming the stanza | the reader, 2026-09-27 (question A) |
| Editorial insertions: II.viii.48.8 keeps the printed `Sir *Guyon*`, a `::: note` after the stanza reading `“Sir *Guyon*”, 1590, 1596, corrected 1609.  *recte* “Prince *Arthur*”`; IV.xii.35.9's `[here, in 1609, ‘The end of the Fourth Booke.’]` dropped | the reader, 2026-09-27 (question B) |
| The site's navigation and end-of-book lines (`Finis Book II.`, `Go on to Book III.`) are dropped: the structure says it | the reader, 2026-09-27 |

## Proposed solution

### The grammar (src/model/grammar.ts)

- `STANZA_OPEN = /^\s*:::\s*stanza\s+0*([1-9]\d*)\s*$/` beside
  `VERSE_OPEN` (:33); the number is REQUIRED — a bare `::: stanza`
  refuses (INFERRED design; the opener family is at :31-39, READ, the
  research pass).
- THE fenceStart TRAP: `fenceStart` (:82-85) takes whatever number ends
  the opener as the START LINE (READ, the research pass), so on
  `::: stanza 2` it would number the first line 2. The stanza arm reads
  its number with its own reader and never calls fenceStart; a test pins
  that `::: stanza 2`'s first line is 1.
- Registered in `opensFence` (:87-90), `flatFence` (:92-94) and
  `rowFence` (:97-99), as verse is, so a note row nests inside a stanza
  and a prose line reading `::: stanza 2` is escaped (READ, the research
  pass: fenceBody, blockLineAt, readsAsBlock and escapeProse all go
  through those lists, :113-201).

### The model (src/model/schema.ts)

- An attr on the verse node, `stanza: { default: null }`, not a new node
  type: fourteen `N.verse` checks across numbering, reference, paste,
  rowKeys, serialize, main and fit keep working unchanged (READ, the
  research pass, sites listed there). `rowBlock` (:22-29) is shared with
  prose, so it is split or given the attr for verse alone.
- toDOM writes `data-stanza="N"` on the verse div; parseDOM reads it back,
  so the HTML flavour of a copy carries the fence (READ: editor.ts:115
  hands `text/html` to ProseMirror's own parseDOM, the research pass).

### The parse and the serializer (src/model/parse.ts, serialize.ts)

- `emitBlocks` (:58) dispatches `STANZA_OPEN` to `emitRows` with
  `meta = { start: 1, stanza: N }`; the token walk opens verse with both
  (:507) (READ sites, the research pass).
- `rowsMd` (:224-240) writes `::: stanza N` when the stanza attr is set,
  byte for byte (roundtrip.test.ts).
- THE START CONFLICT: a stanza block can come to hold start > 1 — the
  quoted passage restamps `start` when a cut begins mid-block
  (src/editor/reference.ts:223 and :279, READ, the research pass) — and
  `::: stanza N` has no room for a start. Decided (question A): a stanza
  block cut mid-stanza is written `::: verse K`, its stanza attr dropped;
  a cut from a stanza's first line keeps `::: stanza N`.
- fenceRefusals.ts: an arm for `::: stanza` with no number or a bad one
  (`fenceLineReason`, :36-47), so the refusal names it rather than "not a
  block Gesta knows" (READ, the research pass).

### Numbering (src/editor/numbering.ts)

- `rowKind` reads a wholly italic row as a stage direction and a wholly
  bold one as a speaker, both uncounted (READ, numbering.ts:61-66); in a
  block carrying a stanza attr every inked row is a `line`. Nine rows in
  Books I–VI are set wholly in italics — inscriptions and songs, e.g.
  II.i.55.4 `*Sad verse, giue death to him that death does giue,*`
  (MEASURED) — and each must count. A numbering test pins it.

### Drawing (src/editor/editor.css, lineNumbers.ts)

- `.page .verse[data-stanza]::before { content: attr(data-stanza) }`,
  absolute at `top: 0; right: calc(100% - var(--ln-column) + 3.2ch)`,
  bold, the sans face, ink colour — variant D as mocked over the
  successor's own stylesheet (MEASURED 2026-09-27 in headless Helium, no
  overlap with line numbers at "every line").
- The column needs room: a root class (`stanzapage`) set by the
  lineNumbers plugin's `attributes` prop (:59-62) where a top-level
  stanza fence stands, widening the page's left margin by ~2.5em (the
  mockup's figure; to be read off Helium at the batch's end).
- The number is independent of the interval: it is the block's
  attribute, not a row decoration, so `interval = 0` draws it.

### The citation (src/store/reference.ts, headings.ts, src/editor/reference.ts)

- headings.ts: `directsRomanBookCanto(md)` beside `directsFromLastTitle`
  (:28-35), matching `/roman book and canto/i` in a top-level reference
  block; `Journal` gains `romanBookCanto(workKey)`, memoised with the
  heading (journalOf, :36-48) (READ sites, the research pass). The WORK
  page is asked — a new level: today's directive is asked of the root
  only (:142).
- store/reference.ts: `referenceLabel` respells the deepest numeral run
  under the directive — the first numeral upper-case Roman, the second
  lower-case roman, `pr` kept — before the range joins at :150. No Roman
  converter exists in src/store (READ, the research pass), so one is
  written, with tests.
- editor/reference.ts:
  - the range becomes stanza-shaped where the covered blocks are stanza
    blocks under the directive: `2.1`, `2.1-4`, `2` (one whole stanza),
    `2–3` (whole stanzas), `2.8–3.2` (a partial run);
  - `spansTwoBlocks` (:77-80) stops refusing a run of stanza blocks under
    the directive; it still refuses everything else;
  - `passageMd` (:238-287) quotes from ONE block today (:245, READ, the
    research pass); it quotes the stanzas the selection covers, a gap
    between them.
- Without the directive a stanza fence cites like a plain verse fence
  (the key's numerals and the line range within the block).

### The crumb (src/chrome/mastheadModel.ts)

- `leaf = pp.leaf` (:52) is the raw key segment (READ, the research
  pass); under the work's directive it is respelled with the same Roman
  function (`1.1` → `I.i`, `1.pr` → `I.pr`, `7.8` → `VII.viii`).

### ⌃⌘G (src/editor/goto.ts, main.ts)

- `askCheck` (goto.ts:72-78) accepts arabic only and main.ts:597-602
  parses the box with `parseInt` (READ, the research pass). In a work
  under the directive the box takes `N` (stanza N's first line) and
  `N.M` (its line M); a hit search keyed on `block.attrs.stanza`, and
  refusals worded for a stanza that does not exist and a line past a
  stanza's end. LineBar.svelte's box is free text and needs no change.
- A shared link does not carry a line number (the hash's highlight is
  the selected TEXT and its occurrence, keys.ts:120-131, READ, the
  research pass), so no existing link becomes ambiguous.

### The tools and the help

- tools/corpus.ts:120-123 skips question 3 (the old app's parse) for a
  file holding `::: grid`; `::: stanza` joins that exception, since
  ../writer's parser reads it as text (READ, the research pass).
- tools/helium-steps.mjs: one successor-only step, the grid step's shape
  (:203-250): seed a two-stanza entry under the directive, read the
  drawn stanza column, ⌃⌘R across the stanza gap and read the label;
  every field ../writer reads differently listed in
  tools/expected/corner.differences.txt with its reason.
- src/chrome/help.html: `::: stanza N` beside `::: verse` (:106); the
  sentence at :89 that a selection across verse blocks is refused gains
  its exception; the directive, which the help does not mention today
  (READ, the research pass), is described.

## Batches

Each test-first, each leaving `npm run verify` green; the reader looks
and accepts after batch 3 (the gate), then ONE `/code-review` at medium
over the range, since batches 2–3 touch main.ts and the editor (THE
REVIEW SHAPE).

1. **The model, no DOM** — grammar, schema, parse, serialize, the
   refusal arm, the corpus exception; roundtrip, parse and refusal tests.
2. **The citation and the chrome's logic, no DOM** — every stanza row a
   line (numbering.ts), the directive read,
   the Roman respelling, the stanza range, the lifted refusal, the
   multi-stanza passage, the crumb, ⌃⌘G's `stanza.line`; reference,
   mastheadModel and goto tests.
3. **The drawing and the wiring** — toDOM's attribute, editor.css's
   column and the `stanzapage` class, main.ts's ⌃⌘G wiring, the help,
   the Helium step and its listed differences; then the mockup's widths
   read off the real page in Helium by the reader.

## The import (after the review)

The converter is `converter/fq.py`, to ship beside its import folder at
`~/Desktop/gesta-bookshelf-import-spenser/` as the Dickens converter did.
State at this plan (MEASURED 2026-09-27, over Books I–VI):

- 72 cantos parse, 3,695 stanzas, every one nine lines once the site's
  own navigation is dropped (`Go on to Book II.`, `Finis Book II.` — read
  at first as a tenth line of II.xii.87). CORRECTED 2026-09-27: this line
  first said 3,765, a count taken before the canto slicing was fixed,
  when 65 cantos each ended in a one-line pseudo-stanza (the next
  heading's half-cut tag, `*<a*`); and III.xii's 1590 stanzas (below)
  were counted as its 46–50.
- THE WITNESS (question 17): J. C. Smith's Clarendon Press text (1909),
  Gutenberg #70717 and #72698, prints each stanza's number in the margin.
  Read off those numerals, its count agrees with the converter's in all
  72 cantos of Books I–VI (MEASURED; by book 617, 683, 677, 599, 565,
  554). Two misreadings of the witness were mine: a footnote marker after
  a numeral (`iii[363]`, I.xi.3) and a numeral set two spaces off a long
  line (III.iv.46); one is its transcription's (II.x.74 printed `lxiv`).
  Smith also prints `Y cladd` at I.i.1.2, as the source does; the
  reader's print has `Ycladd`, and the reader's emendation stands.
- III.xii: the source prints 1596's forty-five stanzas and then, under
  "STANZAS IN 1590 REPLACED IN 1596 WITH OTHERS.", 1590's five (READ).
  The converter ends the canto at the heading and holds the five aside
  (`canto_1590`); how to present them is question D below.
- Repairs, each listed per stanza: 118 editorial brackets dropped, the
  letter kept; 33 characters mis-encoded in Book II restored (UTF-8 read
  as Windows-1252 once or twice: `CongÃƒÂ©` → `Congé`, `Ã´` → `ô`,
  `Ãƒâ€ gle` → `Ægle`); 65 drop caps rejoined (a font letter runs into
  its word, `L`+`O I` → `LO I`; an image letter is a word, `A Gentle`; an
  `O` before a capitalised word stays apart, `O Goodly`); `hero¬icke`,
  `Malven\x9c` (a Mac Roman `ú`, INFERRED), `vThat`, `Trowis/`, `[)]`;
  `Ycladd` (confirmed).
- Nine rows set wholly in italics (inscriptions and songs, e.g. II.i.55.4
  `*Sad verse, giue death…*`, MEASURED) need no mark: a stanza fence
  numbers every row (Numbering, above). A first cut declared them
  `⟨line⟩`; withdrawn 2026-09-27 for the fence rule.
- The two editorial insertions are handled as decided (question B):
  II.viii.48 carries its note, IV.xii.35.9's 1609 note is dropped.
- Open: the proems, the Mutabilitie page (its canto viii headed
  `The VIII. Canto, vnperfite.`, READ), the title pages, the contents
  page and the dedication are not yet converted; the Gutenberg witness
  is not yet fetched; the Raleigh page comes last (its signatures are set
  as centred headings, its verse lines broken inside the markup, READ).

Checks before handing over, the prior art's (../writer/docs/
source-to-bookshelf.md §5): the word multiset against the source; the
per-canto stanza counts against the witness; hygiene (no `[`, no
straight quote, no "Renascence"); tools/corpus.ts clean over the folder;
tools/importCorpus.ts; the real import through the successor's own act
in headless Helium; then the reader opens a canto, the contents and a
Mutabilitie canto and reads them.

## Acceptance criteria

- `::: stanza 2` parses to a verse block with stanza 2 whose first line
  is 1, and serializes back byte for byte; a bare `::: stanza` refuses
  with its own reason.
- Under the directive: a caret selection of I.i.2.1 cites
  `Spenser, *The Faerie Queene*, I.i.2.1`; stanza 2 whole cites `I.i.2`;
  2–3 whole `I.i.2–3`; 2.8 to 3.2 `I.i.2.8–3.2`; the proem `I.pr.1-4`;
  the passage copied across a stanza gap quotes both stanzas.
- Without the directive a stanza fence cites and refuses as a verse
  fence does today.
- The crumb reads `Spenser, Edmund › The Faerie Queene › I.i` over
  `Book I, Canto i`.
- ⌃⌘G `2.1` lands on stanza 2's first line; `2` on stanza 2; a missing
  stanza or line is refused in words.
- The stanza number is drawn at every interval, "none" included, in its
  own column, never over a line number (the reader, in Helium).
- `npm run verify` green, the corpus tool clean over the mirror.

## Dependencies and risks

- The directive is read at a new level (the work); the root-only read
  stays as it is (INFERRED from headings.ts; tests pin both).
- A pasted stanza in an entry WITHOUT the directive draws its number but
  cites plainly — by design (the last row of the decisions table).
- Old app: ../writer reads `::: stanza` as text; nothing is back-ported,
  and the export's stanza fences are the successor's alone (CLAUDE.md).

## Questions still open

A, B and C were answered by the reader on 2026-09-27 and moved into the
decisions table.

- D. III.xii's 1590 ending (five stanzas, replaced in 1596 by 43–45):
  leave it out, or keep it — e.g. in a `::: note` after the canto under
  its heading, or as an entry of its own?
- E. The shared Helium step for the stanza (the Record's batch 3 says why
  it was not written unattended).

## Record

### Batch 1 — 2026-09-27, the model

- `STANZA_OPEN` requires its number (`0*[1-9]\d*`); `stanzaNumber` reads
  it, and emitRows takes the stanza's start as 1 without asking
  fenceStart — the trap the research pass named. Registered in
  opensFence, flatFence and rowFence, so a note row nests in a stanza, a
  stanza nests in a quote, and a prose line spelling `::: stanza 2` is
  escaped (parse.test.ts).
- The verse node alone carries `stanza` (rowBlock's second argument);
  toDOM writes `data-stanza`, parseDOM reads it (roundtrip.test.ts).
- The serializer writes `::: stanza N` while the block starts at 1, and
  `::: verse K` once a cut has given it a start (question A).
- The refusal names a bare `::: stanza` ("stanza needs its number, like
  ::: stanza 2") and a bad number ("two is not a stanza number").
- tools/corpus.ts: question 3's parity half skips a file holding
  `::: stanza`, as it skips `::: grid`.
- MEASURED: `npm test` 65 files, 507 tests (from 502); `npm run check`
  clean. `node tools/corpus.ts` over the mirror, 13,565 files: clean
  13,497, not a fixed point 0, document changed 0, round trip differs 31,
  text differs 44 — the baseline the grid plan recorded (its line 561),
  and the report identical byte for byte with the batch stashed. The
  converter's sample (I.i, argument and stanzas 1–10) is clean through
  the corpus tool.

### Batch 2 — 2026-09-27, the citation and the chrome's logic

- numbering.ts: in a block carrying a stanza attr every inked row is a
  `line` — no stage direction, no speaker (numbering.test.ts: a wholly
  italic and a wholly bold row both numbered; a plain verse fence keeps
  its apparatus).
- store/reference.ts: `roman` (subtractive: IV, ix — the modern
  citation's form, not the print's IIII), `romanKey` (`1.1` → `I.i`,
  `1.pr` → `I.pr`, anything not digit-led as it stands) and
  `romanWorkKey` (a book's author/work/leaf whose work page carries the
  directive). `referenceLabel` respells the deepest numeral run before
  the range joins; the Journal gains `romanBookCanto(workKey)`,
  implemented once in headings.ts (`directsRomanBookCanto`, top level
  only, as the root directive is read).
- editor/reference.ts: `stanzaRange` (`2.1`, `2.1-4`, `2`, `2–3`,
  `2.8–3.2`); `spansTwoBlocks` takes a stanza flag and refuses only a
  run reaching a block that is not a top-level stanza; the passage
  quotes each covered stanza's rows with a blank quoted line between
  (`blockPassage`, the old single-block body). `referencePayload` asks
  the work's directive once and uses the stanza range where every
  covered line is a stanza's.
- mastheadModel.ts: the leaf respelled under the directive (`I.i`,
  `I.pr`); the title row stays the heading; the work's own page as ever.
- goto.ts: `stanzaAskCheck` and `stanzaHit` (one place per stanza, no
  cycle; "no stanza 4 here — the last is 3", "stanza 2 has 3 lines").
  The wiring into the Line box is batch 3's.
- MEASURED: `npm test` 65 files, 519 tests (from 507); `npm run check`
  clean.

### Batch 3 — 2026-09-27, the drawing and the wiring

- editor.css: `.page.versepage > .verse[data-stanza]::before` draws the
  number — bold, ink, the sans face at 0.85em, absolute at
  `right: calc(100% - var(--ln-column) + 3.2ch)` — the mockup's variant
  D. NO ROOT CLASS AND NO PAGE SHIFT, a change from the plan: the line
  numbers hang right-aligned 54px into each verse box (editor.css:304-319,
  READ) and the stanza column sits 3.2ch further left inside the same
  box; the mockup's 2.5em shift only moved the page. Drawn for a
  TOP-LEVEL stanza only, where the gutter is reserved; a stanza nested
  in a quote (only a copy's cut path can make one) draws no number.
- main.ts: the Line box, under the work's directive, takes the stanza ask
  (`stanzaAskCheck`, `stanzaHit`) and lands on the row.
- help.html: the stanza fence and the directive described beside
  `::: verse`; the apparatus rule, ⌃⌘G and the two-block refusal each
  given the stanza's exception.
- MEASURED, headless Helium over a throwaway profile, a three-file
  Faerie Queene folder (author, work page with the directive, I.i with
  the argument and stanzas 1–10 from the converter) imported through the
  import act with the picker stubbed:
  - the crumb read `Edmund Spenser/The Faerie Queene › I.i`, the title
    row `Book I, Canto i`;
  - every stanza's `::before` read its number at "every 5th", "every
    line" and "none", and at "every line" the column stood clear of the
    line numbers 1–9 (screenshot);
  - ⌃⌘R on "bloudie Crosse" copied `Spenser, *The Faerie Queene*,
    I.i.2.1`; from "deepe wounds" to "bloudie Crosse" `I.i.1.3–2.1`,
    the passage stanza 1 from its line 3, a `> ` gap, stanza 2's line 1;
    stanzas 2–3 whole `I.i.2–3`;
  - ⌃⌘G `2.1`, `10`, `3.9` landed on the right rows; `11` said "no
    stanza 11 here — the last is 10", `2.10` "stanza 2 has 9 lines",
    `I.i` "I.i is not a stanza or stanza.line, like 2.1".
- NOT DONE: the shared Helium step (the plan's "The tools and the
  help"). A stanza step needs a seeded bookshelf work carrying the
  directive and the old app's reading of every field; left for the
  reader's word rather than changing the approved runs unattended. The
  probe above stood in for it.
- MEASURED: `npm run verify` exit 0 — 519 tests, 43/43 hook checks, the
  Helium runs 0 open.
