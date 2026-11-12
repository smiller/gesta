/* Anything this app would not have written reads as null, not as an empty
   list, so the next add cannot write over rows still recoverable by hand
   (pin: bookmarks.test › parseBookmarks: an empty store is a list, anything
   this app would not have written is null). TWO MEMBER SHAPES AND NO THIRD:
   a bare string is a row with no key of its own, an object one with; an
   unkeyed row serializes back as the bare string, so a store never touched
   by keys stays byte for byte (pin: bookmarks.test › serializeBookmarks: an
   unkeyed row goes back as the bare string) */
import { byName, isDayKey, nsOf } from "./keys.ts";
import { registered } from "./lists.ts";

export const BOOKMARK_CAP = 9;
/* a trigger's first character is neither a (add) nor a digit (the jump)
   (pin: bookmarks.test › aliasRefusal: the pattern) */
export const ALIAS_RE = /^[b-z][a-z0-9]*$/;
export interface Bookmark { key: string; alias: string }
function jsonArray(text: string): unknown[] | null {
  try {
    const raw: unknown = JSON.parse(text);
    return Array.isArray(raw) ? raw : null;
  } catch { return null; }
}
const strayField = (f: string): boolean => f !== "key" && f !== "alias";
const isPlain = (m: unknown): m is Record<string, unknown> => !!m && typeof m === "object" && !Array.isArray(m);
function readRow(m: unknown): Bookmark | null {
  if (typeof m === "string") return { key: m, alias: "" };
  if (!isPlain(m)) return null;
  if (Object.keys(m).some(strayField)) return null;
  const key = m.key, alias = m.alias === undefined ? "" : m.alias;
  return typeof key === "string" && typeof alias === "string" ? { key, alias } : null;
}
function admits(rows: Bookmark[], row: Bookmark): boolean {
  if (!row.key) return false;
  if (row.alias && !ALIAS_RE.test(row.alias)) return false;
  return bookmarkIndex(rows, row.key) === -1 && !aliasHolder(rows, row.alias);
}
export function parseBookmarks(text: string | null | undefined): Bookmark[] | null {
  if (!text) return [];
  const raw = jsonArray(text);
  if (!raw) return null;
  const rows: Bookmark[] = [];
  for (const m of raw) {
    const row = readRow(m);
    if (!row || !admits(rows, row)) return null;
    rows.push(row);
  }
  return numberedBookmarks(rows).length > BOOKMARK_CAP ? null : rows;
}
export function serializeBookmarks(list: Bookmark[]): (string | Bookmark)[] {
  return list.map((b) => (b.alias ? { key: b.key, alias: b.alias } : b.key));
}
export function bookmarkIndex(list: Bookmark[], key: string): number {
  return list.findIndex((b) => b.key === key);
}
export function aliasHolder(list: Bookmark[], alias: string): Bookmark | null {
  if (!alias) return null;
  return list.find((b) => b.alias === alias) || null;
}
export function numberedBookmarks(list: Bookmark[]): Bookmark[] { return list.filter((b) => !b.alias); }
export function aliasedBookmarks(list: Bookmark[]): Bookmark[] {
  return list.filter((b) => b.alias).sort((x, y) => byName(x.alias, y.alias));
}
export function bookmarksFull(list: Bookmark[]): boolean { return numberedBookmarks(list).length >= BOOKMARK_CAP; }
export function aliasRefusal(alias: string): string {
  if (!alias) return "";
  return ALIAS_RE.test(alias) ? "" : "a letter b to z, then letters or digits — a adds, a leading digit jumps";
}
/* a NEW list with the row's trigger set or cleared, or null when the list
   has not got the key: a refused write must leave the cache agreeing with
   the store, and an in-place edit would already have moved (pin:
   bookmarks.test › bookmarksFull counts the numbered rows only; set and add
   return a NEW list or null) */
export function setBookmarkAlias(list: Bookmark[], key: string, alias: string): Bookmark[] | null {
  const i = bookmarkIndex(list, key);
  if (i === -1) return null;
  return list.map((b, n) => (n === i ? { key: b.key, alias } : b));
}
export function addBookmark(list: Bookmark[], key: string): Bookmark[] | null {
  if (bookmarksFull(list)) return null;
  if (bookmarkIndex(list, key) !== -1) return null;
  return list.concat([{ key, alias: "" }]);
}
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
export function movedBookmarks(list: Bookmark[], moves: Record<string, string>): Bookmark[] {
  const held = new Set(list.filter((b) => !Object.hasOwn(moves, b.key)).map((b) => b.key));
  const out: Bookmark[] = [];
  for (const b of list) {
    if (!Object.hasOwn(moves, b.key)) { out.push(b); continue; }
    if (held.has(moves[b.key])) continue;
    held.add(moves[b.key]);
    out.push({ key: moves[b.key], alias: b.alias });
  }
  return out;
}
