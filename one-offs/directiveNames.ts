const NEW: Record<string, string> = {
  "from the last title": "by innermost title alone", "no author": "by title alone", "scripture": "by chapter and verse",
  "parts in roman": "part titles in roman", "prosimetrum": "prose by paragraph, verse by line", "old english verse": "by half-line",
};
export interface Renamed { line: number; was: string; now: string }
/* an entry's retired directive names given their new ones, inside a
   `::: reference` block at the entry's top level alone */
export function renamedDirectives(md: string): { md: string; renamed: Renamed[] } {
  const lines = md.split("\n"), renamed: Renamed[] = [];
  let inBlock = false;
  lines.forEach((l, i) => {
    if (!inBlock) { inBlock = l.trimEnd() === "::: reference"; return; }
    if (l.trim() === ":::") { inBlock = false; return; }
    const now = NEW[l.trim().toLowerCase()];
    if (!now) return;
    renamed.push({ line: i + 1, was: l.trim(), now });
    lines[i] = now;
  });
  return { md: lines.join("\n"), renamed };
}
