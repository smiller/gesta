import { entryFile, collidingFile, pictureIn, RELATIVE_SRC } from "./names.ts";
import { yieldToTaskQueue } from "./io.ts";
import type { ExportFile } from "./files.ts";
import type { ImageStore } from "./store.ts";

export function splitKey(ekey: string): [string, string | null] {
  const slash = ekey.indexOf("/");
  return slash === -1 ? [ekey, null] : [ekey.slice(0, slash), ekey.slice(slash + 1)];
}
/* relative refs only: the rest is the browser's to load (pin:
   exportEntries.test › imageRefs: relative refs, bare or <bracketed>) */
export function imageRefs(md: string): string[] {
  const out: string[] = [], seen: Record<string, true> = Object.create(null);
  if (md.indexOf("![") === -1) return out;
  const re = /!\[[^\]\n]*\]\((<[^>\n]*>|[^)\s]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const src = m[1].charAt(0) === "<" ? m[1].slice(1, -1) : m[1];
    if (!src || !RELATIVE_SRC.test(src) || seen[src]) continue;
    seen[src] = true;
    out.push(src);
  }
  return out;
}
/* MEASURED on HTML: 128 KB a batch ran a 5.8 ms mean */
export const EXPORT_YIELD_BYTES = 128 * 1024;
export interface Collision extends Error { collision: true }
/* the export: one doc per non-blank entry, its sidecars after it, the
   whole list in key order. TWO ENTRIES CLAIMING ONE FILE refuse the run
   before anything is written (pin: exportEntries.test › exportEntries
   refuses two entries that would write one file). A picture the store
   lacks marks the doc `picsLost`; a read that THREW marks it `picsFaulted`:
   a fault heals next run, a missing picture never will, and only one may
   withhold a signature (pin: exportEntries.test › exportEntries: a picture
   read that throws marks the doc faulted) */
export function exportEntries(cache: Record<string, string>, images: ImageStore): Promise<ExportFile[]> {
  const jobs = Object.keys(cache).sort()
    .filter((key) => cache[key].trim())
    .map((key) => { const [date, tag] = splitKey(key); return { key, at: entryFile(date, tag), md: cache[key] }; });
  const clash = collidingFile(jobs);
  if (clash) {
    const err = new Error("two entries would write one file — " + clash.name + " is claimed by " + clash.keys.join(" and ") + ". Rename one of them.") as Collision;
    err.collision = true;
    return Promise.reject(err);
  }
  function oneJob(job: { at: ReturnType<typeof entryFile>; md: string }): Promise<ExportFile[]> {
    const doc: ExportFile = { dir: job.at.dir, name: job.at.base + ".md", flat: job.at.flatBase + ".md", text: job.md, entry: job.at.flatBase, root: job.at.root };
    const files: ExportFile[] = [doc];
    let lost = 0, faulted = 0;
    return Promise.all(imageRefs(job.md).map((ref) => images.get(pictureIn(job.at, ref)).then((row) => {
      if (row) files.push({ dir: job.at.dir, name: ref, bytes: row.bytes, entry: job.at.flatBase, root: job.at.root });
      else lost++;
    }, () => { lost++; faulted++; }))).then(() => {
      if (lost) doc.picsLost = job.at;
      if (faulted) doc.picsFaulted = true;
      return files;
    });
  }
  const batches: typeof jobs[] = [];
  let batch: typeof jobs = [], since = 0;
  for (const job of jobs) {
    batch.push(job);
    since += job.md.length;
    if (since >= EXPORT_YIELD_BYTES) { batches.push(batch); batch = []; since = 0; }
  }
  if (batch.length) batches.push(batch);
  const all: ExportFile[] = [];
  return batches.reduce((chain, group) => chain.then(() =>
    Promise.all(group.map(oneJob)).then((lists) => { for (const l of lists) all.push(...l); return yieldToTaskQueue(); })),
    Promise.resolve()).then(() => all);
}
/* from KEYS alone, never from the exported files (pin: exportEntries.test ›
   splitKey and archiveRoots read the key alone) */
export function archiveRoots(keys: string[]): string[] {
  return keys.map((key) => { const [date, tag] = splitKey(key); return entryFile(date, tag).root; });
}
