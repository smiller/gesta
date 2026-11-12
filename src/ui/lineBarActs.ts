import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Journal } from "../store/reference.ts";
import { refersByBookChapterParagraph, refersAsScripture } from "../store/reference.ts";
import { entryKey } from "../store/keys.ts";
import { paragraphHit, askKind, lineHits, lineRefusal, nextHit, landingWord, folioHit, folioRefusal, askCheck, askedLabel, stanzaAskCheck, stanzaHit, hasStanzas } from "../editor/goto.ts";
import { openFoldAt } from "../editor/folds.ts";
import { endsLineMark, landingPos, setLanding } from "../editor/landing.ts";
import { caretNear } from "../editor/rowKeys.ts";
import { mastheadBottom } from "./mastheadBottom.ts";

export interface LineBarDeps {
  lb: Screen["lineBar"];
  session: Pick<Session, "current" | "view" | "mdView">;
  journal: Journal;
  say(text: string, ms?: number): void;
  opened(): void;
  focusBar(): void;
  warmed(): boolean;
}
export interface LineBar {
  toggle(): void; reask(): void; input(kind: "line" | "page", v: string): void; enter(kind: "line" | "page", v: string, repeat: boolean): void;
  close(): void; dismiss(): void; landSoon(v: string): void; centreSoon(): void; replayOwed(): void;
}
export function lineBarActs(d: LineBarDeps): LineBar {
  const { lb, session, journal, say, opened, focusBar, warmed } = d;
  /* ⌃⌘G: GO TO A LINE, OR A PAGE. A find bar, not a prompt: the bar keeps
     focus and Enter cycles through the blocks that hold that line. The
     landing is CENTRED in the readable band under the masthead — a
     reader who asked for line 254 wants the lines around it, and so does
     one following a reference link, which lands the same way. The three
     routes aimed at the bar (Escape, the ×, ⌃⌘G again) hand the caret
     back to the landed row, the first cell of a pair, or just after a
     leaf marker; a navigation and a click outside take the plain close.
     A number is a coordinate into ONE text, so the boxes empty when the
     bar opens on another entry. */
  let lineAsked: number | string = 0, lastAskKey = "";
  function scrollIntoBand(rect: { top: number; bottom: number }): void {
    const top = mastheadBottom();
    const mid = top + (document.documentElement.clientHeight - top) / 2;
    window.scrollBy(0, (rect.top + rect.bottom) / 2 - mid);
  }
  function centreSelection(): void {
    const view = session.view;
    if (!view || session.mdView) return;
    if (view.state.selection.empty) return;
    const { from, to } = view.state.selection;
    const a = view.coordsAtPos(from), b = view.coordsAtPos(to);
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  }
  const landOn = (pos: number): void => {
    const view = session.view!;
    /* a landing inside a closed contents section opens it first: it stayed
       hidden and scrolled to nothing (pin: folds.test › openFoldAt opens the
       section a position is in) */
    openFoldAt(pos)(view.state, view.dispatch);
    setLanding(view, pos);
    const node = view.state.doc.nodeAt(pos)!;
    const a = view.coordsAtPos(pos + (node.isLeaf ? 0 : 1)), b = view.coordsAtPos(pos + node.nodeSize - (node.isLeaf ? 0 : 1));
    scrollIntoBand({ top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) });
  };
  const asksParagraphs = (): boolean => refersByBookChapterParagraph(session.current.date, session.current.tag, journal);
  const asksVerses = (): boolean => refersAsScripture(session.current.date, session.current.tag, journal);
  const lineLabel = (): string => (asksParagraphs() ? "Paragraph" : asksVerses() ? "Verse" : "Line");
  const goToLine = (n: number | string, quiet: boolean): boolean => {
    const view = session.view!;
    if (typeof n === "number" && asksParagraphs()) {
      const hit = paragraphHit(view.state.doc, n);
      if (typeof hit === "string") { say(hit, 3000); return false; }
      landOn(hit.pos);
      return true;
    }
    const { hits, blocks } = lineHits(view.state.doc, n);
    const noun = asksVerses() ? "verse" : undefined;
    if (!hits.length) { say(lineRefusal(blocks, n, noun), 3000); return false; }
    const hit = nextHit(hits, landingPos(view.state), n === lineAsked);
    lineAsked = n;
    landOn(hit.pos);
    const word = landingWord(hit, { hits, blocks }, n, noun);
    if (word && spoken(quiet, hit.skipped)) say(word, 2500);
    return true;
  };
  const spoken = (quiet: boolean, skipped?: boolean): boolean => !quiet || !!skipped;
  /* what the Line box's words name on this page, the box and a link to a line
     alike (pin: a link to a line › a link to a stanza, and line) */
  const askLine = (v: string, quiet: boolean): boolean => {
    const doc = session.view!.state.doc;
    /* on a page holding stanzas the Line box takes `N` or `N.M`, stanza and
       line, one place each; a plain verse page keeps the line ask (pin:
       stanza › ⌃⌘G 2.1) */
    if (hasStanzas(doc)) {
      const bad = stanzaAskCheck(v);
      if (bad) { say(bad, 2000); return false; }
      const hit = stanzaHit(doc, v);
      if (typeof hit === "string") { say(hit, 3000); return false; }
      landOn(hit.pos);
      return true;
    }
    const label = askedLabel(doc, v);
    if (label) return goToLine(label, quiet);
    const why = askCheck(v, "line", lineLabel().toLowerCase());
    if (why) { say(why, 2000); return false; }
    return goToLine(parseInt(v.trim(), 10), quiet);
  };
  /* before the warm a work's own page, which says how it is referred to, may
     not be read (pin: a link to a line › a link to a paragraph before the warm) */
  let lineOwed: { v: string; key: string } | null = null;
  let endLinkMark: (() => void) | null = null;
  const untilHand = (act: () => void): (() => void) => {
    const onKey = (e: KeyboardEvent): void => { if (endsLineMark(e.key, e.metaKey)) stop(); };
    const stop = (): void => {
      removeEventListener("click", stop, true);
      removeEventListener("keydown", onKey, true);
      endLinkMark = null;
      act();
    };
    addEventListener("click", stop, true);
    addEventListener("keydown", onKey, true);
    return stop;
  };
  const landFromLink = (v: string): void => {
    const view = session.view;
    if (!view || session.mdView) return;
    endLinkMark?.();
    if (!warmed()) {
      lineOwed = { v, key: entryKey(session.current.date, session.current.tag) };
      /* what the hand does meanwhile stands: a landing owed moves no caret (pin:
         a link to a line › a key before the warm) */
      endLinkMark = untilHand(() => { lineOwed = null; });
      return;
    }
    if (!askLine(v, true)) return;
    /* the next key goes from the line, not the page's top (pin: a link to a
       line › a link to a line, a key after arriving) */
    const landed = landingPos(view.state);
    if (landed !== null) caretOn(view, landed);
    view.focus();
    /* no bar stands open to end the mark: a click or a key that moves does, a
       scrollbar's press and a tap's scroll not
       (pin: a link to a line › a link to a line, the next click)
       (pin: landing.test › a key that moves or writes) */
    endLinkMark = untilHand(() => { if (session.view) setLanding(session.view, null); });
  };
  const goToFolio = (tok: string): void => {
    const view = session.view!;
    const hit = folioHit(view.state.doc, tok);
    if (!hit) { say(folioRefusal(view.state.doc, tok), 3000); return; }
    landOn(hit.pos);
  };
  const closeLineBar = (): void => {
    if (!lb.open) return;
    if (session.view) setLanding(session.view, null);
    lb.open = false;
  };
  const dismissBar = closeLineBar;
  /* the caret hand-back: only the routes aimed at the bar */
  const caretOn = (view: NonNullable<typeof session.view>, pos: number): void => {
    const node = view.state.doc.nodeAt(pos);
    if (!node) return;
    const at = node.isLeaf ? pos + 1 : pos + 1 + (node.type.name === "pair" ? 1 : 0);
    view.dispatch(view.state.tr.setSelection(caretNear(view.state.doc, at)));
  };
  const putLineCaret = (): void => {
    if (!lb.open) return;
    const view = session.view;
    const had = document.querySelector(".linebar")?.contains(document.activeElement);
    const pos = view ? landingPos(view.state) : null;
    closeLineBar();
    if (!view) return;
    if (had && pos !== null) caretOn(view, pos);
    view.focus();
  };
  const askedFor = (): string => (asksParagraphs() ? "a paragraph" : asksVerses() ? "a verse" : "a line or a page");
  const noNumbers = (): string => (asksParagraphs() ? "no paragraph numbers here" : asksVerses() ? "no verse numbers here" : "no line or page numbers here");
  const freshAsk = (): void => {
    const c = session.current, askKey = entryKey(c.date, c.tag);
    if (askKey === lastAskKey) return;
    lastAskKey = askKey; lb.line = ""; lb.page = ""; lineAsked = 0;
  };
  const toggleBar = () => {
    if (lb.open) { putLineCaret(); return; }
    if (session.mdView) { say("Switch to the rendered view to go to " + askedFor(), 3000); return; }
    const view = session.view;
    if (!view) return;
    const kind = askKind(view.state.doc);
    if (kind === "none") { say(noNumbers(), 2000); return; }
    freshAsk();
    opened();
    lb.kind = kind;
    lb.lineLabel = lineLabel();
    lb.open = true;
    setTimeout(() => focusBar(), 0);
  };
  /* the boxes follow the entry under the open bar, and a box hidden under
     the focus hands it to the one shown; an entry that answers neither keeps
     both (pin: notices and surfaces › the line bar
     re-asked when the entry gains a page marker) */
  const switchKind = (kind: typeof lb.kind): void => {
    const held = document.activeElement?.closest(".linebar") ? document.activeElement : null;
    lb.kind = kind;
    if (held) setTimeout(() => { if (held.closest("[hidden]")) focusBar(); }, 0);
  };
  const reaskBar = (): void => {
    const view = session.view;
    if (!lb.open || !view) return;
    lb.lineLabel = lineLabel();
    const asked = askKind(view.state.doc), kind = asked === "none" ? "both" : asked;
    if (kind !== lb.kind) switchKind(kind);
  };
  const inputBar = (kind: "line" | "page", v: string): void => { if (kind === "line") { lb.line = v; lineAsked = 0; } else lb.page = v; };
  const enterBar = (kind: "line" | "page", v: string, repeat: boolean): void => {
    if (repeat) return;
    if (session.mdView || !session.view) return;
    if (kind === "line") { askLine(v, false); return; }
    const why = askCheck(v, kind, lineLabel().toLowerCase());
    if (why) { say(why, 2000); return; }
    goToFolio(v.trim());
  };
  const closeBar = putLineCaret;
  /* a click whose press began in the bar is a drag out of a box, not a
     click away (pin: notices and surfaces › a drag
     from the Line box out over the entry) */
  let pressedInBar = false;
  document.addEventListener("mousedown", (e) => { pressedInBar = !!(e.target as Element | null)?.closest(".linebar"); }, true);
  document.addEventListener("click", (e) => {
    const fromBar = pressedInBar;
    pressedInBar = false;
    if (!lb.open || fromBar) return;
    if (e.clientX > document.documentElement.clientWidth || e.clientY > document.documentElement.clientHeight) return;
    if ((e.target as Element).closest(".linebar")) return;
    closeLineBar();
  });
  const replayOwed = (): void => {
    if (!lineOwed) return;
    const owed = lineOwed;
    endLinkMark?.();
    if (owed.key === entryKey(session.current.date, session.current.tag)) landFromLink(owed.v);
  };
  /* a jump's selection is centred A FRAME AFTER it was placed: centred at
     once, a passage in Horace sat exactly mid-band, then a paired entry's
     rows re-wrapped, the page shrank from 6611px to 2065px, the scroll
     clamped and the passage sat 304px above centre, under the masthead
     (MEASURED in headless Helium); a frame later the box has settled (pin:
     reference paste › the reference link followed) */
  const centreSoon = (): void => { requestAnimationFrame(centreSelection); };
  const landSoon = (v: string): void => { requestAnimationFrame(() => landFromLink(v)); };
  return { toggle: toggleBar, reask: reaskBar, input: inputBar, enter: enterBar, close: closeBar, dismiss: dismissBar, landSoon, centreSoon, replayOwed };
}
