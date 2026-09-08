/* What the bookmarks card READS and how a press at it resolves, pure.
   Ported 2026-09-08 from 22-bookmarks-b.js. The rows: keyed first sorted
   by trigger, then the numbered ones, each labelled LIVE from the entry
   (a renamed page keeps its bookmark right with no invalidation hook),
   the open entry's own row marked. The foot line asks one question — can
   the open entry be added, and if not why — and is omitted when the entry
   is already a row. A ROW THAT LEADS NOWHERE is swept at the open: a day
   is reachable whatever was written there, anything else must be
   registered. THE TYPED KEY: a prefix that could still grow WAITS — not
   for a clock, but until it is finished, abandoned or completed; a press
   nothing else extends resolves at once; Enter takes the sole candidate
   left, or asks for the rest; a is the add key and a digit the numbered
   jump only while nothing is held, which is what leaves scr12 reachable. */
import { isDayKey, nsOf, pageParts, entryKey } from "../store/keys.ts";
import { registered } from "../store/lists.ts";
import type { Journal } from "../store/reference.ts";
import { SCOPE_EVERYTHING } from "../store/search.ts";
import { resultLabel } from "./searchModel.ts";
import { trimLabel, LABEL_CAP, ECHO_CAP } from "./mastheadModel.ts";
import { type Bookmark, ALIAS_RE, aliasedBookmarks, numberedBookmarks, aliasHolder, bookmarkIndex, bookmarksFull } from "../store/bookmarks.ts";

export function bookmarkParts(key: string): { date: string; tag: string | null } {
  const slash = key.indexOf("/");
  return slash === -1 ? { date: key, tag: null } : { date: key.slice(0, slash), tag: key.slice(slash + 1) };
}
export function reachableBookmarks(list: Bookmark[], keys: string[]): Bookmark[] {
  return list.filter((b) => {
    const p = bookmarkParts(b.key);
    if (isDayKey(p.date)) return true;
    return !!nsOf(p.date) && registered(keys, p.date, p.tag);
  });
}
/* the row's words: a shelf position, each name bounded on its own */
export function bookmarkLabel(key: string, journal: Journal): string {
  const p = bookmarkParts(key);
  return resultLabel({ date: p.date, tag: p.tag, nth: 0, snippet: "" }, SCOPE_EVERYTHING, journal);
}
/* the link's label is what the entry is CALLED, not where it sits */
export function bookmarkLinkLabel(key: string, journal: Journal): string {
  const p = bookmarkParts(key);
  if (isDayKey(p.date)) return p.tag ? p.date + " · " + p.tag : p.date;
  const parts = pageParts(p.tag || "");
  return parts.sub ? (journal.heading(entryKey(p.date, p.tag)) || parts.leaf) : parts.name;
}
export interface BookmarkRow { key: string; trigger: string; label: string; keyed: boolean; here: boolean; cut: boolean }
export function bookmarkRows(list: Bookmark[], here: string, journal: Journal): BookmarkRow[] {
  const keyed = aliasedBookmarks(list);
  const rows: BookmarkRow[] = keyed.map((b) => ({ key: b.key, trigger: b.alias, label: bookmarkLabel(b.key, journal), keyed: true, here: b.key === here, cut: false }));
  numberedBookmarks(list).forEach((b, i) => rows.push({ key: b.key, trigger: String(i + 1), label: bookmarkLabel(b.key, journal), keyed: false, here: b.key === here, cut: i === 0 && keyed.length > 0 }));
  return rows;
}
/* the foot line, null when the open entry is already a row */
export function bookmarkFoot(list: Bookmark[], here: string, journal: Journal): { full: true } | { full: false; name: string } | null {
  if (bookmarkIndex(list, here) !== -1) return null;
  if (bookmarksFull(list)) return { full: true };
  return { full: false, name: trimLabel(bookmarkLabel(here, journal), LABEL_CAP) };
}
export const alreadyOn = (key: string, journal: Journal): string => "already on " + trimLabel(bookmarkLabel(key, journal), ECHO_CAP);
/* the rows a held prefix could still reach */
export function aliasCandidates(list: Bookmark[], buf: string): Bookmark[] {
  return aliasedBookmarks(list).filter((b) => b.alias.indexOf(buf) === 0);
}
export type Resolved = { buf: string; jump?: Bookmark; say?: string };
/* Enter, or a press that cannot grow: the exact holder, else the sole
   candidate, else "finish the key" with the prefix KEPT, else no bookmark */
export function resolveAlias(list: Bookmark[], buf: string): Resolved {
  let b = aliasHolder(list, buf);
  const left = aliasCandidates(list, buf);
  if (!b && left.length === 1) b = left[0];
  if (!b && left.length) return { buf, say: "finish the key" };
  return b ? { buf: "", jump: b } : { buf: "", say: "no bookmark " + buf };
}
/* a character typed at the card with `buf` held: null when the press is
   not a key's (the caller's other arms then apply) */
export function typeAlias(list: Bookmark[], buf: string, ch: string): Resolved | null {
  if (!ALIAS_RE.test(buf + ch)) return null;
  const next = buf + ch;
  const canGrow = aliasCandidates(list, next).some((b) => b.alias.length > next.length);
  return canGrow ? { buf: next } : resolveAlias(list, next);
}
