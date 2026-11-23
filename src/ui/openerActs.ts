import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Opening } from "./overlays.ts";
import { menuRows, type MenuRow } from "./mastheadModel.ts";
import { entryKey, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { loadState } from "./journalLoad.ts";
import { roomFor, isMenu } from "./menuModel.ts";
import type { Menus, MenuDeps } from "./menuActs.ts";
import { leaveRoom } from "../editor/fit.ts";

export type Ns = "commonplace" | "bookshelf";
export type Opened = Ns | "help" | "bookmarks" | "shortcuts" | "backups";

export interface OpenerDeps {
  screen: Pick<Screen, "opened">;
  menus: Pick<Menus, "open" | "close" | "answer">;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  journal: Journal;
  session: Pick<Session, "focusText" | "save" | "holdTop">;
  open(opening: Opening): void;
  closeOpened(): void;
  openBookmarks(): void;
  openShortcuts(): void;
  readBackups(): void;
}
export interface Openers {
  opener(ns: Opened, byKey?: boolean): void;
  reanswer(): void;
  /* an open menu's right edge, null once it closes */
  room(menuRight: number | null): void;
  /* the focus back where it stood before a menu took it */
  back(was: Element | null): void;
  /* the browser's side of an open menu: its rows read from the journal,
     the focus, and the room */
  ports(): Pick<MenuDeps, "answer" | "focus" | "room">;
}

const emptyLine = (ns: Ns, layer: OpenerDeps["layer"]): string => {
  if (ns !== "bookshelf") return "";
  return { in: "No authors yet — import a folder, or start one below.", failed: "Couldn’t load the bookshelf.", loading: "Still loading…" }[loadState(layer)];
};
/* the leftmost thing drawn: a grid and a note in the margin both hang left
   of the page's own edge */
const DRAWN = "#editor .page, #editor textarea, #editor .page > div.grid, #editor .margin-note.in-margin";
const drawnLeft = (): number | null => {
  const lefts = [...document.querySelectorAll(DRAWN)].map((e) => e.getBoundingClientRect().left);
  return lefts.length ? Math.min(...lefts) : null;
};
/* a control a menu took the focus from may have closed under it */
const shown = (el: Element | null): el is HTMLElement => el instanceof HTMLElement && el.isConnected && el.checkVisibility();

export function openerActs(d: OpenerDeps): Openers {
  const { screen, layer, journal, session, menus } = d;
  /* "No authors" is a claim about the journal, not made before the warm has read it */
  const answer = (ns: Ns): { rows: MenuRow[]; empty: string } => {
    const shelvesKey = entryKey(NS_BOOK.key, SHELVES);
    return { rows: menuRows(ns, Object.keys(layer.cache), journal, layer.cache[shelvesKey] || ""), empty: emptyLine(ns, layer) };
  };
  const others: Record<Exclude<Opened, Ns>, () => void> = {
    help: () => { d.open("help"); screen.opened = "help"; },
    bookmarks: () => d.openBookmarks(),
    shortcuts: () => d.openShortcuts(),
    backups: () => { d.open("backups"); d.readBackups(); screen.opened = "backups"; },
  };
  /* an opener TOGGLES its own menu or panel and displaces any other; the
     chord that opened a panel closes it with the keys back in the text, an opener clicked
     again keeps them (pin: where the keys go › ⌃⌘B pressed twice)
     (pin: launch, menus, the corner, links › its own opener again) */
  const toggleMenu = (ns: Ns): void => (screen.opened === ns ? menus.close("icon") : menus.open(ns));
  const closePanel = (byKey: boolean): void => { d.closeOpened(); if (byKey) session.focusText(); };
  const openPanel = (ns: Exclude<Opened, Ns>): void => { if (isMenu(screen.opened)) menus.close("displaced"); others[ns](); };
  const opener = (ns: Opened, byKey = false): void => {
    if (isMenu(ns)) toggleMenu(ns);
    else if (screen.opened === ns) closePanel(byKey);
    else openPanel(ns);
  };
  /* an open menu is answered again once the pointer has left it, so no row
     is rebuilt under a click */
  const reanswer = (): void => {
    const ns = screen.opened;
    if (isMenu(ns)) {
      const el = document.querySelector(".menu");
      const again = (): void => { if (screen.opened === ns) menus.answer(); };
      if (el?.matches(":hover")) el.addEventListener("mouseleave", again, { once: true });
      else again();
    }
    if (ns === "backups") d.readBackups();
  };
  /* the room is read against the page as it stands with none, and the
     reading place is held across the reflow it makes */
  let made = 0;
  const room = (menuRight: number | null): void => {
    const textLeft = menuRight === null ? null : drawnLeft();
    const px = textLeft === null ? 0 : roomFor({ menuRight: menuRight!, textLeft, width: document.documentElement.clientWidth });
    if (px === made) return;
    made = px;
    session.holdTop();
    leaveRoom(px);
  };
  const back = (was: Element | null): void => {
    if (shown(was) && !was.matches("body, #editor, #editor *")) was.focus({ preventScroll: true });
    else session.focusText();
  };
  const ports = (): Pick<MenuDeps, "answer" | "focus" | "room"> => ({
    answer,
    focus: { here: () => document.activeElement, back },
    room: { make: (right) => room(right), clear: () => room(null) },
  });
  return { opener, reanswer, room, back, ports };
}
