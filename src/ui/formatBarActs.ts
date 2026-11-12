import type { EditorState, Transaction } from "prosemirror-state";
import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import { bold, italic, underline, strike, heading, quote, codeBlock, codeBlockRefusal, curlSelection, inCode, formatState } from "../editor/format.ts";
import { blankRowSelected } from "../editor/rowKeys.ts";
import { offersBoth } from "../editor/reference.ts";

type BarView = NonNullable<Session["view"]>;
type Command = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;

export interface FormatBarDeps {
  bar: Screen["bar"];
  buttons: () => Screen["masthead"]["buttons"];
  session: Pick<Session, "view" | "mdView" | "copyReference" | "showWordCount">;
  say(text: string, ms?: number): void;
  extract(): void;
  mountEl: HTMLElement;
  head: Element;
}
export interface FormatBar { place(): void; suppress(): void; act(act: string): void }

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

export function formatBar(d: FormatBarDeps): FormatBar {
  const { bar, buttons, session, say, extract, mountEl, head } = d;
  /* THE FLOATING BAR: placed over the selection on every selection change
     (a frame later) and scroll, clamped under the masthead; hidden in the
     source view and over a search jump's selection until a reader next
     touches the page — the bar is for text a reader chose to format (pin:
     toolbar › a word double-clicked) */
  let barSuppressed = false;
  const barView = (): Session["view"] => {
    const view = session.view;
    if (!view || session.mdView) return null;
    return barSuppressed ? null : view;
  };
  const showAt = (view: BarView, rect: DOMRect): void => {
    const floor = (head.getBoundingClientRect().bottom || 0) + 8;
    bar.left = rect.left + rect.width / 2;
    bar.top = Math.max(rect.top, floor);
    bar.incode = inCode(view.state);
    bar.on = formatState(view.state);
    bar.canTag = buttons().canCreate;
    bar.canRefAll = offersBoth(view.state);
    bar.tagTitle = buttons().tagTitle;
    bar.show = true;
  };
  const placedOver = (): DOMRect | null => {
    const view = barView();
    const rect = view ? barSelection(view)?.getRangeAt(0).getBoundingClientRect() : undefined;
    return rect && drawn(rect) ? rect : null;
  };
  const place = (): void => {
    const rect = placedOver();
    if (rect) showAt(session.view!, rect);
    else bar.show = false;
  };
  document.addEventListener("selectionchange", () => requestAnimationFrame(place));
  window.addEventListener("scroll", place, { passive: true });
  /* a header row opening or closing moves the text under the bar (pin:
     notices and surfaces as the old app has them › the format bar after
     Line numbering opens) */
  new ResizeObserver(() => requestAnimationFrame(place)).observe(head);
  document.addEventListener("mousedown", () => { barSuppressed = false; });
  mountEl.addEventListener("keydown", () => { barSuppressed = false; });
  const suppress = (): void => { barSuppressed = true; bar.show = false; };
  const elsewhere: Record<string, () => void> = {
    reference: () => session.copyReference(),
    referenceAll: () => session.copyReference(true),
    words: () => session.showWordCount(),
    tag: extract,
  };
  const format = (view: BarView, act: string): void => {
    const cmd = COMMANDS[act];
    if (cmd && !cmd(view.state, view.dispatch)) say((act === "code" && codeBlockRefusal(view.state)) || "nothing to change there", 2000);
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
