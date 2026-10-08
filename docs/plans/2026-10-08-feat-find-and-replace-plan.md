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

- 2026-10-08, REVIEW CYCLE 1: one `/code-review` at high over
  `d45885c..237852f` (the card fills, the corpus tools, find and replace),
  after the accept. COST 118,398 tokens (its transcript's last message: 2
  input + 1,805 cache creation + 114,021 cache read + 2,570 output). Ten
  findings, each read against the code; the behaviour ones given a Helium
  reading first, seen failing, then fixed:
  1. a save from another window rebuilt the source view under the open
     bar, its offsets the old text's — the bar now holds the view it
     opened on and closes when it is replaced, the cursor to the text
     (reading: the bar open after the save, before; closed, after);
  2. `border: 8px solid` on every card drew a word outside the eleven a
     frame in the ink — the edge is set per colour, the 1px rule kept
     (cardFills.test);
  3. Replace All with a replacement holding the find said "none" over
     matches — recounted ("2 found");
  4. Replace All said to throw the window to the entry's end — NOT
     REPRODUCED: in 1,500 paragraphs the window stayed within 60px; kept
     as a reading, no change;
  5. a refused switch back left the cursor on the page — now the text;
  6. other closes (a panel, Search) left the source view open — they
     switch back as Escape does; a navigation, or a view rebuilt, only
     closes the bar, the view staying as views do across a navigation;
  7. two or three whole-text layouts per keystroke — the current match is
     read off the layer just drawn, not a twin, and typing recounts once a
     frame (not measured);
  8. the copied style list twice over — one `MIRROR`;
  9. the port found by duck-typing — declared on `Surface`;
  10. a comment restating its code — gone.

- 2026-10-08, REVIEW CYCLE 2, the confirmation pass, asked for: one
  `/code-review` at high over `237852f..475a5ec`. COST 113,702 tokens (2
  input + 4,058 cache creation + 107,265 cache read + 2,377 output). Nine
  findings:
  1. after another window's save closed the bar, the rebuilt text's caret
     sat at its end — now at the match the bar stood on (reading: caret
     25 with the old call, 3 with the fix);
  2. the once-a-frame recount left the offsets a keystroke behind for up
     to a frame, and Replace wrote at them — Replace now checks the text
     still holds the find at the match, else seeks it again (`holds`,
     replace.test);
  3. the same, at its altitude: a check at write time — taken as 2's fix,
     the view held as well, since a rebuilt view must still close the bar;
  4. the section's last ⌃⌘M was left over, toggling back to source and
     waiting out 5s each run — removed;
  5. closeBack spelled out port()'s test again — it calls port();
  6. two comments moved into surface.ts spoke of other modules — one
     removed, one reworded to its own parameter;
  7. MIRROR's comment restated the constant — removed;
  8. a recount still lays the whole text out — MEASURED in Paradise Lost
     (232 KB): 17–37 ms a keystroke with the bar open, mostly about 24,
     against 16.7 with it closed; left as it is;
  9. the 1px-rule test read one selector shape only — it now reads every
     rule naming a card, and fails on an `:is(…)` rule setting a border
     (seen failing, then the stylesheet restored).
  No further round (2 cycles).

## Status

Built 2026-10-08.

REVIEW CYCLES: 2
