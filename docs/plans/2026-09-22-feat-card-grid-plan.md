---
title: "feat: a grid of cards — ::: grid N, cards N across"
type: feat
status: active
date: 2026-09-22
origin: docs/brainstorms/2026-09-22-card-grid-brainstorm.md
---

# feat: a grid of cards

## Overview

A new fence, `::: grid N`, whose body is card fences and nothing else,
drawn N across as a CSS grid that widens past the page's measure. The
brainstorm settled WHAT (docs/brainstorms/2026-09-22-card-grid-brainstorm.md,
2026-09-22); this plan is HOW, in three batches, each test-first, each
leaving the tree green under `npm run verify`. Every factual sentence is
tagged READ / MEASURED / INFERRED as CLAUDE.md's reporting rule asks.
The READ citations come from two passes of 2026-09-22: a repo-research
agent over the fence pipeline, and a flow analysis over eleven user
flows; where the flow analysis inferred a ProseMirror command's
behaviour rather than measuring it, the sentence says INFERRED and names
the key to press in Helium.

## Motivation

Index cards get arranged in threes on the desk (the photo of
2026-09-22, nine cards, 3x3). Gesta has the card — `::: card-<colour>`,
689 of them in 65 export files (MEASURED in the brainstorm) — but no way
to place cards beside each other; nine files hold cards back to back
that would read as a grid. The successor's document model is where a new
block is cheap: one regex, one node, one serializer case, one stylesheet
rule, and one small keymap for the edges.

## What was decided, and where

Carried from the brainstorm (see brainstorm: Key Decisions and Resolved
Questions), with the decisions added 2026-09-22 after the two passes:

| Decision | Where settled |
|---|---|
| One fence `::: grid N`; rows fall out of the count; a bare `::: grid` means 3 | brainstorm, Key Decisions and Resolved Questions |
| Cards only inside; nothing else, no grid as a grid's direct child | brainstorm, Key Decisions; "direct child" settled here — a grid inside a card inside a grid is legal, because the editor can make it by paste and an entry the editor saved must open (flow analysis, cross-cutting) |
| The grid widens to the window; each card capped at 650px; the count steps down below a 240px card | brainstorm, Resolved Questions (measured on the mockup) |
| The type inside a grid is 0.8em; a short card stretches to its row | brainstorm, Resolved Questions |
| The hyphenated card word stays required | brainstorm, Key Decisions |
| Successor-only; the current app has no grid word | brainstorm, Key Decisions |
| A bad grid shows THE ENTRY as source with a parse-time reason that quotes the offending line, through the throw path that exists; ONE wording on both paths (open and ⌃⌘M), pinned while the entry sits in source | asked and chosen 2026-09-22 after the research pass found the paragraph path would escape the opener on the next save; the one wording and the pin from the flow analysis (flow 1, 8) |
| A grid's shape (add or remove a card, change the count) is edited in the source view only; no new chord | asked and chosen 2026-09-22 |
| The grid is ISOLATING, with one way out: no lift or join crosses its edge; Backspace or Delete that would merge two cards is refused with a whisper naming ⌃⌘M; Enter on the empty last line of the LAST card places a paragraph after the grid | asked and chosen 2026-09-22 after the flow analysis traced the base keymap reshaping a grid silently (flow 3) |
| The serializer writes a bare `::: grid` back bare and a typed count back as typed; sibling cards are written with a blank line between them; a zero-padded count (`03`) is written `3` | this plan ("The serializer") |

## Proposed solution

### The grammar (src/model/grammar.ts)

- `GRID_OPEN = /^\s*:::\s*grid(?:\s+0*[1-9]\d*)?\s*$/`, the verse opener's
  shape (READ grammar.ts:33, `VERSE_OPEN` takes the same optional count),
  beside `CARD_OPEN` at grammar.ts:31. The family tolerates leading
  whitespace and no space after the colons (READ :28-30), so `:::grid`
  opens; `::: Grid` does not (case), and stays a paragraph.
- The count is read by the grid arm as "typed or not": `fenceStart`
  (READ :79-82) defaults to 1, which is not the grid's default.
- Registered in `opensFence` (READ :84-87). That one guard feeds
  `fenceBody`'s depth count (READ :137), `blockLineAt` (READ :179-183, the
  paragraph-run terminator) and `readsAsBlock` (READ :186-188, the
  column-0 escape). Without it a grid's closer inside a note or a quote
  would close the note early (flow 1); the test input is a note holding a
  two-card grid, and the note must end at the last line. A grid's body is
  blocks, so it is NOT a `flatFence` or `rowFence` (READ :89-96).

### The model (src/model/schema.ts)

```ts
grid: {
  attrs: { n: { default: null } },          // null: the count was not typed; drawn as 3
  content: "card+", group: "block", defining: true, isolating: true,
  parseDOM: [{ tag: "div.grid", getAttrs: (dom) => ({ n: dom.dataset.n ? +dom.dataset.n : null }) }],
  toDOM: (n) => ["div", { class: "grid", "data-n": n.attrs.n ?? "", style: "--n: " + (n.attrs.n ?? 3) }, 0],
}
```

- `content: "card+"` is the whole "cards only" rule at the model: a card
  is a named type, so a grid never admits a grid, a paragraph or a note
  as a direct child. A card's content stays `block+` (READ schema.ts:82),
  so grid > card > grid is legal and renders (without the break-out, see
  the stylesheet); the parse's nested-grid refusal is for a DIRECT child
  only, so the model and the parse admit the same texts and an entry the
  editor saved always opens (flow analysis, cross-cutting).
- `isolating: true`: `liftTarget` stops at an isolating node and
  `deleteBarrier` treats it as a barrier (INFERRED from
  prosemirror-transform and prosemirror-commands, flow 3), so no lift or
  join crosses the grid's edge under the base keymap.
