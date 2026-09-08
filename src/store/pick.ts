/* The folder pick: the walk over directory handles, names first, then the
   read. Ported 2026-09-07 from pickImportFiles in
   ../writer/src/js/29-import.js. PHASE ONE IS NAMES ONLY: the duplicate-key
   refusal is decidable from names, and reading costs a getFile per file
   over a folder that may hold tens of thousands — deciding is free, reading
   is not, so nothing is opened until the decision is made. */
import { oneEach, unreadFile, type ImportFile } from "./files.ts";

import type { Dir, FileH } from "./fsa.ts";
export type { Dir as DirHandle, FileH as FileHandle };
export interface Found { dir: string; name: string; handle: FileH }
export async function walkFolder(dir: Dir): Promise<Found[]> {
  const found: Found[] = [];
  async function walk(d: Dir, at: string): Promise<void> {
    const it = d.values();
    for (let res = await it.next(); !res.done; res = await it.next()) {
      const v = res.value;
      if (v.kind === "directory") await walk(v, at + v.name + "/");
      else found.push({ dir: at, name: v.name, handle: v });
    }
  }
  await walk(dir, "");
  return found;
}
/* either opening a file or reading it can fail, and both become the same
   marked record */
export function readFound(e: Found): Promise<ImportFile> {
  const md = /\.md$/i.test(e.name);
  return e.handle.getFile()
    .then((file) => md
      ? file.text().then((text): ImportFile => ({ dir: e.dir, name: e.name, text }))
      : file.arrayBuffer().then((buf): ImportFile => ({ dir: e.dir, name: e.name, bytes: new Uint8Array(buf) })))
    .catch(() => unreadFile(e.name, e.dir));
}
/* PHASE TWO — read, once the names have passed oneEach, which drops nothing */
export function pickImportFiles(dir: Dir): Promise<ImportFile[]> {
  return walkFolder(dir).then((found) => Promise.all(oneEach(found).map(readFound)));
}
