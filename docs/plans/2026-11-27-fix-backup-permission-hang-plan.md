# fix: a backup permission check that never answers (S33)

## Decisions

- Asked: "Let's fix that." — backups had stopped silently: Helium's
  `queryPermission` on the saved folder never answered, so the launch run and
  every later one waited behind it (the single-flight latch), with no alert and
  nothing in the console.
- A check unanswered after 5 s (`PERMISSION_MS`) is taken as not granted: the
  existing "backups paused — click to resume" pill shows, and its click
  (`requestPermission`, a gesture) asks again. No new visible state, so no mock.
- `requestPermission` gets no time limit: it may wait on the reader's answer.

## Record

- 13:3x Traced with the reader in their tab: no "backing up…" after the
  launch; the saved signature (161,557,895) matched the backup without the
  imports (161,557,622), not with them (165,276,580); the folder record in
  `gesta.backup` present; `await handle.queryPermission(...)` never returned.
  Helium 0.22.1.1, unchanged since 18 November; backups had run at 12:24 and
  12:40. A full Helium restart gave the paused pill; its click backed up.
- 13:42 `src/store/backup.test.ts` (new): a check that never answers pauses and
  the next run asks again; one answered in time is waited for. Failed first,
  then `answered()` in `backup.ts`. `npm run verify` green.
