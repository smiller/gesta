/* The modifier wins for EVERY link, internal ones included: ⌘-click is the
   one way to open the journal side by side in a second tab (pin: links.test
   › the modifier opens EVERY link in a new tab). A plain click on an
   external link keeps placing the caret (pin: links.test › a plain click on
   an external link does nothing). THE MODIFIED PRESS IS TAKEN ON MOUSEDOWN:
   a ⌘-mousedown is ProseMirror's own "select this node" gesture, and a
   handler on click ran after it had selected the whole paragraph and raised
   the format toolbar (pin: launch, menus, the corner, links › ⌘-click on an
   external link). The plain click stays a click, so a drag that starts on
   a link routes nothing. */
import type { EditorView } from "prosemirror-view";
import type { EditorState } from "prosemirror-state";
import type { Node } from "prosemirror-model";
import { internalHash, entryAt } from "../store/nav.ts";

export type LinkAction = { kind: "open"; href: string } | { kind: "route"; frag: string } | null;
export function linkAction(href: string | null, modified: boolean, docHref: string = location.href): LinkAction {
  if (!href) return null;
  if (modified) return { kind: "open", href };
  const frag = internalHash(href, docHref);
  return frag ? { kind: "route", frag } : null;
}
/* the entry's last part, so a list of dated sub-entries tells each one's date
   without a heading for it (pin: links.test › a link into the journal names) */
export function linkTitle(href: string, docHref: string = location.href): string {
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
const readable = (href: string, docHref: string): boolean => { try { new URL(href, docHref); return true; } catch { return false; } };
/* a key has no modifier to spare for "elsewhere": a link out of the
   journal opens in a new tab, or the key would do nothing (pin: links.test
   › is followed by the key in this tab when it names an entry) */
export function keyAction(href: string, docHref: string = location.href): LinkAction {
  if (!readable(href, docHref)) return null;
  return linkAction(href, false, docHref) ?? { kind: "open", href };
}
export function followLink(act: LinkAction, onRoute: (frag: string) => void): void {
  if (!act) return;
  if (act.kind === "open") window.open(new URL(act.href, location.href).href, "_blank", "noopener");
  else onRoute(act.frag);
}
export function linkClick(onRoute: (frag: string) => void, phase: "mousedown" | "click"): (view: EditorView, e: MouseEvent) => boolean {
  return (_view, e) => {
    const a = (e.target as Element | null)?.closest("a");
    if (!a) return false;
    const modified = e.metaKey || e.ctrlKey;
    if (modified !== (phase === "mousedown")) return false;
    const act = linkAction(a.getAttribute("href"), modified);
    if (!act) return false;
    e.preventDefault();
    followLink(act, onRoute);
    return true;
  };
}
