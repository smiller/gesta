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

## Review cycle 1 (2026-11-11)

`/code-review` at high over `8087ca6..bd6793a` (the move, and the link's
hover naming its entry). MEASURED cost: 138,152 tokens (its last message's
input + cache creation + cache read + output, from its transcript). Ten
findings, all the reviewer's; the fixes were held until the reader had the
list, then made on the reader's word:

1. Enter on the filled address could move the page (a `%`, or a part the
   name rules change) — fixed: the filled text unchanged does nothing, and a
   typed key is not URL-decoded.
2. A picture whose name is kept could overwrite another picture of that name
   in the new folder — fixed: the move refuses before writing anything.
3. Copied pictures are never removed, on a failure or after a move — kept as
   decided (the image store has no delete); the reader wants unreferenced
   pictures deleted, to be discussed.
4. A twin's and a merged root's bookmarks were dropped — fixed: they follow;
   folds do not; a bookmark landing on one the list holds is dropped.
5. Renamed beside itself, the parent's bare-name label stayed — fixed.
6. A blank twin showed as `“”` in the confirm — fixed: its name.
7. `corner.writer.txt`, the frozen old app's run, was edited by hand for the
   name change — open, the reader's call.
8. The move is a near copy of the re-file; two renames treat links
   differently — open, the reader's call.
9. `splitKey`, `under` and the picture pattern copied — fixed: one each.
10. The picture copies repeated, copied onto themselves, and ran all at once
    — fixed: once each, none in place, one at a time.

A flaky step seen twice in this work, not caused by it: "Enter with the caret
above the window" read `clear: -789` against the approved `24`, MEASURED 1 run
in 3 alone; the replay passed.

## The re-file's pictures (2026-11-11)

READ before the fix: a re-file moved an author's books but not their pictures,
which are keyed under the author's folder, so a re-filed author's book pictures
read as missing; a sweep of unreferenced pictures would have made that loss
final, so this comes first (asked). The re-file now carries them as the move
does, through one helper both share: named for its book a picture is renamed
for its new place, any other name kept, each copied once and one at a time, a
kept name the place holds for another picture refusing, a failed copy stopping
it before any entry is written, a picture not found counted in the corner.
MEASURED, headless Helium, the "author filing" step with a pasted picture in
its book: after the re-file the book's picture is drawn (a blob, 1400×700).

Finding 7 of review cycle 1: the hand edit of `corner.writer.txt` kept, its
exception noted in CLAUDE.md (asked). Finding 8 stays open.

## Pictures nothing names (2026-11-11)

Asked: unreferenced pictures deleted; the reader added that a move, a re-file
and a delete should clean up their own, and the panel's sweep the rest.

- The image store lists and deletes (`keys`, `del`); the reader's two stores
  list and refuse a delete.
- `pictures.ts`: the pictures the entries name, found as the export finds them
  (`imageRefs` under each entry's folder); those of a list no entry names; the
  sweep's plan, refused whole when more than half the stored pictures (and
  more than 20) would go.
- A move and a re-file delete each old picture they copied from, a twin's
  too, once nothing names it; one that fails deletes the copies it made. A
  delete removes the entry's pictures nothing else names. A picture deleted
  from a text stays, so undo can bring it back, until the sweep.
- The backups panel offers "Remove N unused pictures", counted as it opens and
  again at the click, behind a confirm.
- MEASURED, headless Helium: after the move step the old page holds no
  picture and the new place one; the "unused pictures" step — a picture
  pasted, deleted from the text, the panel opened — offers "Remove 1 unused
  picture", and its click leaves none, the corner saying "removed 1 unused
  picture". The step first read the panel before the blank text was stored
  (the corner's "saved" was the paste's); it now waits on the stored text.
- MEASURED: the backup mirror holds 470 pictures, all named. INFERRED: the
  store holds at least 163 more no entry names — the first move's 81 old copies
  under `page/`, the 81 the picture-rename import left under their old names,
  and the test author's — about a quarter, under the belt.
- Flakes seen, not caused here: "ArrowDown from a block's last sentence" (the
  dual-language section) read a note's cell once in a full run; 3 of 3 alone
  read the approved value.

## Review cycle 2 and the confirmation pass of cycle 1 (2026-11-11)

Two `/code-review` runs at high, findings the reviewers', none verified by them:
the confirmation pass of cycle 1's fixes (`bd6793a..de6ae67`), MEASURED
106,165 tokens; the review of the re-file's pictures and the picture clean-up
(`de6ae67..dbfbcdd`), MEASURED 120,897 tokens. Merged into one list, the reader
said to fix all of them:

- A. The picture reader missed forms the editor shows (a name with brackets, a
  title, brackets in the words), so the sweep could free a picture on screen —
  fixed: the editor's parser reads them; the sweep also keeps what the syntax
  alone reads. MEASURED over the backup's 178 entries with pictures: parser and
  syntax read the same pictures, 0 apart, so the 193 removed were unnamed.
- B, E. A delete, or a move's or re-file's old entry or left copy, whose
  removal failed still freed its pictures — fixed.
- C. The sweep counted before this tab's save landed — fixed: saved first.
  Another tab's paste not yet landed stays a gap.
- D. Two destinations of one picture got one copy — fixed: keyed by destination.
- F, G. A failed clash read left saves off; a refusal dropped what was typed —
  fixed: both keep it, reopen and say so.
