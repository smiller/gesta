# refactor: the Backups panel's lines from one function (A32.1.4)

## Decisions

- Candidate 3 of the A32.1 architecture run: "All yes", grilled in one
  round, "yes".
- `backupsLines(state)` gives the panel's lines by role (setup, resume,
  status, folder; unused, more than half); the six one-line predicates and
  `unusedWords` go. The lines come in the panel's two blocks, the folder
  block and the pictures block, so the markup stays as it was.
- Every word the panel shows sits in `backupsModel.ts`, but the trouble's
  (the TROUBLE table) and the long recovery note, which no state changes.
- Each line carries `data-role`; Helium reads `lines: [{ role, text }]`,
  no longer the first `.backups-status`, which had read the unused
  pictures' heading as the status.
- No visible change, proved by rendering every state before and after.

## Record

- 18:2x eighteen states rendered before any change (text, trouble lines,
  buttons, pictures and the raw markup), kept in tools/out/a3214; tests first,
  seven failing on the missing function.
- 18:29 built: every state's text identical; the raw markup differs only in
  whitespace between tags. Health held at 10 by splitting the top lines and
  sharing the test's empty handler.
- 18:31 the corner diff read: three readings, each the same but for status
  becoming lines by role; approved.
- 18:32 `npm run verify` green.
