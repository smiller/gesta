import { entryKey } from "./keys.ts";
import { importTarget, type EntryFile } from "./names.ts";

/* an export file is an entry's markdown (a doc) or a doc's image sidecar,
   which rides as raw `bytes` — or a file that is neither, which takes the
   bytes arm so no count of entries sees it. A picked file that CANNOT be
   read is kept and marked: an unreadable .md is an ENTRY the restore came
   for, COUNTED as a failure rather than dropped, or a browning-out drive
   would shrink the set and report a green partial restore; an unreadable
   picture is present-but-null, so the entry needing it is refused instead
   of being written picture-less over a live one that has it (pin:
   files.test › the records: a doc has text, a sidecar bytes, an unreadable
   file is kept and marked) */
export interface DocFile { dir: string; name: string; text: string; unread?: false }
export interface UnreadDoc { dir: string; name: string; unread: true }
export interface SidecarFile { dir: string; name: string; bytes: Uint8Array | null; unread?: boolean }
export type ImportFile = DocFile | UnreadDoc | SidecarFile;
/* `flat` the stem it had before folders existed, `entry` the entry it
   belongs to, `root` its archive, `sig` its content hash once asked for,
   `picsLost` the entry target when a picture the text names had no bytes,
   `picsFaulted` when a picture read threw */
export interface ExportFile {
  dir: string; name: string;
  text?: string; bytes?: Uint8Array | null;
  flat?: string; entry?: string; root?: string; sig?: string;
  picsLost?: EntryFile; picsFaulted?: boolean;
}
export function isDoc(f: object): boolean { return !("bytes" in f); }
export function fileBody(f: ExportFile): string | Uint8Array { return isDoc(f) ? f.text! : f.bytes!; }
/* the ONE spelling of the join */
export function filePath(f: { dir?: string; name: string }): string { return (f.dir || "") + f.name; }
export function flatName(f: ExportFile): string { return f.flat || f.name; }
export function unreadFile(name: string, dir: string): ImportFile {
  return /\.md$/i.test(name) ? { dir, name, unread: true } : { dir, name, unread: true, bytes: null };
}
export function errText(err: unknown): string {
  const e = err as { name?: string; message?: string } | null;
  return e && e.name ? e.name + ": " + e.message : "";
}
/* the ONE shape of a failure's message */
export function failMsg(op: string, err: unknown): string { return op + " — " + (errText(err) || "see console"); }

/* the ONE spelling of "counts as an entry on import", so no count can
   drift from another (pin: files.test › oneEach and entryDocs: one file per
   ENTRY) */
export function entryDocs(files: ImportFile[]): (DocFile | UnreadDoc)[] {
  return files.filter((f): f is DocFile | UnreadDoc => isDoc(f) && importTarget(filePath(f)) !== null);
}
/* the session-fatal File System Access errors — permission revoked, the
   picker dismissed, the directory removed — that abort a whole write chain
   rather than failing one file */
export function fsaFatal(err: unknown): boolean {
  const e = err as { name?: string } | null;
  return !!e && (e.name === "AbortError" || e.name === "NotAllowedError" || e.name === "SecurityError");
}
export interface Merged extends Error { merged: string }
/* one file per ENTRY — never per filename, which stopped being an identity
   when pages nested: page/A/Notes.md and page/B/Notes.md are two entries.
   A KEY CLAIMED TWICE IS A REFUSAL with nothing to choose between — one
   shape is written and one read, so what brings two paths to one key is
   normalization (a "--" run or an edge dash folded), and the message says
   so rather than "several backups" (pin: files.test › oneEach:
   normalization refuses with what to do). It throws before a byte
   is read, reading a large folder being what exhausts the tab. An entry key
   and a path are both bare strings of one shape, so they are PREFIXED
   apart. Returns the input, in its order: nothing is dropped or preferred. */
export function oneEach<F extends { dir?: string; name: string }>(found: F[]): F[] {
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
