# The review of the terminal-paste and table-Enter batch (A5)

## Why

S14–S17 touched `paste.ts` and `editor.ts`, DOM seams: one `/code-review`
was owed over `cccc617..HEAD`.

## The review

- Run bare, on a clean tree: it read `@{upstream}...HEAD` (`131ae73..HEAD`),
  which takes in `0ec323b`, A4's fix commit, too. Level not in its
  transcript. 115,755 tokens (MEASURED, the last message of
  `subagents/agent-affe1441c70510f1b.jsonl`: 2 input + 1,800 cache creation
  + 111,436 cache read + 2,517 output). Ten findings, the reviewer's.
- From now on an owed review is handed over as the line to paste, level
  and range with it (asked).

## Decisions

- Acted on: an empty box or one of rules alone left as it was; a box a
  table only when every line between ┌ and └ is a row or a rule, and never
  inside a code fence; a table drawing no rule between body rows has a row
  a line (asked; a row wrapped there reads as rows); a pipe in a cell
  escaped, and the table parse now splits only on an unescaped `|` and
  saves a cell's `|` as `\|` (S16's known limit; the corpus report the same
  at HEAD and after, MEASURED); space between two `white-space: pre`
  blocks still a terminal's copy; Enter over a selection in a cell deletes
  it, then goes down (asked); a regex literal a span of its own, so the
  titles checker reads its spacing and `apostrophes.ts` reads strings and
  templates alone; a first line's opening « or “ dropped, a ‘ kept, since
  ’ is also the apostrophe (the comment had promised more); the margin's
  RegExp built once.
- Refused: findings 5 and 6 (the Verse Line / Prose Paragraph bar giving
  way to Line/Page where pages or stanzas stand): only Vita Nuova declares
  "prose by paragraph, verse by line", and none of its 42 chapters has a
  page label or a stanza fence (MEASURED, grep over the backup).
- Helium: "a terminal's copy pasted" reads a rule-less table with `x|y`
  (three rows, `x|y` one cell); "Enter in a table" reads Enter over a
  cell's selected text (the cell emptied, the caret in the cell below).
  Shift+← then Enter raced ProseMirror's reading of the selection in a
  whole run; the step selects through `selectBetween`, which waits.

## The architecture run (A5.1)

- `/improve-codebase-architecture` over the batch's 20 files: one scan,
  176,017 tokens (MEASURED, the last message of
  `subagents/agent-a9393be2a4ba75177.jsonl`: 2 input + 4,958 cache
  creation + 166,666 cache read + 4,391 output). Four candidates.
- Built, Strong: a markdown table written and read in one module,
  `src/model/table.ts` (ccf18ed; a cell escapes its pipe alone, asked); a
  reference's place crossing as `{ kind, text }`, numbers, paragraphs or
  words, the label's first-letter guess gone (604dafa; formatting stays on
  the editor side, conventions still read on both, asked).
- Skipped for now, no ADR: a terminal's copy as its own module
  (`sourcePasted` already is its interface); it may come back if the code
  changes (asked).
- Built after discussion: the progress log's one write path. A day not
  begun is begun by its first event, so "run begin first" no longer meets
  a day's first command (asked); the wake reads what the begin would carry
  in, so a watched item wakes on a new day's first run, which before it
  could not; `logged` refuses for both callers. `begin` stays as a command.

## The review of the architecture run's builds (A6)

- `/code-review high 579083c..HEAD`, 112,046 tokens (MEASURED, the last
  message of `subagents/agent-a9a2c28b8288a71b0.jsonl`: 2 input + 2,947
  cache creation + 106,715 cache read + 2,382 output). Ten findings.
- No architecture run over it: a batch made only of an architecture run's
  own builds (asked; CLAUDE.md says so now).
- Fixed: the last day is a dated log alone, a Dropbox conflicted copy or a
  backup never taken for one; a move keeps an item's watch; the wake runs
  once after a verdict's runs, found from its own script, and a failed
  wake says so; a begun day never reads the last; no rows, no table lines.
- A correction: 604dafa's message said every label stayed the same. One
  rule changed: under `prose by paragraph, verse by line`, a facing
  column's lines now dot on (3.4) where they stood as a field (3, 4). No
  entry reaches it: only Vita Nuova has the directive, and no fence of its
  carries a facing number (MEASURED, grep); Golding's references keep
  their form (Helium's ⌃⌘R reading unchanged). Kept, and pinned (asked).
- Kept: the wake in the pre-commit's Helium run, which can leave the day's
  log changed after a commit (asked).
- Refused: `isTableStart` run twice per table (asked); the one-off
  `pipeTables.ts`'s own cell reader, since importing `table.ts`'s took a
  trivial function out and lowered its code health to 9.38.

## The review of S18 and the progress fixes (A7)

- `/code-review high dd0181f..HEAD`, 80,862 tokens (MEASURED, the last
  message of `subagents/agent-a47e9c59412330c04.jsonl`: 2 input + 2,285
  cache creation + 76,306 cache read + 2,269 output). Eight findings, three
  of them probed by the reviewer.
- A `--` line now starts its own as a list item does, and a line wrapped
  from it runs back on (asked): held both ways, a long one broke where the
  terminal wrapped it. The cost, accepted: a prose line straight after the
  last `--` line, with no blank line between, joins it; replies leave a
  blank line after a code block. A bare `--` stands alone.
- `--terminal` prints each item as a `--` line, nested by indent, so a
  pasted copy keeps every line its own (a test pastes it); it takes a time
  as the page does; the count wording's shape trimmed; CLAUDE.md's layout
  names `--terminal`.
- Known limit, left (asked): a sentence the terminal wraps just before a
  ` -- ` breaks there; nothing joins into a `--` line.
- S19, found in A7's hand-check: a command's output, which Claude Code
  opens on `⎿`, joined the command line above it and kept three spaces of
  indent. A `⎿` line now starts its own and stands outside the margin, as
  a message's `⏺` does.
