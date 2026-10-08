# Find and replace (2026-10-08)

The first use: the Price files' `*-*` and `*,*`, typed as italics round a
punctuation mark, which this app shows as asterisks (the corpus run's
"more asterisks than the current parser", 2026-10-08). A find-and-replace
bar lets them be fixed in the app, entry by entry.

## Decisions (asked, on the mockup)

`docs/brainstorms/2026-10-08-replace-bar-mockup.html`, opened in Helium,
every hand step played first in headless Helium.

1. **The bar**: two rows, under the masthead at its right, the line bar's
   look: **Find** with its count after it ("2 of 7", "none", "7 found"
   after typing in the text), **Replace with** with **Skip**, **Replace**
   and **Replace All** after it, and a ×. Skip, asked for once the bar was
   in use: the outlined match left as it is, the next one outlined, as
   Enter in Find does. "All" alone was ambiguous — replace all, or skip
   all? — so it is spelled out, and Skip comes first. The two boxes start and end at the same x
   (MEASURED on the mockup: 803.2 → 1011.2 px both).
2. **The key**: ⌃⌘E, E for exchange. ⌃⌘F is Helium's full screen and ⌥⌘F
   its web search (both found by hand); ⌃⌘R stays the reference, so the
   help card says "⌃⌘R is already used for references, so ⌃⌘E (for
   exchange) is used for replace". ⌃⌘E with the bar open puts the cursor
   back in Find.
3. **The view**: the replacing is on the markdown. ⌃⌘E in the rendered
   view switches to the source view first, whispering "Source view, to
   replace"; closing the bar (Escape, the ×) switches back. Opened in the
   source view, it stays there.
4. **Scope**: the open entry only.
5. **Matching**: the characters typed, exactly, case counting; no
   patterns.
6. **The keys in the bar**: Enter in Find goes to the next match,
   Shift-Enter the previous; Enter in Replace with replaces the current
   one and goes to the next; **Replace All** replaces every one. The first match
   is the first at or after the caret if the caret is on screen, else the
   first under the masthead.
7. **Undo**: ⌘Z in the text undoes one Replace, and the whole of a Replace All in
   one step (MEASURED on the mockup).
8. **Where you were**: Replace All keeps the place of the current match, not the
   text's end; closing carries it back to the rendered view.

## Record

- 2026-10-08, FOUND BY HAND in Paradise Lost: the outline on "7 of 7" sat
  a line and a bit below its `*-*`. MEASURED in headless Helium: the two
  wrap alike, but at the source view's 1.8 (27.54px) the textarea and a
  block laid the whole entry out 139,335.66px against 139,414.73px, 79px
  apart over 2,706 lines; at a pitch layout can hold exactly, 1/64 px
  (27.5px, 28px, and `round(1.8em, 1px / 64)` = 27.5469px all part by
  0.016px). CHOSEN, not asked, being 0.007px from the old pitch and no
  change to the eye: `round(1.8em, 1px / 64)`.
  Pinned by the replace section's long-entry reading (1,500
  paragraphs: 47px apart before, 0 after); no other reading of the run
  moved.

## Status

Built 2026-10-08.

REVIEW CYCLES: 0
