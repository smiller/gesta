import { LINE_BREAK_RE } from "../model/grammar.ts";

export interface Shortcut { code: string; expansion: string }
/* duplicate codes are BOTH kept in file order: the highlighted row is the
   one inserted, so no winner is chosen (pin: shortcuts.test ›
   parseShortcuts: one row per line, split on the FIRST colon) */
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
