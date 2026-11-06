# A lettered line

Asked 2026-11-06, on the Punica's 8.157a: "I think I want to be able to refer to the row as 8.157a, or go to the row as "157a"... a new row form... but it has its own number, "157a"." Duff prints it flush left, a whole line, `157 a` in his margin; 158 is the next.

REVIEW CYCLES: 1

## Decisions

- The row says its number in the text: `⟨line 157a⟩arma parant…`. It is drawn as a plain line and does not advance the count, so the next line is 158.
- The gutter always draws its number, whatever the Line numbering setting (asked: "it is needed to explain why it isn't line 158, which would be the default assumption").
- ⌃⌘G and `?line=` take `157a`, through the code they share. `157` still names 157. A page with no lettered line keeps `157a is not a line number`, so `50b` on Beowulf is not taken.
- References: `157a` alone, `157-157a`, `157a-59`, `155-57a`; a run through it, `155-59`, as before.

- A line a block opens part-way along, 6.589 in the Punica, names one place, where it begins, and is no repeated number; ⌃⌘G and the last-line refusal read it so (found by the folder's layout check, the class ruled 2026-11-06).
- Tooling: `wordAt` reads until the page holds still, and the skipped-line step waits for a save. Under load, three readings flickered in nine full runs on a click or a corner read while the page settled (INFERRED from the readings; none reproduced alone).

## Not covered

- A stanza page's box and a block numbered on both sides, whose box goes by the right column, do not ask for a lettered line. None exists.

## Review cycle 1

`/code-review` at high over ce79b13..efbf461, with the link to a line's cycle 2: 229,891 tokens. Four findings on this work: a lettered pair split by Enter, a rest after a lettered line misnumbered, a run between two letters losing the first, the refusals reading a lettered row by its bare number. The first two are row kinds not played.

Fixed, all four, none reachable on a page that exists (asked: "do the small commit"), with from the link to a line's cycle 2: a landing owed until the warm dropped by a click or a key; a provenance comment out of `helium-approve.mjs` and its stamp written through `stamp`; `ledgerSeal` moved off `addedLines`'s comment. Not fixed, asked: a delete's reach to `?h=` and `?line=` links and a parent's relabel, there being no such links on a bookshelf parent page, and which keys end the mark, trivial.
