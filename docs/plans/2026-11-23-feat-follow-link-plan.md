# ⌃⌘Enter follows the link at the caret (U15)

Asked 2026-11-23: "What if ⌃⌘J if the caret is on a link follows the
link?" A link was followed only by a mouse press (`links.ts`).

## Decisions

1. ⌃⌘Enter, not ⌃⌘J: on a contents page the caret is nearly always on a
   link (Metamorphoses holds 15 links in 20 lines, Ovid 2 in 4), so ⌃⌘J
   would stop opening the menus there. Enter already opens a menu's row.
2. The caret inside a link or at either edge of it counts; between two
   links, the one after it.
3. A link to an entry is followed in this tab, as a plain click; any
   other in a new tab, the key having no modifier to spare for elsewhere.
   A link to the entry already open says "already here", as a click does.
4. The rendered view only, with the editor focused; elsewhere, and away
   from a link, the key does nothing.

## Record

- 17:40 `linkAtCaret`, `keyAction` and `followLink` in `links.ts`,
  test-first; the session's chord table takes "enter". Help's keys table
  and its links paragraph.
- 17:44 "launch, menus, the corner, links" plays ⌃⌘Enter inside a link,
  just after one, away from one, on a link to itself and on an external
  link (a new tab); the verdict differed only in those readings,
  approved.
- 17:58 A21, `/code-review high dfa0eea..2fe290e`: 108,963 tokens (the
  transcript's last message). Six findings:
  - ⌃⌘Enter in the search box, the shortcuts or bookmarks panel said to
    follow a link once the text took the focus: not reproduced. In the
    search box it neither picks the result nor follows (played: the row
    stays open, no tab); the lists ignore a modified Enter. The chord now
    acts only on a press made in the text all the same.
  - An address `new URL` refuses is not followed (it threw).
  - A selected passage follows nothing; help says so.
  - The chord comment pins the ⌃⌘Enter reading; the reader pressed it in
    Helium in the hand-check before the accept.
  - CLAUDE.md's layout names what `links.ts` now holds.
  - A link to an in-page address that names no entry is routed, as a
    click already did: help now says "within Gesta", and the tests use
    entries' addresses.
