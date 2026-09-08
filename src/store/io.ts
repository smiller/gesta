/* The disk edge of export and backup: the per-file-tolerant writer every
   disk-bound path pays, the backup orchestrator over it (archives, the
   day's census, the mirror with its relayout sweep and its reconcile), the
   zip walk over zip.ts's byte format, the metadata-only listing, and the
   macrotask boundary long runs breathe through. Ported 2026-09-07 from
   ../writer/src/js/io.mjs; every function takes its directory handle as an
   argument, so the suites pass fakes. */
import { utf8, type EntryFile } from "./names.ts";
import { isDoc, fileBody, filePath, flatName, fsaFatal, type ExportFile } from "./files.ts";
import { fileSig, fileSize, MIRROR_DIR, ARCHIVE_DIR, MANIFESTS_DIR, dedupFiles, reconcilePlan, archivePlan, rootManifest, type Manifest, type Archived, type BackupPlan, type ArchiveGroup } from "./plans.ts";
import { emitZipEntry, deflateRaw } from "./zip.ts";
import type { Dir } from "./fsa.ts";

/* A LONG RUN MUST NOT FREEZE THE SCREEN: a promise chain resolves entirely
   through microtasks, so no keystroke, timer or frame is serviced for the
   whole of it. MEASURED 2026-08-18 in Helium, zipping: 18.8 MB ran 238 ms
   with ZERO macrotasks serviced. A MessageChannel, not setTimeout: the
   clamp made it 7% slower and still left a 29 ms gap. */
let yieldWatch: (() => void) | null = null;
export function yieldToTaskQueue(): Promise<void> {
  if (yieldWatch) yieldWatch();
  return new Promise((resolve) => {
    const mc = new MessageChannel();
    mc.port1.onmessage = () => { mc.port1.close(); resolve(); };
    mc.port2.postMessage(0);
  });
}
/* the yield, watchable — a yield is invisible from outside. Returns its own
   remover so a test cannot leave one armed. */
export function setYieldWatch(fn: () => void): () => void {
  yieldWatch = fn;
  return () => { if (yieldWatch === fn) yieldWatch = null; };
}
/* what the newest backup run did, for a person to ask for AFTERWARDS: the
   point of the work is a run small enough to miss. Diagnostic only. */
export interface LastRun { tier: string | null; wrote: number; of: number; ghosts: string[]; refused: number; reconciled: boolean; archives: string[] }
export let lastRun: LastRun | null = null;
/* every file under a tier, as path → size, depth-first. METADATA ONLY:
   getFile() answers a handle's size without reading its bytes, and a
   backup folder gets evicted to cloud placeholders whose hydration costs a
   download apiece — measured 2026-08-17 at 24 KB/min over 10,210 dataless
   files. */
export function folderNames(dir: Dir): Promise<Record<string, number>> {
  const out: Record<string, number> = Object.create(null);
  function walk(d: Dir, at: string): Promise<void> {
    const it = d.values();
    function step(): Promise<void> {
      return it.next().then((res) => {
        if (res.done) return;
        const v = res.value;
        if (v.kind === "directory") return walk(v, at + v.name + "/").then(step);
        return v.getFile().then((file) => { out[at + v.name] = file.size; }).then(step);
      });
    }
    return step();
  }
  return walk(dir, "").then(() => out);
}
/* the memoized folder-chain walk every deep path pays: one PROMISE per
   folder, so paths sharing one neither race nor re-walk it. `create` makes
   missing segments (the writer's mode). `retry` drops a REJECTED chain from
   the memo (the delete sweep's mode): without it one transient refusal is
   inherited by every later path under that folder. Left off, a rejection
   CACHES — one unmakeable folder failing its files once each. */
