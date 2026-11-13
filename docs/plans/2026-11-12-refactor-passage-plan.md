# The passage a selection makes, one module

## Why

The first `/improve-codebase-architecture` run (asked 2026-11-12, once per
batch beside `/code-review`): candidate 1 of seven, "the passage a selection
makes", its top recommendation. Candidates 2 (the paste decision) and 3 (the
⌃⌘G ask) follow, then 4–6 explored (asked).

## Measured before choosing (2026-11-12)

- The scan: 234,227 tokens (MEASURED, the last message of the scan's
  transcript: 2 input + 677 cache creation + 223,714 cache read + 9,834
  output), 56 tool uses, 347 s. Seven candidates; the report written to the
  session's scratchpad, `architecture-review-20261112-1641.html`.
- Three callers widened one selection three ways (READ): the reference
  `wordEdges(sentenceRange(sel))`, the column marks
  `wholeRows(sentenceRange(sel))`, the Ref (all) offer `wordEdges(sel)`. The
  rows' lines walked up to eight times per reference (`coveredUnits`).
- A live disagreement (MEASURED, a node probe over pairMarks.test.ts's Dante
  pair): a drag from the comma ending line 1 into "ritrovai" marks both
  columns of line 1; ⌃⌘R quotes line 2 alone.
- reference.ts (659 lines), pairMarks.ts, dualLanguage.ts: Code Health 10
  (MEASURED, `cs review`).

## Decided (the reader, 2026-11-12, by grilling)

1. THE RULE: a selection means the rows it lands in, whole, both columns; in
   a dual-language block also the Latin its sentence stands beside. ⌃⌘R
   quotes those rows, the marks show what they hold beyond the selection,
   Ref (all) is offered when they are in a block numbered on both sides —
   the one exception, where Ref quotes the translation column alone.
2. Only a word, or part of one, puts a row in the passage; punctuation or a
   space alone does not. The comma case: line 1 is left out, the marks
   change to match ⌃⌘R.
3. The comma case pinned first as a failing test; the restructuring makes it
   pass, no separate patch.
4. The module owns the whole reading: the rows, the refusal, one walk of
   their lines, the quotation.
5. Tests through the interface, their descriptions kept; the test-only
   exports gone.
6. `GLOSSARY.md` created, domain words only, starting with "passage";
   CLAUDE.md points to it; the retired-word test reads it.
7. `src/editor/passage.ts`; reference.ts keeps the reference's own parts
   (label, link, clipboard text, anchor).
8. One interface proposed, not designed twice.
9. `sentenceRange` moves into passage.ts.
10. A refusal marks nothing.
11. The comma case and (10) the only behaviour changes; any other difference
    — a test, a Helium line — stops and is brought to the reader. The
    hand-check covers every row kind.
12. The interface: `passageAt(doc, from, to)` → a `Passage` (the words
    quoted, the facing block, `lines({top, side})`) or a refusal;
    `quotation(p, how)`; `marked(p, from, to)`. reference.ts's label ranges
    read `p.lines()`.
13. A test whose expected text changes once the widening applies to it is
    brought to the reader, before and after.

## Record

- `src/editor/passage.ts` holds the reading, moved from reference.ts and
  dualLanguage.ts (`sentenceRange`) with its comments; reference.ts keeps the
  label's ranges (reading `p.lines()`), the highlight, the link and the
  clipboard text; pairMarks.ts reads `passageAt` and `marked`. The walk: each
  of its four views (top level or every depth, left or right column) walked
  at most once per passage, where a reference walked up to eight times
  (READ). The interface gained one member over the agreed sketch:
  `halves(u)`, which halves of an Old English line the passage inks, read by
  the label's half-line range and the quotation alike.
- The comma test failed before (MEASURED) and passes after; the suite 1479
  tests, every changed file Code Health 10, `passage.ts` new at 10;
  `payloadOver` fell to 9.38 (Complex Method, Complex Conditional) and the
  translation-alone choice was split into `quotedFor` (MEASURED).
- reference.test.ts through the interface: 64 of 66 passed on the first
  run; two read differently (MEASURED), brought to the reader: the leaf
  range now asserted as the label writes it ("p. 61", "pp. 61-62") where it
  was the `{from, to}` record; and `facingBlockOf(GOLDING, end7, b)` is
  null asserted on the selection as made, which a passage cannot say (it is
  read after the widening) — the line removed, `offersBoth` on the same
  selection still asserted true. Three `coversProse` lines removed, an
  internal the quotation beside each already pins.
