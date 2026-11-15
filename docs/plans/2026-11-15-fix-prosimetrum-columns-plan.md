# Verse and prose paired in one entry share their English column

## Why

In Vita Nuova the verse's English started left of the prose's: paired
prose takes two 24em columns, while paired verse's original is fitted to
its widest line and starts past its line numbers. MEASURED in headless
Helium on chapter 12: prose English at 521px, verse English at 505px.

## Decisions (asked)

- The verse's English moves to the prose's: its original column takes at
  least the width that puts it there (`edge` in the fit's measurement);
  the prose and the verse's original start stay.
- A verse whose original is wider keeps its width; nothing wraps to align.
- Any entry with paired prose and paired verse, not the prosimetrum
  directive: only Vita Nuova's 28 chapters today (MEASURED, grep).
- After: chapters 12, 13 and 19 each one column (MEASURED). The Helium
  section "prose and verse paired" reads it; on the old fit it read 426px
  against 521px.
