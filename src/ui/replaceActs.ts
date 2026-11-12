import type { Session } from "../session.ts";
import type { Screen } from "./screen.svelte.ts";
import type { ReplacePort } from "../editor/surface.ts";
import { matches, nearest, replaceAt, replaceEvery, countLabel, holds } from "../editor/replace.ts";
import { mastheadBottom } from "./mastheadBottom.ts";

export interface ReplaceDeps {
  rb: Screen["replace"];
  session: Pick<Session, "locked" | "mdView" | "replacer" | "setView">;
  say(text: string, ms?: number): void;
  opened(): void;
  focusBar(): void;
}
export interface ReplaceBar {
  open(): void; find(v: string): void; with(v: string): void; next(back: boolean): void; one(): void; all(): void;
  close(): void; closeOver(): void; dismiss(): void; check(): void;
}
export function replaceActs(d: ReplaceDeps): ReplaceBar {
  const { rb, session, say, opened, focusBar } = d;
  /* FIND AND REPLACE, on the markdown: ⌃⌘E in the rendered view switches
     to the source view first, and closing the bar switches back */
  let hits: number[] = [], at = -1, fromRendered = false, unwatch: (() => void) | null = null, editing = false, counting = 0;
  /* THE BAR HOLDS THE VIEW IT OPENED ON: the offsets are that text's, and
     a save from another window rebuilt the view under them, so a Replace
     wrote at the old offsets into the new text
     (pin: replace › the entry saved in another window, the bar open) */
  let barPort: ReplacePort | null = null;
  const draw = (port: ReplacePort): void => {
    rb.count = countLabel(rb.find, hits.length, at);
    rb.any = hits.length > 0;
    port.show(hits, rb.find.length, at, mastheadBottom());
  };
  const seek = (port: ReplacePort, from: number): void => {
    hits = matches(port.text(), rb.find);
    at = nearest(hits, from);
    draw(port);
  };
  const recount = (port: ReplacePort): void => {
    hits = matches(port.text(), rb.find);
    at = -1;
    draw(port);
  };
  const dismissReplace = (): void => {
    if (!rb.open) return;
    rb.open = false;
    unwatch?.(); unwatch = null;
    cancelAnimationFrame(counting);
    barPort?.clear();
    barPort = null;
    hits = []; at = -1;
  };
  /* the port the bar opened on, or null with the bar closed when the view was replaced */
  const port = (): ReplacePort | null => {
    if (!rb.open) return null;
    if (session.replacer() === barPort) return barPort;
    dismiss();
    return null;
  };
  const dismiss = () => { dismissReplace(); fromRendered = false; };
  /* a rebuilt view's caret sits at its end: put back at the match the bar
     stood on (pin: replace › the entry saved in another window, the bar open) */
  const freeOrInBar = (a: Element | null): boolean => !a || a === document.body || !!a.closest(".replacebar");
  const check = () => {
    if (!rb.open) return;
    const was = at >= 0 ? hits[at] : 0;
    if (port()) return;
    const a = document.activeElement;
    if (session.mdView && freeOrInBar(a)) session.replacer()?.place(was);
  };
  /* every close switches back to the view the bar was opened from, but a
     navigation or a rebuilt view, which only closes it
     (pin: replace › ⌃⌘H over the bar). A switch back the parse refuses
     leaves the source view open and the cursor in its text, not in the
     hidden Find box (pin: replace › Escape, the switch back refused) */
  const closeBack = (focus: boolean): void => {
    if (!port()) return;
    const back = fromRendered;
    dismiss();
    const wanted = focus || !!document.activeElement?.closest(".replacebar");
    if (back) session.setView(false);
    if (session.mdView && wanted) session.replacer()?.focus();
  };
  const close = () => closeBack(true);
  const closeOver = () => closeBack(false);
  const intoSource = (): "there" | "switched" | "refused" => {
    if (session.mdView) return "there";
    session.setView(true);
    if (!session.mdView) return "refused";
    say("Source view, to replace", 3000);
    return "switched";
  };
  /* typing in the text recounts once a frame, a recount being the whole
     text matched and laid out again */
  const watchPort = (p: ReplacePort): (() => void) => p.watch(() => {
    if (editing) return;
    cancelAnimationFrame(counting);
    counting = requestAnimationFrame(() => { const q = port(); if (q) recount(q); });
  });
  const open = () => {
    if (rb.open && port()) { focusBar(); return; }
    opened();
    const how = intoSource();
    const p = how === "refused" ? null : session.replacer();
    if (!p) return;
    rb.open = true;
    barPort = p;
    fromRendered = how === "switched";
    unwatch = watchPort(p);
    seek(p, p.start(mastheadBottom()));
    setTimeout(() => focusBar(), 0);
  };
  const find = (v: string): void => {
    rb.find = v;
    const p = port();
    if (p) seek(p, at >= 0 ? hits[at] : p.start(mastheadBottom()));
  };
  const withText = (v: string): void => { rb.with = v; };
  const next = (back: boolean): void => {
    const p = port();
    if (!p || !hits.length) return;
    if (at < 0) { seek(p, p.start(mastheadBottom())); return; }
    at = (at + (back ? hits.length - 1 : 1)) % hits.length;
    draw(p);
  };
  const edit = (p: ReplacePort, e: { from: number; to: number; text: string; caret: number }): void => {
    editing = true;
    try { p.edit(e.from, e.to, e.text, e.caret); } finally { editing = false; }
  };
  const replaceable = (p: ReplacePort | null): p is ReplacePort => !!p && hits.length > 0 && !session.locked;
  const one = () => {
    const p = port();
    if (!replaceable(p)) return;
    /* a keystroke not yet recounted moves the text under the offsets: the
       match sought again rather than written at the old place
       (pin: replace.test › whether the text still has the find) */
    if (at < 0 || !holds(p.text(), hits[at], rb.find)) { seek(p, at < 0 ? p.start(mastheadBottom()) : hits[at]); return; }
    const r = replaceAt(p.text(), hits[at], rb.find, rb.with);
    edit(p, { from: hits[at], to: hits[at] + rb.find.length, text: rb.with, caret: r.caret });
    seek(p, r.caret);
  };
  /* recounted after: a replacement holding the find leaves matches, and
     "none" disabled the buttons over them (pin: replace › Replace All, the replacement holding the find) */
  const all = () => {
    const p = port();
    if (!replaceable(p)) return;
    const text = p.text();
    const r = replaceEvery(text, rb.find, rb.with, at >= 0 ? hits[at] : p.start(mastheadBottom()));
    edit(p, { from: 0, to: text.length, text: r.text, caret: r.caret });
    recount(p);
  };
  return { open, find, with: withText, next, one, all, close, closeOver, dismiss, check };
}
