import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Opening } from "./overlays.ts";
import { menuRows } from "./mastheadModel.ts";
import { entryKey, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { loadState } from "./journalLoad.ts";
import { roomFor, isMenu } from "./menuModel.ts";
import { leaveRoom } from "../editor/fit.ts";

export type Ns = "commonplace" | "bookshelf";
export type Opened = Ns | "help" | "bookmarks" | "shortcuts" | "backups";

export interface OpenerDeps {
  screen: Pick<Screen, "opened" | "menuRows" | "menuEmpty">;
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
  const { screen, layer, journal, session } = d;
  /* the rows are built per open and never rebuilt while open — a live
     rebuild would detach a mid-click target. "No authors" is a claim about
     the journal, not made before the warm has read it. */
  const answerMenu = (ns: Ns): void => {
    const shelvesKey = entryKey(NS_BOOK.key, SHELVES);
    screen.menuRows = menuRows(ns, Object.keys(layer.cache), journal, layer.cache[shelvesKey] || "");
    screen.menuEmpty = emptyLine(ns, layer);
  };
  const others: Record<Exclude<Opened, Ns>, () => void> = {
    help: () => { d.open("help"); screen.opened = "help"; },
    bookmarks: () => d.openBookmarks(),
    shortcuts: () => d.openShortcuts(),
    backups: () => { d.open("backups"); d.readBackups(); screen.opened = "backups"; },
  };
  const openMenu = (ns: Ns): void => {
    d.open("menu");
    /* the menu reads the text as typed (pin: shelves › a shelf renamed, the list opened at once) */
    session.save.flush();
    answerMenu(ns);
    screen.opened = ns;
  };
  /* an opener TOGGLES its own menu or panel and displaces any other; the
     chord that opened a panel closes it with the keys back in the text, an opener clicked
     again keeps them (pin: where the keys go › ⌃⌘B pressed twice)
     (pin: launch, menus, the corner, links › its own opener again) */
  const opener = (ns: Opened, byKey = false): void => {
    if (screen.opened === ns) { d.closeOpened(); if (byKey) session.focusText(); return; }
    if (isMenu(ns)) openMenu(ns);
    else others[ns]();
  };
  /* an open menu is answered again once the pointer has left it, so no row
     is rebuilt under a click */
  const reanswer = (): void => {
    const ns = screen.opened;
    if (isMenu(ns)) {
      const el = document.querySelector(".menu");
      const answer = (): void => { if (screen.opened === ns) answerMenu(ns); };
      if (el?.matches(":hover")) el.addEventListener("mouseleave", answer, { once: true });
      else answer();
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
  return { opener, reanswer, room, back };
}
