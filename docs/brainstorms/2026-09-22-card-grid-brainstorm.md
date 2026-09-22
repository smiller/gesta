---
date: 2026-09-22
topic: card-grid
---

# A grid of cards

## What We're Building

A new fence, `::: grid N`, whose body is card fences and nothing else.
The cards lay out N across, the rows falling out of the count, so the
3x3 of index cards on the desk (nine `::: card-<colour>` blocks under
`::: grid 3`) reads on screen as it does on the desk. The grid alone
widens past the page's 760px measure to give the columns room; the
prose above and below stays where it is. Each card in a grid is the
card the app already has — same colours, same body of blocks, edited
in place — only placed.

```
::: grid 2
::: card-light-yellow
first card
:::
::: card-light-yellow
second card
:::
::: card-red
third card
:::
::: card-red
fourth card
:::
:::
```

## Why This Approach

Three shapes were weighed on 2026-09-22:

- A count on the fence (chosen). One word says what the desk shows; the
  parse is one regex beside `CARD_OPEN`; the rows need no fence.
- No count, as many as fit. Smallest grammar, but the author cannot say
  three, and nine cards at four across is a 4-4-1 the desk never shows.
- The nested sketch (`grid` > `grid-row` > `card`). Rows explicit, at the
  price of three fence levels and two new words for nine cards; the rows
  were agreed to fall out of the count, so the row fence has no work.

## Key Decisions

- **Rows fall out of the count.** A grid says how many across; the cards
  flow. A short last row (seven cards under `::: grid 3`) is a row of one,
  left-aligned (ASSUMED here; the mockup settles it).
- **Cards only.** A grid's children are `::: card-<colour>` fences. Any
  other block between them, and a grid inside a grid, make the grid a
  refusal shown as source with its reason, as `fenceRefusals.ts` already
  does for a card without a colour. The grid means one thing.
- **The grid breaks out of the measure, to the window.** The page stays
  760px; the grid takes the window's width less the page's gutter, and
  each card is capped at 650px so that on a wide screen the cards stop
  growing and still look like cards. When the window cannot fit the count
  at a minimum card width, the count steps down (three becomes two, then
  one) rather than the cards becoming unreadable.
- **A grid's type is 0.8em.** Chosen by eye in Helium 2026-09-22 as the
  first step at which the longest title in the photo's nine cards sat on
  one line at three across (the strip read "window 1493px · grid 1445px ·
  3 across"); 0.9em wrapped it.
- **The hyphenated card word stays.** The sketch's `card yellow` is the
  form both apps refuse today (READ grammar.ts:31, fenceRefusals.ts:32);
  the grid does not relax it.
- **Stored as markdown, like every block.** `::: grid N`, the cards, `:::`;
  a save is serialize and compare. MEASURED 2026-09-22 over the export
  mirror (`~/Library/CloudStorage/Dropbox/gesta-snapshots/current`, the
  corpus tool's default): 13,565 files, 689 card fences in 65 of them, 0
  lines opening a grid, and 9 files where a card closer is followed within
  two lines by another card opener — the entries a grid could one day
  rearrange, by hand, never by migration. The corpus gate is untouched:
  a text with no grid parses as it did.
- **Successor-only.** The running app has no grid word (READ
  ../writer/src/js/md.mjs:508–515, its refusal list knows note, reference
  and card-). What the running app shows for an entry holding a grid is
  NOT MEASURED; it matters only after the cutover, and the shared Helium
  steps list a grid step, if one is added, as a decided difference.

## Resolved Questions (2026-09-22)

- **A bare `::: grid` means `::: grid 3`.** The desk's shape is the
  default; the serializer writes back what was typed.
- **A grid's type is 0.8em**, read off the mockup (above). A fixed step,
  not one that changes with the window.
- **The grid widens to the window, the cards capped at 650px.** A fixed
  maximum for the grid was the first answer and was reversed at the
  mockup: on a laptop the whole window is wanted, and the cap on the card
  rather than the grid is what keeps a wide screen's cards card-shaped.
- **The mockup came before the plan.** One static page beside this file,
  `2026-09-22-card-grid-mockup.html`, linking the live `editor.css` by
  relative path so the colours are the app's, holding the nine cards of the 2026-09-22 photo,
  with a control strip for the count, the grid's maximum width, the card's
  maximum width, the type size, the card height (stretched to the row, as
  index cards are all one size, or each its own) and the minimum card
  width below which the count steps down. MEASURED 2026-09-22 in headless
  Helium over the first defaults (3 across, grid max 1200px, 0.9em,
  240px): a 1440px window drew the grid 1200px wide at 3 across; a 1000px
  window 952px at 3 across; a 760px window 712px at 2 across. Then by
  hand in Helium over the settled values (window width, cards capped at
  650px, 0.8em): a 1493px window drew the grid 1445px at 3 across. The grid's break-out uses the margins the paired
  measure already uses (READ editor.css:200, `--par-w`).

- **A short card stretches to its row's height**, as index cards are all
  one size. The mockup opened that way and it was not objected to; the
  strip's other choice, each card its own height, remains in the mockup
  for a second look during the plan.

## Open Questions

- None for the brainstorm. The minimum card width at which the count
  steps down (240px in the mockup) is a stylesheet number for the plan
  to fix by trying it.

## Next Steps
→ `/workflows:plan` for implementation details
