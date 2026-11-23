# A menu opens on the open entry's row (U14)

Asked 2026-11-23: "if I'm on the Ovid page and hit ⌃⌘J, the bookshelf menu
should open with Ovid selected."

## Decisions

1. Every opening, by ⌃⌘J or the icon, selects the row of the open entry or
   of the root it sits under at any depth: Ovid on Ovid, on Metamorphoses
   and on its Book 1; Books on Books and on a sub-entry of it. Overrides the
   menus plan's "every opening selects the first row" where such a row is
   listed; otherwise the first row, as before.
2. The commonplace menu the same way.
3. No mock: the selected row's look is unchanged (the reader waived it);
   played headless over each case instead.
4. Built after A19's fix commit, so the review's findings land on what it
   read.

## Record

- 17:16 `holdsEntry` in `nav.ts` and the opening's selection in
  `menuActs.ts`, each test-first; main.ts hands `holdsHere` the open
  entry. Help and the glossary say where a menu opens.
- 17:18 "menus" reads the selected row: Ovid on Book 1 by ⌃⌘J and on
  Ovid by the icon, Books on its Essay, the first row from a journal day.
  The verdict differed only in those readings and the round's gaining
  `sel`; approved.
