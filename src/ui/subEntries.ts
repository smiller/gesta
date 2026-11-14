/* EVERY page hosts, at every depth; the one leaf left is a day's TAGGED
   entry. A page's name is part of every key beneath it and there is no
   cascade, so content-bearing DESCENDANTS block its rename and delete at
   every depth; registered-but-blank ones never block, and are swept only
   AFTER the user confirms (pin: subEntries.test › content-bearing
   descendants at any depth block; blanks never do) */
import { nsOf, tagParts, entryKey, entryHash, entryNoun, todayKey, NS_BOOK, plural } from "../store/keys.ts";
import { SHELVES } from "../store/shelves.ts";
import { childrenOf } from "../store/lists.ts";
import { entryName } from "../store/names.ts";
import { counted } from "./counted.ts";

export interface SubSpec { tag: string; full: string; listKey: string; href: string }
/* null when the open entry cannot host (a day's tagged entry — silent, since
   no route in shows) (pin: subEntries.test › a day's tagged entry cannot
   host) */
export function subEntrySpec(date: string, tag: string | null, typed: string): SubSpec | { refuse: string } | null {
  const ns = nsOf(date);
  if (!ns && tag) return null;
  const name = ns ? entryName(typed) : typed;
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
export interface SubButtons { create: string; createTitle: string; tagTitle: string; canCreate: boolean; canEdit: boolean; renameTitle: string; deleteTitle: string }
function keyedButtons(date: string, tag: string | null, subNoun: string): SubButtons {
  const level = entryNoun(date, tag) || "";
  return {
    create: "+ " + subNoun, createTitle: "Create a " + subNoun + " here", tagTitle: "Move selection to a new " + subNoun,
    canCreate: !(date === NS_BOOK.key && tag === SHELVES), canEdit: !!tag,
    renameTitle: "Rename this " + level, deleteTitle: "Delete this " + level,
  };
}
const dayButtons = (tag: string | null): SubButtons => ({
  create: "+ tagged entry", createTitle: "Create a tagged sub-entry for this day", tagTitle: "Move selection to a new tagged entry",
  canCreate: !tag, canEdit: !!tag,
  renameTitle: "Rename this entry's tag", deleteTitle: "Delete this tagged entry",
});
export function subButtons(date: string, tag: string | null): SubButtons {
  const ns = nsOf(date);
  return ns ? keyedButtons(date, tag, ns.subNoun) : dayButtons(tag);
}
/* the noun leads the name, the reading not the key, and the prefill stays
   the key since that is what a rename changes (pin: subEntries.test › the
   prompt and the confirm lead with the noun) */
export function renamePrompt(date: string, tag: string, shownLabel: string): string {
  const ns = nsOf(date);
  if (ns?.titledRoots && !tagParts(tag).sub) return "File and sort “" + shownLabel + "” under:";
  return "Rename the " + (ns ? entryNoun(date, tag) : "tag") + ' "' + shownLabel + '" to:';
}
export function movePrompt(date: string, tag: string, shownLabel: string): string {
  return "Move the " + entryNoun(date, tag) + " “" + shownLabel + "” and its " + plural(nsOf(date)!.subNoun) + " to:";
}
const subsText = (sub: string, moved: number): string => (moved ? " and its " + counted(moved, " " + sub, " " + plural(sub)) : "");
function twinsText(sub: string, twins: string[]): string {
  if (!twins.length) return "";
  const one = twins.length === 1;
  return " " + (one ? "1 " + sub + " is" : twins.length + " " + plural(sub) + " are") + " there already by title and " + (one ? "is" : "are") + " deleted, " + (one ? "its" : "their") + " links going to the one there: " + twins.map((t) => "“" + t + "”").join(", ") + ".";
}
export interface Shown { date: string; tag: string; shown: string }
export function moveConfirm(e: Shown, to: string, plan: { moved: number; into: boolean; twins: string[] }): string {
  const sub = nsOf(e.date)!.subNoun;
  const into = plan.into ? " Its own text goes after the text there." : "";
  return "Move the " + entryNoun(e.date, e.tag) + " “" + e.shown + "”" + subsText(sub, plan.moved) + " to " + to + "?" + into + twinsText(sub, plan.twins);
}
export function deleteConfirm(date: string, tag: string, shown: string): string {
  return nsOf(date) ? "Delete the " + entryNoun(date, tag) + ' "' + shown + '"?' : 'Delete the entry "' + shown + '" for this day?';
}
export function deleteLanding(date: string, tag: string): { date: string; tag: string | null } {
  const ns = nsOf(date);
  if (!ns) return { date, tag: null };
  const pp = tagParts(tag);
  return pp.sub ? { date, tag: pp.parent } : { date: todayKey(), tag: null };
}
export function hostKey(date: string, tag: string): string | null {
  const ns = nsOf(date);
  if (!ns) return date;
  const pp = tagParts(tag);
  return pp.sub ? entryKey(date, pp.parent) : null;
}
export interface MoveOutcome { moved: number; updated: number; left: string[]; stayed?: string[]; lost?: number; twins?: number }
const entriesText = (n: number): string => counted(n, " entry", " entries");
export function refiledText(root: string, o: MoveOutcome): string {
  return outcome("filed under " + root + " — " + entriesText(o.moved) + " moved" + lostText(o.lost ?? 0), o);
}
const lostText = (lost: number): string => lost ? ", " + counted(lost, " picture", " pictures") + " not found" : "";
export function movedText(to: string, o: MoveOutcome, verb = "moved"): string {
  const twins = o.twins ? ", " + o.twins + " there already deleted" : "";
  return outcome(verb + " to " + to + " — " + entriesText(o.moved) + twins + lostText(o.lost ?? 0), o);
}
function leftText(left: string[]): string {
  if (left.length === 1) return "; 1 link not updated: " + left[0];
  return left.length ? "; links not updated in " + left.length + " entries: " + left.join(", ") : "";
}
function outcome(text: string, o: MoveOutcome): string {
  const stayed = o.stayed ?? [];
  const updated = o.updated ? ", links updated in " + counted(o.updated, " other", " others") : "";
  const kept = stayed.length ? "; old " + (stayed.length === 1 ? "copy" : "copies") + " kept: " + stayed.join(", ") : "";
  return text + updated + leftText(o.left) + kept;
}
