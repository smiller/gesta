export type ScreenNotice = "take" | "leave" | "deleted";
/* `md` null: deleted in the other tab */
export function screenNotice(onScreen: boolean, unsaved: boolean, md: string | null): ScreenNotice {
  if (!onScreen) return "take";
  if (unsaved) return "leave";
  return md === null ? "deleted" : "take";
}
