import { test, expect } from "vitest";
import { BOOKMARK_CAP, ALIAS_RE, parseBookmarks, serializeBookmarks, bookmarkIndex, aliasHolder, numberedBookmarks, aliasedBookmarks, aliasRefusal, setBookmarkAlias, addBookmark, bookmarksFull } from "./bookmarks.ts";

const row = (key: string, alias = "") => ({ key, alias });
const keys = (n: number, prefix = "k") => Array.from({ length: n }, (_, i) => prefix + i);

test("parseBookmarks: an empty store is a list, anything this app would not have written is null", () => {
  expect(parseBookmarks("")).toEqual([]);
  expect(parseBookmarks("[]")).toEqual([]);
  expect(parseBookmarks('["2021-06-22", {"key": "page/A", "alias": "pa"}]')).toEqual([row("2021-06-22"), row("page/A", "pa")]);
  expect(parseBookmarks("not json")).toBeNull();
  expect(parseBookmarks('{"key": "x"}')).toBeNull();
  expect(parseBookmarks('[""]')).toBeNull();
  expect(parseBookmarks("[3]")).toBeNull();
  expect(parseBookmarks('[{"key": "x", "alias": "b", "extra": 1}]')).toBeNull();
  expect(parseBookmarks('[{"key": "x", "alias": "A1"}]')).toBeNull();
  expect(parseBookmarks('["x", "x"]')).toBeNull();
  expect(parseBookmarks('[{"key": "x", "alias": "b"}, {"key": "y", "alias": "b"}]')).toBeNull();
  expect(parseBookmarks(JSON.stringify(keys(BOOKMARK_CAP + 1)))).toBeNull();
  const many = keys(30, "a").map((k, i) => row(k, "b" + i));
  expect(parseBookmarks(JSON.stringify(many))!.length).toBe(30);
  const both = parseBookmarks(JSON.stringify(keys(BOOKMARK_CAP).concat(many as unknown as string[])))!;
  expect(numberedBookmarks(both).map((b) => b.key)).toEqual(keys(BOOKMARK_CAP));
  expect(aliasedBookmarks(both).length).toBe(30);
  expect(parseBookmarks(JSON.stringify(keys(BOOKMARK_CAP + 1).concat(many as unknown as string[])))).toBeNull();
});
test("serializeBookmarks: an unkeyed row goes back as the bare string, and round-trips", () => {
  const list = [row("2021-06-22"), row("page/A", "pa")];
  expect(serializeBookmarks(list)).toEqual(["2021-06-22", { key: "page/A", alias: "pa" }]);
  expect(parseBookmarks(JSON.stringify(serializeBookmarks(list)))).toEqual(list);
});
test("the two views of one array, and the lookups", () => {
  const list = [row("a"), row("b", "purg19"), row("c"), row("d", "purg2")];
  expect(numberedBookmarks(list).map((b) => b.key)).toEqual(["a", "c"]);
  expect(aliasedBookmarks(list).map((b) => b.alias)).toEqual(["purg2", "purg19"]);
  const cantos = [row("p/a", "purg19"), row("p/b", "purg2"), row("p/c", "purg1"), row("p/d", "scr12"), row("p/e", "scr2")];
  expect(aliasedBookmarks(cantos).map((b) => b.alias)).toEqual(["purg1", "purg2", "purg19", "scr2", "scr12"]);
  expect(bookmarkIndex(list, "c")).toBe(2);
  expect(bookmarkIndex(list, "zz")).toBe(-1);
  expect(aliasHolder(list, "purg2")).toBe(list[3]);
  expect(aliasHolder(list, "")).toBeNull();
  expect(aliasHolder(list, "zz")).toBeNull();
  expect(ALIAS_RE.test("b")).toBe(true);
  expect(ALIAS_RE.test("a1")).toBe(false);
  expect(ALIAS_RE.test("1b")).toBe(false);
  expect(ALIAS_RE.test("scr12")).toBe(true);
});
test("bookmarksFull counts the numbered rows only; set and add return a NEW list or null", () => {
  const nine = keys(9).map((k) => row(k));
  expect(bookmarksFull(nine)).toBe(true);
  expect(bookmarksFull(nine.slice(1))).toBe(false);
  expect(bookmarksFull(nine.slice(1).concat(keys(30, "a").map((k, i) => row(k, "b" + i))))).toBe(false);
  const list = [row("a"), row("b")];
  expect(setBookmarkAlias(list, "b", "bb")).toEqual([row("a"), row("b", "bb")]);
  expect(list).toEqual([row("a"), row("b")]);
  expect(setBookmarkAlias(list, "zz", "bb")).toBeNull();
  expect(addBookmark(list, "c")).toEqual([row("a"), row("b"), row("c")]);
  expect(addBookmark(list, "a")).toBeNull();
  expect(addBookmark(nine, "more")).toBeNull();
  const keyedFull = keys(BOOKMARK_CAP).map((k) => row(k, "b" + k));
  expect(addBookmark(keyedFull, "more")).toEqual(keyedFull.concat([row("more")]));
  const keyed = setBookmarkAlias(addBookmark(keys(8).map((k) => row(k)), "k8")!, "k0", "c")!;
  expect(numberedBookmarks(keyed).length).toBe(BOOKMARK_CAP - 1);
  expect(addBookmark(keyed, "k10")).not.toBeNull();
  expect(numberedBookmarks(setBookmarkAlias(keyed, "k0", "")!).map((b) => b.key)).toEqual(keys(BOOKMARK_CAP));
});
test("aliasRefusal: the pattern and nothing about the list; the old shape still reads", () => {
  expect(aliasRefusal("")).toBe("");
  for (const a of ["1", "a", "1ab", "A"]) expect(aliasRefusal(a)).toMatch(/a letter b to z/);
  for (const a of ["fb", "scr12", "purgatorio19"]) expect(aliasRefusal(a)).toBe("");
  expect(parseBookmarks(null)).toEqual([]);
  expect(parseBookmarks('["page/A","2026-01-01","bookshelf/M/P"]')!.map((b) => b.key)).toEqual(["page/A", "2026-01-01", "bookshelf/M/P"]);
  expect(parseBookmarks('[{"alias":"c"}]')).toBeNull();
  expect(parseBookmarks('[{"key":"page/A","alias":"ab"}]')).toBeNull();
});
