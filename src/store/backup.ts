/* Restore is not new code: the import, pointed at an unzipped archive */
import { NS, todayKey } from "./keys.ts";
import { readRaw, writeRaw } from "./local.ts";
import { imgHash, type EntryFile } from "./names.ts";
import { filePath, errText, failWhy, fsaFatal, type ExportFile } from "./files.ts";
import { backupPlan, withheld, READER_ZIP, type Manifest, type Archived, type BackupPlan } from "./plans.ts";
import { writeBackup, writeBundle, type Failure } from "./io.ts";
import { exportEntries, archiveRoots } from "./exportEntries.ts";
import type { EntryLayer } from "./entries.ts";
import type { ImageStore, BackupStore } from "./store.ts";
import type { Dir } from "./fsa.ts";
import { type Raise, type Trouble } from "../model/alertText.ts";

export const BACKUP_SIG = NS + "backup.sig";
export const BACKUP_DATED = NS + "backup.dated";
export const BACKUP_ON = NS + "backup.on";
/* the idle debounce — 10 min, deliberately long: a folder write is heavier
   than a store put, and the dedup skips the no-change case anyway */
export const IDLE_MS = 600000;
export const PERMISSION_MS = 5000;
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
  raise: Raise;
  /* said once as the runner is made, then each time a field changes, never
     twice the same (pin: backup.test › a run ending as the one before) */
  onChange: (state: BackupState) => void;
}
/* `trouble` is why the last run did not complete, "none" while no folder is set up */
export interface BackupState { configured: boolean; trouble: Trouble; folder: string | null }
export interface Backup extends Readonly<BackupState> {
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
  const { layer, images, store, picker, raise } = opts;
  /* the signature THIS TAB last committed, never stored: equal to the
     shared one means no other tab has written the folder since, the only
     ground on which this run may delete from it */
  let committedSig: string | null = null;
  /* a synchronous "a folder is configured" mirror for the edit hot path,
     seeded from the durable hint; the run's store read corrects it */
  let configured = !!readRaw(BACKUP_ON);   /* every hint read and written inside try: reaching localStorage throws where it is refused (pin: entries left and renamed › a commonplace opened with localStorage refused) */
  let handle: Dir | null = null;   /* cached so a resume can requestPermission SYNCHRONOUSLY in the click */
  let running: Promise<void> | null = null;   /* the single-flight latch */
  let trouble: Trouble = "none";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let said = "";
  function announce(): void {
    const state: BackupState = { configured, trouble: configured ? trouble : "none", folder: handle?.name ?? null };
    const now = JSON.stringify(state);
    if (now !== said) { said = now; opts.onChange(state); }
  }
  function setTrouble(t: Trouble): void { trouble = t; announce(); }
  /* self-sealing: resolves on both arms, never rejects, so the launch and
     idle callers need no catch. Gated on the warm: never back up a blank
     or unread cache. */
  function runBackup(grantedNow = false): Promise<void> {
    if (running) return running;
    if (!layer.warmed || layer.storeReadFailed) return Promise.resolve();
    const run = (handle ? Promise.resolve(handle) : store.get() as Promise<Dir | null>).then((h) => withFolder(h, grantedNow)).catch(runFailed)
      .then(() => { running = null; }, () => { running = null; });
    running = run;
    return run;
  }
  function withFolder(h: Dir | null, grantedNow: boolean): Promise<void> | void {
    /* a folder picked while we read: the newer pick wins, and this run
       is dropped rather than guarded line by line */
    if (handle && handle !== h) return;
    handle = h;
    configured = !!h;
    announce();
    if (!h) { writeRaw(BACKUP_ON, null); setTrouble("none"); return; }
    /* a click has just granted it, a resume's or the pick's: asking again can
       hang as the first ask did (pin: backup.test › a resume granted in the click) */
    if (grantedNow) return granted(h);
    /* no gesture behind a launch or idle run, so only a handle already
       granted writes; a 'prompt' handle (a file:// tab after a restart)
       surfaces the paused affordance, whose click is the gesture */
    const asked = h.queryPermission({ mode: "readwrite" });
    return answered(asked).then((perm) => {
      if (perm === "unanswered") grantedLate(h, asked);
      return perm === "granted" ? granted(h) : setTrouble("paused");
    });
  }
  /* a slow answer of granted lifts the pause it caused (pin: backup.test › a
     permission check answering granted after the wait) */
  function grantedLate(h: Dir, asked: Promise<PermissionState>): void {
    asked.then((perm) => {
      if (perm === "granted" && pausedOn(h)) { setTrouble("none"); void runBackup(); }
    }, () => {});
  }
  const pausedOn = (h: Dir): boolean => h === handle && trouble === "paused";
  /* Helium's queryPermission has hung unanswered, and every later run waited
     behind it with nothing on screen: unanswered in time is taken as not
     granted, and the paused affordance asks (pin: backup.test › a permission
     check that never answers) */
  function answered(perm: Promise<PermissionState>): Promise<PermissionState | "unanswered"> {
    return new Promise((resolve, reject) => {
      const late = setTimeout(() => resolve("unanswered"), PERMISSION_MS);
      perm.then((p) => { clearTimeout(late); resolve(p); }, (err: unknown) => { clearTimeout(late); reject(err); });
    });
  }
  function granted(h: Dir): Promise<void> | void {
    const today = todayKey(), sig = backupSig(layer.cache), lastSig = readRaw(BACKUP_SIG) ?? null;
    const datedWas = readRaw(BACKUP_DATED) ?? null;
    const plan = backupPlan(today, sig, { dated: datedWas, sig: lastSig, ours: committedSig !== null && lastSig === committedSig });
    if (!plan.writeMirror && !plan.dated) { setTrouble("none"); return; }
    raise("backingUp");
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
      unread: c.plan.reconcile ? spare : null, onProgress: (done, total) => raise("backingUpCount", { done, total }) })
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
    if (incomplete) { setTrouble("incomplete"); return; }
    setTrouble("none");
    if (failures.length) reportLeftovers(failures);
    else raise("backedUp");
  }
  /* a delete-only failure is not backup trouble: a resume click
     could do nothing against a file something else holds open;
     nor is the bundle's, retried when the mirror next moves */
  function reportLeftovers(failures: Failure[]): void {
    const bundle = failures.find((x) => x.name === READER_ZIP), swept = failures.filter((x) => x !== bundle);
    if (swept.length) raise("backupLeftovers", { n: swept.length }, { caught: swept[0].error, copy: swept.map((x) => x.name).join(", ") });
    if (bundle) raise("bundleNotWritten", { caught: bundle.error, copy: errText(bundle.error) || READER_ZIP });
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
      setTrouble("blocked");
      raise("backupBlocked", { why: (err as Error).message }, { caught: err, copy: (err as Error).message });
      return;
    }
    console.error("backup failed", err);
    setTrouble(fsaFatal(err) ? "paused" : "failed");
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
    if (!picker) { raise("backupsNeedChromium"); return Promise.resolve(); }
    return picker().then((h) => {
      const was = handle;
      handle = h;
      return store.set(h as unknown as FileSystemDirectoryHandle).catch((err: unknown) => { handle = was; throw err; }).then(() => {
        configured = true;
        writeRaw(BACKUP_ON, "1");
        writeRaw(BACKUP_SIG, null);   /* the first backup writes everything */
        writeRaw(BACKUP_DATED, null);
        setTrouble("none");
        return Promise.resolve(running).then(() => runBackup(true));
      });
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      raise("couldntSetUpBackups", { why: failWhy(err) }, { caught: err });
    });
  }
  /* the paused affordance's click: requestPermission re-grants the CACHED
     handle SYNCHRONOUSLY, as the first statement, since it needs the
     click's activation */
  function resumeBackups(): Promise<void> {
    if (!picker) return Promise.resolve();
    if (!handle) return setupBackupFolder();
    return handle.requestPermission({ mode: "readwrite" }).then((perm) => {
      if (perm === "granted") { setTrouble("none"); return runBackup(true); }
      setTrouble("paused");
    }).catch((err: unknown) => {
      if (err && (err as Error).name === "AbortError") return;
      console.error("resume backups failed", err);
    });
  }
  announce();
  return {
    get configured() { return configured; },
    get folder() { return handle?.name ?? null; },
    get trouble() { return trouble; },
    runBackup, scheduleBackup, firePendingBackup, setupBackupFolder, resumeBackups,
  };
}
