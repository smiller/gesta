import { publish } from "../published.ts";
/* px: the narrowest window a menu area opens in; narrower, the width left
   for the text is too narrow to read in, and the menu lies over it */
export const MENU_AREA_FROM = 900;
/* px between the menu's edge and the text kept clear of it */
export const MENU_GAP = 16;
export function menuAreaFor(at: { menuRight: number; textLeft: number; width: number }): number {
  if (at.width < MENU_AREA_FROM || at.textLeft >= at.menuRight) return 0;
  return at.menuRight + MENU_GAP;
}

/* the window as the menu area reads and writes it: its width, the left edge
   of the leftmost thing drawn, null with nothing drawn, and the root */
export interface LayoutPort { width(): number; drawnLeft(): number | null; write(px: number): void }
export interface PlacePort { hold(): void }
export interface MenuArea {
  /* a menu drawn, its right edge where it stands */
  open(menuRight: number): void;
  close(): void;
  /* px, 0 with none */
  width(): number;
  /* the function that takes the listener off */
  onChange(fn: () => void): () => void;
}

/* the reading place is held before the root moves: the reflow the width
   makes would move it (pin: menu area › Ovid 1 scrolled, the menu open) */
export function menuArea(layout: LayoutPort, place: PlacePort): MenuArea {
  let px = 0;
  const heard = new Set<() => void>();
  const set = (next: number): void => {
    if (next === px) return;
    place.hold();
    px = next;
    layout.write(px);
    for (const fn of heard) fn();
  };
  /* open, the page has moved clear: measured again it would read as clear
     and close itself */
  const open = (menuRight: number): void => {
    if (px > 0) return;
    const textLeft = layout.drawnLeft();
    set(textLeft === null ? 0 : menuAreaFor({ menuRight, textLeft, width: layout.width() }));
  };
  return {
    open,
    close: () => set(0),
    width: () => px,
    onChange: (fn) => { heard.add(fn); return () => heard.delete(fn); },
  };
}

/* the leftmost thing drawn: a grid and a note in the margin both hang left
   of the page's own edge */
const DRAWN = "#editor .page, #editor textarea, #editor .page > div.grid, #editor .margin-note.in-margin";
export function browserLayout(root: HTMLElement): LayoutPort {
  return {
    width: () => root.clientWidth,
    drawnLeft: () => {
      const lefts = [...document.querySelectorAll(DRAWN)].map((e) => e.getBoundingClientRect().left);
      return lefts.length ? Math.min(...lefts) : null;
    },
    write: (px) => {
      root.style.setProperty("--menu-area-w", px + "px");
      publish("menuArea", px);
    },
  };
}

/* THE ONE MENU AREA the page has, given once the session is up and read
   before then as none; a listener may come first */
let shared: MenuArea | null = null;
const listeners = new Set<() => void>();
export const provideMenuArea = (area: MenuArea): void => {
  shared = area;
  area.onChange(() => { for (const fn of listeners) fn(); });
};
export const menuAreaWidth = (): number => shared?.width() ?? 0;
export const onMenuAreaChange = (fn: () => void): (() => void) => { listeners.add(fn); return () => listeners.delete(fn); };
