# "Page" for a commonplace or any entry renamed

## Why

The pages refactor (2026-11-13) left "page" in comments, test titles and
Helium names for a Commonplace and for an entry of any kind, beside the
printed page.

## Decisions (asked)

- A Commonplace says "commonplace"; an entry of any kind "entry" or
  "sub-entry" (`subEntryOrder`, `subEntryDisplayList`,
  `subEntryNeighbors`, `hasSubEntries`, `renameSubEntry`).
- The panel listing the commonplaces or the bookshelf is "lists": class,
  overlay, Helium readings.
- Kept: an author's page, a contents page, the printed page, the browser's
  page, Playwright's page. No guard: the old sense is not coming back.

## Record

- 385c1ff, 8673d4f, 6db7913; the approved runs differed only by the
  renames, line for line (MEASURED); accepted.
- The batch review found three labels missed in the same sections ("its
  row's page typed into…", "the deleted page left for the day", "the
  pictures under the old page…"): renamed in the fix commit.
