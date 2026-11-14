import { test, expect } from "vitest";
import { commonplaceArchive, commonplaceManifest, commonplaceArchivePath } from "./archiveCommonplaces.ts";

const enc = new TextEncoder(), dec = new TextDecoder();
const doc = (path: string, md: string) => ({ path, bytes: enc.encode(md) });
const read = (members: { path: string; bytes: Uint8Array }[] | null) =>
  (members ?? []).map((m) => [m.path, m.path.endsWith(".md") ? dec.decode(m.bytes) : [...m.bytes]]);

test("a page's archive becomes its commonplace's: every member under commonplace/, the pictures named for it renamed, its links followed", () => {
  const picture = { path: "page/page--Verdour-img-1.webp", bytes: new Uint8Array([1, 2]) };
  const plain = { path: "page/3x3-img-1.webp", bytes: new Uint8Array([3]) };
  const out = commonplaceArchive([
    doc("page/Verdour.md", "# Verdour\n\n![](page--Verdour-img-1.webp)\n\n[3x3](#page/3x3)"),
    picture, plain,
  ]);
  expect(read(out)).toEqual([
    ["commonplace/Verdour.md", "# Verdour\n\n![](commonplace--Verdour-img-1.webp)\n\n[3x3](#commonplace/3x3)"],
    ["commonplace/commonplace--Verdour-img-1.webp", [1, 2]],
    ["commonplace/3x3-img-1.webp", [3]],
  ]);
});

test("a sub-entry moves with its page", () => {
  const out = commonplaceArchive([doc("page/Books.md", "# Books\n"), doc("page/Books/Essay.md", "# The essay\n")]);
  expect(out?.map((m) => m.path)).toEqual(["commonplace/Books.md", "commonplace/Books/Essay.md"]);
});

test("another archive keeps its paths and has its links into a page followed; one with none is left as it is", () => {
  const out = commonplaceArchive([
    doc("journal/2026/2026-09-06.md", "[Books](#page/Books?h=x) and [Horace](#bookshelf/Horace)"),
    { path: "journal/2026/2026-09-06-img-1.webp", bytes: new Uint8Array([9]) },
  ]);
  expect(read(out)).toEqual([
    ["journal/2026/2026-09-06.md", "[Books](#commonplace/Books?h=x) and [Horace](#bookshelf/Horace)"],
    ["journal/2026/2026-09-06-img-1.webp", [9]],
  ]);
  expect(commonplaceArchive([doc("journal/2026/2026-09-07.md", "a day\n")])).toBeNull();
});

test("an archive's folder under page/ becomes the same folder under commonplace/, and no other moves", () => {
  expect(commonplaceArchivePath("archive/page/Sean’s Books/2026-10-19.zip")).toBe("archive/commonplace/Sean’s Books/2026-10-19.zip");
  expect(commonplaceArchivePath("archive/journal/2026/2026-11-13.zip")).toBe("archive/journal/2026/2026-11-13.zip");
});

test("a manifest names each page's root and archive as the commonplace's, its lines sorted as the backup writes them", () => {
  const was = "bookshelf/Abelard\tarchive/bookshelf/Abelard/2026-09-07.zip\njournal/2026\tarchive/journal/2026/2026-11-13.zip\npage/3x3\tarchive/page/3x3/2026-10-26.zip\npage/X\n";
  expect(commonplaceManifest(was)).toBe(
    "bookshelf/Abelard\tarchive/bookshelf/Abelard/2026-09-07.zip\ncommonplace/3x3\tarchive/commonplace/3x3/2026-10-26.zip\ncommonplace/X\njournal/2026\tarchive/journal/2026/2026-11-13.zip\n",
  );
  expect(commonplaceManifest("")).toBe("");
});
