# The printed page is "page", in the code too

## Why

With Commonplaces taking the entry kind's old name, "page" is free for
what it is: a book's printed page. The code called it leaf and folio, and
walked a book's page labels three times (the gutter, ⌃⌘G, a reference's
pages), each with its own copy of which labels count.

## Decided (the reader, 2026-11-13)

1. src/editor/pages.ts, no DOM: `pages(doc)` (each page's label and where
   its text begins) and `hasPages(doc)` (stopping at the first), one rule
   for which labels count; the gutter, ⌃⌘G and a reference read it.
2. Leaf and folio become page: the label grammar is pageLabels.ts, the
   gutter pageGutter.ts, the schema node `page_label`, the Page box
   `pageinput`.
3. GLOSSARY.md: Page.

## Record

- Built as decided; `pageParts`, `pageName`, `pagePath` and
  `pageButtons`, which meant a keyed tag or a commonplace, are `tagParts`,
  `entryName`, `tagPath` and `keyedButtons`. The commonplaces tooltip
  reads "List the commonplaces", beside "List the authors on the
  bookshelf" (asked).
- The stored text is unchanged: `⟨138⟩` is markdown, the node's name is
  code. The approved run moved where it reads the Page box's id and the
  tooltip.
- Not done here: about 580 lines of comments and test titles in src/, and
  the Helium sections' names, still say "page" in its old senses beside
  the printed one; telling them apart is a judgement per line.
