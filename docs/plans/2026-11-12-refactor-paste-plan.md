# The paste decision, one module

## Why

Candidate 2 of the first `/improve-codebase-architecture` run (2026-11-12):
the rendered view's paste decided by private functions in editor.ts, with no
node test, where all three terminal-paste fixes (2b90ab0, 58d3d8a, 7040a94)
landed; the source view's terminal route a second copy of the rule.

## Measured before choosing (2026-11-12)

- editor.ts imported 14 names from paste.ts; editor.test.ts had no paste
  test (MEASURED, grep).
- The routes, in order (READ): a picture; a link over a selection; a
  reference in a line; line breaks alone; a terminal's copy outside code;
  any HTML to ProseMirror; markdown blocks; anything else to ProseMirror's
  plain paste.
- ProseMirror's own plain paste (READ, prosemirror-view `doPaste`) sets a
  single-node slice in with `replaceSelectionWith` and tags the transaction
  `paste`/`uiEvent`; the terminal fallback used `replaceSelection`, untagged.
  No plugin in src/ reads either tag (MEASURED, grep).
- The view's own `handlePaste` runs before a plugin's (READ, `someProp`):
  the reference block's paste guard runs only when ours declines, its
  filter catching the rest. Noted, not changed.

## Decided (the reader, 2026-11-12, by grilling)

1. One module decides what a paste becomes for both views, today's order
   kept, no behaviour change intended.
2. A pure decision over the state, the clipboard's flavours and the page's
   address: a transaction (and a refusal to say), a picture, nothing, or the
   editor's own paste.
3. The terminal fallback built as ProseMirror builds its own plain paste.
4. The source view asks the same module, keeping its `execCommand` insert.
5. The copy half split into copy.ts.
6. Tests through the interface, descriptions kept.
7. The interface: `clipboardOf`, `pasted`, `pasteProps`, `sourcePasted`;
   `keepsSpaces` left exported, an internal seam over a DOM node.
8. `copyProps()` from copy.ts; the copy tests in copy.test.ts.

## Record

- Built as decided, one change to (2): plain text that is not blocks is
  built by the module too, as ProseMirror's own plain paste (the same
  function as the terminal fallback), so "the editor's own paste" is HTML
  alone (and an empty clipboard). Without it the tests of plain-text pastes
  could not go through `pasted()`. Brought to the reader.
- Q3's test was written after the module, not before: it passes, not seen
  failing first.
- paste.test.ts through the interface: 35 of 36 passed on the first run.
  "a pasted reference lands as its markdown" read the label alone
  (MEASURED): its caret stood at the end of a line with words, where the real
  paste takes the label-in-line route; the old assertion read
  `pasteSlice`, a path no paste with that caret reaches. The caret moved to
  an empty line, where the description holds. Brought to the reader.
- Twenty-four assertions that a route declined (`toBeNull`) now state what
  the paste becomes through the next route, each read (MEASURED, a probe).
  The joining rule's string tests go through `sourcePasted`, the joined
  text itself.
- Every changed file Code Health 10, copy.ts and
  copy.test.ts new at 10; the approved Helium run unchanged (corner, order,
  bridge, reader ok, MEASURED).

## The batch's review

Recorded in docs/plans/2026-11-12-refactor-passage-plan.md, "The batch's review".
