export type ScreenTake = "take" | "leave" | "deleted";
/* `md` null: deleted in the other tab */
export function screenTake(onScreen: boolean, unsaved: boolean, md: string | null): ScreenTake {
  if (!onScreen) return "take";
  if (unsaved) return "leave";
  return md === null ? "deleted" : "take";
}
