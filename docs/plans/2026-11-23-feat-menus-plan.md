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

Times are the progress log's or a commit's; "~" marks one read off the
conversation.

- 2026-11-22 22:48, started. Keys before (MEASURED, a headless probe over
  the backup's 53 authors and 13 commonplaces): a click left the focus on
  the icon; ↓ scrolled the page; the first row was the 13th Tab (12th in
  the commonplaces); Escape from a row dropped the focus on the body.
- ~22:55, the review mock of the states:
  https://claude.ai/artifact/UGNdWR84563XofzJFwk9bs.
- 2026-11-23 08:23, grilled to the words (Decisions 1-3).
- 08:59, the words, 3d80430: 65 files; the Helium verdict re-approved,
  every changed line a rename (MEASURED: the approved copy with the
  renames applied, diffed against the run).
- ~08:50, asked mid-build: the open menu covers Ovid's two columns ("push
  all the text to the right by the width of the menu"), and the two
  menus' widths differ ("make them the same width"): natural widths 237
  and 199 px (MEASURED). ~09:05 mocked:
  https://claude.ai/artifact/5Khh6uPddSBhgxBmuVk7dA.
- 09:01, 5bca4bd (P15): U8 had shown unstarted, its carry holding no start.
- ~09:15, decided after the mocks: room made only where the menu would
  cover the text (A′), from 900 px wide; one width, 240 px; the acts at the
  foot in the accent green, italic, under a rule (d,
  https://claude.ai/artifact/XnH7mpLLsJ4xgMteEwE4CB).
- ~09:15-09:50, built: src/ui/menuModel.ts (items, keys, letters typed,
  the room) and src/ui/Menu.svelte; fit.ts's leaveRoom writes
  --menu-room and the page, the fitted measure and the grids read it; the
  session's holdTop carries the line at the window's top across the
  reflow (the ⌃⌘M carry).
- The pointer selects by MOVING, not by entering a row: the search
  results drop under a pointer at rest, and a row under it was taken for
  the top match.
- Found by probe: the menu was taken down before its focus hand-back
  read where the focus was; it had fallen to the body. Read as a focus
  to give back.
- Found by the verdict: ⌃⌘H over an open menu opened help and shut it, the
  menu's leaving closing the slot help had taken; only a menu still open
  is closed by it now.
- Helium, section "menus" (MEASURED, two plays alike): room 288 px on
  Ovid 1, the text from 32 to 320 and back, the top line held both ways;
  no room at 860 px; the caret back after "Maec" on Escape, Tab and the
  icon again. The whole verdict re-approved: the menus hold the focus,
  hand it back on closing, and a click outside lands on the moved text.
- 10:00, asked after the look ("let's not count stop words like 'of' or
  'the'"): a small word inside a name is passed over, the name's first
  word counting whatever it is; "o" goes to Ovid, not Hildegard of Bingen
  (MEASURED, the probe over the backup's bookshelf).
- 10:20, the batch review (A17), `/code-review high 416e511..HEAD`:
  202,763 tokens (its transcript's last message), 7 findings, all acted
  on in one fix commit:
  1. One menu opened over the other kept its selection, letters and
     scroll (the component was never taken down): reset on the name.
  2. The rename moved "the bar did not show" to "the toolbar did not
     show", and S6.1's watch could never wake: S6.1 watches the new words,
     and tools/progress/watches.test.ts fails on an open watch no tool can
     print (MEASURED: one hit, S6.1, before the watch was moved).
  3. The room read the page's edge alone; a grid and a margin note hang
     left of it: the leftmost drawn of them is read, and margins.ts sets
     a note clear of the room (MEASURED: three cards at 1400 px, 288 px of
     room; Donne's notes at 1500 px clear of the menu).
  4. A focus handed back to a control that closed under the menu went
     nowhere: only one still shown takes it.
  5. A resize with a menu open kept the room read for the old width: a
     window resized closes the menu (chosen here: a Mac menu closes so).
  6. The act by index and two predicates sat in components: menuActs,
     isMenu and givesFocusBack in menuModel.ts, with tests.
  7. BackupsPanelDeps was renamed BackupsOpenerDeps by the rename
     script's /PanelDeps/: restored.
- 10:46, A15.1.2 (the A15.1 architecture run's candidate 5, asked: "fold
  it in to the fixes"): shelvedRoots(ns, keys, shelvesMd, open) in
  src/store/shelves.ts, beside rootGroups, for the Go to row, the search
  scope and the menus; the two numeric localeCompare sorts become
  childrenOf's byName, the same collation with a tie-break.