- H, I. The clash check read every picture at once and skipped renamed ones —
  fixed: each copy checked just before it is made, one at a time.
- J. An address with an empty part moved into the author or renamed — refused.
- K. Two bookmarks moved onto one key — the first kept.
- L. A blank twin refused as `“”` — its name.
- M. The help's "more than half" said what the rule does once past 20.
- N. The panel kept a stale count — reset before each count.
- O. The picture keys of an entry folded once (`picturesOf`); the bare-name
  label rule one function (`followedLabel`).
- P. A comment above the wrong function moved; the bookmarks-only move its own
  port.

Flakes seen in this cycle's runs, each 3 of 3 right alone: "a link to itself"
read the caret at the line's start once.

## A whisper copies on click; no new page's link in a heading; three waits (2026-11-11)

- Asked: a click on a passing notice copies its words, as a pinned one copies
  its details; "copied" itself only goes. MEASURED headless: the "removed 1
  unused picture" whisper clicked, the clipboard holds those words and the
  corner says "copied".
- Asked: + sub-page / + book refuse a caret in a heading, after a link placed
  at a heading's start renamed a test author ("PicturesTest Author"). MEASURED
  headless: refused with "no link inside a heading — place your cursor below
  it", the heading and the books unchanged. A bookmark's link is not guarded.
  The "entries left and renamed" step had made its tagged entry from a day's
  heading; it now places the caret in the text first.
- Flaky steps: "Enter with the caret above the window" now waits for the
  wheel's scroll to settle before Enter — MEASURED 6 of 6 right, against 1 in 3
  wrong before; "ArrowDown from a block's last sentence" waits for the page to
  hold still, and "a link to itself" for the click's caret — both were right
  alone before too, so only later full runs can show them fixed. A margin-note
  reading at 1000px was seen wrong once in a full run, 2 of 2 right alone.

## Rename, re-file and move one path (2026-11-11)

Finding 8 of review cycle 1, asked: the three made one, `relocate` in
`lifecycle.ts`, in three modes. A move (an address typed, or a page whose
sub-pages hold text) asks first, joins into a page there and deletes twins; a
rename (a plain name, no sub-pages holding text) does not ask; a re-file (an
author's rename) keeps the author's name as its heading and gives a pageless
author a page. All three share the picture step, the link rewrite, the
clean-up, the kept state and the failure paths. A day's tagged entry keeps its
own rename (it hosts nothing, and its folder is the year's).

Behaviour that changed: a plain rename of a page or book now moves every link
to it, anywhere, where only its parent's followed; its blank sub-pages move
with it rather than being swept; its pictures named for it are renamed; the
corner says "renamed to … — N entries, links updated in M others". The
re-file's own key and link functions went, their cases moved to move.test.

MEASURED headless, the new step "a page renamed with every link following":
the link on another page follows and the corner says so. The step first read
the other page before the app had taken it from storage (written there by the
harness, not typed), and the link was not followed; it now visits it first —
INFERRED a harness timing, entries a reader writes being in the app already.
The margin-note reading at 1000px, wrong once more in a full run, now waits for
the resize to settle; 3 of 3 right alone.

## Review cycle 3 (2026-11-11)

`/code-review` at high over `dbfbcdd..61a7a8a`, MEASURED 154,228 tokens (its
transcript). Ten findings, the reviewer's; the reader said to fix eight and to
time two first.

- 1. A day's tagged entry renamed removed the old even when the new write did
  not land — fixed: refused, the old standing, said in a pin.
- 2, 3. The heading guard missed the markdown view and the Tag button —
  fixed: a caret on a heading's line refuses there too (MEASURED headless); a
  selection that cuts into a heading refuses, one holding a whole heading is
  still the new page's.
- 4. A picture's rename wrote the whole text anew, dropping titles — fixed:
  the address changed where it is written, the parser saying which pictures
  there are, the document written anew only where an address cannot be found.
- 5. A page's link to itself kept its old name as its label — fixed.
- 8. A click on "saved" took the clipboard — asked: a routine whisper ("saved",
  "copied", a failed copy) only goes; a copy that never answers no longer holds
  the whisper on screen. The first section's "after the click" reads as the
  old app's again.
- 9. Three comments said what the parser does — reworded.
- 10. Bookmarks moved through two calls — one call, folds and bookmarks named.
- 6, 7 timed first (asked), under node over the backup's 17,348 entries:
  reading pictures, the old pattern 13.3 ms, the parser 55.3 ms, the panel's
  count 54.4 ms over every entry; a rename's checking pass 8.8 ms and 9.1 ms
  for two pages (19 entries), 1,246 ms for the book `bookshelf/Horace/Odes/1.1`
  (1,383 entries). Taken to the reader before any change.
- 6, fixed after the timing (asked): an entry is read in full only when one
  of its addresses, read as an address without parsing the text (`mayName`),
  falls under the page renamed. MEASURED under node over the backup, the same
  entries changed with and without it in all four cases timed: the book
  `Horace/Odes/1.1` 1,383 entries checked → 1, 1,338 ms → 28 ms; the author
  `Milton, John` 1,377 → 69, 1,282 ms → 97 ms; `Paradise Lost/Book 1` 1,383 →
  27, 1,284 ms → 60 ms; `page/Books/Books Lent` 19 → 1, 10 ms → 1 ms. 7 left as
  is (about 42 ms a backup, spread over its batches).
