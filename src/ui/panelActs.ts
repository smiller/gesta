import type { Session } from "../session.ts";
import type { EntryLayer } from "../store/entries.ts";
import type { Journal } from "../store/reference.ts";
import type { Screen } from "./screen.svelte.ts";
import type { Opening } from "./overlays.ts";
import { panelRows } from "./mastheadModel.ts";
import { entryKey, NS_BOOK } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { loadState } from "./journalLoad.ts";

export type Ns = "page" | "bookshelf";
export type PanelName = Ns | "help" | "bookmarks" | "shortcuts" | "backups";

export interface PanelDeps {
  screen: Pick<Screen, "panel" | "panelRows" | "panelEmpty">;
  layer: Pick<EntryLayer, "cache" | "warmed" | "storeReadFailed">;
  journal: Journal;
  session: Pick<Session, "focusText" | "save">;
  open(opening: Opening): void;
  closePanel(): void;
  openBookmarks(): void;
  openShortcuts(): void;
  readBackups(): void;
}
export interface Panels { panel(ns: PanelName, byKey?: boolean): void; reanswer(): void }

const emptyLine = (ns: Ns, layer: PanelDeps["layer"]): string => {
  if (ns !== "bookshelf") return "";
  return { in: "No authors yet — import a folder, or start one below.", failed: "Couldn’t load the bookshelf.", loading: "Still loading…" }[loadState(layer)];
};
const listed = (ns: PanelName | null): ns is Ns => ns === "page" || ns === "bookshelf";

export function panelActs(d: PanelDeps): Panels {
  const { screen, layer, journal, session } = d;
  /* the rows are built per open and never rebuilt while open — a live
     rebuild would detach a mid-click target. "No authors" is a claim about
     the journal, not made before the warm has read it. */
  const answerPanel = (ns: Ns): void => {
    const shelvesKey = entryKey(NS_BOOK.key, SHELVES);
    screen.panelRows = panelRows(ns, Object.keys(layer.cache), journal, layer.cache[shelvesKey] || "");
    screen.panelEmpty = emptyLine(ns, layer);
  };
  const others: Record<Exclude<PanelName, Ns>, () => void> = {
    help: () => { d.open("help"); screen.panel = "help"; },
    bookmarks: () => d.openBookmarks(),
    shortcuts: () => d.openShortcuts(),
    backups: () => { d.open("backups"); d.readBackups(); screen.panel = "backups"; },
  };
  const openList = (ns: Ns): void => {
    d.open("pages");
    /* the list reads the text as typed (pin: shelves › a shelf renamed, the list opened at once) */
    session.save.flush();
    answerPanel(ns);
    screen.panel = ns;
  };
  /* an opener TOGGLES its own panel and displaces any other; the chord that
     opened a card closes it with the keys back in the text, an opener clicked
     again keeps them (pin: where the keys go › ⌃⌘B pressed twice)
     (pin: launch, panels, the corner, links › its own opener again) */
  const panel = (ns: PanelName, byKey = false): void => {
    if (screen.panel === ns) { d.closePanel(); if (byKey) session.focusText(); return; }
    if (listed(ns)) openList(ns);
    else others[ns]();
  };
  /* an open list is answered again once the pointer has left it, so no row
     is rebuilt under a click */
  const reanswer = (): void => {
    const ns = screen.panel;
    if (listed(ns)) {
      const el = document.querySelector(".pages");
      const answer = (): void => { if (screen.panel === ns) answerPanel(ns); };
      if (el?.matches(":hover")) el.addEventListener("mouseleave", answer, { once: true });
      else answer();
    }
    if (ns === "backups") d.readBackups();
  };
  return { panel, reanswer };
}