export function folderMemo(root: Dir, opts?: { create?: boolean; retry?: boolean }): (at: string) => Promise<Dir> {
  const dirs: Record<string, Promise<Dir> | undefined> = Object.create(null);
  const mk = opts && opts.create ? { create: true } : undefined;
  return (at) => {
    const hit = dirs[at];
    if (hit) return hit;
    const made = dirs[at] = at.split("/").filter(Boolean)
      .reduce((chain, seg) => chain.then((d) => d.getDirectoryHandle(seg, mk)), Promise.resolve(root));
    if (opts && opts.retry) made.catch(() => { delete dirs[at]; });
    return made;
  };
}
/* THE BYTE THRESHOLD IS PER CALLER: a byte of deflate and a byte of
   parse-and-re-serialise do not cost the same */
export const ZIP_YIELD_BYTES = 512 * 1024;
/* export records into one ZIP, by hand. tar cannot hold this corpus: 70
   paths run past ustar's 100-byte name. The member path is the file's FULL
   one, so extracting rebuilds the tree an import reads. THE CEILING IS
   REFUSED RATHER THAN OVERRUN: classic zip counts members in 16 bits and
   offsets in 32, and past either the fields wrap into an archive that
   opens and lies. */
export const ZIP_MAX_ENTRIES = 0xFFFF;
export const ZIP_MAX_BYTES = 0xFFFFFFFF;
export function zipBytes(files: ExportFile[], day: string): Promise<Uint8Array> {
  if (files.length > ZIP_MAX_ENTRIES)
    return Promise.reject(new Error("too many files for one archive (" + files.length + ")"));
  /* the archive's OWN DATE as every member's timestamp, so the same content
     on the same day is byte-identical wherever it is built */
  const stamp = ((+day.slice(0, 4) - 1980) << 9) | (+day.slice(5, 7) << 5) | +day.slice(8, 10);
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let at = 0, since = 0;
  return files.reduce((chain, f) => chain.then(() => {
    const body = fileBody(f);
    const raw = typeof body === "string" ? utf8.encode(body) : body;
    return deflateRaw(raw).then((packed) => {
      /* STORE WHAT DEFLATING WOULD GROW: a third of this corpus by size is
         already-compressed pictures */
      const use = packed.length < raw.length ? packed : raw;
      const e = emitZipEntry(filePath(f), raw, use, stamp, at);
      parts.push(e.local, use);
      central.push(e.central);
      at += e.local.length + use.length;
      if (at > ZIP_MAX_BYTES) throw new Error("archive too large for one zip file");
      since += raw.length;
      if (since >= ZIP_YIELD_BYTES) { since = 0; return yieldToTaskQueue(); }
    });
  }), Promise.resolve()).then(() => {
    const cdAt = at;
    let cdSize = 0;
    for (const c of central) { cdSize += c.length; parts.push(c); }
    const end = new Uint8Array(22), v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, files.length, true);
    v.setUint16(10, files.length, true);
    v.setUint32(12, cdSize, true);
    v.setUint32(16, cdAt, true);
    parts.push(end);
    const out = new Uint8Array(cdAt + cdSize + end.length);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  });
}
export interface Failure { name: string; error: unknown; doc: boolean; sweep?: boolean; blind?: boolean }
/* the relayout sweep, run ONLY over a backup tier — a folder this app
   names inside the one the user designated. It deletes BY NAME, and a day
   entry's flat name is YYYY-MM-DD.md, the daily-note filename half the
   note-taking world uses: pointed at a folder the USER picked it would
   delete their files, silently and irreversibly, under a green report. A
   root file goes ONLY when this run just wrote the same name into a
   FOLDER and that write SUCCEEDED; the ENTRY is the unit — a doc whose
   nested write failed keeps its flat copy AND its flat sidecars. */
