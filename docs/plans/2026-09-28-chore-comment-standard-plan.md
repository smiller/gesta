# The comment standard, its audit and its checker

Opened 2026-09-28. CLAUDE.md holds the standard IN FORCE; this is the
plan and THE RECORD: the measurements behind it, the decisions, and one
dated section per batch.

## Why

The review passes found a comment asserting another module's mechanism
on 2026-09-12 (the citation batch), 2026-09-22 (the grid) and in four
passes over the contents folds and the remembered place (2026-09-28).
CLAUDE.md named `../writer/tools/claims.sh`'s port as owed.

## Measured before choosing (2026-09-28, a scratch prototype)

- Ten comment blocks read out of the review-fix commits as the class
  (four of the ten INFERRED from the record's descriptions rather than the
  reviewers' words).
- claims.sh's shape — a causal connective and another module's identifier
  — catches 2 of the 10; flags 25 of today's 981 blocks; over the last 80
  commits touching src/ it fires on 13 (17 blocks).
- Any reference to another module — an identifier declared in another
  file, a file path, a role noun's possessive ("the session's") — catches
  5 of the 10; flags 111; fires on 44 of the 80 commits (102 blocks).
- The other five name the module only by a role in plain English ("the
  units walk", "⌃⌘G's landing", "the view", "whose own scroll"): no shape
  separates them from prose. The review stays the net for them.
- 7 of the 10 carried a record marker (a date, "the review", "the
  reader"): a rule that every comment say what it records would not have
  stopped them.
- Volume: 883 comment blocks added or changed over those 80 commits, about
  11 a commit; src/ holds 981 blocks, 3,038 lines, 18% of its 16,841.
- TypeScript 7 exposes no scanner to JavaScript (`ts.createScanner`
  undefined): the checker scans comments itself.

## Decided (the reader, 2026-09-28)

- The standard in CLAUDE.md: no comment by default; a decision, a
  measurement or a past failure only; nothing about another module; a
  contract between modules is a test; no provenance in comments; a pin
  named in the fixed form; no module header where the layout says it; an
  interface member's comment only where name and type cannot say it.
- More Helium steps and a longer headless run are accepted for comments
  that stay tight and in sync.
- The order: the sample (session.ts, store/nav.ts), the standard written
  down, the checker (the pins resolve; another module named; a ledger of
  every comment a commit adds or changes), then the rest of the audit,
  directory by directory.

## The sample — session.ts and store/nav.ts

The verdict sheet, second draft, read and passed by the reader: 70 blocks,
16 keep, 35 trim, 19 delete; of the 51 kept, 29 with an existing pin (5
INFERRED from the step's readings), 23 needing a test, 1 that cannot be
pinned (a performance choice), 2 pinned with a neighbour.

## Record

### 2026-09-28 — the sample applied: session.ts and store/nav.ts

- MEASURED: session.ts 65 comment blocks → 45, 188 comment lines → 109,
  643 file lines → 559, 43 pins named; store/nav.ts 5 → 4 blocks, 19 → 13
  lines, 5 pins. Provenance out of every comment (the reader: in the
  plan's record alone); contracts as tests (the reader: written as the
  audit goes).
- New pins: Vitest — `local.test` (`stored`, moved out of session.ts to
  src/store/local.ts, over a storage that throws or cannot be reached),
  `importFiles.test` › "a picture the import files is found where the
  entry looks" (the contract between the import and the rendered view's
  resolver, over `pictureKey`, now in store/names.ts and used by both the
  resolver and the paste). Helium — 25 new readings: the faulty entry
  opened (grid); the picture at the entry's end and the picture pasted
  then navigated away from (picture); the caret moved in the source, the
  swap from the top and scrolled away, ⌃⌘W in both views (source view);
  a jump within the open entry (search); ⌃⌘M then ⌃⌘. (walk); the growth,
  a place in a closed section, before and after the warm, a contents
  link before the warm, a forced entry's place (places); a new section,
  "entries left and renamed": an untouched page, a rename scrolled, a
  deleted entry's place, a refused clipboard. `?warm=slow` (main.ts)
  holds the warm two seconds, the one way a step opens a page before it.
- EVERY INFERRED PIN BROKEN ONCE (MEASURED): the mangled payload's nav
  test went red; the picture contract went red; the switch refusal's pin
  (whispered instead) went red. Two stayed GREEN and were re-aimed: the
  hold retirement (the step's caret moved by typing, which changes the
  text — a caret moved with no edit tells them apart: sound, back at
  "play on;"; broken, at "food of") and onSelect's timing (neither the
  toolbar step nor a keyboard selection catches a selectionchange-driven
  bar headless: marked unpinned). The rename's suspended saves: keys typed
  right after the rename click never reach the editor in either build,
  so the race cannot be staged: marked unpinned.
- Unpinned, with the reason in the comment: onSelect's beat, the owed
  highlight's race, the rename's suspension, the refresh's race, the
  unchanged place not rewritten (performance).
- FOUND by the audit (MEASURED, headless Helium):
  - "a picture at the entry's end gets a line below it, the caret there":
    the line is made, the caret stays beside the picture; the comment
    corrected to what is true, the behaviour a question for the reader.
  - Back from the source view with the caret out of sight, the window
    jumps to the caret ("⌃⌘M back, still scrolled away": false): the
    source's hold reports the caret seen, always (READ, holdViewCaret).
    The way in keeps the window (27px move). A question for the reader.
  - A refused clipboard: the current app pins "Couldn't copy the link
    (click to copy)"; the successor whispers it, the markdown only in the
    console. The one open difference against the current app's run; a
    question for the reader.
- The steps: 138 readings; the approved copy grew by 30 lines (25
  readings, 3 console lines, 2 lists that now name the two new pages).
- DECIDED by the reader, the same day, on the three questions:
  - An error message ends "(click to copy)", so it can be clicked and
    pasted into a bug report: the failed copy is now pinned (`stick`),
    and matches the current app's run.
  - Both directions of the view switch keep a reader who scrolled away
    from the caret: the textarea's caret is measured on a hidden twin
    that wraps as it does (`sourceCaretSeen`); "⌃⌘M back, still scrolled
    away" reads true, where the current app jumps (listed as decided).
  - The caret moves to the line made below a picture pasted at the
    entry's end — otherwise there is no way to write on after it;
    "a picture pasted at the entry's end" reads caretBelowPicture true,
    as the current app's run does.
  Each reading stood at the failing value before the change (MEASURED
  above) and at the passing one after.

### 2026-09-28 — the switch carries the text, not the offset

- FOUND by the reader in Helium: Book I, Canto i at its foot (stanza 55),
  ⌃⌘M showed stanza 45 in the source. And the question: shouldn't a test
  have caught it? It should have. "⌃⌘M scrolled away from the caret"
  read only the window's pixel offset, within 60px, on Twelfth Night —
  a short prose entry whose two views are nearly one height. It tested the
  comment's mechanism, not the screen: the rule CLAUDE.md keeps ("a
  headless step reads THE SCREEN after a gesture") was not followed.
- The reader's other sighting, back at stanza 1 on the way home, was a
  tab on a build from before the day's fix: after a refresh it came back
  at 55. Not reproduced headless over five set-ups (MEASURED).
- The reading first: a new section, "the switch carries the text" — a
  40-stanza canto switched at its middle (the stanza at the window's top
  in the rendered view, the source, and back) and at its end (the last
  stanza on screen in all three). On the code as it stood, MEASURED:
  20 → 16 → 20 and 39 → 32 → 39.
- The fix, session.ts: the switch reads the text at the window's top as a
  count into the leaving view's flat stream and sets it at the top of the
  view entered; the source's character geometry measured on a hidden twin
  (`sourceTwin`, shared with the caret's visibility). Two faults found on
  the way, each MEASURED: the rendered side read a point in the gap
  between stanzas as the stanza above (one early; both sides now take the
  first line at or below the masthead); and the two flat streams are not
  equal for fenced text — the source's holds every fence line, 18
  characters a stanza, 365 by stanza 21 — so the count is carried by
  `crossViewOffset`, the caret's own crossing (viewCarets.ts).
- MEASURED after: 20 → 20 → 20; the last stanza showing in all three;
  the reader's own Canto i at 1440×900, 53 → 53 → 53.
