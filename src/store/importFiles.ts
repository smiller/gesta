/* The text is stored AS WRITTEN. Two gates: it is PARSED before it is
   stored, so a form the schema refuses is a counted failure and never a
   blind row (pin: importFiles.test › an unreadable .md is counted, never
   attempted; a form the schema refuses is counted with its error); and the
   write reports whether it landed, so the tally is what the store holds
   (pin: importFiles.test › a write that does not land is a failure). An
   imported file overwrites that entry whatever it held. */
import { parseMarkdown } from "../model/parse.ts";
import { entryKey } from "./keys.ts";
import { importTarget } from "./names.ts";
import { entryDocs, filePath, type ImportFile } from "./files.ts";

export interface ImportSink {
  setEntry(ekey: string, md: string): Promise<boolean>;
  setImage(path: string, bytes: Uint8Array): Promise<void>;
  /* why the entry's last write did not land */
  writeError?(ekey: string): unknown;
}
class StorageFull extends Error {}
const isQuota = (err: unknown): boolean => {
  const e = err as { name?: string; inner?: { name?: string } } | null;
  return e?.name === "QuotaExceededError" || e?.inner?.name === "QuotaExceededError";
};
export type Sidecars = Record<string, Uint8Array | null>;
export type Outcome = "imported" | "skipped" | "failed";
/* the sidecars one entry's text names: matched by the sidecar NAMES this
   pick holds, not a src character class — an ordinary "Trip Log" page's
   ref holds a space and a "(2026)" name a ")" no class can parse — in
   BOTH spellings, bare and CommonMark's <name> form. A ref is RELATIVE, so
   it resolves in its entry's OWN folder and the map is keyed by path (pin:
   importFiles.test › a sidecar is filed under the path its ref resolves to) */
export function sidecarRefs(path: string, text: string, sidecars: Sidecars): { refs: string[]; blocked: boolean } {
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  const refs: string[] = [];
  let blocked = false;
  if (text.indexOf("![") === -1) return { refs, blocked };
  for (const s of Object.keys(sidecars)) {
    if (s.slice(0, dir.length) !== dir) continue;
    const rel = s.slice(dir.length);
    if (rel.indexOf("/") !== -1) continue;
    if (text.indexOf("](" + rel + ")") === -1 && text.indexOf("](<" + rel + ">)") === -1) continue;
    if (sidecars[s] === null) { blocked = true; continue; }
    refs.push(s);
  }
  return { refs, blocked };
}
export function importEntry(path: string, text: string, sidecars: Sidecars, sink: ImportSink): Promise<Outcome> {
  const target = importTarget(path);
  if (!target) return Promise.resolve("skipped");
  const ekey = entryKey(target.date, target.tag);
  const { refs, blocked } = sidecarRefs(path, text, sidecars);
  /* stop rather than write: the entry it would replace may well be the one
     that has the picture (pin: importFiles.test › an entry whose picture
     could not be read is refused and counted) */
  if (blocked) return Promise.reject(new Error("a picture this entry needs could not be read"));
  return Promise.resolve().then(() => {
    parseMarkdown(text);
    /* a full store met mid-way names the pictures it kept, standing with no
       entry to show them (pin: importFiles.test › storage full on a later picture) */
    const written: string[] = [];
    return refs.reduce((chain, s) => chain.then(() => sink.setImage(s, sidecars[s]!)).then(() => { written.push(s); }), Promise.resolve())
      .catch((err: unknown) => { throw isQuota(err) ? new StorageFull("storage full" + (written.length ? "; pictures written for it: " + written.join(", ") : "")) : err; });
  }).then(() => sink.setEntry(ekey, text)).then((landed) => {
    if (!landed && isQuota(sink.writeError?.(ekey))) throw new StorageFull("storage full");
    return landed ? "imported" : "failed";
  });
}
export function importKeys(files: ImportFile[]): Set<string> {
  const keys = new Set<string>();
  for (const f of entryDocs(files)) {
    const t = importTarget(filePath(f));
    if (t) keys.add(entryKey(t.date, t.tag));
  }
  return keys;
}
export interface Tally { imported: number; failed: number; attempted: number; failures: { path: string; error: string }[]; full?: true }
/* A single file's failure is COUNTED, not thrown — one bad file must not
   abort the rest of the folder — and named in the tally. A full store
   stops it: every write after would fail the same way, each its own pin
   (pin: importFiles.test › storage full stops the import)
   (pin: importFiles.test › storage full on a picture) */
export function importFiles(files: ImportFile[], sink: ImportSink, onProgress?: (done: number, total: number) => void): Promise<Tally> {
  const sidecars: Sidecars = Object.create(null);
  for (const f of files) if ("bytes" in f) sidecars[filePath(f)] = f.bytes;
  const docs = entryDocs(files);
  const tally: Tally = { imported: 0, failed: 0, attempted: docs.length, failures: [] };
  let done = 0;
  return docs.reduce((chain, f) => chain.then(() => {
    if (tally.full) return;
    const path = filePath(f);
    if (f.unread) { tally.failed++; tally.failures.push({ path, error: "could not be read" }); return; }
    return importEntry(path, f.text, sidecars, sink).then(
      (outcome) => {
        if (outcome === "imported") tally.imported++;
        else if (outcome === "failed") { tally.failed++; tally.failures.push({ path, error: "the write did not land" }); }
      },
      (err: unknown) => { tally.failed++; tally.failures.push({ path, error: String((err as Error)?.message ?? err) }); if (err instanceof StorageFull) tally.full = true; },
    );
  }).then(() => { if (onProgress) onProgress(++done, docs.length); }), Promise.resolve()).then(() => tally);
}
