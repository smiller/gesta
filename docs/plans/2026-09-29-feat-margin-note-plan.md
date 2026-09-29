---
title: "feat: ::: margin-note, a note drawn in the left margin beside its line"
type: feat
status: built 2026-09-29 (bf81178), reviewed at high; the fix commit follows
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

## Record: the review, 2026-09-29

ONE `/code-review` at high over 0491c70..bf81178 (the build, one commit),
due because the batch touches main.ts and editor.ts. COST, MEASURED from
its transcript's last message: 6,172 cache creation + 136,538 cache read
+ 2 input + 2,531 output = 145,243 tokens. Ten findings, all READ as
holding against the code; all fixed in one commit:

1. The room was the host's left edge from the window, so a gloss in a
   grid's second card was set over the first card. A gloss inside a grid
   is now always in the text (pinned by the step's prose page, which
   gained a grid).
2. A gloss between paragraphs, or in a block a loose-prose passage runs
   into, was quoted into a reference, fences and all, against the help
   card's word. Now left out there too (MEASURED red, then green).
   DECIDED by the reader the same day, asked with the note's opposite
   rule beside it: left out, for now.
3. A gloss in a folded section (display: none) measured as a box at 0
   and set the push floor, so a gloss scrolled above the window was
   pushed ~300px off its line (MEASURED red in the unit test: 304).
   A box of no height now neither moves nor moves the next.
4. `.page :has(> .in-margin) { position: relative }` changed the
   containing block of every absolutely placed label in the host (a
   folio's page number in a quoted verse). The margin form now keeps its
   static place on both axes and is moved left by a shift the pass
   writes (`--mn-x`); no host is made a positioned container. The step's
   readings are unchanged under it (MEASURED: 0px off centre, 83px).
5. Every keystroke rewrote every note's properties, forcing a second
   layout. The pass now writes only a value that differs, and reads each
   note's push-free top by subtracting its own push.
6. The reach lived twice (4.6em in the pass, 5.75em in the CSS). It is
   now the pass's alone, and the note's size is read off the note.
7. A comment asserted another module's behaviour (the fitted measure
   moving the root's size); rewritten to this code's own failure.
8. A test comment carried provenance ("the plan's table … the mockup").
   The checker missed it: its provenance rule now takes "the plan", with
   the block verbatim in its self-test; the sweep finds no other.
9. Seven exports nothing imported; now module-private.
10. The seed text lived twice (main.ts and the steps). Now two files in
    `fixtures/`, imported by the page and read by the steps.

The fix's only change to the verdict run: the prose page's reading
gained the grid card's gloss, in the text (read, then approved); the
current app's run was regenerated and did not change.

After the fixes, decided by the reader: a confirmation pass over the fix
commit, its findings listed by significance before any is fixed; the
comment checker's plain-English blind spot left to the five-round count;
the Donne folder rebuilt only once the fence is finished.

## Record: the confirmation pass, 2026-09-29

`/code-review` at high over bf81178..28badc3 (the fix commit), on the
reader's word. COST, MEASURED from its transcript's last message: 3,692
cache creation + 100,126 cache read + 2 input + 3,653 output = 107,473
tokens. Nine findings, READ as holding, listed by significance before
any was fixed; the reader chose:

- FIXED: a selection wholly inside a margin-note copied an empty
  quotation (a regression of the first fix): now refused, "A margin-note
  can't be referenced — select the text beside it". A margin-note left
  out between two stanza gaps left two; now one (two the text holds stay
  two). The CSS comment was false ("keeps its place in the flow") and
  described the pass. The pass read a block's style and place once per
  margin-note; now once per block. Each red first where it could be.
- DECIDED, option A: a margin-note in a grid's card stays in the text,
  the leftmost card too; the help card now says so. Over B (the leftmost
  card's goes to the margin) and C (in the text in any boxed block). No
  other layout can hold a margin-note side by side (READ, the schema).
- NOT FIXED, the reader's choice: a margin-note directly in a bordered
  block sits the border's width further out (1–3px, unmeasured); the
  tools comment's date; "the plan" matching a future backup-plan comment;
  the two fixture readers.
- THE NAME: the reader asked for "margin-note" everywhere, never "gloss"
  (the 1621 book's printed glosses excepted, as the source). Renamed in
  the help card, the tests, the step's labels and reading, the fixtures;
  the verdict run's diff was the renames alone.
- The current app's run, regenerated for the labels, read a fading
  corner as gone in an untouched list step once in two runs (a timing
  flake in the old app); the second run matched.

DECIDED after it, by the reader: no further review round for this work
unless a problem is really significant; next, the Donne folder rebuilt to
write `::: margin-note`, imported, and looked at.
