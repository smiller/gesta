# refactor: the Backups panel follows the runner itself (A32.1.2)

## Decisions

- Candidate 2 of the A32.1 architecture run, grilled in one round, "yes".
- The runner's `onTrouble` becomes `onChange(state)`: configured, trouble and
  folder, said once as the runner is made and then on a real change only,
  never after every run. main.ts feeds the corner pill and the panel from it,
  so the panel no longer reaches the runner by a lazy getter.
- The panel module holds the runner's last state always, and the unused
  pictures with their URLs exactly from open to close.
- Open and close come from the Backups component's mount and teardown,
  which cover every way of closing the panel; the opener no longer reads it.
- The pictures are read on open, after a sweep, and when the journal's read
  ends with the panel open; a runner change redraws the lines alone.
- No mock: the panel looks the same; a panel left open through a backup no
  longer re-reads its pictures. The trouble stays a sentence (candidate 4).

## Record

- 16:40 tests first: the runner's onChange and the panel's open, close and
  change, fifteen failing on the missing interface; a run-again test that
  passed with nothing said was tightened to require the pause first.
- 16:43 built and wired; health held at 10 by a shared late-arrival helper
  (an it.each pin does not resolve); a stale dist was found under the first
  STEPS run, rebuilt, and backups, unused pictures, pill and alerts and
  surfaces read the same.
- 16:46 `npm run verify` green; the Helium verdict identical (corner, order,
  bridge, reader: ok).