export function sweepFlatCopies(dir: Dir, files: ExportFile[], failures: Failure[]): Promise<void> {
  const lost: Record<string, true> = Object.create(null), nested: Record<string, true> = Object.create(null);
  const lostEntry: Record<string, true> = Object.create(null);
  const doomed: string[] = [];
  for (const x of failures) lost[x.name] = true;
  for (const f of files) if (f.entry && lost[filePath(f)]) lostEntry[f.entry] = true;
  for (const f of files) if (f.dir && !lost[filePath(f)] && !(f.entry && lostEntry[f.entry])) nested[flatName(f)] = true;
  const it = dir.values();
  function scan(): Promise<void> {
    return it.next().then((res) => {
      if (res.done) return;
      const v = res.value;
      if (v.kind === "file" && nested[v.name]) doomed.push(v.name);
      return scan();
    });
  }
  return scan().catch((err: unknown) => {
    /* the LISTING failed. Every write already landed, so rejecting would
       report a wholly successful write as a failure. NotFound means the
       FOLDER went between the writes landing and the scan — a lost write
       in everything but the error's origin; any other name means the
       folder is there and merely would not enumerate, so only the sweep is
       unknown: `blind`. */
    if (fsaFatal(err)) throw err;
    failures.push({ name: "(listing)", error: err, doc: false, blind: !(err && (err as { name?: string }).name === "NotFoundError") });
    doomed.length = 0;
  }).then(() => doomed.reduce((chain, n) => chain.then(() =>
    Promise.resolve().then(() => dir.removeEntry(n)).catch((err: unknown) => {
      /* the scan SAW this file, so NotFound means something else removed
         it — the goal, reached by other means. Anything else is a real
         refusal (a sync client holding the file open), reported under the
         `sweep` mark that keeps it distinguishable from a lost write. */
      if (err && (err as { name?: string }).name === "NotFoundError") return;
      if (fsaFatal(err)) throw err;
      failures.push({ name: n, error: err, doc: false, sweep: true });
    })), Promise.resolve()));
}
export interface BackupRun {
  dir: Dir; files: ExportFile[]; plan: BackupPlan;
  onProgress?: (done: number, total: number) => void;
  manifest?: Manifest; unread?: EntryFile[] | null; archived?: Archived; roots?: (string | null)[];
}
interface Tier { name: string; files: ExportFile[]; dedup: boolean; reconcile: boolean; sub?: Dir; expected: ExportFile[]; present?: Record<string, number>; base: number }
/* the writer: the ARCHIVES first — the durable, append-only snapshot the
   feature exists to preserve, where the mirror is rewritten every run: a
   permission loss part way through must not have spent the run on the
   copy that can simply be made again — then the day's census, then the
   mirror, prepared IMMEDIATELY before it writes, since listing it is the
   longest thing a run does (a getFile over ~14,600 files). */
