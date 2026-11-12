interface Mods { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }

export function listKey(e: { key: string; isComposing: boolean } & Mods): "enter" | 1 | -1 | null {
  if (e.key === "Enter") return e.isComposing ? null : "enter";
  if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return null;
  return e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : null;
}
export const enterKey = (e: { key: string; isComposing: boolean }): boolean => e.key === "Enter" && !e.isComposing;
export const holdsFocus = (tagName: string): boolean => tagName !== "INPUT" && tagName !== "LABEL";
/* `inside`: whether the focus went to an element within the card, null when to no element */
export const focusLeaves = (inside: boolean | null, nowhereLeaves: boolean): boolean => (inside === null ? nowhereLeaves : !inside);
