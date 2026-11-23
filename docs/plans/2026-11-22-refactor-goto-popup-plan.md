# One name for the popup ⌃⌘G opens: the Go to popup (U12)

Asked 2026-11-22: "'line bar' is a funny name ... the goto popup?"; "it's
only go-to-line if it's verse"; "goto popup ... describes what the popup
actually does, rather than what information it gathers"; "(a) as U12,
first"; "if it's the Go to row, probably it should be the Go to popup".

## Decisions

1. ⌃⌘G's popup is the Go to popup, named for what it does: it goes to a
   line, a page, a paragraph, a verse or a stanza.
2. ⌃⌘J's masthead row keeps its label and is the Go to row; its files are
   GotoRow.svelte, gotoRowModel.ts, gotoRowActs.ts, so no file named only
   goto means either. src/editor/goto.ts stays, the popup's logic.
3. "line bar" is retired, and the popup's own files call it the popup,
   not the bar; the format bar and the shared --bar-* colours stay.
4. Done before U10, so U10's alert ids take the new name.

## Record

- Before (grep over src/, tools/, one-offs/): 76 linebar, 69 lineBar, 14
  "line bar", and compounds; 42 linebar in the approved copy.
- Nine files renamed; `bar()` → `popup()`, `BarLabels` → `PopupLabels`,
  `from: "bar"` → `"popup"`; the help's ⌃⌘G line names the Go to popup.
- `tools/vocabulary.ts` `popupByOldName` refuses line bar in any form.
- GLOSSARY.md defines Go to row and Go to popup.
- Helium: 18 lines changed, each only `rows linebar` → `rows goto-popup`
  (MEASURED: every removed line, renamed, equals its added line).
