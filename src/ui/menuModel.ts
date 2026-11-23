import type { MenuRow } from "./mastheadModel.ts";
import type { Opening } from "./overlays.ts";

/* `row`: the row's index among the menu's rows, null for an act; `act`: the
   act's index, null for a row */
export interface MenuItem { text: string; row: number | null; act: number | null }
export function menuItems(rows: MenuRow[], acts: string[]): MenuItem[] {
  const items: MenuItem[] = [];
  rows.forEach((r, i) => { if (!r.shelf) items.push({ text: r.text, row: i, act: null }); });
  acts.forEach((text, i) => items.push({ text, row: null, act: i }));
  return items;
}

export type MenuMove = { sel: number } | { choose: number } | { close: "escape" | "tab" } | { typed: string };
interface Key { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }
const closedBy = (key: "escape" | "tab") => (): MenuMove => ({ close: key });
const NAMED: Record<string, (sel: number, n: number) => MenuMove> = {
  ArrowDown: (sel, n) => ({ sel: (sel + 1) % n }),
  ArrowUp: (sel, n) => ({ sel: (sel - 1 + n) % n }),
  Home: () => ({ sel: 0 }),
  End: (_sel, n) => ({ sel: n - 1 }),
  Enter: (sel) => ({ choose: sel }),
  Escape: closedBy("escape"),
  Tab: closedBy("tab"),
};
const modified = (e: Key): boolean => [e.isComposing, e.metaKey, e.ctrlKey, e.altKey].some(Boolean);
const printable = (key: string): boolean => key.length === 1 && key !== " ";
export function menuKey(e: Key, sel: number, n: number): MenuMove | null {
  if (modified(e)) return null;
  const named = NAMED[e.key];
  if (named) return named(sel, n);
  return printable(e.key) ? { typed: e.key } : null;
}

/* ms: letters typed closer together than this make one string, as a <select>'s do */
export const TYPED_GAP = 1000;
const fold = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/* a small word inside a name is passed over: "o" is Ovid, not Hildegard of Bingen; the name's first word counts whatever it is */
const SMALL = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "the", "to"]);
const wordsOf = (s: string): string[] => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).filter((w, i) => i === 0 || !SMALL.has(w));
export interface Typed { buf: string; at: number }
export function typedAhead(was: Typed, letter: string, now: number, items: MenuItem[]): Typed & { sel: number | null } {
  const buf = (now - was.at <= TYPED_GAP ? was.buf : "") + fold(letter);
  const sel = items.findIndex((it) => wordsOf(it.text).some((w) => w.startsWith(buf)));
  return { buf, at: now, sel: sel < 0 ? null : sel };
}


export type MenuName = "bookshelf" | "commonplace";
export const isMenu = (name: string | null): name is MenuName => name === "bookshelf" || name === "commonplace";
export interface MenuAct { text: string; act: "new" | "shelves" }
const ACTS: Record<MenuName, MenuAct[]> = {
  bookshelf: [{ text: "New author…", act: "new" }, { text: "Shelves…", act: "shelves" }],
  commonplace: [{ text: "New commonplace…", act: "new" }],
};
export const menuActs = (name: MenuName, readOnly: boolean): MenuAct[] => (readOnly ? [] : ACTS[name]);
/* why a menu closed: "displaced", a panel or a masthead row opened over it;
   "left", the focus gone elsewhere; "chosen", a row or an act taken */
export const CLOSE_REASONS = ["escape", "tab", "icon", "resize", "displaced", "chosen", "outside", "left", "navigated"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];
const GIVES_BACK = new Set<CloseReason>(["escape", "tab", "icon", "resize", "displaced"]);
export const handsFocusBack = (reason: CloseReason): boolean => GIVES_BACK.has(reason);
const NAVIGATING = new Set<Opening>(["navigated", "view", "sourceView", "here"]);
export const reasonOpened = (by: Opening): CloseReason => (by === "escape" ? "escape" : NAVIGATING.has(by) ? "navigated" : "displaced");
