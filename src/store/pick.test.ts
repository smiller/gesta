// The walk and the read over fake directory handles shaped like the real
// ones: values() yields handles, a file handle's getFile() reads.
import { test, expect } from "vitest";
import { walkFolder, pickImportFiles, type DirHandle, type FileHandle } from "./pick.ts";

type Tree = { [name: string]: string | Uint8Array | Tree | Error };
function fakeDir(tree: Tree, name = ""): DirHandle {
  return {
    kind: "directory", name,
    async *values() {
      for (const n of Object.keys(tree)) {
        const v = tree[n];
        if (typeof v === "object" && !(v instanceof Uint8Array) && !(v instanceof Error)) yield fakeDir(v, n);
        else yield fakeFile(n, v);
      }
    },
  };
}
function fakeFile(name: string, v: string | Uint8Array | Error): FileHandle {
  return {
    kind: "file", name,
    getFile: () => v instanceof Error ? Promise.reject(v) : Promise.resolve({
      text: () => typeof v === "string" ? Promise.resolve(v) : Promise.reject(new Error("binary")),
      arrayBuffer: () => Promise.resolve((typeof v === "string" ? new TextEncoder().encode(v) : v).buffer as ArrayBuffer),
    }),
  };
}

test("walkFolder lists every file with its folder path, depth-first, names only", async () => {
  const found = await walkFolder(fakeDir({
    "journal": { "2026": { "2026-01-05.md": "a" } },
    "page": { "Trip Log": { "Trip Log.md": "b", "Trip Log-img-1.webp": new Uint8Array([1]) } },
    ".DS_Store": new Uint8Array([0]),
  }));
  expect(found.map((f) => f.dir + f.name)).toEqual([
    "journal/2026/2026-01-05.md", "page/Trip Log/Trip Log.md", "page/Trip Log/Trip Log-img-1.webp", ".DS_Store",
  ]);
});

test("pickImportFiles reads a .md as text and anything else as bytes; an unreadable file is kept and marked", async () => {
  const files = await pickImportFiles(fakeDir({
    "page": { "A.md": "text", "A-img-1.webp": new Uint8Array([7]), "B.md": new Error("evicted"), "B-img-1.webp": new Error("evicted") },
  }));
  expect(files).toEqual([
    { dir: "page/", name: "A.md", text: "text" },
    { dir: "page/", name: "A-img-1.webp", bytes: new Uint8Array([7]) },
    { dir: "page/", name: "B.md", unread: true },
    { dir: "page/", name: "B-img-1.webp", unread: true, bytes: null },
  ]);
});

test("pickImportFiles refuses two files spelling one entry before reading anything", async () => {
  let reads = 0;
  const dir = fakeDir({ "page": { "Trip--Log.md": "a", "Trip-Log.md": "b" } });
  const counting: DirHandle = {
    ...dir,
    async *values() { for await (const v of dir.values()) yield v.kind === "file" ? { ...v, getFile: () => { reads++; return v.getFile(); } } : v; },
  };
  await expect(pickImportFiles(counting)).rejects.toMatchObject({ merged: "page/Trip-Log.md" });
  expect(reads).toBe(0);
});
