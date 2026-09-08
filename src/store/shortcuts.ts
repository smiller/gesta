/* Custom shortcuts: the table's grammar, pure. Ported 2026-09-08 from
   ../writer/src/js/shortcuts.mjs with its tests. Text → ordered rows, one
   per line, split on the FIRST ":": blank lines and #-comments skipped, a
   line with no colon or an empty code skipped, the code trimmed, the
   expansion everything after the colon minus ONE optional leading space
   (trailing whitespace stays). Duplicate codes are BOTH kept in file
   order: the popup inserts the highlighted row, so no winner is chosen.
   The filter is a case-sensitive prefix on the code. */
const LINE_BREAK_RE = /\r\n?|[\u2028\u2029]/g;
export interface Shortcut { code: string; expansion: string }
export function parseShortcuts(text: string | null | undefined): Shortcut[] {
  const out: Shortcut[] = [];
  for (const line of (text || "").replace(LINE_BREAK_RE, "\n").split("\n")) {
    const t = line.trim();
    if (!t || t.charAt(0) === "#") continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const code = line.slice(0, i).trim();
    if (!code) continue;
    out.push({ code, expansion: line.slice(i + 1).replace(/^ /, "") });
  }
  return out;
}
export function filterShortcuts(list: Shortcut[], query: string): Shortcut[] {
  if (!query) return list;
  return list.filter((s) => s.code.indexOf(query) === 0);
}
