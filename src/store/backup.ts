/* Restore is not new code: the import, pointed at an unzipped archive */
import { NS, todayKey } from "./keys.ts";
import { readRaw, writeRaw } from "./local.ts";
import { imgHash, type EntryFile } from "./names.ts";
import { filePath, errText, failMsg, fsaFatal, type ExportFile } from "./files.ts";
import { backupPlan, withheld, READER_ZIP, type Manifest, type Archived, type BackupPlan } from "./plans.ts";
import { writeBackup, writeBundle, type Failure } from "./io.ts";
import { exportEntries, archiveRoots } from "./exportEntries.ts";
import type { EntryLayer } from "./entries.ts";
import type { ImageStore, BackupStore } from "./store.ts";
import type { Dir } from "./fsa.ts";

export const BACKUP_SIG = NS + "backup.sig";
export const BACKUP_DATED = NS + "backup.dated";
export const BACKUP_ON = NS + "backup.on";
export const PAUSED_MSG = "backups paused — click to resume";
/* the idle debounce — 10 min, deliberately long: a folder write is heavier
   than a store put, and the dedup skips the no-change case anyway */
export const IDLE_MS = 600000;
/* a compact fingerprint over the entry BODIES alone, sorted; the backup
   bookkeeping is volatile and none of it is written to the folder, and
   hashing it made the signature differ every run. VERSIONED: bumping it
   forces exactly one rewrite, which is what puts a folder into a new
   shape. The NUL delimiter is spelled as an escape, never a literal byte. */
export function backupSig(cache: Record<string, string>): string {
  const keys = Object.keys(cache).sort();
  const s = keys.map((k) => k + "\u0000" + cache[k]).join("\u0000");
  return "3." + imgHash(s) + "." + s.length;
}
export interface BackupOptions {
  layer: EntryLayer;
  images: ImageStore;
  store: BackupStore;
  picker: (() => Promise<Dir>) | null;
  say: (text: string) => void;
  /* the ONE writer of the trouble state: "" is healthy, else the reason the
     last run did not complete, click-to-resume */
  onTrouble: (msg: string) => void;
  stick: (text: string, err: unknown, copy?: string) => void;
}
export interface Backup {
  readonly configured: boolean;
  readonly trouble: string;
  runBackup(): Promise<void>;
  scheduleBackup(): void;
  firePendingBackup(): Promise<void> | null;
  setupBackupFolder(): Promise<void>;
  resumeBackups(): Promise<void>;
}
interface RunCtx {
  h: Dir; today: string; sig: string; datedWas: string | null; plan: BackupPlan;
  files: ExportFile[]; roots: (string | null)[]; manifest: Manifest; archived: Archived;
}
/* ONE WALK, TWO ANSWERS: a NAME is spared when its pictures did not
   arrive; a FAULT joins the failures, to be answered there */
