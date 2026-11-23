import type { EditorState, Transaction } from "prosemirror-state";
import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import { bold, italic, underline, strike, heading, quote, codeBlock, codeBlockRefusal, curlSelection, inCode, formatState } from "../editor/format.ts";
import { blankRowSelected } from "../editor/rowKeys.ts";
import { passageAt } from "../editor/passage.ts";
import { pageTop } from "./alertArea.ts";
import { said, type Raise } from "../model/alertText.ts";

type BarView = NonNullable<Session["view"]>;
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export interface FormatToolbarDeps {
  toolbar: Screen["formatToolbar"];
  buttons: () => Screen["masthead"]["buttons"];
  session: Pick<Session, "view" | "mdView" | "copyReference" | "showWordCount">;
  raise: Raise;
  extract(): void;
  mountEl: HTMLElement;
  head: Element;
}
export interface FormatToolbar { place(): void; suppress(): void; act(act: string): void }

const COMMANDS: Record<string, Command> = { bold, italic, underline, strike, heading, quote, code: codeBlock, curl: curlSelection };

const liveSelection = (): Selection | null => {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.isCollapsed ? null : sel;
};
const barSelection = (view: BarView): Selection | null => {
  const sel = liveSelection();
  if (!sel || !view.dom.contains(sel.anchorNode)) return null;
  return blankRowSelected(view.state) ? null : sel;
};

const drawn = (rect: DOMRect): boolean => !!(rect.width || rect.height);

/* the toolbar is 39px tall and stands 10px over its anchor, so it needs 49px above
   the selection and 8 more clear of the page's top: what it lacks, the text
   moves down by, where a first line's toolbar covered the alert area (pin:
   formatToolbarActs.test › the text moves down) */
export const roomAbove = (selTop: number, pageTop: number): number => Math.max(0, pageTop + 57 - selTop);
export function formatToolbar(d: FormatToolbarDeps): FormatToolbar {
  const { toolbar, buttons, session, raise, extract, mountEl, head } = d;
  /* THE FORMAT TOOLBAR: placed over the selection on every selection change
     (a frame later) and scroll, clamped under the masthead; hidden in the
     source view and over a search jump's selection until a reader next
     touches the page — the toolbar is for text a reader chose to format (pin:
     format toolbar › a word double-clicked) */
  let barSuppressed = false;
  const barView = (): Session["view"] => {
    const view = session.view;
    if (!view || session.mdView) return null;
    return barSuppressed ? null : view;
  };
  /* the text moves only when a gesture settles, a button or a key let go:
     moved under a drag or a scroll, it would stretch the selection or fight
     the scroll (pin: the entry's top › a word on the first line double-clicked) */
  let moved = 0;
  const moveText = (by: number): void => { moved = by; mountEl.style.paddingTop = by ? by + "px" : ""; };
  const settled = (rect: DOMRect): DOMRect => {
    const by = roomAbove(rect.top - moved, pageTop());
    if (by === moved) return rect;
    moveText(by);
    return placedOver() ?? rect;
  };
  const showAt = (view: BarView, rect: DOMRect): void => {
    toolbar.left = rect.left + rect.width / 2;
    toolbar.top = Math.max(rect.top, pageTop() + 8);
    toolbar.incode = inCode(view.state);
    toolbar.on = formatState(view.state);
    toolbar.canTag = buttons().canCreate;
    const p = passageAt(view.state.doc, view.state.selection.from, view.state.selection.to);
    toolbar.canRefAll = !("refused" in p) && !!p.facing;
    toolbar.tagTitle = buttons().tagTitle;
    toolbar.show = true;
  };
  const placedOver = (): DOMRect | null => {
    const view = barView();
    const rect = view ? barSelection(view)?.getRangeAt(0).getBoundingClientRect() : undefined;
    return rect && drawn(rect) ? rect : null;
  };
  const hide = (): void => { toolbar.show = false; if (moved) moveText(0); };
  const place = (settle = false): void => {
    const rect = placedOver();
    if (rect) showAt(session.view!, settle ? settled(rect) : rect);
    else hide();
  };
  document.addEventListener("selectionchange", () => requestAnimationFrame(() => place()));
  for (const ev of ["mouseup", "keyup"]) document.addEventListener(ev, () => requestAnimationFrame(() => place(true)));
  window.addEventListener("scroll", () => place(), { passive: true });
  /* a masthead row opening or closing moves the text under the toolbar (pin:
     alerts and surfaces › the format toolbar after
     Line numbering opens) */
  new ResizeObserver(() => requestAnimationFrame(() => place())).observe(head);
  document.addEventListener("mousedown", () => { barSuppressed = false; });
  mountEl.addEventListener("keydown", () => { barSuppressed = false; });
  const suppress = (): void => { barSuppressed = true; hide(); };
  const elsewhere: Record<string, () => void> = {
    reference: () => session.copyReference(),
    referenceAll: () => session.copyReference(true),
    words: () => session.showWordCount(),
    tag: extract,
  };
  const format = (view: BarView, act: string): void => {
    const cmd = COMMANDS[act];
    if (cmd && !cmd(view.state, view.dispatch)) raise((act === "code" && codeBlockRefusal(view.state)) || said("nothingToChange"));
    view.focus();
    place();
  };
  const act = (name: string): void => {
    const view = session.view;
    if (!view) return;
    if (elsewhere[name]) elsewhere[name]();
    else format(view, name);
  };
  return { place, suppress, act };
}
