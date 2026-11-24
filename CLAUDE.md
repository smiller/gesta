# Gesta

Gesta: a journal and bookshelf in one page, the editor on ProseMirror and
the UI on Svelte 5, built by Vite into ONE `index.html` that opens from
`file://`. The `../writer` version it replaced is not maintained and its
data is never read.

This file holds what is IN FORCE. Why each rule exists, and the
measurements behind it, live in THE RECORD: `docs/plans/`, one dated plan
per piece of work with its decisions and a record of what was built and
measured; a rule below names its plan where one exists.

## The process in force

- REPORTING — what is SAID about the work, which no checker reads:
  - Every factual sentence is tagged MEASURED (naming the command), READ
    (file:line) or INFERRED. One that fits none of the three is deleted,
    not hedged.
  - No connective tissue: a sentence written to make another one land is
    cut. Fabrications sit in those, never in a number.
  - A rate, an interval or a trend needs two dated readings and the gap
    between them.
  - Hand over the artifact, not the claim: a command and its output, a
    probe to paste, a file:line.
  - A command to paste sits in its own code block, nothing after it, on
    ONE line of 60 characters at most: a copy that wraps picks up two
    spaces at the break and fails. A file to copy in is put at a short
    path first (`tools/out/`, gitignored), never named by the scratchpad's.
  - Report who found what, exactly.
  - A reply's first and last sentences carry something not already in it,
    or they go; a restated fact is the commonest filler.
  - A correct criticism is never softened into a position to be contested.
  - The object is the best version of the project, not being right about
    it.
- THE COMMENT STANDARD (record: docs/plans/2026-09-28-chore-comment-standard-plan.md):
  - NO COMMENT BY DEFAULT. One stays only if someone changing this code
    would get it wrong without it, in a way the code, its names, types and
    tests cannot prevent: a DECISION, a MEASUREMENT, a past FAILURE.
  - It speaks only of the code it sits on. Nothing about what another
    module does; a CONTRACT between modules is a test, written when found.
  - No provenance: dates, "the reader", "the review", "asked" live in the
    record alone.
  - A failure or decision a test can check is PINNED, in a fixed trailing
    form, one group per pin: `(pin: <section> › <reading label>)` for a
    Helium step, `(pin: bridge › …)`, `(pin: reader › …)`,
    `(pin: console › <line prefix>)` for a console line of the approved
    run, `(pin: <file>.test › <title prefix>)` for a Vitest test.
  - No module header where the layout (`docs/LAYOUT.md`) says what the file is; an interface
    member's comment only where its name and type cannot say it.
  - A comment MOVED with its code into another module is re-read against
    this standard before the commit: what was its own module's mechanism
    may be another module's where it lands.
- A CHANGED COMMENT IS READ BEFORE IT IS COMMITTED: `npm run test:comments`
  fails while the ledger of added or changed blocks is unread; each block is
  read against the standard, fixed if it fails, and `npm run comments:read`
  records the ledger. A promise like the accept, not a proof.