function pictureTrouble(files: ExportFile[]): { spare: EntryFile[]; picFaults: Failure[] } {
  const spare: EntryFile[] = [], picFaults: Failure[] = [];
  for (const f of files) {
    if (f.picsLost) spare.push(f.picsLost);
    if (f.picsFaulted) picFaults.push({ name: filePath(f), error: new Error("this entry’s pictures could not be read"), doc: true });
  }
  return { spare, picFaults };
}
function logFailures(failures: Failure[]): void {
  if (!failures.length) return;
  console.error("backup: " + failures.length + " file(s) failed\n" + failures.map((x) => x.name + " — " + (errText(x.error) || x.error)).join("\n"), failures);
}
const isCollision = (err: unknown): boolean => !!err && !!(err as { collision?: boolean }).collision;
export function backupRunner(opts: BackupOptions): Backup {
  const { layer, images, store, picker, say, stick } = opts;
  /* the signature THIS TAB last committed, never stored: equal to the
     shared one means no other tab has written the folder since, the only
     ground on which this run may delete from it */
  let committedSig: string | null = null;
  /* a synchronous "a folder is configured" mirror for the edit hot path,
     seeded from the durable hint; the run's store read corrects it */
  let configured = !!readRaw(BACKUP_ON);   /* every hint read and written inside try: reaching localStorage throws where it is refused (pin: entries left and renamed › a page opened with localStorage refused) */
  let handle: Dir | null = null;   /* cached so a resume can requestPermission SYNCHRONOUSLY in the click */
  let running: Promise<void> | null = null;   /* the single-flight latch */
  let trouble = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  function setTrouble(msg: string): void { trouble = msg || ""; opts.onTrouble(configured ? trouble : ""); }
  /* self-sealing: resolves on both arms, never rejects, so the launch and
     idle callers need no catch. Gated on the warm: never back up a blank
     or unread cache. */
  function runBackup(): Promise<void> {
    if (running) return running;
    if (!layer.warmed || layer.storeReadFailed) return Promise.resolve();
    const run = (handle ? Promise.resolve(handle) : store.get() as Promise<Dir | null>).then(withFolder).catch(runFailed)
      .then(() => { running = null; }, () => { running = null; });
    running = run;
    return run;
  }
  function withFolder(h: Dir | null): Promise<void> | void {
    /* a folder picked while we read: the newer pick wins, and this run
       is dropped rather than guarded line by line */
    if (handle && handle !== h) return;
    handle = h;
    configured = !!h;
    if (!h) { writeRaw(BACKUP_ON, null); setTrouble(""); return; }
    /* no gesture behind a launch or idle run, so only a handle already
       granted writes; a 'prompt' handle (a file:// tab after a restart)
       surfaces the paused affordance, whose click is the gesture */
    return h.queryPermission({ mode: "readwrite" }).then((perm) => (perm === "granted" ? granted(h) : setTrouble(PAUSED_MSG)));
  }
  function granted(h: Dir): Promise<void> | void {
    const today = todayKey(), sig = backupSig(layer.cache), lastSig = readRaw(BACKUP_SIG) ?? null;
    const datedWas = readRaw(BACKUP_DATED) ?? null;
    const plan = backupPlan(today, sig, { dated: datedWas, sig: lastSig, ours: committedSig !== null && lastSig === committedSig });
    if (!plan.writeMirror && !plan.dated) { setTrouble(""); return; }
    say("backing up…");
    /* the census's walk in the SAME tick as the export's snapshot: the
       export yields for seconds, and a walk taken after it reads the
       keys seconds of live typing later than the files it describes */
    const roots = archiveRoots(Object.keys(layer.cache));
    return Promise.all([exportEntries(layer.cache, images), store.getManifest(), store.getArchives()]).then(([files, m, a]) =>
      writeRun({ h, today, sig, datedWas, plan, files, roots, manifest: (m || {}) as Manifest, archived: (a || {}) as Archived }));
  }
  function writeRun(c: RunCtx): Promise<void> {
    const { spare, picFaults } = pictureTrouble(c.files);
    return writeBackup({ dir: c.h, files: c.files, plan: c.plan, manifest: c.manifest, archived: c.archived, roots: c.roots,
      unread: c.plan.reconcile ? spare : null, onProgress: (done, total) => say("backing up… " + done + " / " + total) })
      .then((written) => withBundle(c, written))
      .then((written) => settle(c, written.concat(picFaults)));
  }
  function withBundle(c: RunCtx, written: Failure[]): Promise<Failure[]> | Failure[] {
    if (!c.plan.writeMirror || c.h !== handle) return written;
    return writeBundle(c.h, c.files, c.manifest, { day: c.today, written: Date.now() }).then((b) => written.concat(b));
  }
  function settle(c: RunCtx, failures: Failure[]): Promise<void> | void {
    /* a folder change repointed the handle mid-run: this run wrote
       the OLD folder, so commit nothing and claim nothing */
    if (c.h !== handle) return;
    const { lostWrite, blind } = withheld(failures);
    const datedThen = readRaw(BACKUP_DATED) ?? null;   /* sampled BEFORE our own write */
    commitScalars(c, lostWrite, !lostWrite && !blind);
    logFailures(failures);
    report(failures, lostWrite || blind);
    return commitRecords(c, datedThen);
  }
  function commitScalars(c: RunCtx, lostWrite: boolean, whole: boolean): void {
    if (c.plan.dated && !lostWrite) writeRaw(BACKUP_DATED, c.plan.dated);
    if (c.plan.writeMirror && whole) { writeRaw(BACKUP_SIG, c.sig); committedSig = c.sig; }
  }
  function report(failures: Failure[], incomplete: boolean): void {
    if (incomplete) { setTrouble("backup incomplete — click to retry"); return; }
    setTrouble("");
    if (failures.length) reportLeftovers(failures);
    else say("backed up");
  }
  /* a delete-only failure is not backup trouble: a resume click
     could do nothing against a file something else holds open;
     nor is the bundle's, retried when the mirror next moves */
  function reportLeftovers(failures: Failure[]): void {
    const bundle = failures.find((x) => x.name === READER_ZIP), swept = failures.filter((x) => x !== bundle);
    if (swept.length) stick("backup couldn’t remove " + swept.length + " old file(s)", swept[0].error, swept.map((x) => x.name).join(", "));
    if (bundle) stick("backed up, but gesta.zip for the reader couldn’t be written", bundle.error, errText(bundle.error) || READER_ZIP);
  }
  /* the commits, ONE AFTER THE OTHER: both ride in the same record.
     Another tab's dated run voids ours: the shared scalar moved
     under us, so we record nothing and the next dated run archives
     again. */
  function commitRecords(c: RunCtx, datedThen: string | null): Promise<void> {
    let commits: Promise<void> = Promise.resolve();
    if (c.plan.writeMirror) commits = commits.then(() => storeManifest(c));
    if (c.plan.dated && datedThen !== c.datedWas) return commits;
    if (c.plan.dated) commits = commits.then(() => storeArchives(c));
    return commits;
  }
  function storeManifest(c: RunCtx): Promise<void> | void {
    if (c.h !== handle) return;
    return store.setManifest(c.manifest).catch((err: unknown) => { console.error("backup: could not store the file manifest — the next run will rewrite everything", err); });
  }
  function storeArchives(c: RunCtx): Promise<void> | void {
    if (c.h !== handle) return;
    return store.setArchives(c.archived).catch((err: unknown) => { console.error("backup: could not store the archive signatures — the next dated run will re-archive everything", err); });
  }
  /* a DETERMINISTIC failure gets no retry affordance: the same journal
     throws the same error on every retry */
  function runFailed(err: unknown): void {
    if (isCollision(err)) {
      setTrouble("backup blocked — two entries share a filename");
      stick("backup blocked — " + (err as Error).message, err, (err as Error).message);
      return;
    }
    console.error("backup failed", err);
    setTrouble(fsaFatal(err) ? PAUSED_MSG : "backup failed — click to retry");
  }
  function scheduleBackup(): void {
    if (!configured || !picker) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(firePendingBackup, IDLE_MS);
  }
  /* run the ARMED backup now and disarm — the idle timer's own callback and
     the leave-the-tab capture: a hidden tab's timers are throttled or never
     served. A fire while a run is in flight chains a FRESH run behind it. */
  function firePendingBackup(): Promise<void> | null {
    if (!timer) return null;
    clearTimeout(timer);
    timer = null;
    if (running) return running.then(() => runBackup());
    return runBackup();
  }
  /* the one-time gesture: pick a folder, PERSIST its handle, back up at
     once. The picker opens synchronously in the click. */
  function setupBackupFolder(): Promise<void> {
    if (!picker) { say("automatic backups need a Chromium browser"); return Promise.resolve(); }
    return picker().then((h) => {
      handle = h;
      return store.set(h as unknown as FileSystemDirectoryHandle).then(() => {
        configured = true;
        writeRaw(BACKUP_ON, "1");
        writeRaw(BACKUP_SIG, null);   /* the first backup writes everything */
        writeRaw(BACKUP_DATED, null);
        setTrouble("");
        return Promise.resolve(running).then(runBackup);
      });
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      stick(failMsg("couldn’t set up backups", err), err);
    });
  }
  /* the paused affordance's click: requestPermission re-grants the CACHED
     handle SYNCHRONOUSLY, as the first statement, since it needs the
     click's activation */
  function resumeBackups(): Promise<void> {
    if (!picker) return Promise.resolve();
    if (!handle) return setupBackupFolder();
    return handle.requestPermission({ mode: "readwrite" }).then((perm) => {
      if (perm === "granted") { setTrouble(""); return runBackup(); }
      setTrouble(PAUSED_MSG);
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      console.error("resume backups failed", err);
    });
  }
  return {
    get configured() { return configured; },
    get trouble() { return trouble; },
    runBackup, scheduleBackup, firePendingBackup, setupBackupFolder, resumeBackups,
  };
}
