// The backup's pure decisions, ported 2026-09-07 from ../writer/src/js/plans.test.mjs.
import { test, expect } from "vitest";
import { utf8 } from "./names.ts";
import { isDoc, fileBody, filePath, flatName, errText, failMsg, fsaFatal, type ExportFile } from "./files.ts";
import {
  fileSig, fileSize, sidecarOfOurs, reconcilePlan, RECONCILE_FLOOR,
  dedupFiles, backupPlan, rootOf, rootSig, archivePlan, rootManifest,
} from "./plans.ts";

const doc = (path: string, text: string): ExportFile => {
  const cut = path.lastIndexOf("/");
  return { dir: path.slice(0, cut + 1), name: path.slice(cut + 1), text };
};

test("a record is a doc unless it carries bytes; failures share one message shape", () => {
  const d = doc("page/A.md", "hello");
  expect(isDoc(d)).toBe(true);
  expect(isDoc({ name: "x.webp", bytes: new Uint8Array(1) })).toBe(false);
  expect(fileBody(d)).toBe("hello");
  expect(filePath(d)).toBe("page/A.md");
  expect(filePath({ name: "flat.md" })).toBe("flat.md");
  expect(flatName({ dir: "", name: "A.md", flat: "page--A.md" })).toBe("page--A.md");
  expect(errText({ name: "E", message: "m" })).toBe("E: m");
  expect(failMsg("write", null)).toBe("write — see console");
  expect(fsaFatal({ name: "NotAllowedError" })).toBe(true);
  expect(fsaFatal({ name: "TypeError" })).toBe(false);
});

test("fileSize counts UTF-8 bytes as the folder will report them", () => {
  expect(fileSize(doc("x.md", "héllo"))).toBe(6);
  expect(fileSize(doc("x.md", "café"))).toBe(5);
  expect(fileSize(doc("x.md", "a\u{1F600}"))).toBe(5);
  expect(fileSize(doc("x.md", "a\uD800b"))).toBe(5);
  expect(fileSize({ dir: "", name: "s.webp", bytes: new Uint8Array(7) })).toBe(7);
  for (const probe of ["plain ascii", "café naïve", "漢字カナ", "😀🌍", "mixed é 漢 😀 end", "\ud83d", "a\ud83d", "\ud83d\ud83dx", "\udc00 lone low"]) {
    expect(fileSize(doc("x.md", probe))).toBe(utf8.encode(probe).length);
  }
});

test("dedupFiles: anything not positively known up to date is written", () => {
  const a = doc("page/A.md", "hello");
  const sig = fileSig(a);
  const manifest = { "page/A.md": { size: 5, sig } };
  expect(dedupFiles([a], manifest, { "page/A.md": 5 }).length).toBe(0);
  expect(dedupFiles([a], manifest, {}).length).toBe(1);
  expect(dedupFiles([a], manifest, { "page/A.md": 4 }).length).toBe(1);
  expect(dedupFiles([a], { "page/A.md": { size: 5, sig: "x" } }, { "page/A.md": 5 }).length).toBe(1);
  expect(dedupFiles([a], {}, { "page/A.md": 5 }).length).toBe(1);
  const b = doc("page/B.md", "two"), c = doc("page/C.md", "three");
  const many = { "page/A.md": { sig: fileSig(a), size: 5 }, "page/B.md": { sig: "stale", size: 3 }, "page/C.md": { sig: fileSig(c), size: 5 } };
  expect(dedupFiles([a, b, c], many, { "page/A.md": 5, "page/B.md": 3, "page/C.md": 5 }).map((f) => f.name)).toEqual(["B.md"]);
});

test("fileSig reads fileBody, so a sidecar's bytes hash instead of throwing", () => {
  const pic: ExportFile = { name: "a-img-1.webp", dir: "page/", bytes: new Uint8Array([1, 2, 3]) };
  const other: ExportFile = { name: "a-img-2.webp", dir: "page/", bytes: new Uint8Array([1, 2, 4]) };
  expect(typeof fileSig(pic)).toBe("string");
  expect(fileSig(pic)).not.toBe(fileSig(other));
  expect(fileSig(pic)).toBe(fileSig({ dir: "", name: "elsewhere.webp", bytes: new Uint8Array([1, 2, 3]) }));
});

test("dedupFiles: a zero-byte file needs no special case", () => {
  const empty: ExportFile = { name: "empty.bin", dir: "", bytes: new Uint8Array(0) };
  const known = { "empty.bin": { sig: fileSig(empty), size: 0 } };
  expect(dedupFiles([empty], known, { "empty.bin": 0 }).length).toBe(0);
  expect(dedupFiles([empty], known, {}).length).toBe(1);
});

