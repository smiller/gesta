export type Closer = "panel" | "search" | "goto" | "lineBar" | "lineBarCaret" | "lines" | "replace" | "replaceBack";
export type Opening = "search" | "goto" | "lineBar" | "lines" | "replace" | "help" | "bookmarks" | "shortcuts" | "backups" | "pages" | "navigated" | "sourceView" | "escape";

/* ONE THING OPEN AT A TIME: each opening closes every other open thing —
   a panel every header row, a header row the panel and the other rows —
   and a navigation all of them, drawn as they were for the entry left
   (pin: overlays.test › a header row, opened) (pin: overlays.test › a panel, opened).
   A row's ORDER is part of it: the closers are not independent, one may
   move the focus that a later one reads. Escape's caret hand-back comes
   before search and Go to: after them, it found the focus gone from the
   line bar and handed nothing back (pin: overlays.test › Escape closes everything) */
const ROWS: readonly Closer[] = ["search", "goto", "lineBar", "lines", "replace"];
const others = (self: Closer | null): Closer[] => ["panel", ...ROWS].filter((c) => c !== self) as Closer[];
export const CLOSES: Record<Opening, readonly Closer[]> = {
  search: others("search"),
  goto: others("goto"),
  lineBar: others("lineBar"),
  lines: others("lines"),
  replace: others("replace"),
  help: ROWS,
  backups: ROWS,
  bookmarks: ROWS,
  shortcuts: ROWS,
  pages: ROWS,
  navigated: others(null),
  sourceView: ["lineBar"],
  escape: ["panel", "lineBarCaret", "search", "goto", "lines", "replaceBack"],
};

export function overlays(closers: Record<Closer, () => void>): { open(opening: Opening): void } {
  return { open: (opening) => { for (const c of CLOSES[opening]) closers[c](); } };
}
