type Mods = Pick<KeyboardEvent, "ctrlKey" | "metaKey">;
type Press = Mods & Pick<KeyboardEvent, "code" | "repeat">;

const bothMods = (e: Mods): boolean => e.ctrlKey && e.metaKey;
export const plainChord = (e: Mods & Pick<KeyboardEvent, "shiftKey" | "altKey">): boolean => bothMods(e) && !e.shiftKey && !e.altKey;

export interface HeldKeys {
  swallows(e: Press, active: unknown): boolean;
  release(code: string): void;
  clear(): void;
}
/* A HELD KEY ACTS ONCE where its press moved the keys elsewhere — the Enter
   or digit that chose a search result, a shortcut or a bookmark went on
   into the text it opened, splitting it — and a held ⌃⌘ chord always: a
   walk went on entry after entry. A held Tab moves one control, by
   decision (pin: where the keys go › Enter held on a search result)
   (pin: where the keys go › a digit held on the bookmarks card)
   (pin: where the keys go › ⌃⌘. held from 3pr1)
   (pin: where the keys go › Tab held from the bookshelf button) */
export function heldKeys(): HeldKeys {
  const pressedIn = new Map<string, unknown>();
  const heldElsewhere = (code: string, active: unknown): boolean => pressedIn.has(code) && pressedIn.get(code) !== active;
  const swallows = (e: Press, active: unknown): boolean => {
    if (!e.repeat) { pressedIn.set(e.code, active); return false; }
    return bothMods(e) || heldElsewhere(e.code, active);
  };
  return { swallows, release: (code) => { pressedIn.delete(code); }, clear: () => { pressedIn.clear(); } };
}
export function listenHeldKeys(doc: Document, win: Window): void {
  const held = heldKeys();
  doc.addEventListener("keydown", (e) => {
    if (held.swallows(e, doc.activeElement)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  doc.addEventListener("keyup", (e) => { held.release(e.code); });
  win.addEventListener("blur", () => { held.clear(); });
}
