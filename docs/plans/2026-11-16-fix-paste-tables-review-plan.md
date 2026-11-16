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
