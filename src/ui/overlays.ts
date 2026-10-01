export type Closer = "panel" | "search" | "goto" | "lineBar" | "lineBarCaret" | "lines";
export type Opening = "search" | "goto" | "lineBar" | "lines" | "help" | "bookmarks" | "shortcuts" | "backups" | "pages" | "navigated" | "sourceView" | "escape";

/* what each opening closes, IN ORDER: the closers are not independent —
   one may move the focus that a later one reads — so a row's order is part
   of it. Escape's caret hand-back comes before search and Go to: after
   them, it found the focus gone from the line bar and handed nothing back
   (pin: overlays.test › Escape closes everything). Go to, opened, closes
   only the panel, which would cover it
   (pin: overlays.test › search and Go to close only the panel) */
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
  /* an overlay drawn for another entry goes: Go to's selects were
     preselected for the entry left */
  navigated: ["panel", "search", "goto", "lineBar"],
  sourceView: ["lineBar"],
  escape: ["panel", "lineBarCaret", "search", "goto", "lines"],
};

export function overlays(closers: Record<Closer, () => void>): { open(opening: Opening): void } {
  return { open: (opening) => { for (const c of CLOSES[opening]) closers[c](); } };
}
