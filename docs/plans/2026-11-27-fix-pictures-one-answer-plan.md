# fix: one answer to which pictures an entry names (A32.1.5, S35)

## Decisions

- Candidate 5 of the A32.1 architecture run, built as S35's fix: "All yes",
  grilled in one round, "yes".
- A new picture's name is never one the store holds under the entry's
  folder for its stems: one past the highest of the text's names, by
  either reading, and the stored ones. A paste follows it.
- A move into a folder follows the same rule: a picture renamed there is
  numbered past an unused one under that name, where it was refused; the
  clash check stays as the net, for a name no rule numbers.
- `pictures.ts` answers an entry's pictures: those its text shows
  (`imageRefs`, with `patternRefs`, `imageLinks` and `shownPictures`, moved
  from `exportEntries.ts`), those kept (`picturesOf`), the taken names and
  the next free one; a paste and a move read `images.keys()` for it.
- No design round: nothing on screen changes but a picture's number.

## Record

- 18:4x tests first: the next free name (three) and a move numbering past an
  unused picture failed; the clash test moved to a picture no rule renames.
- 18:47 built; suite green, health 10, ledgers read; the readers' tests moved
  with them. Helium "unused pictures" gains a second paste: -img-2 taken,
  -img-1 kept, the panel offering -img-1, -img-2 left after the removal.
- 18:49 the corner diff read (that step, and what it changes after it) and
  approved.
- 18:50 `npm run verify` green.
