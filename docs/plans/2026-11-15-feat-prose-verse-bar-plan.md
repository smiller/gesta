# ⌃⌘G asks a work of prose and verse for a Verse Line or a Prose Paragraph

## Why

Vita Nuova holds prose and verse in one entry; its bar asked a single Line
box that counted the prose's sentences as lines, while a reference names
the prose by paragraph.

## Decisions (asked)

- Under `prose by paragraph, verse by line`: "Verse Line ____, or Prose
  Paragraph ____" where a chapter holds both; "Paragraph" alone where it
  has no verse; "Line" alone where it has no prose.
- The Line box counts verse lines only; the Paragraph box the paragraph a
  reference names (the numbering ⌃⌘R reads). The model is the Line-or-Page
  bar already on Charles Williams's books.
- The references themselves (prose without "prose", verse by its poem's
  first line): B5.1, not built here.

## Record

- Built test-first in goto.ts (the bar's labels, the paragraph box, verse
  lines alone) and carried to the bar; the Help says so. Played in Helium:
  "Verse Line, or Prose Paragraph" shown, Paragraph 1 and Line 2 each
  landing in its own form; the approved run's one change.
- Seen by hand, both boxes filled and the last typed obeyed: in a bar
  joined by "or" (here, and Line-or-Page while it stands), typing in one
  box empties the other (asked). Played: Line 2 typed, Paragraph empty.
