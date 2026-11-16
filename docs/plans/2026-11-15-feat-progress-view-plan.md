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

## The slideshow (asked)

- A frame at the day's start, every clock half hour after it and at the
  last event: 12 for today, 09:26 to 14:21. One page: a slider with the
  frame's time, ← and →, play every 5 seconds, Pause that turns to
  Resume (and to Play again at the end).
- Each frame marks a row reported since the frame before "new", a row
  whose label changed "was …", and each count's change, e.g. (+2).
- Rows appear where they belong, the tables growing in the middle: the
  growth is what is watched (asked; open to revisit).
- A strip above: done, in progress and unstarted at each frame, the
  frame on screen outlined, a bar a click away.
- `page.ts --slides`, `tools/progress/slides.ts`; published at its own
  link on request.

## The phase's review and scan (12f5ac1..74552f4), A2

Review 118,897 tokens, scan 117,581 (transcripts). No behaviour change found
in the three src/ refactors.

- Fixed (A2.1): a replay applies events in time order (a backdated one
  was lost from earlier frames); `--approx` takes no word after it; the
  slideshow's arrows step once with the slider focused (played in Helium);
  a spawned item moved to another list still counts under what spawned it;
  an event naming no list, no item the day knows, or a day not begun is
  refused, nothing written; a stop or drop without a note keeps the note;
  splitKey beside entryKey in keys.ts (A2.4), the surface no longer
  importing the exporter; page.ts's header its usage line alone.
- Two commit subjects were 73 characters: tools/commitSubject.ts, for a
  commit-msg hook (asked, the hook added by hand); over the last 40 commits
  it refuses three (MEASURED).
- Scan: one place that knows what a label means (A2.2, Strong) to grill;
  the entry layer's cache read-only through its interface (A2.3, Worth
  exploring) refused, asked: a scan over that code raises it again.
- A2.2 built (asked): events.ts says once which labels are open, under
  way and done, the lists there are, and which items count (a moved copy
  not); log.ts reads a day's log for page.ts too. The two "paused" paths
  that had no test (carried into a new day; the strip) pinned. Both pages
  drawn the same as before, byte for byte (MEASURED).

## The day in order (P8, P10)

Mocked up from the day's log (P8), then built as it is to try for a few
days (asked).

- A span runs from a start to its stop, done, drop or move; a restart is
  a span of its own; a start on an open span is not a second one.
- A parent's took is its own time, its spawned items' spans taken out,
  the whole span under it (asked); a span inside another it did not spawn
  is not taken out, so the took column can sum past "working for".
- Every gap of a minute or more is a row (asked: no threshold), so
  working and the gaps together are the day.
- A span open at the end runs to now on the day itself, or to a
  snapshot's time; the slideshow has no such section.
- `tools/progress/spans.ts` holds it, no HTML; `today` and `clock` moved
  to day.ts so page.ts reads the clock without importing log.ts.
- Each slideshow frame ends with the day in order as it stood at its
  time (P11, asked); a frame before any span has none. The terminal copy
  has none (asked: fine).
