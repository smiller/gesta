/* The sub-entry rules, pure: where a new one of the open entry would
   live, what blocks a rename or a delete, and where a delete lands.
   Ported 2026-09-07 from 15-tagged-sub-entries-create-rename-delete.js.
   EVERY page hosts, at every depth; the one leaf left is a day's TAGGED
   entry. A page's name is part of every key beneath it and there is no
   cascade, so content-bearing DESCENDANTS block its rename and delete at
   every depth; registered-but-blank ones never block, and are swept only
   AFTER the user confirms. */
import { nsOf, pageParts, entryKey, entryHash, entryNoun, todayKey } from "../store/keys.ts";
import { childrenOf } from "../store/lists.ts";
import { pageName } from "../store/names.ts";

export interface SubSpec { tag: string; full: string; listKey: string; href: string }
/* the spec for a typed name, or the refusal; null when the open entry
   cannot host (a day's tagged entry — silent, since no route in shows) */
export function subEntrySpec(date: string, tag: string | null, typed: string): SubSpec | { refuse: string } | null {
  const ns = nsOf(date);
  if (!ns && tag) return null;
  const name = ns ? pageName(typed) : typed;
  if (!name) return { refuse: "that name leaves nothing a filename can keep" };
  const full = ns ? tag + "/" + name : name;
  return { tag: name, full, listKey: ns ? entryKey(date, tag) : date, href: entryHash(date, full) };
}
/* the alert when a name is already registered under the list key: the
   first slot says which of the three lists this is */
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
/* the whole blank subtree under a key, deepest first — what a confirmed
   rename or delete sweeps */
export function blankSubTree(keys: string[], listKey: string): string[] {
  const out: string[] = [];
  for (const s of childrenOf(keys, listKey)) { const k = entryKey(listKey, s); out.push(...blankSubTree(keys, k)); out.push(k); }
  return out;
}
/* the button wording per namespace: a page hosts and is a sub-entry both */
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
/* the prompt and confirm texts: the noun leads the name, the reading not
   the key, and the prefill stays the key since that is what a rename
   changes */
export function renamePrompt(date: string, tag: string, shownLabel: string): string {
  const ns = nsOf(date);
  return "Rename the " + (ns ? entryNoun(date, tag) : "tag") + ' "' + shownLabel + '" to:';
}
export function deleteConfirm(date: string, tag: string, shown: string): string {
  return nsOf(date) ? "Delete the " + entryNoun(date, tag) + ' "' + shown + '"?' : 'Delete the entry "' + shown + '" for this day?';
}
/* where a delete lands: a root on today, a sub-page on its immediate
   parent, a day's tagged entry on the day */
export function deleteLanding(date: string, tag: string): { date: string; tag: string | null } {
  const ns = nsOf(date);
  if (!ns) return { date, tag: null };
  const pp = pageParts(tag);
  return pp.sub ? { date, tag: pp.parent } : { date: todayKey(), tag: null };
}
/* the host whose links point at a sub-entry: the day, or a sub-page's
   parent; a top-level page has none */
export function hostKey(date: string, tag: string): string | null {
  const ns = nsOf(date);
  if (!ns) return date;
  const pp = pageParts(tag);
  return pp.sub ? entryKey(date, pp.parent) : null;
}
