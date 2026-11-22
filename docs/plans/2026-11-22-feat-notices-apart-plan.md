# Notices apart (U5)

Asked 2026-11-22, from review finding 5 (every ⌃⌘R refusal pinned, so a
pin swallowed "saved", word counts and ⌃⌘C's "copied"): passing notices
and "why what you just tried didn't work" in different places, so neither
covers or blocks the other; "the bottom left corner a weird place to look
for them anyway".

## Decisions (asked, each a choice put to the reader)

1. Under the masthead, over the page, at its left: one stack of flash
   messages, the failure, the refusal, then the passing notice, each with
   an × that closes it. Mocked over Book 4: under the band chosen over its
   empty middle, which never covers text; then refusals left and passing
   notices right, until the flash styling made one stack the choice.
2. A passing notice: a confirmation, a count, a progress line ("saved",
   "copied", "1 word", "exporting… 3 / 10"). It fades on its own clock, as
   now; a click copies its words, a routine one only goes.
3. A refusal: every line saying why an act did nothing (⌃⌘R's refusals,
   a refused paste, "no line numbers here", "already bookmarked"). It is
   no error, so it fades after ten seconds, or goes when closed, replaced
   by the next, or another entry is opened; first it stayed until clicked.
   A click copies its words.
4. A failure: what pins today ("not saved", "storage full", "cannot
   render", a failed export), and an error told as a refusal before ("Copy
   failed", a copy failed after the entry was left, "couldn't read the
   pictures"): pinned until closed or released by its owner; a click
   copies its detail.
5. A failure and a refusal at once: both, the failure above.
6. With three places, nothing waits for another: a progress line no
   longer drops a failure, a failure no longer waits for a progress line
   to end, a whisper no longer yields to a pin.
7. The backup's trouble pill stays at the bottom right.

## Record
- Asked after the first mock-up: the notices drawn as flash messages,
  with an × to dismiss (aackerman/ember-flash-queue): a tinted box per
  kind (failure red, refusal amber, passing green) and an × that closes
  without copying; a click on the words still copies them.
- The masthead is the anchor (`anchor-name`), so the notices sit 10px
  under it however tall its open folds make it: MEASURED in headless
  Helium over Book 4, 150px under a 140px band, 267px under 257px.
- Every "why not" line moved from `say` to `refuse`: about 40 calls
  across the session and the acts; "Source view, to replace" stays
  passing, said after the switch it names.
- The verdict gained "notices and places". A refusal now standing over
  a link held a step's ⌘-click (closed first, as a reader would); the
  Douay-Rheims box read Line or Verse by a race HEAD's build shows too,
  held by a reload before ⌃⌘G.
- Asked: every failure and refusal logged for later debugging, with its
  time, entry and action: kept three months in `gesta.v1.flashlog`, the
  action the reader's last key chord or control clicked, read in the
  console as `gesta.flashes()`. MEASURED in headless Helium: ⌃⌘R with
  nothing selected logged `⌃⌘R`, its words and its entry, kept across a
  reload.
- Asked: the tests read the flashes live, not as drawn: the page
  publishes them as `data-flashes`, and every reading of the corner reads
  that, the standing ones first, as the single corner showed them.
- Asked: the kinds named as flash messages usually are, "failure" and
  "refusal" being clear only from inside this discussion: error (red),
  warning (amber), success (green), info (blue). A passing flash is info
  or success by what it tells, not by who started it: "saved" and "backed
  up" are successes, a count or a progress line is info; a copy the
  clipboard refused became an error. The code's own words follow in U6.
- Asked: info and success each their own place, stacked error, warning,
  info, success, so a success shows while a progress line holds the info
  place; a hidden flash takes no room and so goes at once, no longer
  fading out.

## Review

- `/code-review high 206f40..8b63f48` (typed for 2062f40..8b63f48; the
  reviewer took it so): 163,562 tokens (MEASURED, the last message of
  `subagents/agent-a0284f02d6d2d9f80.jsonl`: 2 input + 2,630 cache
  creation + 156,752 cache read + 4,178 output); 10 findings, all in
  the flashes work; 73d8eb4's fit and passage changes traced clean.
- Fixed (findings 2, 4-10): an owner's release brings back a save failure
  still owed; a routine "saved" held back while one stands; a flash
  shown before it is logged, a log that is no list read as empty; the
  copy-failed error only closes; a named key is an action; three months
  back stops at the month's last day; the unused `say` deps gone, the
  Chromium refusal a warning; one in-page reader of the flashes for the
  tools.
- Asked (findings 1, 3): a strip one flash tall, kept always, sticky
  between the header and the entry, so no flash moves the text or
  covers it; the bars, lists and dialogs that hang from the header start
  below it, so it covers none of them nor they it (mocked over Book 4,
  each choice put to the reader). MEASURED in headless Helium over Book
  4: the heading at 264px whether the strip is empty or holds a warning;
  the ⌃⌘G bar 211-251px, under the strip's 205; the search results from
  the strip's foot. The page's visible top, the caret's clearance and a
  landing's centre all count the strip.

## Post-mortem

- MEASURED (the day's log): U5 09:20-12:37, its review's fixes
  12:39-13:57; 22 whole Helium verdicts begun, about 4 minutes each.
- The design moved some fifteen times in code (two corners, one stack,
  full width, a strip kept in and then out of the header; four kinds;
  fading; info and success apart; bars, dialogs, lists below the strip),
  each change rewriting tests and reshaping a 700-line approved run; the
  reader asked twice for mock-ups, and one design (the strip in the
  header) was built before it was seen.
- Readings tied to the drawn corner and to a fade's clock broke on each
  layout change and flaked on timing, until the readings read
  data-flashes (the reader's suggestion).
- Asked: three rules for CLAUDE.md (a visible change designed before it
  is built; a reading reads the app's state; only the touched sections
  played while a design moves), and working habits kept in memory.
