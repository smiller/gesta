# The ⌃⌘G ask, one module

## Why

Candidate 3 of the first `/improve-codebase-architecture` run (2026-11-12):
goto.ts answered single questions, thirteen exports one caller used, while
the order of the decisions lived in lineBarActs.ts, untested; five of eight
recent ask changes touched both (the scan's count, a0d23d4, e476646,
efbf461, ce79b13, b00f819), and b00f819 was a link to a line drifting from
the bar.

## Measured before choosing (2026-11-12)

- goto.ts 200 lines, thirteen functions exported for lineBarActs.ts and the
  tests; lineBarActs.ts 248 lines, no test file (READ, MEASURED wc).
- In the acts (READ): a stanza page's ask first, a lettered label, the
  number check, a paragraph under the by-paragraph directive or a line, the
  noun "verse" under scripture, the cycle over the last ask and the landing
  mark, the landing word said, or an omitted line's alone from a link; the
  Page box's check and leaf; the Line box's label and the "no … numbers
  here" and "Switch to the rendered view" words; what is said shown 2000,
  3000 or 2500 ms.

## Decided (the reader, 2026-11-12, by grilling)

1. One module answers every ⌃⌘G ask — the Line box, the Page box, a link's
   `?line=` — from the document, the conventions, the words typed and where
   the reader stands; the acts keep the screen side. No behaviour change.
2. The bar's words move in: the boxes, the label, the words where nothing
   can be asked.
3. The module pure; the cycle's last ask held by the caller.
4. The answer names what kind of thing is said; the acts keep each one's
   time on screen.
5. The conventions a plain record, `{ paragraphs, verses }`, built in the
   acts from the journal, so candidate 4 can later supply it.
6. Tests through the interface, descriptions kept; no new node test for
   the screen side, which the Helium sections play.
7. The interface: `bar(doc, c)` and `ask(doc, c, box, typed, standing,
   from)`; `AskKind` stays exported for the screen state.

## Record

- Built as decided, with one change to (7): `bar` takes the document as
  `Node | null`, the session's view being null in the markdown view (READ,
  session.ts `live`), where the bar's "Switch to the rendered view" words
  are still asked for.
- The acts keep one choice of their own: a bar re-asked on an entry that
  answers neither box shows both, rather than hiding the box under the
  focus.
- goto.test.ts through `ask` and `bar`: 37 of 38 passed on the first run;
  the one failure was the test's own reading of a leaf marker's text (it
  has none), the landing asserted instead. Where a test read a hit count or
  a block ordinal it now reads what successive presses say and where they
  land; `askedLabel`'s refusal of `50b` on a page with no labels now reads
  as the Line box's "50b is not a line number". Two tests added: the bar's
  words under each convention, and a link's landing saying only an omitted
  line's word.
- The suite 1483 tests; goto.ts, goto.test.ts and lineBarActs.ts Code
  Health 10; the approved Helium run unchanged (corner, order, bridge,
  reader ok, MEASURED).

## The batch's review

Recorded in docs/plans/2026-11-12-refactor-passage-plan.md, "The batch's review".
