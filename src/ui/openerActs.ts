import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Opening } from "./overlays.ts";
import { menuRows } from "./mastheadModel.ts";
import { entryKey, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { loadState } from "./journalLoad.ts";

export type Ns = "commonplace" | "bookshelf";
export type Opened = Ns | "help" | "bookmarks" | "shortcuts" | "backups";

export interface OpenerDeps {
  screen: Pick<Screen, "opened" | "menuRows" | "menuEmpty">;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  journal: Journal;
  session: Pick<Session, "focusText" | "save">;
  open(opening: Opening): void;
  closeOpened(): void;
  openBookmarks(): void;
  openShortcuts(): void;
  readBackups(): void;
}
export interface Openers { opener(ns: Opened, byKey?: boolean): void; reanswer(): void }

const emptyLine = (ns: Ns, layer: OpenerDeps["layer"]): string => {
  if (ns !== "bookshelf") return "";
  return { in: "No authors yet — import a folder, or start one below.", failed: "Couldn’t load the bookshelf.", loading: "Still loading…" }[loadState(layer)];
};
const isMenu = (ns: Opened | null): ns is Ns => ns === "commonplace" || ns === "bookshelf";

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
  return { opener, reanswer };
}
