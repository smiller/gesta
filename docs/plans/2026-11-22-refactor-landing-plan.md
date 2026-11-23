# The landing out of the Go to popup, and one reading of the page's top (A15.1.1)

Asked 2026-11-22, from the architecture run over a52e7e3..HEAD: "Let's
explore 2 with 1 folded in", yes to seven questions, then "Go".

## Decisions

1. A landing module, src/ui/landingActs.ts: it lands on a position
   (opening a fold, setting the mark, centring it in the band), follows a
   link to a line (held until the warm, replayed on the same entry, the
   mark ended by the hand's next click or moving key), and centres a
   search highlight a frame after it is placed. Following a link asks
   goto.ts as the popup's Enter does, so the ask and its standing number
   move with it, and so does the caret's hand-back to the landed row. The
   popup's module keeps its boxes, Enter, the close and when its boxes
   empty.
2. The session's onLine and onHighlight and the post-warm replay go to the
   landing; main.ts's lineActs becomes gotoPopup, with landing beside it.
3. The landing takes a page port (scroll by, the band's top, the window's
   height) and a hand port (the next click or key, and stopping); node
   tests pin the warm-held replay and the hand ending the mark; the Helium
   pins stay; the popup's test loses its document stub and its stale info.
4. alertArea.ts owns the page's top: pageTop(), a live measure for placing
   after a change, and pageTopCached(), the observer's value for the scroll
   at each keystroke. visibleTop.ts, session's own masthead observer and
   its Math.max go.
5. The Helium tools read the root's --alert-area-bottom, not the
   expression copied three times; the step's wait for the alert area to
   follow the masthead stays.
6. GLOSSARY.md gains Landing.
7. One plan, one commit, test-first; the Helium verdict unchanged.

## Record
- The architecture run's cost: the walk, 138,554 tokens (its transcript's
  last message). Its five candidates: 2 and 1 built here; 3 and 4 built
  next (docs/plans/2026-11-22-refactor-boxes-and-echo-plan.md); 5 queued
  behind U8 (A15.1.2), asked: "Set aside 5, maybe make a note to look at it
  once U8 is done."
- Built: landingActs.ts with `answer`, `forgetAsked`, `caretBack`,
  `unmark`, `followSoon`, `centreSoon`, `replayOwed`, over a page port and
  a hand port (`windowPage`, `windowHand` the browser's); the ask and its
  standing number moved from the popup, which a link to a line shares.
- The popup's module takes `landing` and a `listen` port; its test lost
  its document stub and the stale `info` behind a cast.
- alertArea.ts: `pageTop()` and `pageTopCached()`; visibleTop.ts and
  session's masthead observer are gone.
- Four tool readings, not three, copied the expression (app.ts:132, 157,
  290; places.ts:159); each reads --alert-area-bottom.
- Code Health: main.ts first fell to 9.09 (the hand port's paired
  listeners read as duplication), the landing to 9.68 (a three-part
  condition); the window ports moved into landingActs.ts and `drawnView`
  split the condition: both at 10.
- Helium: the verdict matched the approved run unchanged.
