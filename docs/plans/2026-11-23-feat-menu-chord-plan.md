# ⌃⌘J round the menus and the Go to row; the open menu's icon reversed (U13)

Asked 2026-11-23: "I do want key-chords for opening the bookshelf menu and
opening the commonplace menu." Fifteen letters are taken under ⌃⌘ and F is
Helium's full screen; B and C, the natural letters, are bookmarks and the
entry link. Tried as a spike (`tools/out/spike/jcycle.html`, built in a
scratchpad worktree) before the build: "That looks really good."

## Decisions

1. ⌃⌘J goes round: the bookshelf menu, then the commonplace menu, then the
   Go to row, then nothing open; from anything else open, the bookshelf
   menu. Chosen over a ⌃⌘J prefix (⌃⌘J then R, B or C) and two free letters.
   Overrides the menus plan's "No chord for either menu".
2. The open menu's icon is reversed: the masthead's cream (`--bar-ink`) as
   its ground, its green (`--bar-bg`) as the icon. Option A of three
   mocked (`tools/out/mocks/menuIcons.ts`); gold set aside as a new colour.
   The icon carries `aria-expanded`, which the steps read.
3. The ▾ beside the two icons goes: "it's an icon, it's clear that clicking
   on it will do something."
4. The journal icon doing something in parallel is B8, another story.

## Record

- 16:34 The spike: HEAD plus the j chord, five presses played headless on
  an empty store; then option A and no ▾ added, the icons read by
  `aria-expanded` at each press.
- 16:55 `jRound` in `menuModel.ts`, test-first; the Masthead test for
  `aria-expanded` and no ▾, failing first; main.ts's `roundTo`.
- 16:58 Help, the glossary and CLAUDE.md say ⌃⌘J goes round. The steps
  that opened the Go to row press ⌃⌘J three times (`openGotoRow` in the
  kit); "menus" reads the round, ⌃⌘J over the help panel and an icon
  clicked (`R.round`).
- 17:00 The verdict differed in two hunks only: the Go to row's two
  readings relabelled and the round's nine; approved. `npm run verify`
  passes.
- 17:08 Accepted. `/code-review high 0beccfe..184b71e` started; the
  architecture run waits for the stories that follow this one (asked: "I
  think there will be other stories here, so deferring the arch review
  until after that").
- 17:13 A19, `/code-review high 0beccfe..184b71e`: 111,752 tokens (the
  transcript's last message). Five findings, all fixed: the round's menu
  area unread at 1400 px (now read in "menu area": the top line holds at
  each press); `openGotoRow` presses until the row is open, four at most;
  help's bookshelf sentence; a test title naming the ▾; main.ts's chord
  comment. No mechanical class among them, so no checker owed.
