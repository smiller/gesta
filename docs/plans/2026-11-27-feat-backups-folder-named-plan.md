# feat: the Backups panel names its folder (U33)

## Decisions

- Asked: "it would be useful if the backups panel said what the backups
  directory is instead of offering a button to change it".
- The browser gives a folder handle's name only, never its path; the name is
  known once a run has read the saved folder, so a journal still loading
  names none.
- Mocked on the real page (tools/out/u33/mock/index.html: not set up, on, on
  with unused pictures, paused, still loading; today against layouts A, B, C).
  The reader picked A: on, "Backing up to **name**." with a small "change
  folder…" link at its end; paused, the reason, then "Folder: **name**." with
  the link; no name yet, "Automatic backups are on." with the link; loading,
  no link. The "Change backup folder…" button goes.

## Record

- 13:5x Tests first (backup.test: the name once a run has read it;
  backupsModel.test: backupsFolder, offersChange, the status said by the
  folder's line; Backups.test: the lines drawn), six failing; then
  `Backup.folder`, `screen.backups.folder`, the panel read, the model and the
  component. The first draw dropped the space before the link ("on.change
  folder…"); the test now strips Svelte's markers and requires it.
- A configured panel cannot be reached headless: OPFS refuses a `file://`
  page ("SecurityError"), and a plain-object folder cannot be stored. The
  hand-check covers it; the Helium "backups" section still reads the
  unconfigured panel. `npm run verify` green.
