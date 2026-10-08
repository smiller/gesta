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
  /* THE ONE SLOT the overlay panels share: every opener sets it, so opening
     one closes the others by construction (pin: launch, panels, the corner,
     links › books panel, displacing it). The in-flow rows compete for no
     spot and are not in it. */
  panel: "page" | "bookshelf" | "help" | "bookmarks" | "shortcuts" | "backups" | null;
  panelRows: Link[];
  /* an empty panel's one explanatory line, "" for none */
  panelEmpty: string;
  search: SearchState;
  /* the Go to row: open, and its run of selects; the body is EMPTY when
     closed, so a dismissed control is a dead mechanism */
  goto: { open: boolean; levels: Level[] };
  bookmarks: { rows: BookmarkRow[]; foot: { full: true } | { full: false; name: string } | null; editing: string; draft: string; buf: string; unreadable: boolean; opening: number };
  shortcuts: { query: string; rows: Shortcut[]; active: number; empty: string; editing: boolean; draft: string; dirty: boolean };
  backups: { canPick: boolean; configured: boolean; trouble: string; warm: "ok" | "loading" | "failed" };
  lineBar: { open: boolean; kind: AskKind; line: string; page: string };
  /* ⌃⌘E's bar: `count` the line after Find, `any` whether there is a match to replace */
  replace: { open: boolean; find: string; with: string; count: string; any: boolean };
  copy: { show: boolean; top: number; right: number; minWidth: number; title: string; label: string };
  bar: { show: boolean; left: number; top: number; incode: boolean; on: Record<string, boolean>; canTag: boolean };
  /* the open entry draws a gutter: the Line numbering row shows; and
     whether the row stands open (⌃⌘L, the summary) */
  gutter: boolean;
  linesOpen: boolean;
  /* the markdown source view is on: the mode pill shows */
  mdView: boolean;
  interval: number;
}
export const EMPTY_MASTHEAD: MastheadModel = { crumbs: [], leaf: null, title: "", tags: [], showToday: false, buttons: { create: "", createTitle: "", canCreate: false, canEdit: false, renameTitle: "", deleteTitle: "" } };
export function screenState(interval: number): Screen {
  const screen = $state<Screen>({
    masthead: EMPTY_MASTHEAD, panel: null, panelRows: [], panelEmpty: "",
    search: { open: false, query: "", options: [], scopeAt: 0, rows: [], empty: "", capped: false, active: -1 },
    goto: { open: false, levels: [] },
    bar: { show: false, left: 0, top: 0, incode: false, on: {}, canTag: false },
    copy: { show: false, top: 0, right: 0, minWidth: 0, title: "", label: "copy" },
    lineBar: { open: false, kind: "none", line: "", page: "" },
    replace: { open: false, find: "", with: "", count: "", any: false },
    bookmarks: { rows: [], foot: null, editing: "", draft: "", buf: "", unreadable: false, opening: 0 },
    shortcuts: { query: "", rows: [], active: 0, empty: "", editing: false, draft: "", dirty: false },
    backups: { canPick: true, configured: false, trouble: "", warm: "loading" },
    gutter: false, linesOpen: false, mdView: false, interval,
  });
  return screen;
}
