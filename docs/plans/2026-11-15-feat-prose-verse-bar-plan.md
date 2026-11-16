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
- The references (B5.1, asked): the prose by its paragraph alone, "3, para
  4"; a poem by its first line, the original where paired, a closing
  comma, semicolon or colon dropped: "3, A ciascun’alma presa e gentil
  core, 1-4". Of the backup's 31 poems one opens on a guillemet (37,
  «L’amaro…, MEASURED), so a worded range opens on any letter or opening
  quotation mark.

## Record

- Built test-first in goto.ts (the bar's labels, the paragraph box, verse
  lines alone) and carried to the bar; the Help says so. Played in Helium:
  "Verse Line, or Prose Paragraph" shown, Paragraph 1 and Line 2 each
  landing in its own form; the approved run's one change.
- Seen by hand, both boxes filled and the last typed obeyed: in a bar
  joined by "or" (here, and Line-or-Page while it stands), typing in one
  box empties the other (asked). Played: Line 2 typed, Paragraph empty.
- B5.1 built test-first; played: Vita Nuova 12's second verse line
  "…, 12, Ballata, i’ voi che tu ritrovi Amore, 2", its prose "…, 12, para
  1"; the approved run's one change.
