# A day's progress, visible

## Why

About four hours of commits on 2026-11-15 and no way to see them against the
day's starting lists: items were added to the side list and a new list of
bigger questions while the work went on, and the order and number of items
kept shifting (asked: "I have no idea what we've accomplished").

## Decisions (asked; the mock-up's shape answered as it was edited)

- A day's events in `docs/progress/<day>.jsonl`, one per line, committed
  with the work: any earlier day's view can be recreated from its file.
- `tools/progress/`: `events.ts` replays a day to a time and answers each
  item's state, pure; `page.ts` draws it; `log.ts` appends an event, stamped
  with the time, as it happens.
- Events: begin (yesterday's open items carried in, the numbers' next
  values), add (number, list, parent, title), start, stop, done (commits),
  move (to another list, a new number), drop. The labels are worked out
  from them: unstarted, in progress, done, done with spawned items open,
  moved, dropped.
- An item's number is its list's letter (A architecture queue, S side list,
  L for later, B bigger questions) and its place in the tree, fixed for its
  life, across days; a list's items stay in the order they were reported.
- The page: a section a list, a row an item with reported, started and
  committed times and its commits, spawned rows hung from their parent;
  starting items carry a "starting item" label and a bar down the left,
  unstarted rows a tint; two count lines, the starting items and what was
  spawned or added since, each by list.
- A snapshot: the page as it stood at a time (`--at HH:MM`). Later, a
  slideshow of the day at half-hour steps, built from snapshots.
- Written to `tools/out/progress/` (ignored) and opened from `file://`;
  published to the artifact's link at each break; a snapshot published on
  request.
- Today's log written after the fact from the mock-up's data, its
  approximate times marked; from the next session on, every event as it
  happens.

## Record
- Built test-first: `events.ts` (the replay, the labels, the counts),
  `log.ts` (the next number, a new day's beginning, the command; a second
  begin on a day refused: it carried the items in twice), `page.ts` with
  `page.css` (the mock-up's styles, the indent by depth).
- Today's log, 59 events, written from the mock-up: the page drawn from it
  matches the mock-up's counts, 10 at the start, 16 added (MEASURED). Its
  numbers corrected the mock-up in one place: A1.2.1.1 is the notices' owed
  record (reported 10:06), A1.2.1.2 the card-copy race (≈10:22).
- Notes on the page name items by number, never by a description (asked).
