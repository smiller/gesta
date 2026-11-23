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
- 17:31 A20, `/code-review high 50d72be..fab47aa`: 86,309 tokens (the
  transcript's last message). Six findings:
  - A menu answered again kept the selection's number: opened on Ovid's
    Book 1 before the warm, it moved to Boethius once the warm ended
    (played on fab47aa's menuActs.ts). Now the open entry's row is found
    again until a key or the pointer moves the selection, and after that
    the row moved to, by its address. This replaces decision 1's "the
    first row stays" for a menu opened before the warm.
  - `holdsHere` read the session's entry, `isHere` the address; both read
    the address now.
  - The menu's top reset and the scroll to its selected row in one effect,
    so a menu over the other one shows its row even when the number is
    unchanged. Not reproduced before the fix: the old effect kept Author
    60 of 60 in view, played twice; the first try read 61 of 64 rows, a
    race in the step, now held on the store's count.
  - The sub-entry case on Zibaldone, which does not sort first; the
    selected row read from `data-menu-sel` on the root; two step comments
    that restated their steps deleted.
