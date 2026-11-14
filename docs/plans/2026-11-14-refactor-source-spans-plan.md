# One lexer for the checkers

## Why

The architecture scan over 1d82979..bff8016 found two hand lexers for
TypeScript: the comment checker's and the apostrophe checker's. The
apostrophe one was the weaker: a template's substitutions read as its
text, a regex told from a division by eight characters behind it and
`return` alone, an unclosed quote running on past its line.

## Decisions

- One lexer, the comment checker's, in `tools/sourceSpans.ts`: `spans`
  (each comment, string and template text with its kind), `spansOf` (by
  file: a module, a stylesheet, a page's script, style and markup) and
  `only` (a page's part, its line numbers kept).
- The comment checker reads its comment spans; the apostrophe checker its
  strings and template text, and now a Svelte or HTML page's script
  strings too. The 12 Svelte scripts held none (MEASURED, before the
  change).
- The comment checker's tests stay where they are; the new module has
  one test per span kind.

## Record

- Built test-first; the rule's run over src/ still finds nothing.
