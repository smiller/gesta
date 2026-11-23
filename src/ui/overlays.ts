export type Closer = "opened" | "search" | "goto" | "gotoToolbar" | "gotoToolbarCaret" | "lines" | "replace" | "replaceBack";
export type Opening = "search" | "goto" | "gotoToolbar" | "lines" | "replace" | "help" | "bookmarks" | "shortcuts" | "backups" | "menu" | "navigated" | "view" | "sourceView" | "here" | "escape";

/* ONE THING OPEN AT A TIME: each opening closes every other open thing —
   a menu or panel every masthead row, a masthead row the open menu or
   panel and the other rows — and a navigation all of them, drawn as they were for the entry left
   (pin: overlays.test › a masthead row, opened) (pin: overlays.test › a menu or panel, opened).
   ⌃⌘M and an arrival where it already is hand the caret to the entry, so
   whatever stands over it goes; a switch the surface makes by itself, a
   refused entry redrawn, closes only the Go to toolbar (pin: overlays.test › a navigation closes everything).
   A row's ORDER is part of it: the closers are not independent, one may
   move the focus that a later one reads. Escape's caret hand-back comes
   before the Search and Go to rows close: after them, it found the focus gone from the
   Go to toolbar and handed nothing back (pin: overlays.test › Escape closes everything) */
const ROWS: readonly Closer[] = ["search", "goto", "gotoToolbar", "lines", "replace"];
const others = (self: Closer | null): Closer[] => ["opened", ...ROWS].filter((c) => c !== self) as Closer[];
export const CLOSES: Record<Opening, readonly Closer[]> = {
  search: others("search"),
  goto: others("goto"),
  gotoToolbar: others("gotoToolbar"),
  lines: others("lines"),
  replace: others("replace"),
  help: ROWS,
  backups: ROWS,
  bookmarks: ROWS,
  shortcuts: ROWS,
  menu: ROWS,
  navigated: others(null),
  view: ["opened", "search", "gotoToolbar"],
  sourceView: ["gotoToolbar"],
  here: ["opened", "search", "gotoToolbar"],
  escape: ["opened", "gotoToolbarCaret", "search", "goto", "lines", "replaceBack"],
};

export function overlays(closers: Record<Closer, (by: Opening) => void>): { open(opening: Opening): void } {
  return { open: (opening) => { for (const c of CLOSES[opening]) closers[c](opening); } };
}
