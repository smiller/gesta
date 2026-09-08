/* The chrome's shared state: what the masthead reads, the gutter switch,
   the backups button's label, the line-numbering interval. ONE rune
   object made by a factory, written by the page's wiring and read by the
   components' templates; the "every opener closes the others" rule will
   live here when the panels arrive. */
import type { MastheadModel, Link } from "./mastheadModel.ts";
import type { ScopeOption } from "./searchModel.ts";
import type { Level } from "./gotoModel.ts";
import type { AskKind } from "../editor/goto.ts";
import type { BookmarkRow } from "./bookmarksModel.ts";
import type { Shortcut } from "../store/shortcuts.ts";
import type { Result } from "../store/search.ts";

/* the Search row: open, the query as typed, the scope options with the
   picked one, and the rows the last scan produced — a result carries its
   label and its snippet cut into runs, so the component only draws */
export interface SearchRow { result: Result; where: string; runs: { text: string; mark: boolean }[] }
export interface SearchState {
  open: boolean;
  query: string;
  options: ScopeOption[];
  scopeAt: number;
  rows: SearchRow[];
  /* the explanatory line in place of rows: "No matches.", "Still loading…" */
  empty: string;
  capped: boolean;
  /* the row ↑↓ landed on, -1 for none */
  active: number;
}

export interface Screen {
  masthead: MastheadModel;
  /* THE ONE SLOT the overlay panels share under the masthead: the pages
     list, the bookshelf, and later the help, backups, bookmarks and
     shortcuts panels. Every opener sets it, so opening one closes the
     others by construction; null is none. The in-flow rows (Line
     numbering) compete for no spot and are not in it. */
  panel: "page" | "bookshelf" | "help" | "bookmarks" | "shortcuts" | null;
  panelRows: Link[];
  /* an empty panel's one explanatory line, "" for none */
  panelEmpty: string;
  search: SearchState;
  /* the Go to row: open, and its run of selects; the body is EMPTY when
     closed, so a dismissed control is a dead mechanism */
  goto: { open: boolean; levels: Level[] };
  /* the bookmarks card: its rows, the foot line, the editor's row and
     draft, the held prefix, and the latch for an unreadable store */
  bookmarks: { rows: BookmarkRow[]; foot: { full: true } | { full: false; name: string } | null; editing: string; draft: string; buf: string; unreadable: boolean; opening: number };
  /* the shortcuts popup: the query, the rows it filters to, the active
     one, the editor's visibility and its text, whether it has unsaved lines */
  shortcuts: { query: string; rows: Shortcut[]; active: number; empty: string; editing: boolean; draft: string; dirty: boolean };
  /* ⌃⌘G's bar: open, which boxes the entry can answer, what each holds */
  lineBar: { open: boolean; kind: AskKind; line: string; page: string };
  /* the floating format bar over a selection: where it sits, what is lit */
  bar: { show: boolean; left: number; top: number; incode: boolean; on: Record<string, boolean>; canTag: boolean };
  /* the open entry draws a gutter: the Line numbering row shows */
  gutter: boolean;
  /* the markdown source view is on: the mode pill shows */
  mdView: boolean;
  backupsLabel: string;
  interval: number;
}
export const EMPTY_MASTHEAD: MastheadModel = { crumbs: [], leaf: null, title: "", tags: [], showToday: false, buttons: { create: "", createTitle: "", canCreate: false, canEdit: false, renameTitle: "", deleteTitle: "" } };
export function screenState(interval: number): Screen {
  const screen = $state<Screen>({
    masthead: EMPTY_MASTHEAD, panel: null, panelRows: [], panelEmpty: "",
    search: { open: false, query: "", options: [], scopeAt: 0, rows: [], empty: "", capped: false, active: -1 },
    goto: { open: false, levels: [] },
    bar: { show: false, left: 0, top: 0, incode: false, on: {}, canTag: false },
    lineBar: { open: false, kind: "none", line: "", page: "" },
    bookmarks: { rows: [], foot: null, editing: "", draft: "", buf: "", unreadable: false, opening: 0 },
    shortcuts: { query: "", rows: [], active: 0, empty: "", editing: false, draft: "", dirty: false },
    gutter: false, mdView: false, backupsLabel: "", interval,
  });
  return screen;
}
