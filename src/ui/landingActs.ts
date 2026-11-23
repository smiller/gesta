import type { Session } from "../session.ts";
import { entryKey } from "../store/keys.ts";
import { ask, type Words } from "../editor/goto.ts";
import type { Conventions } from "../store/conventions.ts";
import { openFoldAt } from "../editor/folds.ts";
import { endsLineMark, landingPos, setLanding } from "../editor/landing.ts";
import { caretNear } from "../editor/rowKeys.ts";
import type { Raise } from "../model/alertText.ts";
import { pageTop } from "./alertArea.ts";

/* the window the landing scrolls: `top` is where the page shows from */
export interface LandingPage { scrollBy(dy: number): void; top(): number; height(): number; nextFrame(f: () => void): void }
/* the hand's next click or key, until the returned stop */
export interface Hand { listen(onClick: () => void, onKey: (e: { key: string; metaKey: boolean }) => void): () => void }
export const windowPage: LandingPage = { scrollBy: (dy) => window.scrollBy(0, dy), top: pageTop, height: () => document.documentElement.clientHeight, nextFrame: (f) => requestAnimationFrame(f) };
export const windowHand: Hand = {
  listen: (onClick, onKey) => {
    const on = (add: boolean): void => {
      (add ? addEventListener : removeEventListener)("click", onClick, true);
      (add ? addEventListener : removeEventListener)("keydown", onKey, true);
    };
    on(true);
    return () => on(false);
  },
};
export interface LandingDeps {
  session: Pick<Session, "current" | "view" | "mdView">;
  conventions(): Conventions;
  raise: Raise;
  warmed(): boolean;
  page: LandingPage;
  hand: Hand;
}
export interface Landing {
  /* asks the entry for the words, lands on the answer or says why not; true when it landed */
  answer(words: Words, from: "popup" | "link"): boolean;
  /* the next ask starts its cycle afresh */
  forgetAsked(): void;
  caretBack(): void;
  unmark(): void;
  followSoon(line: string): void;
  centreSoon(): void;
  replayOwed(): void;
}
type View = NonNullable<Session["view"]>;

export function landingActs(d: LandingDeps): Landing {
  const { session, conventions, raise, warmed, page, hand } = d;
  /* the landing is CENTRED in the readable band under the masthead — a
     reader who asked for line 254 wants the lines around it, and so does
     one following a reference link, which lands the same way */
  let lineAsked: number | string = 0;
  function scrollIntoBand(rect: { top: number; bottom: number }): void {
    const top = page.top();
    page.scrollBy((rect.top + rect.bottom) / 2 - (top + (page.height() - top) / 2));
  }
  const drawnView = (): View | null => (session.mdView ? null : session.view);
  function centreSelection(): void {
    const view = drawnView();
    if (!view || view.state.selection.empty) return;
    const { from, to } = view.state.selection;
    const a = view.coordsAtPos(from), b = view.coordsAtPos(to);
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  }
  const landOn = (view: View, pos: number): void => {
    /* a landing inside a closed contents section opens it first: it stayed
       hidden and scrolled to nothing (pin: folds.test › openFoldAt opens the
       section a position is in) */
    openFoldAt(pos)(view.state, view.dispatch);
    setLanding(view, pos);
    const node = view.state.doc.nodeAt(pos)!;
    const a = view.coordsAtPos(pos + (node.isLeaf ? 0 : 1)), b = view.coordsAtPos(pos + node.nodeSize - (node.isLeaf ? 0 : 1));
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  };
  const answer = (words: Words, from: "popup" | "link"): boolean => {
    const view = session.view!;
    const a = ask(view.state.doc, conventions(), words, { pos: landingPos(view.state), asked: lineAsked }, from);
    if ("pos" in a) { lineAsked = a.asked; landOn(view, a.pos); }
    if (a.said) raise(a.said);
    return "pos" in a;
  };
  const caretOn = (view: View, pos: number): void => {
    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    const at = node.isLeaf ? pos + 1 : pos + 1 + (node.type.name === "pair" ? 1 : 0);
    view.dispatch(view.state.tr.setSelection(caretNear(view.state.doc, at)));
  };
  const caretBack = (): void => {
    const view = session.view;
    const pos = view ? landingPos(view.state) : null;
    if (view && pos !== null) caretOn(view, pos);
  };
  const unmark = (): void => { if (session.view) setLanding(session.view, null); };
  /* before the warm a work's own page, which says how it is referred to, may
     not be read (pin: a link to a line › a link to a paragraph before the warm) */
  let lineOwed: { v: string; key: string } | null = null;
  let endLinkMark: (() => void) | null = null;
  const untilHand = (act: () => void): (() => void) => {
    const stop = (): void => { quiet(); endLinkMark = null; act(); };
    const quiet = hand.listen(stop, (e) => { if (endsLineMark(e.key, e.metaKey)) stop(); });
    return stop;
  };
  const here = (): string => entryKey(session.current.date, session.current.tag);
  const follow = (v: string): void => {
    const view = drawnView();
    if (!view) return;
    endLinkMark?.();
    if (!warmed()) {
      lineOwed = { v, key: here() };
      /* what the hand does meanwhile stands: a landing owed moves no caret (pin:
         a link to a line › a key before the warm) */
      endLinkMark = untilHand(() => { lineOwed = null; });
      return;
    }
    if (!answer({ line: v }, "link")) return;
    /* the next key goes from the line, not the page's top (pin: a link to a
       line › a link to a line, a key after arriving) */
    caretBack();
    view.focus();
    /* no popup stands open to end the mark: a click or a key that moves does, a
       scrollbar's press and a tap's scroll not
       (pin: a link to a line › a link to a line, the next click)
       (pin: landing.test › a key that moves or writes) */
    endLinkMark = untilHand(unmark);
  };
  const replayOwed = (): void => {
    if (!lineOwed) return;
    const owed = lineOwed;
    endLinkMark?.();
    if (owed.key === here()) follow(owed.v);
  };
  /* a jump's selection is centred A FRAME AFTER it was placed: centred at
     once, a passage in Horace sat exactly mid-band, then a paired entry's
     rows re-wrapped, the page shrank from 6611px to 2065px, the scroll
     clamped and the passage sat 304px above centre, under the masthead
     (MEASURED in headless Helium); a frame later the box has settled (pin:
     reference paste › the reference link followed) */
  const centreSoon = (): void => page.nextFrame(centreSelection);
  const followSoon = (v: string): void => page.nextFrame(() => follow(v));
  return { answer, forgetAsked: () => { lineAsked = 0; }, caretBack, unmark, followSoon, centreSoon, replayOwed };
}
