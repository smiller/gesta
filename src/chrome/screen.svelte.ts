/* The chrome's shared state: what the masthead reads, the gutter switch,
   the backups button's label, the line-numbering interval. ONE rune
   object made by a factory, written by the page's wiring and read by the
   components' templates; the "every opener closes the others" rule will
   live here when the panels arrive. */
import type { MastheadModel, Link } from "./mastheadModel.ts";

export interface Screen {
  masthead: MastheadModel;
  /* THE ONE SLOT the overlay panels share under the masthead: the pages
     list, the bookshelf, and later the help, backups, bookmarks and
     shortcuts panels. Every opener sets it, so opening one closes the
     others by construction; null is none. The in-flow rows (Line
     numbering) compete for no spot and are not in it. */
  panel: "page" | "bookshelf" | null;
  panelRows: Link[];
  /* an empty panel's one explanatory line, "" for none */
  panelEmpty: string;
  /* the open entry draws a gutter: the Line numbering row shows */
  gutter: boolean;
  backupsLabel: string;
  interval: number;
}
export const EMPTY_MASTHEAD: MastheadModel = { crumbs: [], leaf: null, title: "", tags: [], showToday: false };
export function screenState(interval: number): Screen {
  const screen = $state<Screen>({ masthead: EMPTY_MASTHEAD, panel: null, panelRows: [], panelEmpty: "", gutter: false, backupsLabel: "", interval });
  return screen;
}
