/* EVERY page hosts, at every depth; the one leaf left is a day's TAGGED
   entry. A page's name is part of every key beneath it and there is no
   cascade, so content-bearing DESCENDANTS block its rename and delete at
   every depth; registered-but-blank ones never block, and are swept only
   AFTER the user confirms (pin: subEntries.test › content-bearing
   descendants at any depth block; blanks never do) */
import { nsOf, pageParts, entryKey, entryHash, entryNoun, todayKey } from "../store/keys.ts";
import { childrenOf } from "../store/lists.ts";
import { pageName } from "../store/names.ts";

export interface SubSpec { tag: string; full: string; listKey: string; href: string }
/* null when the open entry cannot host (a day's tagged entry — silent, since
   no route in shows) (pin: subEntries.test › a day's tagged entry cannot
   host) */
export function subEntrySpec(date: string, tag: string | null, typed: string): SubSpec | { refuse: string } | null {
  const ns = nsOf(date);
  if (!ns && tag) return null;
  const name = ns ? pageName(typed) : typed;
  if (!name) return { refuse: "that name leaves nothing a filename can keep" };
  const full = ns ? tag + "/" + name : name;
  return { tag: name, full, listKey: ns ? entryKey(date, tag) : date, href: entryHash(date, full) };
}
export function takenText(listKey: string, tag: string): string {
  const cut = listKey.indexOf("/");
  const head = cut === -1 ? listKey : listKey.slice(0, cut);
  const ns = nsOf(head);
  if (!ns) return 'A "' + tag + '" entry already exists for this day.';
  return 'A "' + tag + '" ' + (cut === -1 ? ns.noun : ns.subNoun) + " already exists.";
}
export const bearing = (cache: Record<string, string>, key: string): boolean => !!(cache[key] || "").trim();
export function subTreeHasContent(keys: string[], cache: Record<string, string>, listKey: string): boolean {
  return childrenOf(keys, listKey).some((s) => { const k = entryKey(listKey, s); return bearing(cache, k) || subTreeHasContent(keys, cache, k); });
}
export function blankSubTree(keys: string[], listKey: string): string[] {
  const out: string[] = [];
  for (const s of childrenOf(keys, listKey)) { const k = entryKey(listKey, s); out.push(...blankSubTree(keys, k)); out.push(k); }
  return out;
}
export interface SubButtons { create: string; createTitle: string; canCreate: boolean; canEdit: boolean; renameTitle: string; deleteTitle: string }
export function subButtons(date: string, tag: string | null): SubButtons {
  const ns = nsOf(date);
  const level = entryNoun(date, tag) || "";
  return {
    create: ns ? "+ " + ns.subNoun : "+ tagged entry",
    createTitle: ns ? "Create a " + ns.subNoun + " here" : "Create a tagged sub-entry for this day",
    canCreate: !!ns || !tag,
    canEdit: !!tag,
    renameTitle: ns ? "Rename this " + level : "Rename this entry's tag",
    deleteTitle: ns ? "Delete this " + level : "Delete this tagged entry",
  };
}
/* the noun leads the name, the reading not the key, and the prefill stays
   the key since that is what a rename changes (pin: subEntries.test › the
   prompt and the confirm lead with the noun) */
export function renamePrompt(date: string, tag: string, shownLabel: string): string {
  const ns = nsOf(date);
  if (ns && ns.titledRoots && !pageParts(tag).sub) return "File and sort “" + shownLabel + "” under:";
  return "Rename the " + (ns ? entryNoun(date, tag) : "tag") + ' "' + shownLabel + '" to:';
}
export function deleteConfirm(date: string, tag: string, shown: string): string {
  return nsOf(date) ? "Delete the " + entryNoun(date, tag) + ' "' + shown + '"?' : 'Delete the entry "' + shown + '" for this day?';
}
export function deleteLanding(date: string, tag: string): { date: string; tag: string | null } {
  const ns = nsOf(date);
  if (!ns) return { date, tag: null };
  const pp = pageParts(tag);
  return pp.sub ? { date, tag: pp.parent } : { date: todayKey(), tag: null };
}
export function hostKey(date: string, tag: string): string | null {
  const ns = nsOf(date);
  if (!ns) return date;
  const pp = pageParts(tag);
  return pp.sub ? entryKey(date, pp.parent) : null;
}
export function refiledText(root: string, moved: number, updated: number, left: string[], stayed: string[] = []): string {
  let text = "filed under " + root + " — " + moved + (moved === 1 ? " entry" : " entries") + " moved";
  if (updated) text += ", links updated in " + updated + (updated === 1 ? " other" : " others");
  if (left.length === 1) text += "; 1 link not updated: " + left[0];
  else if (left.length) text += "; links not updated in " + left.length + " entries: " + left.join(", ");
  if (stayed.length) text += "; old " + (stayed.length === 1 ? "copy" : "copies") + " kept: " + stayed.join(", ");
  return text;
}
