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

### The review — 2026-09-28, /code-review at HIGH over a31427a..054af51

- COST: 126,373 tokens (the run's report), 5 min 23 s, 24 tool uses. Ten
  findings, its cap. The reviewer also resolved every pin in the touched
  files: all resolve; "bridge" and "console" were outside the documented
  form, which now names them.
- NOT FIXED, wrong: the forced entry's "wait for the stray line" loop
  "does not wait" — each `A.stored` call waits 800 ms (READ, the adapter).
- FIXED, each reading red on the code before (MEASURED) and green after:
  - a failed copy's pin silenced every later whisper, a successful copy's
    too: a copy that lands releases it ("⌃⌘C again, the clipboard back":
    was the pin, now "Link copied");
  - the switch into the rendered view set the text by its box alone: a
    closed section's text had none ("a closed section's text switched
    to": was no section open, now Book 3 open, its text in view), and a
    page growing after the switch drifted it ("⌃⌘M back, then 400px grown
    above": stanza 18, now 20). The switch's place is now held and
    remembered as an arrival's is, through applyPlace;
  - a switch near the top set the first character under the masthead:
    near the top now stays at the top ("⌃⌘M from 20px down": back at 72,
    now 0);
  - main.ts and backup.ts read localStorage bare at boot, and a page with
    its site data blocked never drew ("a page opened with its site data
    blocked": no entry, now page/Horace) — through `stored` now;
  - `pictureKey` had split entryFile from its comment; the export built
    the picture key by hand (`pictureIn`, shared with `pictureKey`);
  - two new comments lacked their pins; three new step comments carried
    dates.
- The closed-section reading's first gesture was wrong: it scrolled the
  source by counting lines, and the Filler paragraphs wrap — it stopped in
  Book 2. It measures on a wrapping twin now.

### The confirmation pass — 2026-09-28, /code-review at HIGH over 054af51..972dc9d

- COST: 102,519 tokens (the run's report), 3 min 58 s, 15 tool uses. Nine
  findings, under its cap.
- FIXED:
  - the near-the-top guard read the LEAVING view's count; a source top
    just above its first fence's text maps to rendered count 0 — the
    guard is on the arriving count now, in both arms;
  - the switch's remembered place paired a rendered position with the
    source's offset: the rendered offset is taken after the place is set
    ("the switch's place remembered": false with the old order, true now,
    MEASURED);
  - a caret that was seen now wins over the switch's held place, which
    the mount's resize re-applies a frame later (the re-apply MEASURED
    live, counted on the switch back). UNPINNED: the old behaviour stayed
    green on a canto, a heading page and a page of pictures (MEASURED) —
    no step's page has shown the caret leaving view;
  - copies settling out of order: only the latest copy's outcome touches
    the pin (unpinned: two writes no step can order);
  - UNREADABLE IS NOT EMPTY: `readRaw` (undefined when the storage cannot
    be reached, null for an absent key) and `writeRaw` (false, never a
    throw) in store/local.ts, tested; main.ts's shortcuts and bookmarks
    read through it — a refused read is the bookmarks card's unreadable
    state, never a first run seeding the defaults — and every backup hint
    goes through it, so a refused localStorage costs the mirror's
    signature, not every run; `stored` built on the two;
  - the storage reading claimed "site data blocked" and read the other
    tab's screen: it is "a page opened with localStorage refused" now,
    with the blocked tab's own screen, and says IndexedDB still answers;
  - the new comment on copy() asserted the notices' behaviour: reworded
    to its own code's decision.
- The approved "⌃⌘M from 20px down" still reads source 25: at 20px down
  the first line sits half under the masthead, and the first WHOLE line
  is carried — the text rule, not the guard's case.
- A further confirmation pass over 573fcff was offered at about 100k and
  SKIPPED on the reader's word. The day's review runs, summed from the
  three plans' records: nine (seven at high, two at medium), 829,228
  tokens; the folds and remembered-place chain alone ran six.

### 2026-09-28 — step 3: the checker

- THE FOUR INFERRED KNOWN-BAD BLOCKS, checked against the reviewers' own
  words in the transcripts (READ): three CONFIRMED — reference.ts "the
  units walk numbers top-level blocks alone" (the 7d24ba2 review: "the
  mechanism claim about numbering.ts the review named, moved rather than
  removed"); numbering.ts "the gutter folds this over the top level" (the
  420a712..f2313ef and 7d24ba2 reviews: "blockUnits' comment asserts what
  lineNumbers.ts and reference.ts do with it"); main.ts "the landing sets
  no selection" (the d1deeb7..7539133 review: "main.ts:542 and
  folds.ts:102 assert that setLanding 'sets no selection'"). One NOT
  confirmed: session.ts "the open sections are drawn with the view"
  (e81e417) — the fix rewrote it, and no finding named it. It is out of
  the self-test, which holds NINE.
- BUILT: `tools/commentRules.ts` (the scanner — strings, template
  literals and their interpolations, regex literals, a component's
  markup, script and style, a stylesheet; the pin resolver; the
  other-module rule; the diff's added lines), `tools/comments.ts` (the
  run), `tools/commentRules.test.ts` (35 tests: the nine known-bad
  blocks verbatim, six real quiet ones, the scanner's and the pins'
  cases). `npm run test:comments`, under `verify`.
- A PIN RESOLVES, by its head: a Helium section — the section in
  helium-steps.mjs holds the reading label as a string literal, AND the
  approved run has a line `<label>: ` (so it ran); `bridge` — a literal in
  helium-bridge.mjs and a line of bridge.approved.txt; `console` — a line
  of the approved run's console, its level aside, beginning with the
  text; `<file>.test` — a test, it or describe title in that file
  beginning with the text. A Helium or bridge label is the WHOLE label.
- FOUND by its first run (MEASURED): two pins in session.ts named a
  truncated label, "walk › ⌃⌘. from 3pr1"; the reading is "⌃⌘. from 3pr1
  over an index of 3pr1, 3m1, 3pr2". The pins now name it whole. All 64
  pins resolve.
- EACH RULE BROKEN ONCE (MEASURED): the regex arm off, the role noun's
  owner ignored, a label matched as any substring, the approved-run
  check off — each turned exactly one self-test red.
- MEASURED, the rule over the nine: 5 caught (paste.ts "the clipboard's";
  folds.ts's header, foldsContents, store/contents.ts and "the
  session's"; foldState.ts "the session's", and later "placeState.ts";
  numbering.ts "the gutter's"), 4 missed (reference.ts, folds.ts and
  main.ts on the landing, session.ts's highlight's own scroll) — the
  prototype's figure.
- MEASURED, the tree: 1,050 comment blocks in 156 files (the prototype
  read 981 in 151: this scanner reads the stylesheets, help.html and
  every trailing comment too); the sweep lists 138 naming another
  module — 100 with a path (most of them the old app's files in port
  provenance), 23 with a role possessive, 29 with an identifier.
- MEASURED, the replay over the last 80 commits touching src/: the
  ledger holds 858 blocks; 49 commits would have failed, on 119 blocks.
  The gate is strict by decision (no waiver); a block MOVED counts as
  added (INFERRED from the diff, where a moved line is an added one), so
  moving code whose comment names another module fails until the audit
  has cleared it.
- The run costs 0.3 s over the working tree (MEASURED `time`).

### 2026-09-28 — the provenance rule

- DECIDED by the reader, on the question the checker's report left: dates,
  the reader and the reviewer are recorded in docs/plans alone, so the
  checker refuses them in an added or changed comment block, no waiver.
- MEASURED before the rule's words were chosen, over today's 1,050
  blocks: 242 dates (all but one provenance — a sub-page name quoted as
  an example, so a date inside quotes or backticks does not count); 31
  blocks naming the review, the reviewer or a confirmation pass, all
  provenance; 24 with "the reader", most of them the app's user in a
  sentence about behaviour ("until the reader's own wheel") — the phrase
  is refused whole, and such a sentence says "a reader"; 38 with
  "asked", most of them prose ("the depth asked for"), each one
  recording provenance carrying a date as well (READ, the list) — so
  "asked" is not checked.
- BUILT: `provenance` in tools/commentRules.ts, three tests (the markers
  verbatim from the tree, the quiet cases, a pin's text not the
  comment's), each red before the rule (MEASURED) and after two breaks
  (the quote strip, the pin strip: each turned its test red). The run
  fails on it as on the other-module rule; `--sweep` lists 245 blocks.
- MEASURED, the replay over the last 80 commits touching src/: 76
  commits would have failed on it, 279 blocks. A probe file carrying
  "(the review, 2026-09-28)" failed the run with exit 1; the clean tree
  exits 0.

### 2026-09-28 — step 4 begins: src/model audited

- ASKED by the reader with the go-ahead: the comment checker in the Stop
  hook, so it runs before any review. `hooks/**` is denied to the agent:
  the patch is drafted for the reader to apply (`hooks/stop.sh` runs
  `npm run test:comments` after tsc and the suite), and
  `tools/hooks-test.sh` gained the case "src/ moved, the comment checker
  red: blocked", RED against today's hook (MEASURED: 1 of 44 failing)
  until the patch lands.
- src/model first: the smallest directory, no DOM, its pins all Vitest.
  MEASURED: 130 comment blocks → 91, 359 comment lines → 254, 61 pins;
  the sweep lists nothing in src/model (it listed 21 naming another
  module, 36 carrying provenance). Module headers the layout covers went
  (schema, grammar, tokens); port history, dates, "the reader", the
  review, and every clause about another module (the serializer, the
  numbering, the stylesheet, the source view, search) went; each kept
  decision, measurement or failure names its pin.
- NEW PINS, each red once on a broken rule (MEASURED): schema.test.ts
  (new) — every node that draws itself reads itself back (a note's
  parseDOM removed), a grid read back only with data-n (the guard
  removed), the card guard's selector and toDOM, and `card+` refused by
  prosemirror-model (MEASURED: the Schema constructor throws "Only
  non-generatable nodes (card) in a required position"; the test pins
  the library's refusal, so it stays green when the real schema is
  changed — a `card+` there throws at import instead); parse.test — the
  other marker kind opens a sibling list (the break removed), a fence's
  lang drops its backticks (the replace removed), a pipe row with no
  divider is a paragraph (not broken: the rule's break is an endless
  loop); roundtrip.test — a fence holding a backtick line (escalation
  removed: three tests red), a break in a row's cell written as a space
  (the collapse removed), a list item's empty continuation line written
  unindented (the guard removed); flatten.test — flattenText's own test,
  the one before it sitting in viewCarets.test.
- Two test titles lost their provenance ("(the 2026-09-12 second
  confirmation pass: …)", "(the block's closing review, 2026-09-12)").
- Kept UNPINNED: the table cell's "inline, never blocks", image src
  never resolved here, the folio as content, the block-shaped list line
  left unindented, flatRange's fail-safe, the marker parsing to NaN, the
  table's two skipped lines.

### 2026-09-28 — src/store audited

- MEASURED: 330 comment blocks → 284, 1,061 comment lines → 943, 154
  pins (the kept blocks carry most of the old app's measurements, so the
  lines fell less than the model's; each gained its pin). The sweep lists
  nothing in src/store (it listed 70 blocks there). The whole tree's
  sweep: 138 naming another module → 74, 245 carrying provenance → 138.
- Out, as in the model: module headers the layout covers, port history
  ("ported … from ../writer/…", "the current app …"), dates and "(the
  review)", and every clause about another module — the masthead, the
  pages dropdown, the import walk, the reconcile, the picker, the
  notices, "for byName's sake". Kept: every measurement (tagged MEASURED,
  its date dropped) and every decision a later change could break.
- FOUND by the audit and fixed, behaviour-neutral (READ, then the suite):
  the folio alphabets were spelled TWICE, in src/model/grammar.ts and
  src/store/folio.ts, whose own comment said "spelled once" — folio.ts now
  re-exports grammar's, keeping FOLIO_CHARS_RE, and grammar's spelling
  carries the decisions both held; the pin given grammar.ts in the model
  batch named folio.test, which then tested the other copy, and is true
  now. src/store/shortcuts.ts declared its own LINE_BREAK_RE beside
  grammar's "ONE spelling of what counts as a line break": it imports
  grammar's.
- The checker caught two of the audit's own rewordings (a comment naming
  FOLIO_ONE after the move, one saying "for byName's sake") and two old
  trailing comments naming readRaw/writeRaw and oneEach.
- Pins to another directory's test where the contract lives there:
  search.ts's shared fold (highlight.test › what selectionLink minted,
  findHit lands on), names.ts's importTarget and the backup's deletes
  (plans.test › reconcilePlan: … a stranger's files stay), store.ts's
  picture path (importFiles.test). One test title lost its date
  (searchIndex.test).
- Kept UNPINNED: the numeralDivisions measurement ("Books 1–25"), the
  backup factory's decisions (backup.ts has no test file), WRITE_BYTES'
  Chromium measurement, zip's host byte and mode, the export's yield
  size.

### 2026-09-28 — src/editor audited

- MEASURED: 322 comment blocks → 293, 993 comment lines → 831, 118 pins,
  many of them Helium readings (reference paste, grid, card copy, list,
  contents folds, launch) where the behaviour is only on a screen. The
  sweep lists nothing in src/editor (it listed 52 blocks there).
- Out, as before: headers the layout covers, port history (the old app's
  file names, "the README's rule", "the current app's …"), dates and
  "(the review)", and clauses about another file — fit.ts, main.ts,
  paste.ts, richCopy.ts, the stylesheet, the router — each either cut or
  said as this code's own decision. Four of the audit's rewordings named
  another module and the checker caught each ("the schema's list_item",
  "the gutter's reserve"; fit.ts's "main's own padding", the <main>
  element, reworded to say so; and three "the serializer's" in tests).
- FOUND by the audit (READ), fixed without a behaviour change:
  editor.css declared `.page .landed { background: var(--flash); }`
  twice, the second under an obsolete comment ("the jump is phase 3's;
  the class is named now") — the second copy is gone; rowKeys.test's
  title said ⌃⌘N for the command bound to ⌃⌘I (⌃⌘N is "new") — the title
  now says ⌃⌘I. Test titles lost their provenance: five in
  reference.test ("the shapes the 2026-09-12 confirmation pass
  measured: …"), one in paste.test.
- MEASURED: the stripped-of-comments diff of src/editor against HEAD is
  the one CSS line and the test titles, nothing else.
- FOUND, FLAKY, not the audit's (MEASURED): the reading "a forced entry
  left scrolled, returned to" read stayed:false once in three runs of
  the Helium verdict on this tree (the other two, and the verify after,
  true). The tree's code is unchanged but for a rendered-view CSS rule;
  the reading is in the source view. Owed: a look at why the source
  view's held place can miss, with the run that caught it.

### 2026-09-28 — src/chrome, main.ts and session.ts audited: the audit's end

- src/chrome, MEASURED: 147 comment blocks → 133, 493 comment lines → 414.
  The component headers were port history round a decision or two (the
  old app's file names, which the other-module rule reads as paths);
  the decisions stay, the history goes. screen.svelte.ts's header said
  the "every opener closes the others" rule "will live here when the
  panels arrive" — they arrived; the rule is on the panel field, pinned.
  Interface-member comments that restated their type went. One describe
  title lost "(2026-09-27)".
- main.ts, never audited before (the sample took session.ts): 64 blocks
  kept 64, 229 lines → 221 — the wiring's comments speak of its own
  code; the header's phase history, the dates, "(the review)", "the
  reader" and four role possessives went ("the landing's typed text"
  meant the entry landed on after a delete, not the landing mark).
  session.ts: its five "the reader" became "a reader", and "the warm's
  count" the entry count.
- THE WHOLE TREE, MEASURED: 1,050 comment blocks → 924, 3,288 comment
  lines → 2,824, 436 pins, all resolving. The sweep: 0 blocks name
  another module, 0 carry provenance (138 and 245 before the audit).
  What the sweep cannot see is still there where it was: a module named
  only by a role in plain English ("the units walk", "the view") — four
  of the nine known-bad blocks were that shape, and the review stays the
  net for it.
- FOUND: THE HELIUM VERDICT IS FLAKY (MEASURED). On the final tree, 4 of
  10 runs differed from the approved copy — "a forced entry left
  scrolled, returned to" read stayed:false three times, and "with
  ?corner=pill" drew no pill once; 3 runs on HEAD (2cd89d4) all passed.
  The two trees build a BYTE-IDENTICAL dist/index.html (sha256
  a72c16cd…, MEASURED), so the page under test is the same and the flips
  are timing. The forced entry's reading had flipped once on the
  src/editor batch too. OWED: why the source view's held place can miss,
  and whether the pill's step waits on the launch run; until then a
  commit's pre-commit may need a second run of verify.

### 2026-09-28 — the flaky Helium verdict, found and fixed

- "a forced entry left scrolled, returned to" (MEASURED, traced frame by
  frame in the places section alone): the place left is y 900; the
  failing arrivals landed at 873 and stayed. 873 is 900 less 27, and 27
  is Horace's masthead (111px) less the forced entry's (84px): the place
  was restored under the masthead of the entry arrived FROM, the masthead
  then shrank, and the browser's scroll anchoring moved the window with
  the text. The held place's ResizeObserver watched the editor mount
  alone, so nothing set it again. A step that shrinks the masthead under
  a held place reproduced it EVERY time (stayed:false, 3 of 3) — the new
  reading "a held place, the masthead shrinking under it".
- FIX, session.ts, two parts, each measured: the observer watches the
  whole page (document.documentElement), which the held place's own rule
  ("set again whenever the page under it changes size") already said —
  the new reading green, the forced entry 1 in 10 still false; and the
  browser's scroll anchoring is OFF while a place is held
  (overflow-anchor: none on the root, back on release) — 12 of 12 true.
  Held, the app owns the window's position; anchoring could only fight
  it.
- "with ?corner=pill" was the STEP's race, not the app's (READ): the pill
  is set after the launch's backup run, which ends after the warm the
  step waited on. The step now waits for the pill, its timeout swallowed
  so a missing pill still reads as missing.
- The new reading is the successor's alone, listed in
  corner.differences.txt ("the current app keeps no place").
- MEASURED after both fixes: the whole Helium verdict ok in 8 runs of 8
  (4 flips in 10 before). The stripped-of-comments diff: session.ts's
  held place (setHeld, the observer on the page), the pill step's wait,
  the new reading.

### The review — 2026-09-28, /code-review at HIGH over the held-place fix

- COST: 94,721 tokens (MEASURED from the transcript's last message: 2
  input, 969 cache creation, 87,650 cache read, 6,100 output), 3 min
  52 s, 12 tool uses. Seven findings.
- FIXED, each reading red on the code before it (MEASURED):
  - the hold let go only on a wheel, key, pointer or touch, so a scroll
    no hand made — the browser's find — stayed held and snapped back on
    the next resize: the hold now lets go on any scroll landing where the
    code did not put the window. New reading "a held place, then a scroll
    no hand made": kept:false 10 of 10 before, true after.
  - the masthead reading could not tell the page-wide observer from
    anchoring off: a rendered-view reading was added ("a held place in the
    rendered view, the masthead shrinking under it", the row under the
    masthead read mid-column — the place reading's 40px-in sample falls in
    a verse page's gutter and names the block's first row wherever the
    window is). Then MEASURED: with the observer back on the editor mount
    and anchoring off, every reading held, the forced entry 10 of 10 — so
    the page-wide observer came OUT: anchoring off is the whole fix, and
    with it the reviewer's two-observers-on-the-root finding goes.
  - a pin mid-comment: the pins are trailing again.
  - the step's masthead clamp is undone in a finally.
- NOT FIXED, with the reason: the restore running before the masthead
  settles (root cause) — with anchoring off a masthead changing height
  moves the text and its own bottom edge together, so the row under it
  stands (MEASURED, the rendered reading with the mount observer); the
  hold bounding anchoring-off indefinitely — the hold now ends on any
  move a reader makes, a scroll included.
- MEASURED: verify exit 0, 149 steps, 0 open.
- MEASURED on the final code: the whole Helium verdict ok in 4 runs of 4.

### 2026-09-28 — the second pass: restatement cut

- ASKED by the reader, after the audit came to 14% of comment lines net:
  measure what a harder cut would take, then do it, directory by
  directory, one commit each, unattended overnight.
- MEASURED before: 384 pinned blocks (1,757 lines) — by word overlap with
  the pinned test's title, 18 at ≥0.6 and 32 at 0.4–0.6, nearly all
  restating by reading; a sample of 30 below 0.4, 5 wholly and 4 partly
  restating. 355 unpinned blocks in app code (827 lines) — a sample of 30,
  13 saying what the next line or its name says. Estimate ~550 lines,
  range ~350–750.
- THE RULE for this pass: a comment goes when it only restates what its
  pinned test's title says, or what the code, its names or its types
  already say; a sentence goes when the rest of its block carries the
  reason. A comment stays when it holds a MEASUREMENT, a FAILURE, or a
  reason the test and the code cannot hold — why a rule exists, what a
  plausible "simplification" would break. Comments in tests explaining
  their own setup stay; svelte-ignore directives stay.
- src/model, MEASURED: 93 blocks → 65, 262 comment lines → 190 (28
  blocks gone, one trimmed); the stripped-of-comments diff empty. Gone:
  the comments saying what their test's title says (a note is a row, the
  stanza number is required, no backtick in a lang, the other marker kind
  opens a sibling list, …) or what the code says (the first pipe or -1,
  the content column or -1). Kept: every measurement, every failure, and
  the reasons a test cannot carry (why ⟨line⟩ rides on the row, why the
  escaping rules may not change, why fenceStart must not read a stanza).
  Section dividers kept, like the svelte-ignore directives.
- src/store, MEASURED: 284 blocks → 258, 943 comment lines → 884 (26
  blocks gone); the stripped diff empty. Fewer than the estimate's share:
  the store's comments are mostly the old app's measurements and the
  backup's reasons (why the archive goes first, why a delete needs the
  shared signature), and those stay. Gone: restatements of a test's title
  (the folio label, a rename carrying a place, the relabel of a minted
  link, the neighbour walks) and of the code (a label as link text, the
  unanchored date source).
- src/editor, MEASURED: 293 blocks → 242, 831 comment lines → 703 (51
  blocks gone, two trimmed to their reason); the stripped diff empty.
  Gone: the row keys' Enter cases, the stanza range's spellings, the
  folio switch, the lineNumbers classes, the format acts and the goto
  helpers — each what its test's title says — and code restatements
  (wrapIn, BOUND, "ceil each column, then add", the side box). Kept: the
  fit's measurements, the focus-before-scroll rule, the reference cut's
  failures, the stylesheet's measured reasons.
