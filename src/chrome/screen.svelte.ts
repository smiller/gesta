/* The chrome's shared state: what the masthead reads, the gutter switch,
   the backups button's label, the line-numbering interval. ONE rune
   object made by a factory, written by the page's wiring and read by the
   components' templates; the "every opener closes the others" rule will
   live here when the panels arrive. */
import type { MastheadModel } from "./mastheadModel.ts";

export interface Screen {
  masthead: MastheadModel;
  /* the open entry draws a gutter: the Line numbering row shows */
  gutter: boolean;
  backupsLabel: string;
  interval: number;
}
export const EMPTY_MASTHEAD: MastheadModel = { crumbs: [], leaf: null, title: "", tags: [], showToday: false };
export function screenState(interval: number): Screen {
  const screen = $state<Screen>({ masthead: EMPTY_MASTHEAD, gutter: false, backupsLabel: "", interval });
  return screen;
}
