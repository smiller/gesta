export type Closer = "panel" | "search" | "searchDropped" | "goto" | "lineBar" | "lineBarCaret" | "lines";
export type Opening = "search" | "goto" | "lineBar" | "lines" | "help" | "bookmarks" | "shortcuts" | "backups" | "pages" | "navigated" | "sourceView" | "escape";

/* what each opening closes, IN ORDER: closing search or Go to hands focus
   back to the editor, and Escape's line-bar close hands the caret back.
   Go to's row closes only the panel: the row itself covers nothing, so an
   overlay opening leaves it alone, and it dismisses only what would cover
   the row just asked for (pin: overlays.test › search and Go to close only the panel)
   (pin: overlays.test › Escape closes everything) */
export const CLOSES: Record<Opening, readonly Closer[]> = {
  search: ["panel"],
  goto: ["panel"],
  lineBar: ["panel", "search", "goto"],
  lines: ["panel", "lineBar"],
  help: ["search", "lineBar"],
  backups: ["search", "lineBar"],
  bookmarks: ["search", "goto", "lineBar"],
  shortcuts: ["search", "goto", "lineBar"],
  pages: [],
  /* an overlay drawn for another entry goes, the search with its query, and
     the line bar whose preselects it made stale */
  navigated: ["panel", "searchDropped", "goto", "lineBar"],
  sourceView: ["lineBar"],
  escape: ["panel", "search", "goto", "lineBarCaret", "lines"],
};

export function overlays(closers: Record<Closer, () => void>): { open(opening: Opening): void } {
  return { open: (opening) => { for (const c of CLOSES[opening]) closers[c](); } };
}
