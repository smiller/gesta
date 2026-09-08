// The disk-name decisions, ported 2026-09-07 from ../writer/src/js/names.test.mjs.
import { test, expect } from "vitest";
import {
  dayDir, pageName, trimToBytes, nameFromUrl,
  nsTarget, importTarget, NAME_BYTES, imgHash,
  entryFile, collidingFile, nextImageName,
} from "./names.ts";

test("imgHash: the string math must not move, and the arms differ past ASCII", () => {
  expect(imgHash("abc")).toBe("7aigb0");
  expect(imgHash(new TextEncoder().encode("abc"))).toBe("7aigb0");
  // The two accessors agree only while char code === byte; both outputs are
  // stored contracts.
  expect(imgHash("é")).toBe("tz86ys");
  expect(imgHash(new TextEncoder().encode("é"))).toBe("7xuf8c");
});

test("pageName: the house rules, run to a fixed point", () => {
  expect(pageName("Title: Sub")).toBe("Title — Sub");
  expect(pageName("12:30 log")).toBe("12-30 log");
  expect(pageName("A//B\\C")).toBe("A-B-C");
  expect(pageName("a - -")).toBe("a");
  expect(pageName("-x-")).toBe("x");
  expect(pageName("Notes.")).toBe("Notes");
  expect(pageName("...")).toBe("...");
  for (const n of ["Title — Sub", "A-B-C", "...", "12-30 log"]) {
    expect(pageName(n)).toBe(n);
  }
});

test("pageName caps at NAME_BYTES, by UTF-8 bytes", () => {
  expect(NAME_BYTES).toBe(245);
  const long = "é".repeat(300);
  expect(pageName(long)).toBe("é".repeat(122));   // 244 bytes — 245 would split a é
});

test("trimToBytes: bounded, multibyte-safe, no lone high surrogate", () => {
  expect(trimToBytes("anything", 0)).toBe("");
  expect(trimToBytes("héllo", 3)).toBe("hé");
  expect(trimToBytes("a\u{1F600}", 3)).toBe("a");
  expect(trimToBytes("a\uD800", 10)).toBe("a");
});

test("dayDir derives the year folder from the key", () => {
  expect(dayDir("2026-01-05")).toBe("journal/2026");
});

test("nameFromUrl: three outcomes, and the whitelist stays out of the regex", () => {
  expect(nameFromUrl("https://x.com/2026/01/05/slug/?utm=1")).toBe("2026-01-05-slug");
  expect(nameFromUrl("https://x.com/about")).toBe(null);
  expect(nameFromUrl("https://x.com/2026/01/05/a%20b/")).toBe("");
});

test("nameFromUrl: the shapes a paste actually carries", () => {
  expect(nameFromUrl("http://example.com/2020/01/02/some-post")).toBe("2020-01-02-some-post");
  expect(nameFromUrl("  https://a.blog/2021/05/06/slug/#top ")).toBe("2021-05-06-slug");
  expect(nameFromUrl("Necessary Losses")).toBe(null);
  // EMPTY input stays null, not "": a cancelled prompt arrives as "".
  expect(nameFromUrl("")).toBe(null);
  expect(nameFromUrl("https://example.com/2023/1/2/slug/")).toBe(null);
  expect(nameFromUrl("https://example.com/2023/11/12/two/parts/")).toBe(null);
  expect(pageName(nameFromUrl("https://x.com/2023/11/12/foo--bar/"))).toBe("2023-11-12-foo-bar");
});

test("importTarget: the day arm reads the filename, in exactly its own folder", () => {
  expect(importTarget("journal/2026/2026-01-05.md")).toEqual({ date: "2026-01-05", tag: null });
  expect(importTarget("journal/2026/2026-01-05--morning.md")).toEqual({ date: "2026-01-05", tag: "morning" });
  expect(importTarget("journal/2027/2026-01-05.md")).toBe(null);
  expect(importTarget("journal/2026/2026-01-05--.md")).toBe(null);
});

