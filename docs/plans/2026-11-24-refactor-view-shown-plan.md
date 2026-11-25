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
- 19:48 W6 built (asked "shall we pull in W6 and then review?", then "yes"
  to its three decisions): `showAgain(focused, show)` in the surfaces holds
  the caret, runs the show and carries the caret by its count; the
  session's redraw is that one call. `viewCarets.ts` moved to `src/editor/`.
  Two tests over the surfaces' fakes; verify green, the verdict as approved.
- 20:01 A29, `/code-review high 2dd06e1..HEAD`: 144,603 tokens; six
  findings. Fixed: the type-only pattern anchored to the statement (an
  unterminated `export type` swallowed the next import, latent: none in
  the tree); the alert's description scoped the selection case to a new
  entry's; two comments in helium-approve.ts described the verdict's
  doing. Did not stand: `secs` from the play's start was A28's fix
  (b661289), recorded above at 18:10; the kept-print test reads "differs"
  (`compared` says "failed" only for a held run), now asserted. Kept for
  the reader: in markdown mode a link after the caret is let into a code
  fence, inline code or a link, where HTML mode refuses (pre-existing).
- 20:14 S31 (asked "yes, refuse those in markdown mode too"): markdown
  mode refuses a link after the caret inside a code fence, inline code
  that closes, or a link, as HTML mode does: `markdownSpanAt` in
  `markdownKeys.ts` reads the text around the caret (it replaces
  `headingLineAt`); `shown`'s markdown mode carries `spanAt()`. Before, a
  link typed inside a link broke it (MEASURED by parsing each case). Two
  Helium readings in markdown mode, approved as the corner's only change.
- 20:20 S31, found writing its hand-check: a bare address (http or www)
  is drawn as a link in HTML mode but was nothing to the reader, so a
  link typed into one in markdown mode broke it (MEASURED on a line of
  the backup's "External Links"). It now reads as a link; one in `<…>`,
  drawn as text, does not. A third Helium reading, approved.
