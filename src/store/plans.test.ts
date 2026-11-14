import { test, expect } from "vitest";
import { utf8 } from "./names.ts";
import { isDoc, fileBody, filePath, flatName, errText, failMsg, fsaFatal, type ExportFile } from "./files.ts";
import {
  fileSig, fileSize, sidecarOfOurs, reconcilePlan, RECONCILE_FLOOR,
  dedupFiles, backupPlan, rootOf, rootSig, archivePlan, rootManifest, bundleDue, READER_ZIP, withheld,
} from "./plans.ts";

const doc = (path: string, text: string): ExportFile => {
  const cut = path.lastIndexOf("/");
  return { dir: path.slice(0, cut + 1), name: path.slice(cut + 1), text };
};

test("a record is a doc unless it carries bytes; failures share one message shape", () => {
  const d = doc("commonplace/A.md", "hello");
  expect(isDoc(d)).toBe(true);
  expect(isDoc({ name: "x.webp", bytes: new Uint8Array(1) })).toBe(false);
  expect(fileBody(d)).toBe("hello");
  expect(filePath(d)).toBe("commonplace/A.md");
  expect(filePath({ name: "flat.md" })).toBe("flat.md");
  expect(flatName({ dir: "", name: "A.md", flat: "commonplace--A.md" })).toBe("commonplace--A.md");
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
  const a = doc("commonplace/A.md", "hello");
  const sig = fileSig(a);
  const manifest = { "commonplace/A.md": { size: 5, sig } };
  expect(dedupFiles([a], manifest, { "commonplace/A.md": 5 }).length).toBe(0);
  expect(dedupFiles([a], manifest, {}).length).toBe(1);
  expect(dedupFiles([a], manifest, { "commonplace/A.md": 4 }).length).toBe(1);
  expect(dedupFiles([a], { "commonplace/A.md": { size: 5, sig: "x" } }, { "commonplace/A.md": 5 }).length).toBe(1);
  expect(dedupFiles([a], {}, { "commonplace/A.md": 5 }).length).toBe(1);
  const b = doc("commonplace/B.md", "two"), c = doc("commonplace/C.md", "three");
  const many = { "commonplace/A.md": { sig: fileSig(a), size: 5 }, "commonplace/B.md": { sig: "stale", size: 3 }, "commonplace/C.md": { sig: fileSig(c), size: 5 } };
  expect(dedupFiles([a, b, c], many, { "commonplace/A.md": 5, "commonplace/B.md": 3, "commonplace/C.md": 5 }).map((f) => f.name)).toEqual(["B.md"]);
});

test("fileSig reads fileBody, so a sidecar's bytes hash instead of throwing", () => {
  const pic: ExportFile = { name: "a-img-1.webp", dir: "commonplace/", bytes: new Uint8Array([1, 2, 3]) };
  const other: ExportFile = { name: "a-img-2.webp", dir: "commonplace/", bytes: new Uint8Array([1, 2, 4]) };
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
  expect(backupPlan("2026-08-25", "s1", { dated: null, sig: null, ours: false })).toEqual({ writeMirror: true, dated: "2026-08-25", reconcile: false });
  expect(backupPlan("2026-08-25", "s2", { dated: "2026-08-24", sig: "s1", ours: true })).toEqual({ writeMirror: true, dated: "2026-08-25", reconcile: true });
  expect(backupPlan("2026-08-25", "s1", { dated: "2026-08-25", sig: "s1", ours: true })).toEqual({ writeMirror: false, dated: null, reconcile: false });
  expect(backupPlan("2026-08-25", "s2", { dated: "2026-08-25", sig: "s1", ours: false })).toEqual({ writeMirror: true, dated: null, reconcile: false });
  expect(backupPlan("2026-08-25", "s1", { dated: "2026-08-24", sig: "s1", ours: true })).toEqual({ writeMirror: false, dated: "2026-08-25", reconcile: false });
});

test("sidecarOfOurs: the stem must name an entry we have seen", () => {
  const known: Record<string, true> = { "commonplace/A.md": true };
  expect(sidecarOfOurs("commonplace/A-img-1.webp", known)).toBe(true);
  expect(sidecarOfOurs("commonplace/commonplace--A-img-2.png", known)).toBe(true);
  expect(sidecarOfOurs("commonplace/holiday-img-1.jpg", known)).toBe(false);
  expect(sidecarOfOurs("commonplace/holiday--A-img-1.jpg", known)).toBe(false);
  expect(sidecarOfOurs("commonplace/A.md", known)).toBe(false);
});

test("reconcilePlan: a ghost sidecar goes under either spelling; a stranger's files stay", () => {
  const pageFiles: ExportFile[] = [doc("commonplace/Verdour.md", "x"), { name: "commonplace--Verdour-img-1.webp", dir: "commonplace/", bytes: new Uint8Array([1, 2, 3]) }];
  const plan = reconcilePlan({
    "commonplace/Verdour.md": 1, "commonplace/commonplace--Verdour-img-1.webp": 3, "commonplace/Verdour-img-1.webp": 3,
    "commonplace/holiday-img-1.jpg": 9, "commonplace/notes.txt": 4, "commonplace/.DS_Store": 6,
  }, pageFiles);
  expect(plan.drop).toEqual(["commonplace/Verdour-img-1.webp"]);
});

