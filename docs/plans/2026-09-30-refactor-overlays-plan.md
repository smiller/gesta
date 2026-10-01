# Which overlay closes which

Opened 2026-09-30, candidate 4 of the architecture scan (its record:
`2026-09-30-refactor-surface-and-place-keeper-plan.md`). This is the plan
and THE RECORD.

## Why

Each opener in `src/main.ts` closes its own subset of the others, by
hand, at its own site (READ, main.ts at 5d5718e):

| opening | panel | search | Go to | line bar | ⌃⌘L lines |
|---|---|---|---|---|---|
| search | ✓ | — | | | |
| Go to | ✓ | | — | | |
| ⌃⌘G line bar | ✓ | ✓ | ✓ | — | |
| ⌃⌘L lines | ✓ | | | ✓ | — |
| help | (replaced) | ✓ | | ✓ | |
| bookmarks, shortcuts | (replaced) | ✓ | ✓ | ✓ | |
| backups | (replaced) | ✓ | | ✓ | |
| pages, bookshelf | (replaced) | | | | |
| a navigation | ✓ | ✓, its query dropped | ✓ | ✓ | |
| the source view | | | | ✓ | |
| Escape | ✓ | ✓ | ✓ | ✓, the caret handed back | ✓ if open |

The rule exists nowhere but in these sites; one comment, on Go to, gives
a reason for one column ("the row itself covers nothing, so an overlay
opening leaves it alone").

## Decided (the reader, 2026-09-30, one round, at night)

1. STRICTLY PRESERVED: the module encodes this table, its blanks with it;
   the approved Helium run unchanged. The blanks that look like accidents
   are listed below as questions, decided apart.
2. `src/ui/overlays.ts`: the table and `open(row)`; each overlay keeps its
   own open and close code in main.ts and hands the module its closer.
   Vitest reads the table row by row over fake closers.
3. Each row keeps today's ORDER of closes: closing search or Go to hands
   focus back to the editor, and Escape's line-bar close hands the caret
   back.
4. The three document-click handlers stay out: they say where a click
   lands, not who displaces whom.
5. Built overnight: tests first and run red, then the module, verify, a
   commit; no design-it-twice; no review before the reader's look and
   accept. A surprise stops the work and leaves a note.

## Questions for the reader (the blanks, not decided)

- Help and backups leave Go to open; bookmarks and shortcuts close it.
- Search and Go to open over each other, each closing only the panel.
- ⌃⌘L's lines row is closed by Escape alone — no panel, no navigation.
- Pages and bookshelf, opened, close none of the OTHER overlays —
  search, Go to, the line bar, ⌃⌘L's lines — while help and backups close
  search and the line bar. (Every panel replaces whichever panel is open:
  one slot holds them all, so help gives way to pages or the bookshelf.
  The reader saw that on the look, 2026-10-01, and it is as it should be;
  the question is the other overlays only.) As used, search closes too:
  pages and bookshelf have no chord, so they open only by a click, and a
  click outside the search row closes it (main.ts's document click
  handler, outside the table by 4) — Go to, with no such handler, stays
  (the reader's look, 2026-10-01). So the effective difference from help
  and backups is Go to, the line bar and ⌃⌘L's lines.

## Batch 1 — the table (2026-09-30, overnight)

- Tests first: `src/ui/overlays.test.ts`, six, run red with the module
  absent (MEASURED: "Cannot find module"), then green.
- `src/ui/overlays.ts` 29 lines: the table and `open(row)`. Seven
  closers, not four: Escape closes the line bar through its caret
  hand-back where every other row closes it plainly, and a navigation
  drops the search's query between the panel and the search (READ,
  main.ts). The module is built at main.ts's top level, beside Escape's
  handler, reaching the closers through `acts` as Escape always did —
  before boot every `acts` is a stub, so Escape closed only the panel
  then, and still does. `acts` gains `search.drop` and `lineBar.dismiss`.
- main.ts 927 → 934 lines (MEASURED, wc): the table and its wiring cost
  more lines than the inline closes; what moved is the rule, into one
  place under test. The calls that close an overlay's OWN row (a pick, a
  jump, the click handlers) stay where they are (4).
- The Go to comment's sentence on what its opening dismisses moved to the
  table, where the rule now lives.
- `npm run check` clean; the suite 76 files, 675 tests; the comment
  checker passes; hooks 44/44; Helium corner ok, bridge ok, 0 open
  (MEASURED).
- AWAITING the reader's look and accept, then one /code-review at high
  over b672058..HEAD (the two renames ride in it).
