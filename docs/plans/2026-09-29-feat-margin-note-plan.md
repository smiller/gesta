---
title: "feat: ::: margin-note, a note drawn in the left margin beside its line"
type: feat
status: built 2026-09-29, uncommitted, awaiting the reader's look
date: 2026-09-29
origin: the Donne import (~/Desktop/gesta-bookshelf-import-donne), whose Anniversaries carry 17 marginal glosses from the 1621 book
---

# feat: `::: margin-note`

## Overview

Donne's Anniversaries (1621) print 17 short glosses in the margin ("The
entrance.", "Smalenesse of stature."). The import sets each as a
`::: note` row inside the `::: verse` fence, at the line it stands
against, and the app draws it as the ordinary note: a full-width box
between two lines (READ, the import's screenshots 2026-09-29), which
reads as a stanza break. The reader asked for them in the margin, and
settled the look over a mockup drawn on the app's own captured page:
`2026-09-29-margin-note-mockup.html` beside this file (the First
Anniversarie as the successor rendered it, with a switch strip).

A new fence, `::: margin-note`, says where the thing goes, not what it
is: a note to be set in the margin when the margin is wide enough, and a
note in the text when it is not.

    ::: verse
    This new world may be safer, being told.
    ::: margin-note
    The sickenesse of the world
    Impossibility of health.
    :::
    The dangers and diseases of the old:
    :::

## What was decided

All by the reader, 2026-09-29, over the mockup.

| Decision | |
|---|---|
| Its own fence, `::: margin-note`, not a rule over `::: note`: a note inside verse stays a note in the text (Horace, Satires 1.10, whose `::: note` at the head of the fence holds the eight spurious prelude lines; the only note inside verse on the shelf, READ in the mirror 2026-09-29) | over "a note inside verse is a gloss unless it opens the fence" and "a short note is a gloss" |
| The name `margin-note`: the placement is the point, and a gloss carries no placement; it pairs with `note` and names its own fallback | over `sidenote`, `margin`, `marginalia`, `in-margin`, `marginal-gloss` |
| The LEFT margin, outside the line numbers | over right margin and the box |
| Beside the line AFTER the margin-note row: the line its passage opens with | the mockup's default, not changed |
| Italic, the muted colour, 0.8em | over roman, and italic with a rule |
| 15em wide, right-aligned against the numbers | over 9em and 12em |
| When the margin is short, the margin-note narrows, down to 10em | over "15em or nothing" |
| Below 10em of room, it goes back into the text where it stands: italic, 0.8em, muted, no box, 0.65em above and below (in its own em) | over 0.15em |
| The Donne folder is rebuilt to write `::: margin-note` for its 17 glosses | accepted as the fence's cost |
| Editing: like a `::: note`, a margin-note, once added, is edited in the html view, where it is drawn, in the margin or in the text | over "drawn from a decoration, edited in the source view" |
| Scope: not limited to `::: verse`; prose can have margin-notes too | over "inside `::: verse` only" |

MEASURED in headless Helium over the mockup (18px text, the gap from the
numbers 2.2em, the numbers' gutter 2.4em):

| window | room left of the column | form |
|---|---|---|
| 1500px | 394px | margin, 15em |
| 1300px | 294px | margin, 14.6em |
| 1150px | 219px | in the text (10em needs 227px) |
| 900px | 94px | in the text |

A margin-note that would overlap the one above it is pushed down below
it (the mockup does this; no Anniversarie gloss needs it: the nearest two
stand 21 lines apart, MEASURED over the built entries).

## Open, for the build

- In prose, a margin-note stands beside the first line of the block
  after it, as in verse it stands beside the line after; inside a
  `::: prose` fence, beside the row after it. A margin-note in plain
  prose is a block between paragraphs, so no paragraph is split to hold
  one. Built as the initial assumption and changed when a concrete
  prose example shows what it needs (the reader, 2026-09-29: no strong
  view yet).
- Editing where it is drawn means the margin form is a real, editable
  node positioned in the margin, not a decoration: the caret enters it,
  and the arrow keys move in and out of it. How that moves between the
  margin and the text form as the window narrows, without losing the
  caret, is tested in Helium as the build goes (the reader, 2026-09-29).
- Like `::: note` inside a row fence, a margin-note row is not a line
  and takes no number (pin: parse.test › a ::: note inside a row fence
  is a row); the grammar, the parse, the serializer and the numbering
  each need it named, test-first.
- Nothing is decided for a phone or tablet beyond the in-text form: not
  needed until a portable version is.
- The old app reads the fence as text; it is not maintained.

## Record: the build, 2026-09-29

Built test-first from this plan. Every "Open, for the build" item above
was built as its initial assumption; none was decided anew.

- THE MODEL. `margin_note` is its own node (`block+`, like `note`), a
  block at the top level and a row in a verse or prose fence;
  `MARGIN_NOTE_OPEN` in the grammar, a `::: margin-note 2` refused as
  "margin-note takes nothing after it". Round trips at the top level, in
  verse, a stanza and a paired prose fence, and quoted (MEASURED, the
  suite). Wherever the editor passes over a note row it passes over a
  margin-note row: no number, no leaf, left out of a quoted passage,
  Enter's exit to a row; markdown as you type opens blocks inside one.
- THE FORM is a class on the note's own node (`in-margin`, with `--mn-w`
  and `--mn-push`), written by a plugin view (`src/editor/margins.ts`),
  not a decoration: the caret stays in the same node across a change of
  form. The node view ignores its own attribute mutations. The margin
  form is absolutely positioned at its static place, so it stands beside
  the row after it with no measuring of rows; the pass measures only the
  host block's left edge (the width) and the notes' boxes (the push).
- FAILURE, MEASURED in headless Helium: the pass ran on the root's size
  alone, and a window widened or narrowed past 760px moved the page's
  left edge without changing its size — at 900px the glosses stood at
  x = −205, still in the margin. The window's resize now schedules it too.
- MEASURED in headless Helium over the seeded Donne passage (18px text),
  the plan's table reproduced in the app: 1500px → margin, 15em;
  1300px → 14.6em; 1150px and 900px → in the text. In the margin the
  gloss's middle is 0px off its line's first line, its right edge 83px
  (4.6em) left of its block; a gloss a line under a two-line gloss is
  pushed to 4px below it (605 → 609). In the text, left edge on the
  text's, 9px (0.65em of 14.4px) above the next row.
- THE CARET, MEASURED in headless Helium (the plan's open item): a click
  lands in a margin gloss and typing is stored in its fence; ArrowRight
  at the end of the line before enters it, ArrowRight at its end and
  ArrowDown leave to the line after, ArrowUp from the line after enters
  it; a resize to 900px and back with the caret inside kept the caret,
  and the characters typed at each width were stored. A synthetic key is
  not a hand: the reader's own keys in Helium are the answer.
- THE STEP. `margin-note` in `tools/helium-steps.mjs`, seeded by
  `?store=seed-margin` (the passage, with "Shortnesse of life." moved up
  from 30 lines on so that it is pushed, and a prose page); its four
  readings are successor-only, listed in `corner.differences.txt`.
  Approved after reading the diff: the four readings added, no earlier
  reading moved. The current app's run was regenerated; it also gained
  two lines in its `places` section, READ as the steps' change in
  f352e3f, made after that run was last regenerated (573fcff).
- NOT DONE: the Donne folder's rebuild to write `::: margin-note`.
