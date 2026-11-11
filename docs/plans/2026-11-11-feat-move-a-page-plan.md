# A page moved with its sub-pages

Asked 2026-11-11: a page's sub-pages moved under a page of an author's in the
bookshelf, all but those already there.

## Why it is in the app

READ: an import writes entries and never deletes one (`importFiles.ts`: "An
imported file overwrites that entry whatever it held"), and a rename stays in
its namespace and refused a page whose sub-pages hold text. An import folder
would have left the 102 old entries under `page/` for 102 deletes by hand. The
reader chose the move in the app, and the old index merged into the
bookshelf's.

## Decisions

1. The gesture is Rename. On a page or book whose sub-pages hold text, the
   prompt asks "Move the page “X” and its sub-pages to:", filled with its own
   address (`page/Essays`). On any page or book an ADDRESS typed there —
   `bookshelf/…`, `page/…`, or a link's `#…` — moves it there; a plain name on
   a page with sub-pages moves it beside itself. A bookshelf author's Rename
   stays the re-file.
2. A confirm before anything is written: how many move, where the text goes,
   each twin by its title.
3. Into an entry already there, the moved page's own text goes after the text
   there (nothing lost; the index's two shapes are joined, not reshaped).
4. A TWIN is a sub-page the place already holds under the same title, whatever
   its key (one essay filed under two dates, a re-run). It is deleted, and every link to it
   goes to the one there. A twin with pages of its own refuses; a key already
   there under another title refuses.
5. The pictures are copied first, to the new entry's folder; a
   copy that fails stops the move before any entry is written; a picture the
   store lacks is counted in the corner. The old picture rows stay (the image
   store has no delete). A picture named for its entry — by its whole path
   (`page--Essays--…-img-1.webp`, the old app's export) or by the entry's
   own name (`Essay-img-1.webp`, a paste) — is renamed for the new entry in the
   same form and its address in the text follows; any other name is kept. Into
   a text that names pictures already, the moved are numbered past its highest.
   Asked after the first move left 81 pictures under their old page's names,
   names, which read as wrong; those 19 pages were renamed by an import folder
   (a scratch script, imported and seen).
6. The rest follows the re-file's order: every copy lands before any old key
   is cleared, a failed copy takes the others back and puts the text there back
   as it was; then the links elsewhere; then the old keys; then the places,
   folds and bookmarks (the root's and the twins' dropped when moved into an
   entry already there).

## Measurements

- MEASURED, the plan over the backup `gesta-backups/current` (a scratch dry run
  of `movePlan`, `moveLinks`, `imageRefs`, `pointsInto`): 102 entries move (the
  page and 101 sub-pages), 1 twin (one essay under two dates), 81 picture references copied, 28
  journal days' links rewritten, 0 links left pointing into the old page.
  A tagged entry mentioning the old page's addresses holds pasted console output,
  not links, and is rightly left.
- MEASURED, headless Helium, the step "a page moved with its sub-pages": the
  prompt and confirm as above, the joined text, the twin deleted and its link
  pointed at the one there, a `?line=` link elsewhere moved with its payload,
  the three old keys gone, the moved essay's picture drawn (a blob, 1400×700).

## Found on the way

- READ, not fixed: the re-file (`refile` in `lifecycle.ts`) moves an author's
  books but not their pictures. A book's pictures are keyed under the author's
  folder, so a re-filed author's book pictures would read as missing. The
  move's picture copy is the remedy, if wanted.