test("reconcilePlan: a namespaced entry's ghost picture is seen through its flat stem", () => {
  const plan = reconcilePlan({ "commonplace/Yarnia.md": 1, "commonplace/commonplace--Yarnia-img-1.webp": 3, "commonplace/foo.md": 1, "commonplace/holiday--foo-img-1.jpg": 9 },
    [doc("commonplace/Yarnia.md", "x"), doc("commonplace/foo.md", "x")]);
  expect(plan.drop).toContain("commonplace/commonplace--Yarnia-img-1.webp");
  expect(plan.drop).not.toContain("commonplace/holiday--foo-img-1.jpg");
});

test("reconcilePlan: a namespace word below the tier root is not ours", () => {
  const plan = reconcilePlan({ "notes/commonplace/Ideas.md": 5, "notes/commonplace/commonplace--Ideas-img-1.png": 3, "docs/bookshelf/Hamlet/Act I.md": 7, "commonplace/Old/Note.md": 4 }, []);
  expect(plan.drop).toEqual(["commonplace/Old/Note.md"]);
});

test("reconcilePlan: a removed day's picture goes with it, by the bare stem", () => {
  const plan = reconcilePlan({ "journal/2026/2026-07-15.md": 4, "journal/2026/2026-07-15-img-1.webp": 30, "journal/2026/2026-07-16.md": 2 },
    [doc("journal/2026/2026-07-16.md", "hi")]);
  expect(plan.drop).toContain("journal/2026/2026-07-15-img-1.webp");
  expect(plan.drop).not.toContain("journal/2026/2026-07-16.md");
});

test("reconcilePlan drops only nested ghosts of ours, and spares the unread", () => {
  const expected: ExportFile[] = [doc("commonplace/A.md", "x"), { dir: "", name: "A.md", text: "y" }];
  const present = {
    "commonplace/A.md": 1, "commonplace/Ghost.md": 1, "commonplace/Ghost-img-1.png": 1, "notes/theirs.md": 1, "A-img-1.png": 1,
    "commonplace/Unread.md": 1, "commonplace/Unread-img-1.png": 1, "commonplace/commonplace--Unread-img-2.png": 1,
  };
  const unread = [{ dir: "commonplace/", base: "Unread", flatBase: "commonplace--Unread", root: "commonplace/Unread" }];
  const plan = reconcilePlan(present, expected, unread);
  expect(plan.drop.sort()).toEqual(["commonplace/Ghost-img-1.png", "commonplace/Ghost.md"]);
  expect(plan.refused).toBe(0);
  const withPic = { "commonplace/Yarnia.md": 9, "commonplace/commonplace--Yarnia-img-1.webp": 400, "commonplace/Yarnia-img-2.webp": 400 };
  const lostPic = [{ dir: "commonplace/", base: "Yarnia", flatBase: "commonplace--Yarnia", root: "commonplace/Yarnia" }];
  expect(reconcilePlan(withPic, [doc("commonplace/Yarnia.md", "x")], lostPic).drop.length).toBe(0);
  expect(reconcilePlan(withPic, [doc("commonplace/Yarnia.md", "x")], []).drop.length).toBe(2);
});

test("reconcilePlan's floor: a small folder may still sweep over half", () => {
  const present = { "commonplace/A.md": 1, "commonplace/G1.md": 1, "commonplace/G2.md": 1, "commonplace/G3.md": 1, "commonplace/G4.md": 1, "commonplace/B.md": 1 };
  const plan = reconcilePlan(present, [doc("commonplace/A.md", "x"), doc("commonplace/B.md", "y")], []);
  expect(plan.drop.length).toBe(4);
  expect(plan.refused).toBe(0);
});

test("reconcilePlan refuses a sweep past the floor rather than doing it", () => {
  const present: Record<string, number> = {};
  for (let i = 0; i < 50; i++) present["commonplace/G" + i + ".md"] = 1;
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
  expect(rootOf({ name: "x.md", dir: "commonplace/", root: "commonplace/Recipes" })).toBe("commonplace/Recipes");
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
  const page: ExportFile = { ...doc("commonplace/Recipes.md", "commonplace"), root: "commonplace/Recipes" };
  return { day, book, other, pic, page, all: [day, book, other, pic, page] };
};

test("archivePlan groups by root, in an order the export's cannot change", () => {
  const { all } = shelf();
  const first = archivePlan(all, {}, {});
  expect(first.map((g) => g.root)).toEqual(["bookshelf/Austen", "commonplace/Recipes", "journal/2026"]);
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

test("bundleDue: the reader's bundle is written unless its record and the folder both vouch for it", () => {
  const files = [doc("journal/2026/2026-01-01.md", "one"), doc("commonplace/A.md", "two")];
  const sig = rootSig(files);
  expect(bundleDue(files, undefined, 120)).toBe(true);
  expect(bundleDue(files, { sig, size: 120 }, null)).toBe(true);
  expect(bundleDue(files, { sig, size: 120 }, 119)).toBe(true);
  expect(bundleDue(files, { sig: "1.other", size: 120 }, 120)).toBe(true);
  expect(bundleDue(files, { sig, size: 120 }, 120)).toBe(false);
});

test("withheld: a lost write withholds both scalars, a blind sweep the signature; the bundle's own failure neither", () => {
  expect(withheld([])).toEqual({ lostWrite: false, blind: false });
  expect(withheld([{ name: "commonplace/A.md" }])).toEqual({ lostWrite: true, blind: false });
  expect(withheld([{ name: "current", blind: true }])).toEqual({ lostWrite: false, blind: true });
  expect(withheld([{ name: "old.md", sweep: true }])).toEqual({ lostWrite: false, blind: false });
  expect(withheld([{ name: READER_ZIP }])).toEqual({ lostWrite: false, blind: false });
});
