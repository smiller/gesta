# One reading of which view is showing (A28.1.2)

Asked 2026-11-24: "let's grill for candidate 2 now" (A28.1's candidate 2,
Strong), then "yes" to the five decisions below.

## Decisions

1. The session publishes `shown`: nothing, HTML mode with its editor, or
   markdown mode with its replace and whether the caret's line is a
   heading; callers branch once, on its mode.
2. `session.view`, `session.markdownMode`, `session.replacer()` and
   `session.markdownLineIsHeading()` go; `screen.markdownMode`, the
   masthead pill's own state, stays.
3. `insertText` stays on the session: it types into whichever view shows.
4. The lifecycle takes `shown()` for its two ports; `main.ts`'s
   `markdownPort` goes.
5. Tested by the three states of a pure `shownOf`, the act tests over
   fakes that write `shown`, and the verdict read as approved.

## Record

- 18:52 Built: `Shown`, `shownOf`, `htmlView`, `replaceOf` and `sameShown`
  in `src/editor/surface.ts` (`shownOf` builds a fresh value each read, so
  the lifecycle's "the same view still showing" compares the editor or the
  replace, not the value); six act modules, the lifecycle and `main.ts`
  read `shown`, their double checks dropped. Verify green, the four Helium
  runs ok with no approval.
- 19:14 Candidate 3 built (d370c19): a bookmark's link refused in a heading
  in both modes, as a new entry's (asked). Candidate 4 dismissed (asked):
  the place keeper's markdown-mode branches at `placeKeeper.ts:36` and
  `:136` carry real differences, a text position meaning nothing in
  markdown mode; moving the flag behind the adapter only renames it.
  Candidate 5 kept on W.
