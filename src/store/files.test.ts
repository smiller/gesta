// oneEach and entryDocs, ported 2026-09-07 from ../writer/src/js/io.test.mjs.
import { test, expect } from "vitest";
import { oneEach, entryDocs, isDoc, unreadFile, failMsg, type ImportFile } from "./files.ts";

const f = (dir: string, name: string, handle: string) => ({ dir, name, handle });

test("oneEach and entryDocs: one file per ENTRY, and only a .md carries a key at all", () => {
  const oneWay = oneEach([
    f("journal/", "1997-03-14.md", "loose"),
    f("journal/2026/", "1997-03-14.md", "wrong year"),
    f("journal/1997/", "1997-03-14.md", "the one")]);
  expect(oneWay.length).toBe(3);   // the mis-filed copies key to nothing
  const docs = entryDocs(oneWay.map((x) => ({ ...x, text: "" })));
  expect(docs.length).toBe(1);
  expect((docs[0] as { handle?: string }).handle).toBe("the one");
  // two pages under different parents share a basename and are two entries
  expect(oneEach([f("page/A/", "Notes.md", "a"), f("page/B/", "Notes.md", "b")]).length).toBe(2);
  expect(oneEach([f("page/A/", "Notes-img-1.png", "a"), f("page/B/", "Notes-img-1.png", "b")]).length).toBe(2);
  // only a .md carries a key: two sidecars pageName would fold alike are two files
  expect(oneEach([f("page/A/", "Trip--1-img-1.png", "a"), f("page/A/", "Trip-1-img-1.png", "b")]).length).toBe(2);
  // an entry key and a file path never collide — different namespaces
  expect(oneEach([f("journal/1997/", "1997-01-01.md", "doc"), f("journal/1997/", "1997-01-01", "stray")]).length).toBe(2);
});

test("oneEach: normalization refuses with what to do, never 'several backups'", () => {
  let normed: Error | null = null;
  try {
    oneEach([f("page/", "Trip--Log.md", "a"), f("page/", "Trip-Log.md", "b")]);
  } catch (e) { normed = e as Error; }
  expect(normed).not.toBe(null);
  expect(normed!.message).not.toMatch(/several backups/i);
  expect(normed!.message).toMatch(/same entry/);
  expect((normed as { merged?: string }).merged).toBe("page/Trip-Log.md");
});

test("a root pick keys no entry: current/ and archive/ put the namespace at segment 1", () => {
  const files: ImportFile[] = [
    { dir: "current/journal/1997/", name: "1997-03-14.md", text: "x" },
    { dir: "older/journal/1997/", name: "1997-03-14.md", text: "y" },
  ];
  expect(oneEach(files).length).toBe(2);
  expect(entryDocs(files).length).toBe(0);
});

test("the records: a doc has text, a sidecar bytes, an unreadable file is kept and marked", () => {
  expect(isDoc({ dir: "", name: "a.md", text: "" })).toBe(true);
  expect(isDoc({ dir: "", name: "a.webp", bytes: new Uint8Array() })).toBe(false);
  expect(unreadFile("a.md", "page/")).toEqual({ dir: "page/", name: "a.md", unread: true });
  expect(unreadFile("a.webp", "page/")).toEqual({ dir: "page/", name: "a.webp", unread: true, bytes: null });
  expect(isDoc(unreadFile("a.webp", "page/"))).toBe(false);
  expect(failMsg("import failed", new Error("boom"))).toBe("import failed — Error: boom");
  expect(failMsg("import failed", null)).toBe("import failed — see console");
});
