---
title: "feat: a verse line split between speakers is one line"
type: feat
status: open
date: 2026-10-20
---

# feat: a verse line split between speakers is one line

## The ask (2026-10-20)

Bringing Samson Agonistes onto the bookshelf, laid out as Twelfth Night
is (a speaker a bold row, a direction an italic row), a verse line shared
between speakers became two or three numbered rows. The reader: "that
should probably be one line, both here and in Cyrano. Don't worry about
Cyrano now." Checked in the Oxford World's Classics edition: Samson's
"Relate by whom." / "By Samson." / "That still lessens" is one line, 1563.

## Decisions

1. **A row marked `⟨…⟩` is the rest of the verse line above it**, the
   speaker and direction rows between passed over. The mark is a row's
   declared kind, in the `⟨line⟩` family (`kind: "cont"` on the row),
   asked over putting the halves on one row with inline speakers. A rest
   with no line above it in its block begins a line. MEASURED over the
   backup: no `⟨…⟩` anywhere; the page-number grammar takes digits or
   roman numerals only.
2. **A rest takes the number of the line it finishes and draws none of its
   own**; a passage quoted from a rest is numbered from that line.
3. **A rest is set in a space (0.3em) past where the half above ends**, a
   three-way split stepping on, as the 1671 printing staggers it — asked
   over a fixed 3em indent, after a static mockup of both opened in Helium
   (Samson 1554–1595, Harvard's text). A rest that would run past its row
   is set in only as far as it fits.
4. **Enter splitting a rest** leaves the rest on its first half; the text
   carried below begins a line of its own (a `⟨line⟩` row's split keeps
   its kind on both halves).
5. **Made in the markdown source only.** No gesture in the rendered view;
   the help card says how.

## Record

- The indent is a measuring pass (`src/editor/continuations.ts`, the
  arithmetic pure) writing `--cont-x` on the row. FAILURE, MEASURED in
  headless Helium: the row's view read the write back as a change and
  redrew the row with none; the row view now ignores its own `style`
  mutations, as the margin-note view ignores its attributes.
- MEASURED in headless Helium (the `split lines` section): each rest
  starts 5–6px past the end of the half above at 18px; "Then take the
  worst" at 1570, "All by him fell" 1580 and "O lastly over-strong" 1590,
  where the 1671 margin numbers stand; typed into "Relate by whom.", the
  two rests after it moved 40px right; ⌃⌘R on "By Samson." cites
  `[Milton, *Samson Agonistes*, 1563]`, quoted from `::: verse 1563`.
- The first full Helium run after the change failed the toolbar section
  (a double-click selected no word, the section timed out); the toolbar
  section alone, and the full run again, passed. That run was approved
  in error, reading only the diff's tail, and the approval undone; the
  run approved is the second, whose whole diff is this section's three
  readings.

## Review cycle 1 (2026-10-21)

One `/code-review` at high over 5067615 (⌃⌘M's caret probe, folded into
this batch as asked on 2026-10-19) and 5bd9481: 130,767 tokens (the run's
final context plus output, read from its transcript), ten findings, nine
on this feature; none on 5067615. Fixed in one commit:

1. `countAt` from a speaker row or gap before a rest counted one past the
   line it finishes, so a quote or copy opening there was fenced a line
   high. Now the first numbered row at or after the cut decides.
2. Enter at the start of a `⟨…⟩` row left the mark on the empty row above
   and made the text a new line. The row opened above is now a plain one.
3. ⌃⌘G's Line box found the half and each rest as separate hits, and a
   stanza counted a rest as a line. Rests are passed over.
4. ⌃⌘I overwrote a rest's kind with "line". A rest now counts as declared
   and keeps its kind.
5. A rest the indent had wrapped was measured by its last visual line,
   so the fit clamp never pulled it back. It is now measured unwrapped.
   MEASURED in headless Helium (the new reading "a rest typed past its
   row's width"): the old pass left it on two lines set in 276px, the new
   one sets it in 149px on one.
6. The pass built every verse and prose block's units each frame, and
   measured every row of a block with a rest. It now skips blocks with no
   `⟨…⟩` row and measures only the rests and the lines they finish.
7. `Unit` carries `rest`, the one fact the count, ⌃⌘G and the pass share.
8. and 9. Two comments: provenance ("asked") in continuations.ts, and the
   row view's comment naming the measuring pass.
10. A `⟨…⟩` pair in prose was set in on screen but numbered as a sentence.
   The pass now runs over verse only.

Accepted 2026-10-21. No confirmation pass was asked. ⌃⌘G to a split line
highlights its first half alone, where a reference link to it highlights
every part: looked at in Helium and kept as it is (2026-10-21).

REVIEW CYCLES: 1