- `group: "block"` lets a grid sit wherever a card does — the document, a
  quote, a note, a card (READ schema.ts:36, :47, :82-90).
- The class is `grid`, not `card-…`: the card's `parseDOM` selects
  `div[class^='card-']` (READ schema.ts:84). MEASURED 2026-09-22: no
  `.grid` class exists in editor.css or chrome.css (grep).
- `parseDOM` carries the count and the bare/typed bit, so the editor's
  own ⌘C then ⌘V (the HTML flavour, READ editor.ts, taken by ProseMirror's
  paste when `text/html` is present) reads a grid back as a grid rather
  than dropping two loose cards (flow 4; the rule at schema.ts:15-21).
  The count reaches CSS as an inline `--n`, which also travels into the
  clipboard HTML, harmlessly; `attr()` typed reads are a Chromium-version
  question not worth asking.

### The parse (src/model/parse.ts)

- `emitBlocks` gets an arm beside the card's (READ parse.ts:56):
  `else if (GRID_OPEN.test(line)) i = emitGrid(sink, lines, i);`
- `emitGrid`: reads the typed count (the trailing number, or null), takes
  `fenceBody(lines, from + 1)` (READ :110-146), CHECKS THE BODY (below),
  then `emitBody(sink, "grid", { n }, box.body)` (READ :115-120).
- `buildDoc` gets `case "grid_open": open(schema.nodes.grid, { n: t.meta!.n })`
  beside `card_open` (READ :482) and `grid_close` in the close list (READ
  :492-497); an unknown token throws (READ :498-499).

### The refusal

A grid whose body holds anything but cards is refused AT THE PARSE, in
`emitGrid`, before any token is pushed — so the reason is this plan's and
not the schema's generic `cannot build a grid from its content` (READ
parse.ts:439-444), which would fire for the same inputs and name no line
(flow 8). The check walks the body's lines the way `emitBlocks` would: a
blank line is skipped, a `CARD_OPEN` line is skipped past its own
`fenceBody`, and the first line that is neither throws. The reasons,
each pinned by a test with its input:

| Input | Message |
|---|---|
| text before the first card, a paragraph between cards, a heading, a list, a code fence, a note among the cards | `a grid holds only cards, but line N is not a card: "<the line, trimmed, at most 60 chars>"` — N counted from the entry's first line, because the source view has no find |
| a `::: grid` line as a direct child | the same message; the line quoted says what it was |
| `::: card` without a colour inside a grid — it matches no opener, so it is a paragraph AND the next `:::` closes the grid early (READ grammar.ts:139) | the same message, with fenceRefusals' own reason appended when the quoted line is `:::`-shaped: `… — card blocks must include a colour, like card-light-green` (READ fenceRefusals.ts:32) |
| no cards (`::: grid 3` then `:::`) | `a grid holds at least one card` |
| an unclosed grid — it swallows the rest of the text (READ grammar.ts:109) | judged on what it swallowed; the quoted line is the first prose after the cards, which is what the writer needs to see |

Not a refusal, so the rule is not over-applied: an EMPTY card inside a
grid (`::: card-red` then `:::`) — `createAndFill` gives it an empty
paragraph and the serializer writes `::: card-red\n\n:::`, which parses
back the same (flow 8). Pinned as a round trip.

Why the throw and not the paragraph: the two mechanisms that exist pull
apart for a body-level fact. Today's refusals are OPENER-level — the line
matches no fence, stays a paragraph, and `fenceRefusals.ts` names it
after the fact (READ fenceRefusals.ts:16-38, :27 skips any line
`opensFence` accepts). A grid opener that matched but whose body failed,
left as a paragraph, would be escaped to `\::: grid 3` by `escapeProse`
on the next save (READ grammar.ts:186-193, serialize.ts:123-126) — a
silent rewrite of the text.

WHERE the throw lands, and the one wording (flow 1, 8):
- On open, `session.ts:303-318` catches, says `cannot render <key> —
  <message>; shown as source`, forces the source view for that entry.
- On ⌃⌘M back from source, `setView` (READ session.ts:273-275) catches
  and today WHISPERS `the source cannot be rendered — <reason>` for 3 s
  (READ notices.svelte.ts:48, `WHISPER_MS`) while the writer stays in
  source — a wording of its own, faded before a slow reader has found the
  line. Both paths use the open path's wording, and the switch path PINS
  it through the `fencePin` mechanism that already holds a fence refusal
  (READ session.ts:275-279, :301), released by a clean parse or a
  navigation. Two faults fixed one at a time then read as one pin
  replacing another.

The same parse runs at import (`importFiles.ts`, READ :59, the parse
gate) and in the corpus tool, so an imported file with a bad grid is a
COUNTED IMPORT FAILURE named with this reason in the tally — not
imported as text, as a card fault would be (flow 9). A documented limit;
no export file has a grid (MEASURED, brainstorm).

`fenceRefusals.ts` gets one reason for the opener that does NOT match
(`::: grid three`, `::: grid 0`, `::: grid 3 4`), beside the count
reasons verse and prose already have (READ :28-30): `three is not a
count`, the tail quoted. Today those read `not a block Gesta knows`,
which sends the writer to check a word they spelled right (the file's
own principle, READ :1-10).

### The serializer (src/model/serialize.ts)

- `case N.grid: return "::: grid" + (n == null ? "" : " " + n) + "\n" + blocksMd(node) + "\n:::";`
  beside the card's (READ serialize.ts:175). A bare grid is written back
  bare and a typed 3 as ` 3`: a save is serialize-and-compare, and a
  normalised count would dirty every entry holding a bare grid on open.
- `blocksMd` joins siblings with a blank line (READ :141), so cards inside
  a grid are written `:::\n\n::: card-…`. A grid typed without the blank
  parses the same (READ parse.ts:54 skips blank lines) and is written with
  it; a count typed `03` parses as 3 and is written `3`. Both pairs are
  pinned in `roundtrip.test.ts`'s `NORMALIZED` list (READ :95-100). The
  brainstorm's example, typed without blanks, is therefore a `NORMALIZED`
  case; batch 3 updates it to the canonical spelling with a note.
