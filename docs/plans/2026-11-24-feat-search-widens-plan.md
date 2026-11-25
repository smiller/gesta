# ⌃⌘K a second time widens the search to Everything (U24)

Asked 2026-11-24: "⌃⌘K opens the search row with the default scope, as
currently. ⌃⌘K a second time, instead of closing the row, sets the scope
to "Everything". ⌃⌘K a third time closes the search row", then "yes" to
the four decisions, and of Q4 "something from the bookshelf menu,
something from the commonplace menu, and something from the journal".

## Decisions

1. By the row's state, not a count of presses: closed, ⌃⌘K opens it on the
   entry's own scope; open on any scope but Everything, it sets
   Everything; open on Everything, it closes the row.
2. The widening press keeps the query, answers it again over Everything,
   and leaves the focus in the box.
3. No mock-up: no new state is shown. The help and the shortcuts' line
   say it.
4. Read in Helium on a book, a commonplace and a journal day.

## Record

- 22:05 Built: `press()` in `searchActs.ts`, the ⌃⌘K chord's act; tested
  on the three kinds, the query answered again, a hand-picked scope. In
  Helium the three entries read open on Boethius, Horace and Journal, then
  Everything with the focus in the box, then closed; the corner's only
  change, approved. The first reading caught its own race (the focus
  given to the box a tick after the row opens) and now waits for it.
