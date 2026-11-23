import type { MenuRow } from "./mastheadModel.ts";

/* `row`: the row's index among the menu's rows, null for an act; `act`: the
   act's index, null for a row */
export interface MenuItem { text: string; row: number | null; act: number | null }
export function menuItems(rows: MenuRow[], acts: string[]): MenuItem[] {
  const items: MenuItem[] = [];
  rows.forEach((r, i) => { if (!r.shelf) items.push({ text: r.text, row: i, act: null }); });
  acts.forEach((text, i) => items.push({ text, row: null, act: i }));
  return items;
}

export type MenuMove = { sel: number } | { choose: number } | { close: true } | { typed: string };
interface Key { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }
const close = (): MenuMove => ({ close: true });
const NAMED: Record<string, (sel: number, n: number) => MenuMove> = {
  ArrowDown: (sel, n) => ({ sel: (sel + 1) % n }),
  ArrowUp: (sel, n) => ({ sel: (sel - 1 + n) % n }),
  Home: () => ({ sel: 0 }),
  End: (_sel, n) => ({ sel: n - 1 }),
  Enter: (sel) => ({ choose: sel }),
  Escape: close,
  Tab: close,
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

/* px: the narrowest window a menu makes room in; narrower, the room left
   for the text is too narrow to read in, and the menu lies over it */
export const MENU_ROOM_FROM = 900;
/* px between the menu's edge and the text it makes room for */
export const MENU_GAP = 16;
export function roomFor(at: { menuRight: number; textLeft: number; width: number }): number {
  if (at.width < MENU_ROOM_FROM || at.textLeft >= at.menuRight) return 0;
  return at.menuRight + MENU_GAP;
}

export type MenuName = "bookshelf" | "commonplace";
export const isMenu = (name: string | null): name is MenuName => name === "bookshelf" || name === "commonplace";
export interface MenuAct { text: string; act: "new" | "shelves" }
const ACTS: Record<MenuName, MenuAct[]> = {
  bookshelf: [{ text: "New author…", act: "new" }, { text: "Shelves…", act: "shelves" }],
  commonplace: [{ text: "New commonplace…", act: "new" }],
};
export const menuActs = (name: MenuName, readOnly: boolean): MenuAct[] => (readOnly ? [] : ACTS[name]);
/* where the focus stands as the menu is taken down: in it, fallen to the
   body, nowhere, or put elsewhere by a click */
export type FocusAt = "menu" | "body" | "none" | "elsewhere";
export const givesFocusBack = (at: FocusAt): boolean => at !== "elsewhere";
