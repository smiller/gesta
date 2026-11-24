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
- 18:18 A22, the confirmation pass, `/code-review high 2fe290e..41731a4`:
  80,455 tokens (the transcript's last message). Six findings:
  - A `javascript:` or `data:` address opened by ⌃⌘Enter or ⌘-click
    (before: ⌘-click alone): only http, https, mailto and file addresses
    open now, by either; an unreadable one by neither.
  - The "press made in the text" pin named a reading that reads the same
    without the guard: dropped, the decision left unpinned, no path
    reaching it being known.
  - Help says ⌃⌘Enter works in the rendered text, not the source.
  - The search step's wait says whether a hit was there.
  - Left: every ⌃⌘ chord the page answers is swallowed whether or not it
    acts, ⌃⌘Enter included; no control on the page answers ⌃⌘Enter.
- 18:35 A22.1, the architecture run over 0beccfe..33b6d54's 20 files
  (`tools/out/arch-files.txt`): its walk 141,994 tokens (the transcript's
  last message). Five candidates: 1 the menu decides "here" and "under
  here" from one address (Strong); 2 ⌃⌘Enter as an editor command beside
  the link click (Strong); 3 one table of the ⌃⌘ chords (Worth
  exploring); 4 the open menu's items built once (Worth exploring); 5 the
  app publishes what is open (Speculative). The ⌃⌘J round: no candidate.
- 18:42 Grilled (asked: "Let's explore 1 and 2", then "go"): the menu
  takes one port, the open entry's address; "is it" is the same entry,
  any line or search ignored, and a row for it chosen goes nowhere; the
  session's `goto` keeps comparing the whole address (a link to a line in
  this entry lands); ⌃⌘Enter becomes an editor command, swallowed in the
  text as today, with the new tab behind an opener given to the editor.
- 18:45 A22.1.1: `sameEntry` in nav.ts; MenuDeps' `isHere` and
  `holdsHere` become `openAddress`, both answers worked out in menuActs
  through nav.ts and tested there with a bare comma and `?line=5`. The
  verdict played whole and passed unchanged.
- 18:49 A22.1.2: ⌃⌘Enter is the editor's own key (`followAtCaret` in
  links.ts, installed by `keydownHandler` in createEditor beside the click
  handlers), over `LinkPorts`: route, and open for the new tab, which the
  session gives as `window.open`. The session's binding, its in-text guard
  and its second route closure are deleted. Command tests cover the route,
  the opener and the press away from a link; the verdict played whole and
  passed unchanged.
- 18:54 The run's other candidates (asked): 3 built now (A22.1.3); 4 kept
  on W (W2, with its files and friction); 5 dropped, to come up again if
  the code makes it stronger.
- 19:00 A22.1.3, grilled (asked: yes to one listener over one table, the
  table a module, help checked not drawn, swallowing unchanged; ⌃⌘I's help
  row in the reader's words). `src/ui/chords.ts` lists every ⌃⌘ chord:
  its key, help line, act, and whether the reader has it, ⌃⌘I and
  ⌃⌘Enter as the editor's. main.ts holds the one listener; the session's
  map and listener go, `switchView` joins its interface. A test reads
  help's table against the module: help lacked ⌃⌘I, now listed. The
  verdict played whole and passed unchanged, the reader's included.
- 19:18 A23, the confirmation pass, `/code-review high db735b9..d80134b`:
  103,941 tokens (the transcript's last message). Six findings:
  - ⌃⌘Enter outside the rendered text was no longer swallowed: the page's
    listener now swallows the editor's two keys too, every chord in the
    table being swallowed. In the source view the markdown was kept
    either way (played).
  - ⌘-click on an address that may not open fell to ProseMirror's
    select-this-node: the whole paragraph selected, the format toolbar up
    (played). The press is now taken on any link.
  - The ⌘-click hint is left off a link whose address will not open.
  - "Ctrl-Mod-" is Ctrl alone off macOS: ⌃⌘Enter and ⌃⌘I now say
    "Ctrl-Meta-". A mechanical class, so `tools/chordSpelling.test.ts`
    checks src/ (2 hits before the fix; it caught both with the two files
    put back).
  - The opener's test resolves a relative address, as its title says.
  - Comments that spoke of other code: reworded or folded into the
    header.
  - F5: the order run read "grid" otherwise once (the corner's "saved"),
    a section this does not touch; the next play passed.