- `escapeIndent` is a no-op for column-0 fences (READ grammar.ts:214-225).

### The stylesheet (src/editor/editor.css)

The mockup's rules, transcribed (docs/brainstorms/2026-09-22-card-grid-mockup.html,
MEASURED 2026-09-22 in headless Helium and by hand), scoped to a grid
that is the page's own child:

```css
/* THE GRID (2026-09-22): the count is --n from the node. A grid that is
   the page's own child breaks out of the measure the way .page.fitted
   pulls the whole entry (the margins at the paired measure): to the
   window less the gutter, capped so a card never passes 650px, and
   centred — so a count of 1 or 2 on a wide window is a centred card or
   pair, not a card at the window's left edge. Below a 240px card the
   count steps down. Measured on the mockup: a 1493px window drew 3
   across at 1445px; a 760px window 2 across at 712px. Inside a quote, a
   note or a card the grid keeps its container's width, or it would ride
   over the quote's rule. */
.page div.grid {
  display: grid; gap: 1em;
  grid-template-columns: repeat(auto-fit, minmax(max(240px, calc((100% - (var(--n) - 1) * 1em) / var(--n))), 1fr));
  font-size: 0.8em;
  margin: 1.2em 0;
}
.page > div.grid {
  --grid-w: min(100vw - 48px, calc(var(--n) * 650px + (var(--n) - 1) * 1em));
  width: var(--grid-w);
  margin: 1.2em calc(50% - var(--grid-w) / 2);
}
.page div.grid > div[class^="card-"] { margin: 0; }
```

- A short card stretches to its row: CSS grid's default `align-items`.
- The card's own `margin: 1.2em 0` (READ editor.css:116) would not
  collapse inside a grid track, so the last rule zeroes it; that is the
  mockup's spacing (flow 2).
- The 0.8em is a fixed step (brainstorm). It COMPOUNDS with a note's
  0.8em (READ :115): a grid in a note, or a note in a grid's card, reads
  at 0.64em. A documented limit, one line to change if it is ever met.
- `100vw` includes a visible scrollbar in Chromium; the paired measure's
  fallback leaves 64px for that reason (READ :35). Batch 2 MEASURES a
  long entry with a grid in Helium, and the gutter number (48 or 64) is
  chosen after that reading, not before (flow 2).
- This is the stylesheet's first `repeat(auto-fit, minmax(…))` and its
  first responsive rule of any kind (MEASURED by the research pass: no
  `@media` in editor.css or chrome.css). The interaction with
  `.page.fitted` — an entry with a paired verse block AND a grid, both
  pulling — is NOT MEASURED; batch 2 measures it with a text holding both
  and records the reading.
- No node view: the grid draws by `toDOM`, as the card does (READ
  rows.ts:51-66, only the note has a view, for its copy button).

### The keys (src/editor/gridKeys.ts, new)

The listKeys/quoteKeys shape (READ CLAUDE.md's layout: commands with an
`onRefuse`), ahead of the base keymap in `editor.ts`:

- **Enter** on the empty last paragraph of the LAST card of a grid: the
  paragraph is removed from the card (unless it is the card's only
  paragraph, when it stays) and a paragraph is placed after the grid with
  the caret in it — the one way out. On an empty last paragraph of any
  OTHER card the command declines and the base keymap's `splitBlock` adds
  a line (with the grid isolating, `liftEmptyBlock` finds no lift target
  and returns false — INFERRED from prosemirror-commands, flow 3;
  measured, and pinned either way).
- **Backspace** at the start of a card's first textblock inside a grid,
  and **Delete** at the end of a card's last textblock: refused, with the
  whisper `a grid's cards are joined in the source view (⌃⌘M)`. Without
  the guard, `deleteBarrier` joins card 2 into card 1 (colour of card 1
  wins) inside the grid, which isolating does not stop (INFERRED, flow 3);
  at the FIRST card's start, isolating makes the base keymap fall to
  `selectNodeBackward`, which would select the paragraph before the grid
  with a blue outline and delete it on the next press — the guard covers
  that edge too.
- NOT guarded, measured and documented: Enter on an empty paragraph
  mid-card splits the card into two of the same colour (INFERRED:
  `liftEmptyBlock`'s first branch, `canSplit` at the card, `copy` keeps
  attrs), as it does in a plain card today; a selection from one card
  into the next then Backspace or typing joins them, as it does for two
  adjacent cards today. Both are written into help.html as what happens.
- Arrows: with no gap cursor (MEASURED by the research pass:
  prosemirror-gapcursor is not installed) there is no position before a
  grid that opens an entry; prose above such a grid is added in the
  source view (documented). After a grid, the Enter arm above. Down-arrow
  from the first card's last line at 3 across lands where Helium's visual
  line search says — a reading for the step, not a rule.
- Typing `::: grid 3` in the rendered view is stored `\::: grid 3` and
  stays text, like every fence typed there (READ typing.ts:8-9,
  help.html:103); the help's grid sentence says so.
- Tests in `gridKeys.test.ts`, the command convention (markdown in, a
  caret, the command, markdown and caret out): the way out from the last
  card; the decline in a middle card; the refusal at a card's start and
  end with the whisper text; and the base keymap's measured behaviours
  pinned as they were measured.

### The seams a container joins (src/editor)

- `reference.ts:182` `CONTAINERS` (blockquote, note, card): a grid joins
  it, or a phrase selected in a grid's card cites as five fence lines
  where the same phrase in a plain card cites as `> phrase` (READ
  reference.ts:150-334, `unquoted` stops at a non-container; flow 5).
  Test beside it in `reference.test.ts`; a selection across two cards
  then cites as two card fences, matching two plain cards.
