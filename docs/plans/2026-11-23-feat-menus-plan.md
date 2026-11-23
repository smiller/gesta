# The menus, the toolbars and the panels: their names, and menus that act as menus (U8)

Asked 2026-11-22: "I think we'll probably want to review the dropdown lists
too -- and also firm up the vocabulary for them -- but maybe make that U8."
Grilled over eight rounds; "index" and "control" discussed and set aside.

## Decisions

1. The words, each kind with its members:
   - MENUS, to go somewhere from: the bookshelf menu, the commonplace menu;
     the search results keep their name.
   - TOOLBARS, used on the entry in front of you: the go to toolbar (⌃⌘G),
     the format toolbar (on a selection), the replace toolbar (⌃⌘E).
   - PANELS, read or picked from: help, backups, bookmarks, shortcuts.
   - Masthead rows as before; the masthead's buttons, never "toolbar".
   - The copy button, the alerts, the backups-paused note by their own names.
   - The browser's own: a dropdown is a `<select>`; dialogs; tooltips.
2. "Index" set aside: the code's search index holds the word. "Control"
   set aside: every button is one, and it is the ⌃ key's name. "Popup"
   set aside: a panel pops up too.
3. The code takes the names (`GotoToolbar`, `FormatToolbar`,
   `ReplaceToolbar`, `.menu`, `menuRows`, the open slot `screen.opened`,
   no `card` for bookmarks or shortcuts); the old names are retired words
   in `tools/vocabulary.ts`. The icons' tooltips: "Bookshelf menu",
   "Commonplace menu". No chord for either menu.
4. The menus act as menus: every opening selects the first row, shelf
   headings passed over, the focus in the menu; hover moves the one
   highlight; ↑ ↓ wrap over the rows and the acts at the foot; Home, End;
   Enter opens or acts; the selected row kept in view; Tab closes; Escape
   returns the focus where it was before the opening; typed letters
   (about a second apart at most) jump to the first row with a word
   starting so.
5. The selected row looks as a search result's does (A of three mocked,
   https://claude.ai/artifact/UGNdWR84563XofzJFwk9bs); the search results
   take the one-highlight rule too.
6. Placement unchanged: the review mock read every menu below the alert
   area, with one and two alerts, scrolled, beside each masthead row and
   at 640 px.
7. Two commits: the words, then the keys test-first.

## Record

- Keys before (MEASURED, a headless probe over the backup's 53 authors and
  13 commonplaces): a click left the focus on the icon; ↓ scrolled the
  page; the first row was the 13th Tab (12th in the commonplaces); Escape
  from a row dropped the focus on the body.