export function writeBackup(run: BackupRun): Promise<Failure[]> {
  const { dir, files, plan, onProgress, manifest, unread, roots } = run;
  const sigs: Archived = run.archived || Object.create(null);
  let groups: ArchiveGroup[] = [];
  /* ASKED ONE PATH AT A TIME: nothing prunes archives, so enumerating a
     namespace directory would grow without bound. A probe that fails costs
     an archive, never the history. */
  function archiveListing(): Promise<Record<string, true>> {
    const present: Record<string, true> = Object.create(null), folderOf = folderMemo(dir);
    return Object.keys(sigs).reduce((chain, root) => {
      const was = sigs[root];
      if (!was || typeof was !== "object" || !was.at) return chain;
      const at = was.at;
      return chain.then(() => {
        const cut = at.lastIndexOf("/");
        return folderOf(cut < 0 ? "" : at.slice(0, cut))
          .then((d) => d.getFileHandle(at.slice(cut + 1)))
          .then(() => { present[at] = true; }, () => {});
      });
    }, Promise.resolve()).then(() => present);
  }
  const tiers: Tier[] = [];
  /* ONLY THE MIRROR IS A TIER: an archive is a single file under its own
     parent, needing no listing, dedup, sweep or reconcile */
  if (plan.writeMirror) tiers.push({ name: MIRROR_DIR, files, dedup: !!manifest, reconcile: plan.reconcile, expected: files, base: 0 });
  lastRun = { tier: null, wrote: 0, of: 0, ghosts: [], refused: 0, reconciled: false, archives: [] };
  const seen = lastRun;
  function prepare(t: Tier): Promise<void> {
    return Promise.resolve().then(() => dir.getDirectoryHandle(t.name, { create: true })).then((sub) => {
      t.sub = sub;
      t.expected = t.files;
      if (!t.dedup) return;
      /* A LISTING THAT FAILS COSTS A REWRITE, NEVER THE BACKUP. Logged,
         because the degradation is invisible: every run then looks like a
         legitimate first run. */
      return folderNames(sub).then((present) => {
        t.present = present;
        t.files = dedupFiles(t.expected, manifest!, present);
      }, (err: unknown) => {
        console.error("backup: could not list " + t.name + " — writing every file", err);
      });
    });
  }
  /* ONE CUMULATIVE COUNT across the run: an archive is one unit, a doc one
     unit, so the notice never holds still through the archives and reads
     as a stall (measured 2026-08-18: a whole-corpus first run is ~3.6 s) */
  let total = 0, done = 0;
  function plot(t: Tier): void { t.base = total; total += t.files.filter(isDoc).length; }
  function tier(t: Tier): Promise<Failure[]> {
    const base = t.base, sub = t.sub!;
    return writeFilesTo(sub, t.files, onProgress && ((n) => onProgress(base + n, total)))
      .then((failures) => {
        if (t.dedup) recordWritten(t, failures);
        /* the relayout sweep FIRST: it reasons about this run's own writes,
           the reconcile about a listing taken before them */
        return sweepFlatCopies(sub, t.expected, failures)
          .then(() => t.dedup ? reportGhosts(t, failures) : undefined)
          .then(() => failures);
      });
  }
  /* NAME THE GHOSTS, THEN REMOVE THEM. No user gesture stands behind a run,
     so the belt and the ownership test stand in for "are you sure". */
  function reportGhosts(t: Tier, failures: Failure[]): Promise<void> | void {
    seen.tier = t.name;
    seen.wrote = t.files.length;
    seen.of = t.expected.length;
    if (!t.present || !t.reconcile) return;
    const ghosts = reconcilePlan(t.present, t.expected, unread);
    seen.ghosts = ghosts.drop;
    seen.refused = ghosts.refused;
    seen.reconciled = true;
    if (ghosts.refused) {
      console.error("backup: " + ghosts.refused + " files in " + t.name + " look stale — too many to be a tidy-up, so none were touched");
      return;
    }
    if (!ghosts.drop.length) return;
    const before = failures.length;
    return removeStale(t.sub!, ghosts.drop, failures).then(() => {
      for (const gone of ghosts.drop) delete manifest![gone];
      const stuck = failures.length - before;
      console.error("backup: removed " + (ghosts.drop.length - stuck) + " stale file(s) from " + t.name + " the journal no longer contains — lastRun lists them");
    });
  }
  /* one name at a time and NEVER recursively; the ONE function here that
     destroys data, so `tierDir` and never the backup root */
  function removeStale(tierDir: Dir, doomed: string[], failures: Failure[]): Promise<void> {
    const folderOf = folderMemo(tierDir, { retry: true });
    return doomed.reduce((chain, path) => chain.then(() => {
      const cut = path.lastIndexOf("/"), name = path.slice(cut + 1);
      return folderOf(cut < 0 ? "" : path.slice(0, cut))
        .then((d) => d.removeEntry(name))
        .catch((err: unknown) => {
          if (err && (err as { name?: string }).name === "NotFoundError") return;
          if (fsaFatal(err)) throw err;
          failures.push({ name: path, error: err, doc: false, sweep: true });
        });
    }), Promise.resolve());
  }
  /* what the mirror now holds, for the next run to skip against; a file
     that FAILED to write is left out, so a lost write is retried */
  function recordWritten(t: Tier, failures: Failure[]): void {
    const lost: Record<string, true> = Object.create(null);
    for (const x of failures) lost[x.name] = true;
    for (const f of t.files) if (!lost[filePath(f)]) manifest![filePath(f)] = { sig: fileSig(f), size: fileSize(f) };
  }
  /* ONE ROOT AT A TIME, zipped and written before the next is begun: all
     at once would hold the whole corpus compressed in memory (~109 MB) */
  const zipName = plan.dated + ".zip";
  function writeArchives(): Promise<Failure[]> {
    return groups.reduce((chain, g) => chain.then((failures) => {
      const rec: ExportFile = { dir: ARCHIVE_DIR + "/" + g.root + "/", name: zipName, bytes: null };
      const at = filePath(rec);
      return zipBytes(g.files, plan.dated!).then((bytes) => {
        rec.bytes = bytes;
        return writeFilesTo(dir, [rec]);
      }).then((lost) => {
        /* A SIGNATURE COMMITS ONLY ON A CLEAN WRITE, the path beside the
           hash so the next run can ASK the folder whether the file is there */
        if (!lost.length) { sigs[g.root] = { sig: g.sig, at }; seen.archives.push(at); }
        return lost;
      }, (err: unknown) => {
        if (fsaFatal(err)) throw err;
        return [{ name: at, error: err, doc: false }] as Failure[];
      }).then((lost) => {
        done += 1;
        if (onProgress) onProgress(done, total);
        return failures.concat(lost);
      });
    }), Promise.resolve([] as Failure[]));
  }
  return (plan.dated ? archiveListing() : Promise.resolve(null)).then((present) => {
    if (present) {
      groups = archivePlan(files, sigs, present);
      total = groups.length;
    }
    return writeArchives();
  }).then((archiveFails) => {
    /* THE MANIFEST GOES AFTER THE ARCHIVES, because it describes them; NOT
       WRITTEN AT ALL WHEN AN ARCHIVE FAILED (a root keeps its previous
       record, so its line would name an older zip as today's state), and
       an EMPTY ONE IS NOT WRITTEN EITHER (it would assert no root existed) */
    if (!plan.dated) return archiveFails;
    if (archiveFails.length) return archiveFails;
    const body = rootManifest(roots || [], sigs);
    if (!body) return archiveFails;
    return writeFilesTo(dir, [{ dir: MANIFESTS_DIR + "/", name: plan.dated + ".txt", bytes: utf8.encode(body) }])
      .then((lost) => archiveFails.concat(lost));
  }).then((archiveFails) => tiers.reduce((chain, t) => chain.then((f) =>
    prepare(t).then(() => { plot(t); return tier(t); }).then((g) => f.concat(g))), Promise.resolve(archiveFails)));
}
/* write every file into the directory, one at a time, COLLECTING a single
   file's failure instead of rejecting the chain, so one bad name cannot
   sink a 7000-file export; a SESSION-fatal error rethrows. Progress counts
   ENTRY docs, not files: a doc's sidecars ride along but are not entries. */
export function writeFilesTo(dir: Dir, files: ExportFile[], onProgress?: (done: number, total: number) => void): Promise<Failure[]> {
  const failures: Failure[] = [];
  let done = 0;
  const docTotal = files.filter(isDoc).length;
  const folderOf = folderMemo(dir, { create: true });
  const handleAt = (f: ExportFile) => folderOf(f.dir || "").then((d) => d.getFileHandle(f.name, { create: true }));
  return files.reduce((chain, f) => chain.then(() =>
    Promise.resolve()
      .then(() => handleAt(f))
      .then((h) => h.createWritable())
      .then((w) => Promise.resolve(w.write(fileBody(f))).then(() => w.close()))
      .catch((err: unknown) => {
        if (fsaFatal(err)) throw err;
        failures.push({ name: filePath(f), error: err, doc: isDoc(f) });
      })
      .then(() => { if (onProgress && isDoc(f)) onProgress(++done, docTotal); })), Promise.resolve()).then(() => failures);
}