test("backupPlan: the mirror on signature, the archives once per day, the reconcile only ours", () => {
  expect(backupPlan("2026-08-25", null, "s1", null, false)).toEqual({ writeMirror: true, dated: "2026-08-25", reconcile: false });
  expect(backupPlan("2026-08-25", "2026-08-24", "s2", "s1", true)).toEqual({ writeMirror: true, dated: "2026-08-25", reconcile: true });
  expect(backupPlan("2026-08-25", "2026-08-25", "s1", "s1", true)).toEqual({ writeMirror: false, dated: null, reconcile: false });
  expect(backupPlan("2026-08-25", "2026-08-25", "s2", "s1", false)).toEqual({ writeMirror: true, dated: null, reconcile: false });
  expect(backupPlan("2026-08-25", "2026-08-24", "s1", "s1", true)).toEqual({ writeMirror: false, dated: "2026-08-25", reconcile: false });
});

test("sidecarOfOurs: the stem must name an entry we have seen", () => {
  const known: Record<string, true> = { "page/A.md": true };
  expect(sidecarOfOurs("page/A-img-1.webp", known)).toBe(true);
  expect(sidecarOfOurs("page/page--A-img-2.png", known)).toBe(true);
  expect(sidecarOfOurs("page/holiday-img-1.jpg", known)).toBe(false);
  expect(sidecarOfOurs("page/holiday--A-img-1.jpg", known)).toBe(false);
  expect(sidecarOfOurs("page/A.md", known)).toBe(false);
});

test("reconcilePlan: a ghost sidecar goes under either spelling; a stranger's files stay", () => {
  const pageFiles: ExportFile[] = [doc("page/Verdour.md", "x"), { name: "page--Verdour-img-1.webp", dir: "page/", bytes: new Uint8Array([1, 2, 3]) }];
  const plan = reconcilePlan({
    "page/Verdour.md": 1, "page/page--Verdour-img-1.webp": 3, "page/Verdour-img-1.webp": 3,
    "page/holiday-img-1.jpg": 9, "page/notes.txt": 4, "page/.DS_Store": 6,
  }, pageFiles);
  expect(plan.drop).toEqual(["page/Verdour-img-1.webp"]);
});

test("reconcilePlan: a namespaced entry's ghost picture is seen through its flat stem", () => {
  const plan = reconcilePlan({ "page/Yarnia.md": 1, "page/page--Yarnia-img-1.webp": 3, "page/foo.md": 1, "page/holiday--foo-img-1.jpg": 9 },
    [doc("page/Yarnia.md", "x"), doc("page/foo.md", "x")]);
  expect(plan.drop).toContain("page/page--Yarnia-img-1.webp");
  expect(plan.drop).not.toContain("page/holiday--foo-img-1.jpg");
});

test("reconcilePlan: a namespace word below the tier root is not ours", () => {
  const plan = reconcilePlan({ "notes/page/Ideas.md": 5, "notes/page/page--Ideas-img-1.png": 3, "docs/bookshelf/Hamlet/Act I.md": 7, "page/Old/Note.md": 4 }, []);
  expect(plan.drop).toEqual(["page/Old/Note.md"]);
});

test("reconcilePlan: a removed day's picture goes with it, by the bare stem", () => {
  const plan = reconcilePlan({ "journal/2026/2026-07-15.md": 4, "journal/2026/2026-07-15-img-1.webp": 30, "journal/2026/2026-07-16.md": 2 },
    [doc("journal/2026/2026-07-16.md", "hi")]);
  expect(plan.drop).toContain("journal/2026/2026-07-15-img-1.webp");
  expect(plan.drop).not.toContain("journal/2026/2026-07-16.md");
});

test("reconcilePlan drops only nested ghosts of ours, and spares the unread", () => {
  const expected: ExportFile[] = [doc("page/A.md", "x"), { dir: "", name: "A.md", text: "y" }];
  const present = {
    "page/A.md": 1, "page/Ghost.md": 1, "page/Ghost-img-1.png": 1, "notes/theirs.md": 1, "A-img-1.png": 1,
    "page/Unread.md": 1, "page/Unread-img-1.png": 1, "page/page--Unread-img-2.png": 1,
  };
  const unread = [{ dir: "page/", base: "Unread", flatBase: "page--Unread", root: "page/Unread" }];
  const plan = reconcilePlan(present, expected, unread);
  expect(plan.drop.sort()).toEqual(["page/Ghost-img-1.png", "page/Ghost.md"]);
  expect(plan.refused).toBe(0);
  const withPic = { "page/Yarnia.md": 9, "page/page--Yarnia-img-1.webp": 400, "page/Yarnia-img-2.webp": 400 };
  const lostPic = [{ dir: "page/", base: "Yarnia", flatBase: "page--Yarnia", root: "page/Yarnia" }];
  expect(reconcilePlan(withPic, [doc("page/Yarnia.md", "x")], lostPic).drop.length).toBe(0);
  expect(reconcilePlan(withPic, [doc("page/Yarnia.md", "x")], []).drop.length).toBe(2);
});

test("reconcilePlan's floor: a small folder may still sweep over half", () => {
  const present = { "page/A.md": 1, "page/G1.md": 1, "page/G2.md": 1, "page/G3.md": 1, "page/G4.md": 1, "page/B.md": 1 };
  const plan = reconcilePlan(present, [doc("page/A.md", "x"), doc("page/B.md", "y")], []);
  expect(plan.drop.length).toBe(4);
  expect(plan.refused).toBe(0);
});