- `paste.ts:117` `ROW_BLOCKS`: a grid joins it, so an open slice from mid
  card 1 to mid card 2 pasted at the end of a paragraph arrives as the
  grid those parts came from, not as the target paragraph swallowing card
  1's tail with a one-card grid after it — the first-cell merge
  `closeRowSlice` already fixes for rows (READ paste.ts, flow 4). The
  card itself is left as it is today.
- `inlineStyles.ts:11-16` STYLED, the selectors whose computed style the
  HTML flavour of ⌘C carries: `div.grid` gets `display`,
  `grid-template-columns`, `gap` — the paired row's precedent (READ :14,
  `div.vrow.vpair`) — so a whole grid copied into Mail or Docs arrives as
  a grid, not stacked cards. No test file exists beside inlineStyles.ts
  (MEASURED 2026-09-22, `ls`); the reading is the Helium step's clipboard
  HTML, as the card's is today (READ helium-steps.mjs:181-202,
  `clipboardCard` reads `grid-template-columns` from the HTML already).
- `session.ts:273-279`: the switch-path wording and pin (above).
- `main.ts:622` the hover-copy `BLOCKS`: the grid joins it (reversed
  2026-09-22 at the reader's question, batch 2's record): each card keeps
  its own button, innermost wins (READ :612-615), and the gaps between
  the cards are the grid's zone, its label `copy grid`.
- NOT joined, by decision: `typing.ts:27` `BLOCK_HOSTS` (a grid holds no
  paragraph; the cards inside are hosts already); `fit.ts:77`
  `INSET` (a pair inside a grid's card is already inset by the card, READ
  fit.ts:78-86, so the entry is not fitted by it).

### What nests, and what it looks like (flow 7)

- A grid in a quote, a note or a card: parses (the quote body strips
  `> ` and re-enters `emitBlocks`, READ parse.ts:60-66), takes its
  container's width (the stylesheet), and Tab in a quote moves it under
  the quote as one thing (READ quoteKeys' comment) — help.html:116's list
  gains the word.
- A paired verse block in a grid's card: the card-scoped `1fr 1fr` rule
  applies (READ editor.css:227); at a 240-470px track the halves are
  cramped. Documented limit.
- A verse block in a grid's card is numbered (a card is not a note), and
  the gutter class on the root shifts the whole page (READ
  numbering.ts:96, folios.ts:21). Documented limit; the input is read in
  Helium once.
- An image scales to the track (READ editor.css:52, `max-width: 100%`); a
  code block's hover copy finds the `pre` innermost. Nothing to do.
- Search: the grid is transparent to `nodesBetween` (READ
  flatten.ts:24-32); the jump selects by position and main scrolls a
  frame later. One reading for the step: a hit in the third column lands
  and is centred.

### The tools (tools/)

- A shared step in `helium-steps.mjs`, the card step's shape (READ
  :181-202): `go("page/Gridded")`, paste a two-card grid, read
  `A.read.grid(page)` — the grid's computed `grid-template-columns`
  column count, the grid's width against the page's, the first card's
  computed background — then ⌘C over both cards and the clipboard HTML's
  `grid-template-columns`, then a search hit in the second card, and the
  screen after each. Every reading needs BOTH adapters (READ
  adapters/successor.mjs:41-74, adapters/writer.mjs:58-93); the writer's
  returns what the current app draws, and each field it draws
  differently is one line in `tools/expected/corner.differences.txt`
  with the date and "successor-only" (READ :1-10 for the format).
  `--approve` after reading the diff.
- The current app MEASURED once, by hand, five minutes, and recorded
  here: what it shows for an entry holding a grid (INFERRED from
  ../writer/src/js/md.mjs:508-515 and its escape rule: the opener a
  paragraph pinned `not a block Gesta knows`, the cards rendered, the
  closer a stray `:::` that a save there writes `\:::` — which,
  re-imported here, no longer closes the grid, so the grid swallows to
  the end and the entry is refused; flow 10). The help says: a grid is
  successor-only, and an entry with a grid SAVED in the current app comes
  back refused.
- The corpus tool (READ tools/corpus.ts:113-125): question 3 compares the
  parsed text with the CURRENT app's parser, which reads `::: grid 3` as
  text, so the first grid to reach the mirror would turn that file red
  under `TEXT DIFFERS FROM THE CURRENT PARSER` for ever. The tool skips
  question 3 for a file holding a grid opener and says why in its header;
  the fixed-point and document-changed questions still run (flow 9). It
  runs once after batch 1 and must stay green over the mirror; the line
  is recorded here.
- No new fixture: the fixtures are copies from the mirror (CLAUDE.md),
  and the mirror has no grid; the Helium step seeds inline markdown
  (READ helium-steps.mjs:15-22).

### The docs (flow 11)

- `src/chrome/help.html`: a grid sentence after :104 (the fence, the
  count, bare is 3, cards only, the shape edited in the source view, the
  refusal and what to do: ⌃⌘M, fix the quoted line, ⌃⌘M); :111's Enter
  clause for a grid card (the way out from the last card; a line added
  elsewhere); :78's copy-button sentence (none on the grid, each card
  keeps its own); :82-83 (a copied grid pasted arrives as a grid); :116
  (Tab in a quote moves a grid as one thing); the current-app note. The
  acceptance list the Help component carries whole gains the grid's
  lines.
- CLAUDE.md's Layout: `grammar.ts`, `schema.ts`, `gridKeys.ts` and
  `editor.css` entries name the grid in a word each; this plan's record
  holds the measurements.
- The brainstorm's example is updated to the canonical spelling (blank
  lines between cards) with a note that the unspaced form parses too.

## Batches

Each batch: tests first, `npm run verify` green, then STOP and tell the
reader what to look at; they run `! sh hooks/accept.sh`. One
`/code-review` at medium over the whole range after batch 3 (the batch
that closes the feature; batch 2 touches `session.ts` and `paste.ts`,
two of the DOM seams the review shape names), its findings in one fix
commit (CLAUDE.md, the review shape).

