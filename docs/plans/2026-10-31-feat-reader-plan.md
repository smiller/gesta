# feat: the reader — Gesta read-only on the iPad

## The ask (2026-10-31)

- "I want a read-only version of Gesta, so on a tablet with access to the
  Dropbox gesta-backups folder I could read Gesta entries. It shouldn't show
  markdown view or allow changes, but it should let me view and search
  content."
- Ruled the same day: an iPad, Safari; the page on GitHub Pages; pictures in
  the bundle; the app's backup writes the bundle.

## What the folder holds (MEASURED 2026-10-31)

- `gesta-backups/current`: 14,229 `.md`, 446 `.webp`, 248 MB. Bookshelf 6,279
  files / 96 MB of text, journal 7,749 / 37 MB, page 201 / 1.9 MB.
- The text tar-gzipped: 56 MB. The pictures: 85 MB.

## The design

- THE BUNDLE: `gesta-backups/reader/gesta.zip`, the backup's own export (every
  entry's `.md` and its pictures at the paths the mirror has) in one zip,
  written by every backup run that writes the mirror, after it. Streamed to
  the file a member at a time, never held whole. A failed bundle write is a
  lost write: the run reports "backup incomplete" and the next retries.
  `backupSig` moves to version 3, so the first run after this writes one.
- THE PAGE: the same app built in a reader mode (`vite build --mode reader`,
  `dist-reader/index.html`): the store a memory one filled from the bundle,
  every entry locked (no caret, no keyboard), no markdown view, no format
  bar, copy button, new/rename/delete, import/export, backups, shortcuts,
  bookmarks or replace. Kept: the masthead's crumbs and sibling tags, the
  bookshelf and pages lists, today, Search with its scopes, Go to, links,
  folds, line numbering.
- THE PICK: "Open backup" takes one file through Safari's picker (Files ›
  Dropbox › gesta-backups › reader › gesta.zip). The file is kept in the
  page's IndexedDB (`gesta.reader`, its own name) and read again at every
  launch; a new pick replaces it. The masthead says the bundle's date.
- ‹ and › either side of the crumbs walk to the previous and next entry as
  ⌃⌘, and ⌃⌘. do, the iPad having no keyboard (asked 2026-11-01: "add back
  the ‹ › buttons"); the reader's page alone.
- A search hit in a locked entry is drawn as a highlight decoration: a
  selection is not drawn in a view that is not editable.
- PUBLISHING: `dist-reader/index.html` pushed to the `gh-pages` branch, on
  the reader's word.

## Defaults stated, not asked

- The bundle is rewritten whenever the mirror is (after 10 minutes idle,
  on leaving the tab), not once a day: the iPad reads what the Mac wrote.
- No service worker in the first cut: the page loads from the network, the
  entries from the iPad's own storage.
- Safari drops a site's storage after 7 days without a visit unless the
  page is added to the Home Screen; then a new pick restores it.

## Measured (2026-10-31)

- `tools/readerBundle.ts` over the backup under node: 14,675 files zipped to
  146.8 MB in 4.3 s; read back to 14,229 entries and 446 pictures in 0.5 s.
- `tools/helium-reader.mjs`, headless Helium, 1024×1366: nothing kept, the
  page says "no backup opened" and where the file is; the bundle picked,
  14,229 entries in 1.9–2.1 s; relaunched, 1.85 s to the warm, a heap of
  386 MB. Unpacking 64 entries at once against one at a time: 1.9 s against
  2.4 s to the warm on relaunch.
- In it: a contents link clicked opens Book 1; Search "darkness visible",
  its one row clicked, opens Book 1 scrolled to the hit, the hit drawn; a
  click in the text then "xyz" and Enter typed change nothing and leave no
  focus; ⌃⌘M says "no markdown view here"; 2026-05-07's picture loads
  (1400 px); the bookshelf list has 47 rows and no buttons; Go to opens with
  4 selects.
- ‹ › (2026-11-01, headless): › on 2026-05-07 opens 2026-05-08, ‹ back;
  › on Paradise Lost Book 1 opens Book 2, ‹ there "no earlier entry"; each
  37×39 px. At 810–834 px wide a long crumb (Paradise Lost) wraps the tools
  to a second line, the bar 168 px against 140 without them; 1024 and wider
  unchanged. The first search's index over 14,229 entries: 11.0 s, the Mac
  under load.
- The app's own first backup after a reload wrote
  `gesta-backups/reader/gesta.zip`, 146,848,819 bytes (2026-11-01 06:57; a
  tab opened before the build had written version 2's signature and no
  bundle).
- `npm run verify` passes; the Helium run matches its approved copy, so the
  app's own page is unchanged.

## Not played

- The bundle's write by the app's backup: no headless run drives the folder
  picker; `writeBundle` is the tests'. Its time in Helium is not measured.
- Safari on the iPad: Helium is Chromium. The page meets Safari only once
  published.

REVIEW CYCLES: 0
