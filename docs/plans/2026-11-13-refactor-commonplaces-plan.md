# Pages become Commonplaces

## Why

"Page" meant three things: the kind of entry that is neither a day nor a
book, a printed page (⌃⌘G's Page box, "p. 138"), and whichever entry is
open. The code called the printed page "leaf" to get round it.

## Decided (the reader, 2026-11-13)

1. The kind is a Commonplace: "Commonplaces", "New commonplace…", the
   paper icon kept ("It refers to \"Sean's Commonplace Book\"").
2. Its key is `commonplace/`, ubiquitous language; `page/` addresses are
   not kept.
3. What sits under one is a sub-entry, "+ sub-entry".
4. "Entry" where the Help and messages meant whichever entry is open.
5. "Page" is the printed page alone, in the code too (the next step).
6. The data moves once, in the app at startup, with bookmarks, places and
   folds; the backup writes `commonplace/`.

## Record

- src/store/toCommonplaces.ts: once the journal is in, every `page/`
  entry moves to `commonplace/` under the same name, pictures renamed with
  it, every link into it in any entry rewritten by its first segment, the
  keepers told; a copy or write that does not land leaves everything for
  the next start. Six tests.
- Over the backup in memory (MEASURED, tools/out/dryRunCommonplaces.ts):
  98 entries moved, none left under `page/`; 11 other entries rewritten,
  only in link targets; no `#page/` link left; 26 pictures moved.
- The words: the panel, prompts, buttons, search scope ("All
  Commonplaces"), Go to, the Help and the backups note; a plural helper
  for "sub-entries". The code's own comments, identifiers and test titles
  that say "page" for a commonplace or an entry go with step 5.
- main.ts crossed the duplication threshold three times on the way; the
  migration's step is a factory called inline, main.ts 10.
- The approved runs change only in the words, and two readings that
  truncate a now longer address.
- The backup's `current/page/` folder will stay: the backup leaves a
  top-level folder it does not know as a stranger's (READ: names.ts
  importTarget); removed by hand after the first backup.

## The batch's review and scan (1d82979..bff8016)

`/code-review` at high, 174,582 tokens; the architecture scan
(45f036b..HEAD), 151,976 (MEASURED, the last message of each
transcript).

Fixed in one commit (the reader agreed findings 1-5 and 7-10):
1. A save that wrote nothing left its edits counted unwritten, and
   `moved()` stayed false: a refresh after an import or a delete kept the
   stale screen. It now marks the entry current.
2. The entry open before the migration kept the links it rewrote; the
   load now refreshes it when anything moved.
3. A run cut short could write a stale page over an edited commonplace,
   and leave links into a commonplace never written: the commonplaces
   land first, the links after, the old keys last, and a commonplace
   already there is never written over.
4. A failure after the writes rejected the whole load; the step never
   rejects.
5. A picture whose key does not change was copied onto itself and
   removed; it is left alone.
7. A rename of an entry deleted elsewhere pinned "not saved" before
   writing the text anyway; the hand-over no longer refuses it.
8. The slow-load pin could stick through a slow migration; it is
   released first.
9. ⌃⌘R with no rendered view went silent; its words are back.
10. The paste route's tag, an internal string, is "default", no
   apostrophe for the checker to curl; a moved entry parsed once.

Finding 6, an older backup's `page/` files skipped by the import: the
reader chose a one-off rewriting the archives to `commonplace/`, so the
app keeps one code path. Next.

The scan's other candidates, to grill: one lexer for both checkers
(tools/commentRules.ts already had one; tools/apostrophes.ts wrote a
second), pageLabels.ts folded into grammar.ts, the save's tests over the
real layer.
