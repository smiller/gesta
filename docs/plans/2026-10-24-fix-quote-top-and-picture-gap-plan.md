# fix: a quotation's top and a picture's gap

## The two sightings (2026-10-23)

- "It is the case that other quotes have that empty space at the top of the
  quote. There's also a problem with space after an image."
- Both answered as spacing rules in `src/editor/editor.css`; built
  2026-10-24 on "Build both."

## Causes (MEASURED in headless Helium, 1100px)

- A single-column quoted verse block stood its text 29px below the quote
  box's top edge, against 7px for a two-column quote and a quoted paragraph:
  `.page .verse` keeps its 1.2em top margin inside a quotation, and only the
  paired form was reset.
- A picture ending its paragraph: ProseMirror appends
  `img.ProseMirror-separator` and `br.ProseMirror-trailingBreak` after it, an
  empty line under a block picture — 18px above the picture, 77px below it,
  against an 18px paragraph gap.

## The change

- `.page blockquote > :first-child` (and the note, card and reference forms,
  named as the last-child rule names them) drops its top margin, the mirror
  of the last-child rule.
- The separator and trailing break that follow a picture are not drawn.

## Measured after

- The Helium step "a picture's gaps and a quotation's top" (editing as the
  `../writer` version does): above 18, below 18, paragraph gap 18, quote top to text
  [7, 7, 7].
- A scratch probe: a click right of the picture and X typed put X in the
  picture's paragraph, the picture kept; Enter then Y made a new paragraph
  (MEASURED).
- The full run's approved copy moved by the new step and the page count
  (1569 → 1570, the new page) alone. One run flaked in the toolbar section
  (a double-click that selected nothing); the section passed twice alone,
  and the copy was approved from a clean run.

REVIEW CYCLES: 0 (CSS only, no DOM seam touched)