test("importTarget: the namespace arm is tested FIRST and keys by path", () => {
  expect(importTarget("page/A/B.md")).toEqual({ date: "page", tag: "A/B" });
  expect(importTarget("bookshelf/B/2026-01-05.md")).toEqual({ date: "bookshelf", tag: "B/2026-01-05" });
  expect(importTarget("notes/page/Ideas.md")).toBe(null);
  expect(importTarget("bookshelf/A/B/C/D.md")).toEqual({ date: "bookshelf", tag: "A/B/C/D" });
});

test("importTarget: only entry-shaped .md files target anything", () => {
  expect(importTarget("page/A/B-img-1.webp")).toBe(null);
  expect(importTarget("page.md")).toBe(null);
  expect(nsTarget("page", [])).toBe(null);
  expect(nsTarget("page", ["A", ""])).toBe(null);
});

test("entryFile: a day rides under its year; the flat and bare stems agree", () => {
  expect(entryFile("2023-11-12")).toEqual(
    { dir: "journal/2023/", base: "2023-11-12", flatBase: "2023-11-12", root: "journal/2023" });
  expect(entryFile("2023-11-12", "a/b:c")).toEqual(
    { dir: "journal/2023/", base: "2023-11-12--a-b-c", flatBase: "2023-11-12--a-b-c", root: "journal/2023" });
});

test("entryFile: a keyed entry's folder IS its key, its flat stem opens with its namespace", () => {
  expect(entryFile("page", "Recipes")).toEqual(
    { dir: "page/", base: "Recipes", flatBase: "page--Recipes", root: "page/Recipes" });
  expect(entryFile("page", "Recipes/Bread")).toEqual(
    { dir: "page/Recipes/", base: "Bread", flatBase: "page--Recipes--Bread", root: "page/Recipes" });
  expect(entryFile("bookshelf", "Hamlet/Act I/Scene 2")).toEqual(
    { dir: "bookshelf/Hamlet/Act I/", base: "Scene 2",
      flatBase: "bookshelf--Hamlet--Act I--Scene 2", root: "bookshelf/Hamlet" });
});

test("entryFile: an ancestor ending in a dot flattens the entry, never its root", () => {
  expect(entryFile("page", "A./B")).toEqual(
    { dir: "", base: "page--A.--B", flatBase: "page--A.--B", root: "page/A" });
  expect(entryFile("page", "../Sub")).toEqual(
    { dir: "", base: "page--..--Sub", flatBase: "page--..--Sub", root: "page/-" });
});

test("collidingFile: two entries claiming one flat stem refuse the run", () => {
  const at = (tag: string) => entryFile("2024-01-02", tag);
  expect(collidingFile([
    { at: entryFile("page", "Recipes"), key: "page/Recipes" },
    { at: entryFile("page", "Bread"), key: "page/Bread" },
  ])).toBe(null);
  expect(collidingFile([
    { at: at("a/b"), key: "2024-01-02/a/b" },
    { at: at("a:b"), key: "2024-01-02/a:b" },
  ])).toEqual({ name: "journal/2024/2024-01-02--a-b.md", keys: ["2024-01-02/a/b", "2024-01-02/a:b"] });
  const flatOnly = collidingFile([
    { at: entryFile("page", "A--B"), key: "page/A--B" },
    { at: entryFile("page", "A/B"), key: "page/A/B" },
  ]);
  expect(flatOnly!.name).toBe("page--A--B.md");
});

test("collidingFile: the same key twice is a drifted registry, not a clash", () => {
  const job = { at: entryFile("page", "Recipes"), key: "page/Recipes" };
  expect(collidingFile([job, { ...job }])).toBe(null);
});

test("nextImageName: one past the highest the text names, the mirror's spelling", () => {
  expect(nextImageName("Trip Log", [])).toBe("Trip Log-img-1.webp");
  expect(nextImageName("Trip Log", ["Trip Log-img-1.webp", "Trip Log-img-3.webp", "other-img-9.webp"])).toBe("Trip Log-img-4.webp");
  expect(nextImageName("2022-02-06", ["2022-02-06-img-2.png"])).toBe("2022-02-06-img-3.webp");
  expect(nextImageName("a.b", ["a.b-img-1.webp", "aXb-img-5.webp"])).toBe("a.b-img-2.webp");
});