- THE COMMENT CHECKER, `tools/comments.ts` (`npm run test:comments`, under
  `verify`), over src/ with its tests and the daily tools/ (not
  one-offs/): it FAILS on a pin that does not resolve, and on an added or
  changed block that names another module (an identifier another file
  declares at its top level, a file path, a role noun's possessive such as
  "the session's") or carries provenance (a date outside quotes, "the
  reader", "the review", "the reviewer", a confirmation pass, "the plan");
  the app's user, in a sentence about behaviour, is "a reader". It prints
  THE LEDGER. `--commit R` reads one commit; `--sweep` lists every block
  that breaks either rule. It catches six of the fourteen known-bad blocks;
  the review stays the net for a module named only by its role in prose.
- A TEST'S DESCRIPTION STATES THE RULE; the exact forms live only in its
  assertions. `npm run test:titles`, under `verify`, lists tests whose code
  differs from HEAD under the same description; each is read against its
  assertions, fixed if out of step, and `npm run titles:read` records it.
- THE WORD IS "REFERENCE", for what ⌃⌘R makes and every part of it, in
  code, tests, help, tools and replies; a label is a link's text;
  `one-offs/shelfLines.ts` calls a typed attribution a "source line".
  The band at the top is THE MASTHEAD and its rows masthead rows; "header"
  is a table's first row.
  ⌃⌘J goes round THE BOOKSHELF MENU, THE COMMONPLACE MENU and THE GO TO
  ROW, to another entry; ⌃⌘G THE GO TO TOOLBAR, to a
  line, page, paragraph, verse or stanza in this one, by no older name.
  The masthead's two icons open THE BOOKSHELF MENU and THE COMMONPLACE
  MENU; the go to, format and replace TOOLBARS work on the entry in front
  of you; help, backups, bookmarks and shortcuts are PANELS; a dropdown is
  a `<select>`.
  ⌃⌘M switches between MARKDOWN MODE and HTML MODE, the entry's two
  views; "source" is where a reference or a line comes from.
  `tools/vocabulary.test.ts` fails on a retired word in src/, tools/,
  one-offs/, this file or the glossary; dated plan records keep their words.
- THE DOMAIN'S WORDS are in `GLOSSARY.md`, the file
  `/improve-codebase-architecture` reads: things a reader of the app would
  recognise, never how the code does them; a word is added when a design
  names it.
- CODE HEALTH 10, AND HELD THERE (record:
  docs/plans/2026-11-11-chore-code-health-plan.md): every TypeScript file
  under src/ (tests included), tools/ and one-offs/ scores CodeScene's Code
  Health 10, and no change lowers one. `npm run test:health`, under
  `verify` and the Stop hook, scores each file that differs from HEAD and
  refuses one below its HEAD score, or a new one below 10, naming its
  smells; the Stop hook's refusal is the loop. A CLI that cannot measure
  fails `verify` but lets a Stop through; sign it in with
  `! ~/Library/Caches/codehealth-mcp/MCP-*/cs auth login`. Primitive
  Obsession and String Heavy Function Arguments are OFF
  (`.codescene/code-health-rules.json`): they read spelling, not safety;
  every structural rule stands at CodeScene's default, and that file is
  never edited to quiet a structural finding. `.svelte` is not scored.
  While restructuring, `cs review <file>` or the MCP's
  `code_health_review` reads a file's smells.
- HELIUM IS THE TRUTH: Sean runs Gesta in Helium (`/Applications/Helium.app`,
  a Chromium fork) from `file://`. Every real-behaviour question is
  answered there; a synthetic event proves only that a handler is reachable.
- HAND-CHECK STEPS ARE ACCURATE BEFORE THEY ARE HANDED OVER. Each step
  names the entry and its kind (a page, a book, a journal day); every
  control by its label on screen; every key, Enter and Escape included; the
  expected result as what is SEEN; and what the step does NOT cover. Its
  expected words, lines and counts come from that entry in the backup
  (THE CORPUS, below), never from a fixture or seed that shares its name.
  Every step a probe can play is played headless first and its expectation
  is MEASURED; a step not played says so. A step no hand can reach (a
  forgotten store, a failed write) is named as the tests', not handed over.
- A VISIBLE CHANGE IS DESIGNED BEFORE IT IS BUILT: every state it can
  show is mocked on the real page, side by side (idle; one and two of a
  kind; scrolled; beside each bar, list and dialog that can be open), and
  the reader picks before any code is written; a choice still open is
  asked with its mock, never built to be looked at. Record:
  docs/plans/2026-11-22-feat-notices-apart-plan.md (U5 took about four
  and a half hours, the design moving some fifteen times in code).
- A HELIUM READING READS THE APP'S STATE, NOT ITS PIXELS: what a step
  checks the app publishes (`data-*` on the root, e.g. `data-alerts`),
  and the reading reads that; positions and drawn text are read only in a
  section that exists to check layout. A reading that a clock or a layout
  can change is a flaky reading.
- WHILE A DESIGN IS MOVING, PLAY ONLY THE SECTIONS IT TOUCHES (`STEPS=`);
  the whole verdict runs once the design holds, before the hand-over, and
  only after the comment and title ledgers are read: an edit after it,
  even to a comment, plays it again (record:
  docs/plans/2026-11-23-feat-menus-plan.md). A run is waited on by its own
  word that it has ended, never a loop that can match itself.
- TEST-FIRST, AND VERIFIED: new behaviour is built test-first (`npm test`,
  Vitest), and `npm run verify` (tsc, the suite, the checkers, then the
  headless tools under their verdict) passes before work is called done.
- THE HELIUM VERDICT: `npm run test:helium` plays the steps
  (`tools/helium-steps.ts`) and compares the whole run, scrubbed, against
  `tools/expected/corner.approved.txt`. `--approve` makes the run just
  played the approved copy: a judgement made after reading the whole diff,
  never to quiet it. It does not play again, and refuses a run with a
  failed section, a run of some steps, or one whose inputs moved since it
  played. A `.received.txt` is never committed. A PASSING RUN IS NOT
  REPLAYED: `tools/heliumStamp.ts` fingerprints what a run reads, and a
  run with the same fingerprint prints "ok — not replayed"; `STEPS=` always
  plays. The comparisons with the `../writer` version, in Helium and in
  the corpus tool, are retired; git history has them.
- A FLAKE WAKES ITSELF: a Helium step that fails now and then goes on F
  (flaky tests) with a watch only its failure prints, set when it is
  added: a failing line, or `section read otherwise — <section>`, which
  the verdict prints for each section a failed run reads otherwise. A
  failed run's print is kept under `tools/out/helium-failed/`.
- REVIEWS, BY BATCH: ONE `/code-review` at HIGH over a commit range when a
  batch touches a DOM seam (main.ts, session.ts, editor.ts, paste.ts,
  htmlMode.ts, markdownMode.ts) or closes a phase, never per commit,
  with THE ARCHITECTURE RUN beside it, both after the accept. How each is
  run, its findings fixed and its cost recorded: `docs/REVIEWS.md`, read
  when one is owed.
- THE GATE: no review-shaped call while `src/` or `index.html` has moved
  past the last acceptance. Finish the work, make the suite green, tell the
  reader what to look at, and STOP; they run `! sh hooks/accept.sh` once
  they have looked, and `hooks/pre-review.sh` (PreToolUse on Skill, Agent
  and Workflow) refuses the review skills, any Workflow and a review-shaped
  Agent until the tree's signature matches. The agent asks whether the tree
  is accepted with `sh tools/accepted.sh` alone. `hooks/**`,
  `.claude/settings.json` and the accept script are permission-denied to
  the agent.
- THE TEST GATES: `hooks/stop.sh` refuses to end a turn while `src/` or
  `index.html` differ from HEAD and tsc, the suite or the checkers are red;
  `hooks/pre-commit` (`core.hooksPath hooks`, set once per clone) runs
  `npm run verify` before any commit. `tools/hooks-test.sh`, under
  `verify`, asserts every hook's exit codes over a throwaway repo and reads
  the wiring from this one.
- COMMITS follow Conventional Commits v1.0.0
  (https://www.conventionalcommits.org/en/v1.0.0/): a subject line
  `type(scope)!: summary`, the type one of build, chore, ci, docs, feat,
  fix, perf, refactor, revert, style or test, the scope optional, `!` for a
  breaking change, the whole line 72 characters at most; then a blank line
  and a body with the detail (what changed, what was measured, "asked");
  then the trailers (`Co-Authored-By:`).
- DEPENDENCIES: `node_modules` carries the Dropbox-ignore attribute; a
  clean reinstall runs `mkdir -p node_modules && xattr -w com.dropbox.ignored 1 node_modules`
  FIRST. Versions are pinned exact (`npm install --save-exact`).
- STORAGE: names live OUTSIDE `page750.*` (every `file://` page shares one
  storage origin); the `../writer` version's databases are never read; data arrives by
  import of the export folder.
## Rules the plans set that later work keeps

- Headless Helium is `--headless=new` by executable path, wrapped in a
  kill. A storage question is answered through playwright-core waiting for
  the attribute, never a `--dump-dom`. The tools use their own profiles
  under `tools/out`, and a lingering headless process is killed by its
  profile name, never by the app's.
- A `.svelte` component never shares a stem with a `.ts` module (the disk
  is case-insensitive). svelte-check is not installed; a component is
  checked by its compile and its test. A decision in a component moves to
  a module, where CodeScene scores it and a node test reads it.
- Every ⌃⌘ chord was carried from the `../writer` version or asked for (⌃⌘I "italic, but a
  line", ⌃⌘N "new"). Whether Helium passes a chord through is answered
  only by pressing it there; every new chord is named for a hand to try.
- A headless step reads THE SCREEN after a gesture (the entry, the
  selection, the bar, the corner), not only the bit the feature promises;
  and a step's wait never swallows its timeout: the reading carries what
  the corner said, matching or not.
- The stored text is markdown, the field `md`; a save is serialize and
  compare; an entry the model refuses is shown in markdown mode, never edited as
  a lossy document.
- EVERY HELIUM SECTION STARTS FRESH: storage, clipboard and dialog answers
  cleared and the fixtures seeded before each. A section needing an entry,
  a bookmark list or a shortcut table writes it itself (`writeAll`, `keep`
  in the kit); reading what another section left is the failure; a race a
  reading depends on is held by the step. The verdict's `order` run plays
  the steps last first, and a section reading otherwise than in the corner
  run fails `verify` (`tools/heliumOrder.ts`); the remedy is the section's
  own setup.
- THE ROWS OF A TEXT BLOCK ARE NOT ALL ONE SHAPE. In `::: dual-language`,
  row X is a `.vpair` whose English cell runs down beside the rows after
  it, which are `.vrow:not(.vpair)`, with no English cell; a split line's
  rest (`⟨…⟩`) has its own English or none; plain paired verse has rows
  with no `|`; a block numbered on both sides has rows with nothing on the
  left; a stanza counts its own lines. Anything that acts on a row is read
  in Helium on every kind it can land on, and the report says which kinds
  were played.

## Where things are

Tests sit beside their modules as `*.test.ts`; Vitest also reads
`tools/**` and `one-offs/**`. THE CORPUS is
`~/Library/CloudStorage/Dropbox/gesta-backups/current`, this app's backup
(`gesta-snapshots` is the `../writer` version's and is never read). Every
module, what it is and the tools' switches: `docs/LAYOUT.md`, read before
changing a module not yet read in the session.
