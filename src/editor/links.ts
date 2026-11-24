/* The modifier wins for EVERY link, internal ones included: ⌘-click is the
   one way to open the journal side by side in a second tab (pin: links.test
   › the modifier opens EVERY link in a new tab). A plain click on an
   external link keeps placing the caret (pin: links.test › a plain click on
   an external link does nothing). THE MODIFIED PRESS IS TAKEN ON MOUSEDOWN:
   a ⌘-mousedown is ProseMirror's own "select this node" gesture, and a
   handler on click ran after it had selected the whole paragraph and raised
   the format toolbar (pin: launch, menus, the corner, links › ⌘-click on an
   external link); it is taken even on an address that may not open (pin:
   links.test › is taken whether or not the address may open). The plain
   click stays a click, so a drag that starts on a link routes nothing. */
import type { EditorView } from "prosemirror-view";
import type { Command, EditorState } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { internalHash, entryAt } from "../store/nav.ts";

export type LinkAction = { kind: "open"; href: string } | { kind: "route"; frag: string } | null;
/* a script or data address opened in a new tab would run beside the
   journal's own storage, wherever the link came from
   (pin: links.test › is opened, by the key or the modifier, only as a web) */
const OPENED = new Set(["http:", "https:", "mailto:", "file:"]);
const opens = (href: string, docHref: string): LinkAction => {
  try { return OPENED.has(new URL(href, docHref).protocol) ? { kind: "open", href } : null; } catch { return null; }
};
export function linkAction(href: string | null, modified: boolean, docHref: string = location.href): LinkAction {
  if (!href) return null;
  if (modified) return opens(href, docHref);
  const frag = internalHash(href, docHref);
  return frag ? { kind: "route", frag } : null;
}
/* the entry's last part, so a list of dated sub-entries tells each one's date
   without a heading for it (pin: links.test › a link into the journal names) */
export function linkTitle(href: string, docHref: string = location.href): string {
  if (!opens(href, docHref)) return "";
  const hint = "⌘-click to open";
  const frag = href ? internalHash(href, docHref) : null;
  const p = frag ? entryAt(frag) : null;
  if (!p) return hint;
  return hint + " " + (p.tag ? p.tag.slice(p.tag.lastIndexOf("/") + 1) : p.date);
}
const hrefOf = (n: Node | null | undefined): string | null => n?.marks.find((m) => m.type.name === "link")?.attrs.href ?? null;
export function linkAtCaret(state: EditorState): string | null {
  if (!state.selection.empty) return null;
  const $h = state.selection.$head;
  return hrefOf($h.nodeAfter) ?? hrefOf($h.nodeBefore);
}
/* a key has no modifier to spare for "elsewhere": a link out of the
   journal opens in a new tab, or the key would do nothing (pin: links.test
   › is followed by the key in this tab when it names an entry) */
export const keyAction = (href: string, docHref: string = location.href): LinkAction => linkAction(href, false, docHref) ?? opens(href, docHref);
export interface LinkPorts { route(frag: string): void; open(url: string): void }
function followLink(act: LinkAction, ports: LinkPorts, docHref: string): void {
  if (!act) return;
  if (act.kind === "open") ports.open(new URL(act.href, docHref).href);
  else ports.route(act.frag);
}
export const followAtCaret = (ports: LinkPorts, docHref: string = location.href): Command => (state) => {
  const href = linkAtCaret(state);
  followLink(href ? keyAction(href, docHref) : null, ports, docHref);
  return true;
};
export function linkClick(ports: LinkPorts, phase: "mousedown" | "click", docHref: () => string = () => location.href): (view: EditorView, e: MouseEvent) => boolean {
  return (_view, e) => {
    const a = (e.target as Element | null)?.closest("a");
    if (!a) return false;
    const modified = e.metaKey || e.ctrlKey;
    if (modified !== (phase === "mousedown")) return false;
    const act = linkAction(a.getAttribute("href"), modified, docHref());
    if (!act && !modified) return false;
    e.preventDefault();
    followLink(act, ports, docHref());
    return true;
  };
}
