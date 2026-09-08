/* The file records an import pick and an export run pass around, and the
   two pure decisions over a pick. Ported 2026-09-07 from
   ../writer/src/js/plans.mjs (the records) and io.mjs (oneEach, entryDocs). */
import { entryKey } from "./keys.ts";
import { importTarget } from "./names.ts";

/* an export file is an entry's markdown (a doc) or a doc's image sidecar,
   which rides as raw `bytes` — or a file that is neither, which takes the
   bytes arm so no count of entries sees it. A picked file that CANNOT be
   read is kept and marked: an unreadable .md is an ENTRY the restore came
   for, COUNTED as a failure rather than dropped, or a browning-out drive
   would shrink the set and report a green partial restore; an unreadable
   picture is present-but-null, so the entry needing it is refused instead
   of being written picture-less over a live one that has it. */
export interface DocFile { dir: string; name: string; text: string; unread?: false }
export interface UnreadDoc { dir: string; name: string; unread: true }
export interface SidecarFile { dir: string; name: string; bytes: Uint8Array | null; unread?: boolean }
export type ImportFile = DocFile | UnreadDoc | SidecarFile;
export function isDoc(f: ImportFile): f is DocFile | UnreadDoc { return !("bytes" in f); }
/* where a file sits — the ONE spelling of the join */
export function filePath(f: { dir: string; name: string }): string { return (f.dir || "") + f.name; }
export function unreadFile(name: string, dir: string): ImportFile {
  return /\.md$/i.test(name) ? { dir, name, unread: true } : { dir, name, unread: true, bytes: null };
}
export function errText(err: unknown): string {
  const e = err as { name?: string; message?: string } | null;
  return e && e.name ? e.name + ": " + e.message : "";
}
/* op + the error's name and detail, else "see console" — the ONE message
   shape every sticky failure text shares */
export function failMsg(op: string, err: unknown): string { return op + " — " + (errText(err) || "see console"); }

/* the entry docs of a pick — the .md files importTarget accepts — the ONE
   spelling of "counts as an entry on import" the loop, the progress total
   and the consent share, so no count can drift from another */
export function entryDocs(files: ImportFile[]): (DocFile | UnreadDoc)[] {
  return files.filter((f): f is DocFile | UnreadDoc => isDoc(f) && importTarget(filePath(f)) !== null);
}
export interface Merged extends Error { merged: string }
/* one file per ENTRY — never per filename, which stopped being an identity
   when pages nested: page/A/Notes.md and page/B/Notes.md are two entries.
   A KEY CLAIMED TWICE IS A REFUSAL with nothing to choose between — one
   shape is written and one read, so what brings two paths to one key is
   normalization (pageName folding a "--" run or an edge dash), and the
   message says so rather than "several backups". It throws before a byte
   is read, reading a large folder being what exhausts the tab. An entry key
   and a path are both bare strings of one shape, so they are PREFIXED
   apart. Returns the input, in its order: nothing is dropped or preferred. */
export function oneEach<F extends { dir: string; name: string }>(found: F[]): F[] {
  const best: Record<string, F> = Object.create(null);
  for (const e of found) {
    const path = filePath(e);
    const t = importTarget(path);
    const id = t ? "e:" + entryKey(t.date, t.tag) : "p:" + path;
    const at = best[id];
    if (at) {
      const err = new Error("two files here are the same entry (" + filePath(at) +
        " and " + path + ") — remove one and import again") as Merged;
      err.merged = path;
      throw err;
    }
    best[id] = e;
  }
  return found;
}
