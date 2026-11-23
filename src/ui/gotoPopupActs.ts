import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Journal } from "../store/reference.ts";
import { conventionsOf } from "../store/conventions.ts";
import { entryKey } from "../store/keys.ts";
import { popup, type Words } from "../editor/goto.ts";
import type { Raise } from "../model/alertText.ts";
import type { Landing } from "./landingActs.ts";

export interface GotoPopupDeps {
  lb: Screen["gotoPopup"];
  session: Pick<Session, "current" | "view" | "mdView">;
  journal: Journal;
  raise: Raise;
  opened(): void;
  focusBar(): void;
  landing: Landing;
  /* a listener on the document, in its capture phase */
  listen(type: "mousedown" | "click", f: (e: MouseEvent) => void): void;
}
export interface GotoPopup {
  toggle(): void; reask(): void; input(kind: "line" | "page" | "stanza", v: string): void; enter(kind: "line" | "page" | "stanza", v: string, repeat: boolean): void;
  close(): void; dismiss(): void;
}
export function gotoPopupActs(d: GotoPopupDeps): GotoPopup {
  const { lb, session, journal, raise, opened, focusBar, landing, listen } = d;
  /* ⌃⌘G: GO TO A LINE, A PAGE, A PARAGRAPH, A VERSE OR A STANZA. Like a find bar, not a prompt: the popup keeps
     focus and Enter cycles through the blocks that hold that line. The three
     routes aimed at the popup (Escape, the ×, ⌃⌘G again) hand the caret
     back to the landed row; a navigation and a click outside take the
     plain close.
     A number is a coordinate into ONE text, so the boxes empty when the
     popup opens on another entry. */
  let lastAskKey = "";
  const conventions = () => conventionsOf(session.current.date, session.current.tag, journal);
  const closeGotoPopup = (): void => {
    if (!lb.open) return;
    landing.unmark();
    lb.open = false;
  };
  const dismissBar = closeGotoPopup;
  /* the caret hand-back: only the routes aimed at the popup */
  const putLineCaret = (): void => {
    if (!lb.open) return;
    const view = session.view;
    const had = document.querySelector(".goto-popup")?.contains(document.activeElement);
    if (had) landing.caretBack();
    closeGotoPopup();
    view?.focus();
  };
  const freshAsk = (): void => {
    const c = session.current, askKey = entryKey(c.date, c.tag);
    if (askKey === lastAskKey) return;
    lastAskKey = askKey; lb.line = ""; lb.page = ""; lb.stanza = ""; landing.forgetAsked();
  };
  const toggleBar = () => {
    if (lb.open) { putLineCaret(); return; }
    if (session.mdView) { raise(popup(null, conventions()).inSource); return; }
    const view = session.view;
    if (!view) return;
    const b = popup(view.state.doc, conventions());
    if (b.kind === "none") { raise(b.none); return; }
    freshAsk();
    opened();
    lb.kind = b.kind;
    lb.lineLabel = b.label;
    lb.pageLabel = b.pageLabel;
    lb.open = true;
    setTimeout(() => focusBar(), 0);
  };
  /* the boxes follow the entry under the open popup, and a box hidden under
     the focus hands it to the one shown; an entry that answers neither keeps
     both (pin: alerts and surfaces › the Go to popup
     re-asked when the entry gains a page marker) */
  const switchKind = (kind: typeof lb.kind): void => {
    const held = document.activeElement?.closest(".goto-popup") ? document.activeElement : null;
    lb.kind = kind;
    if (held) setTimeout(() => { if (held.closest("[hidden]")) focusBar(); }, 0);
  };
  const reaskBar = (): void => {
    const view = session.view;
    if (!lb.open || !view) return;
    const b = popup(view.state.doc, conventions());
    lb.lineLabel = b.label;
    lb.pageLabel = b.pageLabel;
    const kind = b.kind === "none" ? "both" : b.kind;
    if (kind !== lb.kind) switchKind(kind);
  };
  /* two boxes joined by "or" ask one number: typing in one empties the
     other, which stayed and read as asked too */
  const inputBar = (kind: "line" | "page" | "stanza", v: string): void => {
    if (kind === "line") { lb.line = v; landing.forgetAsked(); } else lb[kind] = v;
    if (lb.kind !== "both" || !v) return;
    if (kind === "line") lb.page = "";
    else if (kind === "page") { lb.line = ""; landing.forgetAsked(); }
  };
  /* on a page in stanzas Enter in either box asks with both */
  const wordsOf = (kind: "line" | "page" | "stanza", v: string): Words => {
    if (lb.kind === "stanza") return { stanza: kind === "stanza" ? v : lb.stanza, line: kind === "line" ? v : lb.line };
    return kind === "page" ? { page: v } : { line: v };
  };
  const enterBar = (kind: "line" | "page" | "stanza", v: string, repeat: boolean): void => {
    if (repeat) return;
    if (session.mdView || !session.view) return;
    landing.answer(wordsOf(kind, v), "popup");
  };
  const closeBar = putLineCaret;
  /* a click whose press began in the popup is a drag out of a box, not a
     click away (pin: alerts and surfaces › a drag
     from the Line box out over the entry) */
  let pressedInBar = false;
  listen("mousedown", (e) => { pressedInBar = !!(e.target as Element | null)?.closest(".goto-popup"); });
  listen("click", (e) => {
    const fromBar = pressedInBar;
    pressedInBar = false;
    if (!lb.open || fromBar) return;
    if (e.clientX > document.documentElement.clientWidth || e.clientY > document.documentElement.clientHeight) return;
    if ((e.target as Element).closest(".goto-popup")) return;
    closeGotoPopup();
  });
  return { toggle: toggleBar, reask: reaskBar, input: inputBar, enter: enterBar, close: closeBar, dismiss: dismissBar };
}