### Batch 1 — the model, no DOM (grammar, schema, parse, serialize, refusals, the corpus tool)

Tests, written first:
- `parse.test.ts`: the dispatch pin at :10-13 gains a grid; a grid's
  children are cards; `::: grid` carries `n: null`, `::: grid 2` carries
  2, `::: grid 03` carries 3; `:::grid` opens, `::: Grid` does not; a grid
  inside a quote, a note and a card parses, and the note ends at its own
  closer; grid > card > grid parses; `fenceBody` over a grid of cards
  returns the right `next` (the depth pin at :166-170's shape); each
  refusal input in the table above throws its pinned message with its
  line number; an empty card in a grid is not a refusal.
- `roundtrip.test.ts`: `ROUND_TRIPS` gains a bare grid and a counted grid
  with blank lines between cards, a grid in a quote (`> ` on every line,
  as :58's card in a quote), an empty card in a grid; `NORMALIZED` gains
  the unspaced form → the spaced form and `03` → `3`.
- `fenceRefusals.test.ts`: `::: grid three` named `three is not a count`.
Then: the schema node with `isolating: true`; `node tools/corpus.ts` with
the question-3 skip, green over 13,565 files; the line recorded.

### Batch 2 — the editor (gridKeys, editor.css, reference, paste, inlineStyles, session's pin)

Tests, written first:
- `gridKeys.test.ts`: as listed under "The keys".
- `reference.test.ts`: a passage inside a grid's card trims as in a card;
  a selection across two cards cites two card fences.
- `paste.test.ts`: an open slice across two cards pasted after a
  paragraph arrives as a grid.
- `session`'s pin: whatever test shape the fence pin has today (READ
  session.ts:273-279; if it is only measured in Helium, it stays so and
  the step reads it).
Then the stylesheet rules, and the Helium readings by hand, each
recorded here: the brainstorm's nine cards pasted into a page at the
laptop's width and at a narrowed window; a long entry with a grid (the
scrollbar and the gutter number); the same page with a paired verse
block above the grid (the `.fitted` interaction); a grid inside a quote;
a `::: grid 1` on the wide window (centred); Enter, Backspace and Delete
at every edge named above, and Down-arrow across a row; a refused grid
opened, fixed in source, and switched back (the pin's wording and its
release). Every new key behaviour is named for a hand to try (CLAUDE.md).

### Batch 3 — the tools and the docs

- The shared step, both adapters, the differences lines, the approved
  copy regenerated after reading the diff; the current app measured
  once; `npm run verify` green.
- help.html, CLAUDE.md's layout words, the brainstorm's example.
- Then the acceptance, then the one review at medium over batches 1-3.

## System-wide impact

- **Interaction graph.** A parse throw for a grid runs through
  `session.ts:303-318` on open and `:273-279` on the switch, the second
  now pinning; the `fenceRefusals` pin never sees a matched grid opener.
  Import names a bad grid in its tally through the same throw. Search
  flattens generically and needs nothing; the tokenizer touches no
  schema (READ tokens.ts).
- **Error propagation.** One new message family, three strings (the line
  refusal, the empty grid, the count), pinned in tests; the corner shows
  them with the entry key as today; the switch path pins instead of
  whispering.
- **State.** Nothing persists differently: markdown in, markdown out; the
  stale-write refusal and the backup are untouched. A bare grid and a
  typed count round-trip as typed, so opening an entry never dirties it;
  `03` and an unspaced grid are the two normalisations, each pinned.
- **API parity.** The ⌘C HTML flavour (inlineStyles), the in-app paste
  (parseDOM, ROW_BLOCKS) and ⌃⌘R (CONTAINERS) are the interfaces that
  enumerate containers; all join. The hover copy button deliberately
  does not.
- **Cross-layer scenarios unit tests will not catch** — the Helium step
  and the hand readings: the grid's break-out under `.fitted` and beside
  a scrollbar; the grid's columns in the HTML flavour on the clipboard;
  the way out after a grid; the refusal's pin on the switch back; the
  current app over a grid entry.

## Acceptance criteria

