# feat: the Backups panel says what unused pictures are and shows them (U34)

## Decisions

- Asked: "I also don't understand the 'Remove 3 unused pictures' button", then
  "let's also create U34 in case there isn't overlap and we might need to
  remove pictures after all". Telling the three apart took the console that
  day; the panel should let a reader see them.
- Mocked on the real page (tools/out/u34/mock/index.html: none, one, three,
  more than half; today against A names, B shown, C B behind a toggle). The
  reader picked B: "**N unused pictures.** Pictures stored in Gesta that no
  entry shows — most often one pasted and then deleted from the text. No
  backup holds them, so removing them is for good.", each picture 150×100 with
  its name, then "Remove this picture" / "Remove these N pictures". The
  more-than-half refusal keeps its sense, after the same sentence.
- The picture types move into `pictureBlob` (store/pictures.ts), shared with
  the session's resolver.

## Record

- 14:3x Tests first (pictures.test: pictureBlob; Backups.test: the block
  drawn; backupsPanelActs.test, new: each unused picture by name, shown from
  the store, let go on a re-read), failing; then the state (`unused` a list),
  the read with `showPicture`/`releasePicture` hooks, the panel and the
  wiring. A picture arriving after a re-read is let go: its test written after
  the guard, then seen to fail without it.
- Helium "unused pictures" waits for the picture drawn, clicks "Remove…", and
  its reading names each picture and whether it shows; the corner diff (those
  two sections only) read and approved. `npm run verify` green.
