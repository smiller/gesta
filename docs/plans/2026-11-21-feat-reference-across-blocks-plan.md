# A reference across verse blocks numbered straight on (U1–U3)

Asked 2026-11-21: Ovid, *Metamorphoses*, 4.469-511 was refused, "that spans
two verse blocks"; the refusal should stay pinned; the corner is hard to
read over text.

## Decisions

1. Blocks numbered straight on are one passage: each a top-level verse
   block of one kind (plain, dual-language, or numbered on both sides),
   each opening one past the last line before it, or with that line's rest
   (`⟨…⟩`), on every numbered side; nothing but headings between.
2. Quoted as one block numbered from its first line, a gap row where two
   met (asked: "one block with a gap"); a heading between left out
   (asked: "leave the heading out"). Ref over facing blocks quotes the
   translation alone across them.
3. Blocks numbered apart are refused saying so ("aren’t numbered straight
   on"); other kinds of crossing keep "spans two verse blocks".
4. A passage's refusal is pinned through the surface's refusal pin
   (released by the next entry), and the next ⌃⌘R releases it first.
   The click copies its words, as every notice's click does: not "a click
   simply dismisses", as first offered.
5. The corner sits on the page's colour, fully opaque when shown.

## Record

- MEASURED over the backup (a node walk of every entry): 1,392 neighbouring
  top-level verse blocks numbered straight on with nothing between, 216 with
  a `##`, 42 with a `###`, 1 with a `##` and a note; 296 start again at 1;
  47 open with the rest of the line before (Horace, Satires 1.1, 49→49).
- MEASURED in headless Helium over the backup's entries: Book 4,
  `sprevit` to `recingitur anguem.` → "Ovid, *Metamorphoses*, 4.469-511",
  one `::: dual-language 469` fence, one gap; `nocte volant` to `numen erat`
  → 4.415-17, `## Athamas and Ino` left out; Browning, *A Blot in the
  ’Scutcheon*, `TIME, 17` to `push, friends` → refused, numbered apart,
  pinned.
- The verdict gained "references across verse blocks". Its replays found
  three races, each held by its own step: the bar after a selection (that
  section and "prose and verse paired"), a caret placed before the arrival
  settled ("editing as the help says"), a second selection overwritten
  (that section, reverse order).
- Progress lists gained U, the reader's requests, at the top (asked).

## U4: a dual-language block's columns in equal halves

Asked: "the English translation in the reference is much wider than the
Latin"; then "build equal halves". Replaces decision 7 of
2026-10-22-feat-dual-language-plan: the English still counts at most 30em
toward the entry's width, and the room is then split in halves; the Latin
is wider only where its own lines need it, and the English keeps its floor.
That decision named no alternative weighed; equal halves had been refused
only for a quoted pair of verse, whose English lines wrapped.

- MEASURED in headless Helium over the backup's Book 4 at 1280px: Latin
  508px, English 509px (before: the Latin its own width, the English 30em).
- The verdict's one changed reading: a pasted dual-language reference's
  English runs 9 lines where it ran 8.

## Review

- `/code-review high 5a8edc7..305cdee`: 129,554 tokens (MEASURED, the last
  message of `subagents/agent-a7919842aa26c708a.jsonl`: 2 input + 5,435
  cache creation + 116,459 cache read + 7,658 output); 10 findings.
- Fixed: a refusal never covers a pin the surface does not hold (a "not
  saved"), and the warning it covered is pinned again when it is
  released (1, 2); a facing block opening with a line's rest keeps it a
  rest quoted alone (3); a block with no numbered lines on a side is
  passed over there (4); a dual-language entry whose English is the wider
  is sized for two columns of it, under the cap (6); the blocks worked
  out once per passage, `facingRun` reading between its blocks by the
  joined run's rule (7, 8); the verdict gained "references across blocks
  of each kind": dual-language with a heading between, numbered on both
  sides with a rest, by Ref and Ref (all) (10).
- Left: 5 (every refusal pinned) waits for U5, notices in two places;
  9 (a selection taking in the heading above quotes it loose) is the
  rule for a selection with prose in it.
- MEASURED (`passageAt` over an entry selected whole, 20 runs, node):
  Aristophanes’ Apology 68.3 ms at 5a8edc7, 35.8 at 305cdee, 35.5
  after; House of Fame 7.3, 4.3, 4.2; Golding Book 13 2.1, 2.6, 2.1. The
  batch made the walk faster, not slower; its 35 ms is outside the run.
- MEASURED in headless Helium over the backup's Book 4: the entry 1122px
  → 1188px, its columns 508/509 → 541/542 at every window from 1280 to
  2400; at 1600 its English 952 lines → 913, 39 of 384 sentences a line
  shorter. 4.469-511 still one reference. The backup has no block
  numbered on both sides opening with a rest, and one verse block with
  no numbered lines between others (Pauline's epigraph), between blocks
  numbered apart: 3 and 4 are the tests' and the verdict's.
