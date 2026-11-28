import { entryFile, collidingFile, pictureIn } from "./names.ts";
import { imageRefs } from "./pictures.ts";
import { splitKey } from "./keys.ts";
import { yieldToTaskQueue } from "./io.ts";
import type { ExportFile } from "./files.ts";
import type { ImageStore } from "./store.ts";
import { PHRASES } from "../model/alertText.ts";

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
  if (clash) return Promise.reject(collisionError(clash));
  const all: ExportFile[] = [];
  return batchesOf(jobs).reduce((chain, group) => chain.then(() =>
    Promise.all(group.map((job) => exportJob(job, images))).then((lists) => { for (const l of lists) all.push(...l); return yieldToTaskQueue(); })),
    Promise.resolve()).then(() => all);
}
function collisionError(clash: { name: string; keys: string[] }): Collision {
  const err = new Error(PHRASES.filenameClash(clash)) as Collision;
  err.collision = true;
  return err;
}
interface ExportJob { at: ReturnType<typeof entryFile>; md: string }
function exportJob(job: ExportJob, images: ImageStore): Promise<ExportFile[]> {
  const doc: ExportFile = { dir: job.at.dir, name: job.at.base + ".md", flat: job.at.flatBase + ".md", text: job.md, entry: job.at.flatBase, root: job.at.root };
  const files: ExportFile[] = [doc];
  let lost = 0, faulted = 0;
  return Promise.all(imageRefs(job.md).map((ref) => images.get(pictureIn(job.at, ref)).then((row) => {
    if (row) files.push({ dir: job.at.dir, name: ref, bytes: row.bytes, entry: job.at.flatBase, root: job.at.root });
    else lost++;
  }, () => { lost++; faulted++; }))).then(() => {
    if (lost) { doc.picsLost = job.at; doc.picsMissing = lost; }
    if (faulted) doc.picsFaulted = true;
    return files;
  });
}
function batchesOf<J extends ExportJob>(jobs: J[]): J[][] {
  const batches: J[][] = [];
  let batch: J[] = [], since = 0;
  for (const job of jobs) {
    batch.push(job);
    since += job.md.length;
    if (since >= EXPORT_YIELD_BYTES) { batches.push(batch); batch = []; since = 0; }
  }
  if (batch.length) batches.push(batch);
  return batches;
}
/* the pictures an export's text names and could not carry (pin:
   exportEntries.test › exportEntries: a doc per non-blank entry) */
export function missingPictures(files: ExportFile[]): number {
  return files.reduce((n, f) => n + (f.picsMissing ?? 0), 0);
}
export function archiveRoots(keys: string[]): string[] {
  return keys.map((key) => { const [date, tag] = splitKey(key); return entryFile(date, tag).root; });
}
