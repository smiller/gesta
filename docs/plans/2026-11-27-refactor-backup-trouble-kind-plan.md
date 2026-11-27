# refactor: the runner's trouble as a kind, its words from the alert table (A32.1.3)

## Decisions

- Candidate 4 of the A32.1 architecture run: "All yes" to building it next,
  grilled in one round, "yes".
- The runner's trouble is one of none, paused, incomplete, failed, blocked;
  none is also what is said while no folder is set up. `pausedOn` compares
  the kind, so a rewording cannot stop the late grant.
- The words sit in a `TROUBLE` table in `alertText.ts`, each with when it
  shows; `tools/alertsPage.ts` writes it to `docs/alerts.md` as "The pill",
  after Success.
- The kind travels (the pill's state, the panel's state, `?corner=pill`);
  the words come from the table at drawing time.
- No visible change: every sentence word for word.

## Record

- 18:14 tests first, eleven failing on the kinds and the missing table.
- 18:20 built; suite green, health 10, both ledgers read (one comment
  narrowed to its own table); rebuilt, and pill, backups, unused pictures
  and alerts and surfaces read the same.
- 18:23 `npm run verify` green; the Helium verdict identical (corner, order,
  bridge, reader: ok).