- [x] `::: grid`, `::: grid N`, `:::grid` and `::: grid 0N` parse to a
      grid node of cards with the right `n`; grids sit in a quote, a
      note, a card; grid > card > grid parses (batch 1, 2026-09-22; renders
      is batch 2's).
- [x] Each refusal input throws its pinned message quoting the line
      (batch 1, 2026-09-22: done, without a line number — see the record);
      the entry is shown as source with it (MEASURED in Helium); ⌃⌘M with
      the fault still there pins the same wording; fixing it and ⌃⌘M
      renders the grid and releases the pin (batch 2, 2026-09-22: all
      measured headless, the record).
- [x] `::: grid three` stays a paragraph and the pin names the count
      (batch 1, 2026-09-22).
- [x] Round trip: bare stays bare, a count stays its count, cards are
      written with a blank line between, an empty card survives; the
      unspaced form and `03` normalise (batch 1, 2026-09-22).
- [x] The corpus tool is green over the mirror after batch 1, question 3's
      parity half skipped for grid files only (2026-09-22, the record).
- [ ] In Helium at the laptop's width, the brainstorm's nine cards draw 3
      across, wider than the prose, centred, at 0.8em, short cards
      stretched; a narrowed window steps to 2 across; `::: grid 1` on a
      wide window is one centred card; a grid in a quote stays inside the
      quote's rule; a long entry shows no horizontal scroll; with a paired
      verse block above, the reading is recorded whatever it is. (Batch 2,
      2026-09-22: measured HEADLESS at 1493 and 760 wide, the record; the
      hand's readings — the laptop, the scrollbar, `::: grid 1` — are the
      reader's, named in the handoff.)
- [x] Enter on the last card's empty last line lands after the grid;
      Backspace at a card's start and Delete at its end whisper the
      refusal; the mid-card split and the cross-card join do what was
      measured (batch 2, 2026-09-22, pinned in gridKeys.test.ts and read
      headless) and help.html says so (batch 3).
- [x] ⌃⌘R inside a grid's card cites and quotes as in a card (batch 2,
      2026-09-22, reference.test.ts).
- [x] ⌘C across two cards pastes into another entry as a grid (MEASURED
      by hand 2026-09-22); the clipboard HTML carries
      `grid-template-columns` (read headless); the hover button above the
      corner copies the whole grid. The shared step reads them (batch 3).
- [x] Both adapters answer the grid step; the differences are listed;
      the current app's reading is recorded; `npm run verify` green; the
      record in this plan carries every measurement with its date (batch
      3, 2026-09-22).

## Dependencies and risks

- The parse-time body check duplicates a little of `emitBlocks`'s
  dispatch (blank, card, other). Kept minimal: it decides only card /
  not-card; the cards' own bodies are parsed by the ordinary recursion.
- Every base-keymap behaviour above is INFERRED until pressed; the
  gridKeys arms are small, and a measurement that disagrees changes a
  test's expected string, not the design.
- The break-out under `.fitted` and beside a scrollbar is unmeasured; the
  rule is a stylesheet line either way.
- A grid with a large count (`::: grid 12`) is legal; the 240px minimum
  steps it down. No cap is planned; the count is the author's.
- The 0.8em compounding in a note, the cramped pair in a grid card, the
  numbered verse in a grid card, prose above a grid that opens an entry,
  and the import failure on a bad grid are documented limits, each one
  line to change if met.

## Record

One dated entry per batch, appended as the work lands: what was
measured, what the reader was told to look at, what the review found.

### Batch 1 — 2026-09-22, the model

- MEASURED: prosemirror-model refuses `content: "card+"` at schema
  construction — `Only non-generatable nodes (card) in a required
  position` — because a card's colour attr has no default, so the model
  cannot generate a card to fill a required slot. The grid's content is
  `card*`; the parse still refuses an empty grid (`a grid holds at least
  one card`), and the serializer writes an empty grid NODE as nothing, so
  a text the editor saved always opens. Pinned in roundtrip.test.ts.
- DECIDED: the refusal message quotes the offending line and carries NO
  line number, against the plan's first wording: a grid inside a note or
  a quote parses over its container's body lines and does not know its
  offset in the entry, and one message shape is worth more than a number
  that is sometimes wrong. Chromium's find-in-page searches a textarea,
  so the quoted line is found in the source view with ⌘F. The shapes:
  `a grid holds only cards; "<line>" is not a card`, with fenceRefusals'
  own reason appended after ` — ` when the line is `:::`-shaped and opens
  nothing (`::: card` inside a grid names the colour it lacks), and
  `a grid holds at least one card`. The reason table moved out of
  `fenceRefusals()` into `fenceLineReason(line)` so the parse and the pin
  say the same thing; `::: grid three` reads `three is not a count`.
- MEASURED: `node tools/corpus.ts` over the mirror, 13,565 files: clean
  13,497, not a fixed point 0, document changed 0, round trip differs
  31, asterisks grew 0, text differs from the current parser 44 (15 more,
  16 fewer), threw 0, 20.8 s — the same counts the successor plan's record
  last carried (its line 1760: 31 and 44). The parity half of question 3
  now skips a file holding a grid opener; no file in the mirror does.
- MEASURED: `npm run check` clean; `npm test` 63 files, 491 tests, all
  green (490 before the last pin).
- Files: grammar.ts (GRID_OPEN, opensFence), schema.ts (grid), parse.ts
  (emitGrid and the two token cases), serialize.ts (the grid case),
  fenceRefusals.ts (fenceLineReason, the count reason), tools/corpus.ts
  (the skip), and the three model test files.

### Batch 2 — 2026-09-22, the editor

- MEASURED under node (gridKeys.test.ts, the base keymap's own commands
  over a grid): Enter at the end of the last card's text adds an empty
  paragraph in the card (`splitBlock`); Enter again, the new arm, removes
  it and lands in a paragraph after the grid, the card keeping its text;
  in a middle card the arm declines and the base keymap's Enter adds a
  line — with the grid isolating, nothing lifts out; Enter on an empty
  paragraph MID-card splits the card into two of the same colour inside
  the grid (the INFERRED behaviour, confirmed). `atCardEdge` is true at a
  card's first offset and last offset inside a grid, false a character in
  and false in a plain card.
- DECIDED: `ROW_BLOCKS` in paste.ts gains the CARD, not the grid — a drag
  across two cards slices to open cards with the grid, their common
  ancestor, left out, so it is the card the closer must see. Two cards
  then travel whole; the in-app paste re-wraps them in their grid from the
  clipboard's own context (ProseMirror's `data-pm-slice`), which the hand
  reads. A drag across two PLAIN cards now also pastes as whole cards
  rather than merging the first card's tail into the target paragraph;
  no test pinned the old behaviour, and the row precedent says whole.