- Behaviour beyond the comma case (READ): Ref (all) is no longer offered
  where ⌃⌘R refuses (a selection inside a margin-note in a block numbered
  on both sides), by decision 10.
- Helium: the approved run unchanged by the restructuring (MEASURED, corner,
  order, bridge, reader ok). No step read the marks on a pair, a block
  numbered on both sides or plain verse (MEASURED, a grep for
  `dl-covered`); a section "column marks" added, a mouse drag from closing
  punctuation on each kind, its eleven lines the corner run's only
  difference, order ok — held for the reader's approval.

## The batch's review (candidates 1–3, `ea6a8d8..75311de`)

- One `/code-review` at HIGH: 180,974 tokens (MEASURED, the last message of
  its transcript: 2 input + 402 cache creation + 178,098 cache read + 2,472
  output), 32 tool uses, 637 s. Nine findings; the ⌃⌘G move read as keeping
  its behaviour.
- 1–3, speed: `coveredMarks` and `offersBoth` worked out the whole passage,
  its two-block check walking every line, before their cheap tests; over a
  3000-line plain verse page selected whole, 16.1 and 15.7 ms a call
  (MEASURED, re-run of the review's script), on every drag step and, for
  the offer, every scroll. Fixed in passage.ts: the two-block check skips
  the walk where the span touches one block at most; 0.30 and 0.23 ms after
  (MEASURED).
- 4: `paragraphOf` copied into passage.ts and reference.ts; one now, in
  numbering.ts.
- 5: a terminal's copy with no plain text went to ProseMirror's HTML paste,
  each coloured run a paragraph; now nothing (test-first, failing first).
- 6: `plainPaste`'s comment claimed ProseMirror's own paste, which also opens
  a closed slice; the comment now says what it does.
- 7: ⌃⌘G in the markdown view walked the document before its words; the
  view checked first.
- 8: `Standing.asked` typed without the null the acts never hold.
- 9: `quotation`'s `column: "both"` never passed; `translation?: boolean`.
- All in one fix commit; the suite 1484, Code Health held, Helium unchanged.

## The batch's architecture re-scan

- `/improve-codebase-architecture`'s exploration over `ea6a8d8..51e7a6a`:
  160,171 tokens (MEASURED, the last message of its transcript: 2 input +
  1,660 cache creation + 154,342 cache read + 4,167 output), 29 tool uses,
  259 s. Its verdict: the three deepenings landed, small interfaces, thin
  callers, tests across the interfaces. Three small candidates: the
  facing-block rule split between passage.ts and reference.ts (`offersBoth` a
  pass-through, `quotedFor` and the no-translation refusal outside the
  passage); the passage's tests filed in reference.test.ts (29 of its pins
  resolve there, MEASURED); a page's leaves walked by folios.ts and
  reference.ts both, goto.ts importing each.

## The re-scan's candidates 1 and 2 (asked, 2026-11-12)

Decided by grilling: the passage answers what Ref and Ref (all) quote,
"no-translation" refusal included, and `reference.ts` stops choosing
(`quotedFor` and `offersBoth` go; the format bar reads the passage's
`facing`); `quotation(p, { halves, paragraphs, all })` returns `{ text }` or
`{ refused: "no-translation" }`; the refusals' words stay in reference.ts; the
passage's tests move to passage.test.ts with their pins; nothing on screen
changes.

- Built so. The split by what each test reaches through its helpers: 22 to
  passage.test.ts, 45 stay (MEASURED); the two Ref (all) offer tests
  rewritten onto the passage (`offered`: a passage whose `facing` is set),
  the margin-note one asserting `passageAt`'s refusal for
  `referencePayload`'s. Seventeen pins in passage.ts renamed
  `passage.test › …`, all 719 resolving.
- The suite 1488 across 130 files; reference.ts, passage.ts, formatBarActs.ts
  and both test files Code Health 10, passage.test.ts new at 10; Helium
  unchanged (MEASURED). Over the reader's own Golding Book 7 (the backup's
  file), lines 2–3 give the same Ref, Ref (all) and offer before and after
  the change (MEASURED, the change stashed and restored).