test("reconcilePlan refuses a sweep past the floor rather than doing it", () => {
  const present: Record<string, number> = {};
  for (let i = 0; i < 50; i++) present["page/G" + i + ".md"] = 1;
  const plan = reconcilePlan(present, [], []);
  expect(plan.drop).toEqual([]);
  expect(plan.refused).toBe(50);
  expect(RECONCILE_FLOOR).toBe(20);
});

test("rootSig: a deletion moves it, order does not, and it is versioned", () => {
  const a = doc("bookshelf/B/1.md", "x"), b = doc("bookshelf/B/2.md", "y");
  expect(rootSig([a, b])).toBe(rootSig([b, a]));
  expect(rootSig([a, b])).not.toBe(rootSig([a]));
  expect(rootSig([a])).toMatch(/^1\./);
});

test("rootOf: a file answers with its archive, or with nothing", () => {
  expect(rootOf({ name: "x.md", dir: "page/", root: "page/Recipes" })).toBe("page/Recipes");
  const quiet = console.error; console.error = () => {};
  expect(rootOf({ name: "x.md", dir: "" })).toBe(null);
  console.error = quiet;
});

test("archivePlan writes anything not positively corroborated", () => {
  const files: ExportFile[] = [{ root: "R", dir: "bookshelf/R/", name: "1.md", text: "x" }];
  const sig = rootSig(files);
  expect(archivePlan(files, { R: { sig, at: "archive/R.zip" } }, { "archive/R.zip": 10 }).length).toBe(0);
  expect(archivePlan(files, { R: { sig, at: "archive/R.zip" } }, {}).length).toBe(1);
  expect(archivePlan(files, { R: { sig: "old", at: "archive/R.zip" } }, { "archive/R.zip": 10 }).length).toBe(1);
  expect(archivePlan(files, { R: { sig } }, { "archive/R.zip": 10 }).length).toBe(1);
  expect(archivePlan(files, { R: sig }, { "archive/R.zip": 10 }).length).toBe(1);
});

const shelf = () => {
  const day: ExportFile = { ...doc("journal/2026/2026-07-16.md", "day"), root: "journal/2026" };
  const book: ExportFile = { ...doc("bookshelf/Austen/Emma.md", "book"), root: "bookshelf/Austen" };
  const other: ExportFile = { ...doc("bookshelf/Austen/Persuasion.md", "more"), root: "bookshelf/Austen" };
  const pic: ExportFile = { name: "bookshelf--Austen--Emma-img-1.webp", dir: "bookshelf/Austen/", bytes: new Uint8Array([7]), root: "bookshelf/Austen" };
  const page: ExportFile = { ...doc("page/Recipes.md", "page"), root: "page/Recipes" };
  return { day, book, other, pic, page, all: [day, book, other, pic, page] };
};

test("archivePlan groups by root, in an order the export's cannot change", () => {
  const { all } = shelf();
  const first = archivePlan(all, {}, {});
  expect(first.map((g) => g.root)).toEqual(["bookshelf/Austen", "journal/2026", "page/Recipes"]);
  expect(first[0].files.length).toBe(3);
});

test("archivePlan touches only the root that moved, or lost its zip", () => {
  const { day, book, other, pic, page, all } = shelf();
  const sigs: Record<string, { sig: string; at: string }> = {}, onDisk: Record<string, number> = {};
  for (const g of archivePlan(all, {}, {})) { sigs[g.root] = { sig: g.sig, at: g.root + "/2026-07-17.zip" }; onDisk[g.root + "/2026-07-17.zip"] = 500; }
  expect(archivePlan(all, sigs, onDisk).length).toBe(0);
  const gone = { ...onDisk };
  delete gone["bookshelf/Austen/2026-07-17.zip"];
  expect(archivePlan(all, sigs, gone).map((g) => g.root)).toEqual(["bookshelf/Austen"]);
  const edited: ExportFile = { name: "Emma.md", dir: "bookshelf/Austen/", text: "annotated", root: "bookshelf/Austen" };
  expect(archivePlan([day, edited, other, pic, page], sigs, onDisk).map((g) => g.root)).toEqual(["bookshelf/Austen"]);
  expect(archivePlan([day, book, pic, page], sigs, onDisk).map((g) => g.root)).toEqual(["bookshelf/Austen"]);
});

test("archivePlan: a file belonging to no root joins no group", () => {
  const { day } = shelf();
  const quiet = console.error; console.error = () => {};
  const groups = archivePlan([day, { name: "odd.md", dir: "", text: "odd" }], {}, {});
  console.error = quiet;
  expect(groups.map((g) => g.root)).toEqual(["journal/2026"]);
});

test("rootManifest: every line terminated, a gap written as a bare name", () => {
  expect(rootManifest(["B", "A", null], { A: { sig: "s", at: "archive/A.zip" } })).toBe("A\tarchive/A.zip\nB\n");
  expect(rootManifest(["b", "a", "a"], {})).toBe("a\nb\n");
  expect(rootManifest([], {})).toBe("");
});
