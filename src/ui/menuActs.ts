import type { Screen } from "./screen.svelte.ts";
import type { MenuRow } from "./mastheadModel.ts";
import { menuItems, menuKey, typedAhead, menuActs as actsOf, handsFocusBack, type MenuName, type MenuAct, type CloseReason, type Typed } from "./menuModel.ts";

/* where the focus stands, and the focus given back where it stood */
export interface FocusPort { here(): Element | null; back(was: Element | null): void }
/* the menu area, opened from the menu's drawn right edge */
export interface MenuAreaPort { open(menuRight: number): void; close(): void }
export interface MenuDeps {
  screen: Pick<Screen, "opened" | "menuRows" | "menuEmpty" | "menu">;
  answer(name: MenuName): { rows: MenuRow[]; empty: string };
  readOnly: boolean;
  /* the text saved as typed, for the rows to read it (pin: shelves › a shelf renamed, the list opened at once) */
  flush(): void;
  overlay(): void;
  focus: FocusPort;
  area: MenuAreaPort;
  go(href: string): void;
  act(name: MenuName, act: MenuAct["act"]): void;
}
interface Key { key: string; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }
export interface Menus {
  open(name: MenuName): void;
  close(reason: CloseReason): void;
  /* true where the key was the menu's */
  key(e: Key): boolean;
  hover(i: number): void;
  choose(i: number): void;
  /* the menu drawn, its right edge where it stands */
  mounted(menuRight: number): void;
  answer(): void;
}

/* ONE MENU OPEN AT MOST, and this module's own record of which: a panel may
   take the slot without closing it, and the menu taken down then still
   closes its menu area, never the panel's slot (pin: menuActs.test › with no menu
   open does nothing) */
export function menuActs(d: MenuDeps): Menus {
  const { screen } = d;
  let open: MenuName | null = null, was: Element | null = null, typed: Typed = { buf: "", at: 0 };
  const items = () => (open ? menuItems(screen.menuRows, actsOf(open, d.readOnly).map((a) => a.text)) : []);
  const answer = (): void => {
    if (!open) return;
    const a = d.answer(open);
    screen.menuRows = a.rows;
    screen.menuEmpty = a.empty;
    screen.menu.sel = Math.min(Math.max(0, screen.menu.sel), Math.max(0, items().length - 1));
  };
  const show = (name: MenuName): void => {
    if (!open) { was = d.focus.here(); d.overlay(); }
    d.flush();
    open = name;
    typed = { buf: "", at: 0 };
    screen.menu.sel = 0;
    answer();
    screen.opened = name;
  };
  const close = (reason: CloseReason): void => {
    if (!open) return;
    if (screen.opened === open) screen.opened = null;
    open = null;
    screen.menu.sel = -1;
    d.area.close();
    if (handsFocusBack(reason)) d.focus.back(was);
  };
  const choose = (i: number): void => {
    const name = open, it = items()[i];
    if (!name || !it) return;
    close("chosen");
    if (it.row !== null) d.go(screen.menuRows[it.row].href);
    else d.act(name, actsOf(name, d.readOnly)[it.act!].act);
  };
  const typing = (letter: string): void => {
    const t = typedAhead(typed, letter, Date.now(), items());
    typed = t;
    if (t.sel !== null) screen.menu.sel = t.sel;
  };
  const key = (e: Key): boolean => {
    const n = items().length, m = menuKey(e, screen.menu.sel, n);
    if (!m || !open) return false;
    if ("close" in m) close(m.close);
    else if (!n) return false;
    else if ("sel" in m) screen.menu.sel = m.sel;
    else if ("choose" in m) choose(m.choose);
    else typing(m.typed);
    return true;
  };
  return {
    open: show, close, key, choose, answer,
    hover: (i) => { if (open) screen.menu.sel = i; },
    mounted: (menuRight) => { if (open) d.area.open(menuRight); },
  };
}