- MEASURED in headless Helium over the built page (a scratch script over
  the successor's own paste seam, 2026-09-22): at a 1493px window a
  four-card `::: grid` drew 1445px wide, 3 across, its left edge at 24px,
  the page 712px wide at 391px, the cards' type 14.4px (0.8 × 18); at
  760px the grid was 712px at 2 across; with sixty paragraphs below it no
  horizontal overflow (headless Chromium's scrollbar takes no width —
  the hand reads a visible one); inside a quote the grid was 669px at 2
  across with the blockquote as its parent; with a paired verse block
  above, the page fitted to 788px and the grid still drew 1445px at 24px —
  the two pulls are independent, the reading the plan said to record.
- MEASURED the refusal, both paths: ⌃⌘M with a stray line in a grid pins
  `cannot render page/GridBad — a grid holds only cards; "loose line" is
  not a card; shown as source` in the corner, still there after 3.5 s,
  the source view kept; fixing the line and ⌃⌘M rendered the grid at 3
  across with no corner. On OPEN of a stored bad grid the same wording
  was at first only WHISPERED and the warm's `14 entries stored` covered
  it, and a page error showed a second, unguarded parse: the search index
  builds its text by parsing every entry. Both fixed: the open path pins
  too (released by the next open, as its fence pin is), and the index
  falls back to the raw source for an entry whose flatten throws
  (searchIndex.test.ts). After the fix: pinned on open, no page error.
- MEASURED the keys in the browser: two Enters at the end of the last
  card then typing landed `after the grid` as a paragraph after it;
  Backspace at the second card's start left both cards and whispered
  `a grid's cards are joined in the source view (⌃⌘M)`. ⌘C across the
  two cards: the HTML flavour carries `grid-template-columns` and the
  grid div; the text flavour is the two partial cards under `::: grid 2`.
- MEASURED: `npm run verify` failed once at the reference-copy step's 5 s
  wait while the readings script drove a second headless Helium and the
  clipboard at the same time; alone, `npm run test:helium` passed with 92
  steps identical or decided. A lingering headless process was killed by
  its scratch profile's name, as CLAUDE.md's rule says.
- MEASURED BY HAND in Helium (2026-09-22, the reader): the nine cards of
  the photo drew 3x3 on the wide window at the 650px cap, the short cards
  stretched, the Saunders title on one line; the last two cards copied
  and pasted arrived as a new grid — the paste re-wrap from the
  clipboard's context, confirmed.
- ASKED AND CHANGED (2026-09-22, at the reader's question "should I be
  able to copy a whole grid?"): the plan had said no hover button for the
  grid; now `div.grid` joins the hover copy's BLOCKS in main.ts. A card
  wins while the mouse is over it, so the gaps between the cards are the
  grid's hover zone; the button sits at the grid's top-right, the same
  corner as the top-right card's, so its idle label reads `copy grid`
  where a card's reads `copy`, and its title `Copy this grid`. MEASURED
  headless: over a card `copy` / `Copy this card`; over the gap
  `copy grid` / `Copy this grid`; the click wrote the whole fence
  (`::: grid 2` and both cards) to the clipboard and said `copied`,
  settling back to `copy grid`.
- FOUND BY HAND (2026-09-22, the reader): the grid's button drawn inside
  the top-right corner could not be reached from a gap — the path crossed
  the top-right card, which took the button over. Asked for instead: the
  button appears when the mouse comes to just ABOVE the top-right corner,
  as a block's appears at its corner. Now a band 26px tall over the
  rightmost 140px above a grid's top edge, read on `mousemove` since no
  element changes there, shows the grid's button DRAWN ABOVE the corner
  (25px up), and the gaps still show the same button in the same place.
  MEASURED headless: in the band the button read `copy grid` at 100–122px
  with the grid's top at 125px; the mouse on the button kept it; moving
  out of the band along the top hid it; the click copied the fence.
  MEASURED BY HAND in the live app the same day: it works.
- FOUND BY HAND (2026-09-22, the reader): two cards pasted under an
  inherited count of three drew 715px each — the 650px cap was the BOX's,
  sized from the count, and two tracks grew to fill a three-card box. The
  first fix, a definite 650px track maximum, MEASURED headless as wrong
  the other way: auto-fit counts its repetitions by a definite maximum,
  so three cards at 1445px wrapped to two tracks of 650px. The rule now:
  the track keeps `1fr`, and the box is sized by `min(--n, --cards)`,
  `--cards` read with `:has(> :nth-child(k):last-child)` for one to five
  cards (Helium is Chromium 150; `:has` is Chromium 105). MEASURED headless
  after: at 1493px, two cards under a bare count 650px each, centred, in
  a 1314px box; `::: grid 1` one 650px card centred; three cards 472px
  each across 1445px. At 760px: two cards 349px each; three cards 2
  across then 1; the single card 650px.
- Files: gridKeys.ts and its test (new), editor.ts (the keymap in order),
  editor.css (the grid rules), reference.ts (CONTAINERS), paste.ts
  (ROW_BLOCKS), inlineStyles.ts (STYLED), session.ts (both pins),
  searchIndex.ts (the fallback), main.ts (the hover copy) and the
  reference, paste and index tests.

## Sources

- **Origin brainstorm:** docs/brainstorms/2026-09-22-card-grid-brainstorm.md
  — carried forward: one fence with a count and rows from the count;
  cards only; the window-wide break-out with a 650px card cap and 0.8em
  type; the refusal shown as source (its mechanism settled here).
- **The mockup:** docs/brainstorms/2026-09-22-card-grid-mockup.html, the
  measurements in the brainstorm's Resolved Questions.
- The card pipeline: grammar.ts:28-36, :79-146, :179-225; parse.ts:50-133,
  :439-444, :482-499; schema.ts:15-21, :36-90; serialize.ts:123-176;
  fenceRefusals.ts:1-44; session.ts:273-279, :303-318;
  notices.svelte.ts:48; editor.css:35, :52, :115-135, :199-227;
  reference.ts:150-334; paste.ts:117; inlineStyles.ts:11-16;
  typing.ts:8-27; fit.ts:77-86; main.ts:612-637; importFiles.ts:59;
  tools/corpus.ts:113-125; helium-steps.mjs:15-22, :181-202;
  corner.differences.txt:1-10; ../writer/src/js/md.mjs:508-515.
- The successor plan and its record:
  docs/plans/2026-09-07-feat-successor-app-prosemirror-svelte-plan.md.

### Batch 3 — 2026-09-22, the tools and the docs

- THE SHARED STEP, `grid` in helium-steps.mjs after `card copy`: a
  two-card `::: grid 2` pasted under a line of prose, then six readings —
  the layout (a grid or not, its columns, its cards, wider than the page
  or not, its type size), the band above its top-right corner hovered
  (the button's show, label, title), the button clicked (the label and
  the clipboard's text head), ⌘C across both cards (the HTML flavour's
  columns), a stray line put in the grid in the source view and ⌃⌘M back
  (the corner's text), and the line made a card and ⌃⌘M back (the corner
  and the layout again). Both adapters answer every reading by the same
  name over their own ids: `gridLayout`, `gridHover`, `clipboardText`,
  `selectCards`, `setSource`, `inSource`, `gridCorner`.
- FOUND on the first run: a step that leaves the page in the source view
  leaves EVERY later section there — the view is the reader's choice
  until switched back — and five sections failed on selectors the source
  view lacks. The step now ends by fixing the line and switching back,
  which is a reading worth having (the pin's release, the grid drawn).
  And the current app, which rendered the stray line and came back,
  needs a second ⌃⌘M before the fix, so the step asks `inSource` first.
- MEASURED, the successor's run: `{"grid":true,"columns":2,"cards":2,
  "wider":true,"type":"14.4px"}`; the band `copy grid` / `Copy this grid`;
  the click `copied` with `::: grid 2\n::: card-light-blue\nalpha…` on
  the clipboard; ⌘C's HTML `grid: true`; the stray line's corner
  `cannot render page/Gridded — a grid holds only cards; "loose" is not a
  card; shown as source`; after the fix the corner empty and the grid
  drawn 3 across (a bare count). Approved after reading the diff: the six
  readings and the page `Gridded` in the Go to and Search lists, nothing
  else.
- MEASURED, THE CURRENT APP over the same steps (`npm run compare:writer`,
  the measurement the plan asked for): it draws the two cards loose
  (`grid: false`, `cards: 2`, not wider, no type change), shows no button
  above where a grid's corner would be, its ⌘C carries no columns, and on
  the switch back its corner pins `::: grid — not a block Gesta knows, so
  it stayed a paragraph` and renders the rest as paragraphs and cards;
  the pin stands after the fix, the word still unknown to it. Sixteen
  fields over six steps, each listed in corner.differences.txt with its
  reason; the compare then passes. The INFERRED consequence in the plan —
  a save in the current app writing the grid's closer as `\:::` — was not
  exercised by the step and stays inferred.
- VOCABULARY, and THE CUTOVER (2026-09-22, the reader's word after this
  batch): "the current app" in this plan, in CLAUDE.md and in the tools
  means `../writer`, which is now the OLD app — this is the app in use,
  and a feature built here is never back-ported. The help sentence that
  warned of a grid saved in the old app was dropped the same day, there
  being no one to save one there; CLAUDE.md's running-app sentence and
  its reference rule were rewritten, dated.
- The docs: help.html gains a grid sentence after the card's (the fence,
  the count, cards only, the refusal and ⌃⌘M, the shape edited in source,
  the nesting, the current app), Enter's clause for a grid's cards, the
  copy button's `copy grid`, the paste sentence, and Tab in a quote
  moving a grid; CLAUDE.md's layout names the grid under grammar.ts,
  gridKeys.ts and editor.css; the brainstorm's example is the canonical
  spelling with a note.

### The review — 2026-09-22, one /code-review at medium over 3c9d0d6..7fa1843

- MEASURED: 164,042 tokens, 25 tool uses, 12 minutes; seven findings, two
  of them behaviour faults measured under node by the reviewer, the rest
  read. All seven fixed in one commit, the fixes test-first where a test
  can reach and read in the Helium step where it cannot:
- The grid did not travel on a mid-paragraph paste. A selection's
  content() keeps its parents (READ prosemirror-state), so a drag across
  two cards slices to the GRID, open three deep, and the CARD put in
  `ROW_BLOCKS` in batch 2 never fired for a grid — while changing how a
  loose card pasted, unstated. Now the grid is in the set and the card
  out; paste.test.ts builds its slice from a real TextSelection, pins the
  mid-paragraph paste of a grid, and pins the loose-card cases at their
  pre-batch strings. The comment that had asserted the clipboard's
  mechanism (the class CLAUDE.md names as owed a checker, claims.sh's)
  is replaced by what was measured. The step pastes two copied cards
  mid-paragraph on a fresh page and reads a grid, 2 across.
- A foreign `div.grid` in pasted HTML would have parsed to an empty grid
  node drawn as a blank gap: the parse rule now requires `data-n`, which
  only the editor's own copies carry.
- A refused switch back cleared `forced`, so a refused entry opened from
  the rendered view left every later entry in source: `forced` is kept
  across the refusal. The step reads it: the faulty entry opened from a
  sound one, ⌃⌘M refused, the next entry rendered. That reading found a
  latent fault beside it — the forced branch of open() restored the
  reader's view without telling the chrome, so the mode pill stayed on —
  fixed with one call.
- The band above a grid's corner was tested after the block under the
  mouse, so a card directly above covered most of it; the band is tested
  first, and the scan reads a live collection's length before anything
  else, so an entry with no grid costs one property read per move. The
  step's grid now sits directly under a card, and the band still finds it.
- `100vw` counts a classic scrollbar: main.ts writes the layout
  viewport's width to the root as `--client-w` on load and resize, and
  the stylesheet reads it with `100vw` as the fallback.
- The step's first cut reloaded the page to reach the open path, which
  ended the OLD app's run; a navigation away and back does the same, once
  the save has landed, and the old app's adapter now accepts a painted
  source view as an entry (text, no elements). The refused entry's
  console line lost its stack: minified names churn per build in the
  tools' console.
- Not built here, owed still: the port of ../writer/tools/claims.sh, the
  checker for a comment asserting another module's mechanism — its class
  showed up on 2026-09-12 and again in this review.
