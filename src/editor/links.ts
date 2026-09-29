/* The modifier wins for EVERY link, internal ones included: ⌘-click is the
   one way to open the journal side by side in a second tab (pin: links.test
   › the modifier opens EVERY link in a new tab). A plain click on an
   external link keeps placing the caret (pin: links.test › a plain click on
   an external link does nothing). THE MODIFIED PRESS IS TAKEN ON MOUSEDOWN:
   a ⌘-mousedown is ProseMirror's own "select this node" gesture, and a
   handler on click ran after it had selected the whole paragraph and raised
   the format bar (pin: launch, panels, the corner, links › ⌘-click on an
   external link). The plain click stays a click, so a drag that starts on
   a link routes nothing. */
import type { EditorView } from "prosemirror-view";
import { internalHash } from "../store/nav.ts";

export type LinkAction = { kind: "open"; href: string } | { kind: "route"; frag: string } | null;
export function linkAction(href: string | null, modified: boolean, docHref: string = location.href): LinkAction {
  if (!href) return null;
  if (modified) return { kind: "open", href };
  const frag = internalHash(href, docHref);
  return frag ? { kind: "route", frag } : null;
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
    if (act.kind === "open") window.open(new URL(act.href, location.href).href, "_blank", "noopener");
    else onRoute(act.frag);
    return true;
  };
}
