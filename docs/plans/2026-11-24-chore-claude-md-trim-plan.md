# CLAUDE.md holds what every session needs; the rest is read when needed

## Decisions

1. The layout, every module with a line each, moves to `docs/LAYOUT.md`,
   read before changing a module not yet read in the session;
   `tools/claudeLayout.test.ts` reads it there. CLAUDE.md keeps where the
   tests and THE CORPUS are.
2. How a review and the architecture run are run, their findings fixed
   and their cost recorded, with NOT YET (a prose checker added when its
   class first shows in a review), moves to `docs/REVIEWS.md`, read when
   one is owed. CLAUDE.md keeps when one is owed, and THE GATE.
3. The opening history shortens to what the app is and that the
   `../writer` version is never read. NEVER moves here, as decided:

   > NEVER — the single-file checkers (the vocabulary index, check-sync,
   > map.sh, names.sh, the concatenating build): TypeScript and the import
   > graph answer their question.

## Record

- 14:58 The reader: "Is there stuff in CLAUDE.md which isn't useful
  enough to be included in every session". CLAUDE.md was 11.9k tokens a
  session (`/context`); by characters, the layout about 45%, the review
  and architecture-run procedures about 8%, the opening history, NEVER
  and NOT YET about 5%.
- 15:32 Moved: CLAUDE.md 30,573 characters to 14,859 (`wc -c`);
  `docs/LAYOUT.md` 13,795, `docs/REVIEWS.md` 2,264. The layout, paths
  and vocabulary tests read the new files.
