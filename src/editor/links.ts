/* A click on a link in the editor, ported 2026-09-07 from the current
   app's 07c-link-clicks.js: a contenteditable places the caret on a click
   and follows nothing, so the editor decides. The modifier wins for EVERY
   link, internal ones included — ⌘-click is the one way to open the
   journal side by side in a second tab; a plain click on an internal link
   (a bare fragment, or a full URL that points at this document) routes in
   this tab, and a link can point at the entry it is printed on, which is
   the router's cell to answer; a plain click on an external link keeps
   placing the caret. The decision is pure; the handler applies it.
   THE MODIFIED PRESS IS TAKEN ON MOUSEDOWN: a ⌘-mousedown is ProseMirror's
   own "select this node" gesture, and a handler on click ran after it
   had selected the whole paragraph and raised the format bar — FOUND by
   hand 2026-09-09 on an external link; the headless step had asked only
   whether a new tab appeared. The plain click stays a click, so a drag
   that starts on a link routes nothing. */
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
