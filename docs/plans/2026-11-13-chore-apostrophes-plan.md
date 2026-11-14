# One apostrophe

## Why

The app's messages wrote "couldn't" straight in 18 strings and curled in
5; its typing curls quotes and its Help writes ’. Asked: "something we
can add in before the reviews as well, since that's just mechanical".

## Record

- Curled, the house form the typing and the Help already keep.
- tools/apostrophes.ts with its test: a letter, a straight apostrophe and
  a letter in a string a module holds or in a component's or the Help's
  text, comments, code and `<code>` samples skipped. Before the fix it
  found 42 (MEASURED), every one a message; after, none. TypeScript 7
  has no scanner for JavaScript to call, so the rule lexes strings,
  comments and regex literals itself.
- One straight apostrophe stays on purpose: the Help's example that
  search finds don’t for don't, now set in `<code>`.
- The approved run changed where it reads those messages.
