# A commit's verify keeps every ledger line (P22)

Asked 2026-11-24: "Look at the P item next."

## Decisions

1. `hooks/pre-commit` keeps setting aside what is not staged; after verify
   it takes verify's lines off the play ledger and the progress log
   (append-only), puts them back as staged, pops the stash, then appends
   verify's lines after the set-aside ones. A ledger file verify started
   new is moved aside and appended the same way.
2. `tools/hooks-test.sh` holds the case; `PRE_COMMIT=<file>` plays a hook
   in place of `hooks/pre-commit`, so a fix is played before it is copied
   in. `hooks/` is the reader's to change.

## Record

- 20:55 The case against today's hook: 4 of 65 checks fail (the commit
  refused, the set-aside line lost from the ledger and a new day's, a stash
  left behind), tonight's fault exactly. Against the fixed hook,
  `tools/out/p22/pre-commit`: 65 of 65; copied into hooks/ by the reader.
