export type Closer = "panel" | "search" | "goto" | "gotoPopup" | "gotoPopupCaret" | "lines" | "replace" | "replaceBack";
export type Opening = "search" | "goto" | "gotoPopup" | "lines" | "replace" | "help" | "bookmarks" | "shortcuts" | "backups" | "lists" | "navigated" | "view" | "sourceView" | "here" | "escape";

/* ONE THING OPEN AT A TIME: each opening closes every other open thing —
   a panel every masthead row, a masthead row the panel and the other rows —
   and a navigation all of them, drawn as they were for the entry left
   (pin: overlays.test › a masthead row, opened) (pin: overlays.test › a panel, opened).
   ⌃⌘M and an arrival where it already is hand the caret to the entry, so
   whatever stands over it goes; a switch the surface makes by itself, a
   refused entry redrawn, closes only the Go to popup (pin: overlays.test › a navigation closes everything).
   A row's ORDER is part of it: the closers are not independent, one may
   move the focus that a later one reads. Escape's caret hand-back comes
   before the Search and Go to rows close: after them, it found the focus gone from the
   Go to popup and handed nothing back (pin: overlays.test › Escape closes everything) */
const ROWS: readonly Closer[] = ["search", "goto", "gotoPopup", "lines", "replace"];
const others = (self: Closer | null): Closer[] => ["panel", ...ROWS].filter((c) => c !== self) as Closer[];
export const CLOSES: Record<Opening, readonly Closer[]> = {
  search: others("search"),
  goto: others("goto"),
  gotoPopup: others("gotoPopup"),
  lines: others("lines"),
  replace: others("replace"),
  help: ROWS,
  backups: ROWS,
  bookmarks: ROWS,
  shortcuts: ROWS,
  lists: ROWS,
  navigated: others(null),
  view: ["panel", "search", "gotoPopup"],
  sourceView: ["gotoPopup"],
  here: ["panel", "search", "gotoPopup"],
  escape: ["panel", "gotoPopupCaret", "search", "goto", "lines", "replaceBack"],
};

export function overlays(closers: Record<Closer, () => void>): { open(opening: Opening): void } {
  return { open: (opening) => { for (const c of CLOSES[opening]) closers[c](); } };
}
