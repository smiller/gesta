interface Mods { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean; altKey: boolean }

export type Step = 1 | -1 | "home" | "end";
const STEPS: Record<string, Step> = { ArrowDown: 1, ArrowUp: -1, Home: "home", End: "end" };
/* `ends`: Home and End are the list's only where the list holds the focus;
   in a text box they move the caret */
export function listKey(e: { key: string; isComposing: boolean } & Mods, ends = false): "enter" | Step | null {
  if (e.isComposing) return null;
  if (e.key === "Enter") return "enter";
  if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return null;
  const step = STEPS[e.key];
  return step === undefined || (!ends && typeof step === "string") ? null : step;
}
export function stepped(active: number, by: Step, n: number): number {
  if (!n) return active;
  if (by === "home") return 0;
  if (by === "end") return n - 1;
  return (active + by + n) % n;
}
export const enterKey = (e: { key: string; isComposing: boolean }): boolean => e.key === "Enter" && !e.isComposing;
export const holdsFocus = (tagName: string): boolean => tagName !== "INPUT" && tagName !== "LABEL";
/* `inside`: whether the focus went to an element within the panel, null when to no element */
export const focusLeaves = (inside: boolean | null, nowhereLeaves: boolean): boolean => (inside === null ? nowhereLeaves : !inside);
