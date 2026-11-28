# fix: the batch review's findings, 929c4cf..d6176f0 (A34)

## Decisions

- The batch (the five A32.1 builds; S35) touched main.ts and session.ts:
  one `/code-review high 929c4cf..d6176f0`, seven findings. No further
  architecture run: the batch is that run's own builds.
- Fixed (each test-first):
  1. A reference from a Stephanus number into a label that is not one
     (⟨2a⟩ to ⟨xiv⟩) threw: the run asked the page of a label with no
     digits. Such a run is named whole, "2a-xiv".
  2. A picture pasted, then another entry opened while it was stored, was
     put in that entry. The aim is checked again once stored; a miss says
     it had nowhere to land, the picture left unused.
  3. Two pictures pasted close together could list the store before either
     was written and take one name. One at a time now holds until stored.
     2 and 3 moved the paste out of session.ts into `src/ui/picturePaste.ts`,
     where a test reaches it.
  4. (pre-existing) A folder picked whose save failed stayed the runner's
     folder. The one it had is put back.
  5. A move planned before the pictures were listed read its texts after.
     It is planned once they are listed.
  7. The backups model's comment named what the runner does; cut to the
     status's own reason.
- Dismissed: 6 (the panel's first frame from stale state: the read runs in
  the mount's effect, flushed before a paint, INFERRED); 7's alertText half
  ("one set of words wherever it is drawn" is the table's own decision).

## Record

- 21:59 the review ran; cost 149,720 tokens (input 2, cache creation 5,998,
  cache read 136,872, output 6,848), from the last message of its transcript.
- 22:0x fixes 1-5 and 7: each failing test first (the two paste tests run
  against the old landing failed, the other two passed there); health 10.
- 22:09 `npm run verify` green, the whole Helium verdict played: corner, order, bridge, reader ok, the approved run unchanged.
