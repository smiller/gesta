// The blank-row step's reading, the same over both apps but for the root
// the text sits under: where the caret is, the first blank row's box and
// drawn caret, the first verse's first two rows.
import type { Page } from "../heliumPage.ts";

export const blankRowReader = (root: string) => (page: Page) => page.evaluate((root) => {
  const g = document.querySelector(root + " .vgap");
  const s = getSelection()!, a = s.anchorNode;
  const el = (a?.nodeType === 3 ? a.parentElement : a) as Element | null;
  const held = el?.closest?.(".vgap");
  const gap = (held && !held.textContent ? held : null) || (g?.classList.contains("ProseMirror-selectednode") ? g : null);
  const row = el?.closest?.(".vrow, .vgap");
  const first = document.querySelector(root + " .vrow");
  return {
    caret: gap ? "on the blank row" : row ? "…" + row.textContent!.slice(0, s.anchorOffset).slice(-12) + "|" : "none",
    box: g ? getComputedStyle(g).outlineStyle : null,
    drawn: g ? getComputedStyle(g, "::before").content !== "none" : null,
    rows: first ? [...first.parentElement!.children].slice(0, 2).map((c) => c.classList.contains("vgap") && !c.textContent ? "(blank)" : c.textContent!.slice(0, 24)) : [],
  };
}, root);
